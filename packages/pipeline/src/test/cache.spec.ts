import * as chai from "chai"
import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import _ from "lodash"
import { SchemaBuilder } from "@serafin/schema-builder"
import { PipelineAbstract } from "../PipelineAbstract.js"
import { defaultSchemaBuilders } from "../SchemaBuildersInterface.js"
import { Cache, flushCacheScope, openCacheScope } from "../pipe/Cache.js"
import { stableKey } from "../stableKey.js"

chai.use(chaiAsPromised)

const modelSchema = SchemaBuilder.emptySchema().addString("id").addString("group", {}, false)
const schemas = defaultSchemaBuilders(modelSchema)

/**
 * What a source pipeline did. Held in its own object rather than in fields on the pipeline, because
 * `pipe()` clones the pipeline and a cloned counter would be counted separately.
 */
interface SourceState {
    reads: number
    writes: string[]
    failNextRead: boolean
    failNextWrite: boolean
}

/**
 * A pipeline that records how often it actually went to its source, and can be told to fail.
 */
class Source extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(public state: SourceState) {
        super(schemas as any)
    }
    protected override async _read(query: any, context: any) {
        this.state.reads++
        if (this.state.failNextRead) {
            this.state.failNextRead = false
            throw new Error("source unavailable")
        }
        return { data: [{ id: "1", group: "a" }], meta: { source: "db" } }
    }
    protected override async _create(resources: any[], options: any, context: any) {
        this.state.writes.push("create")
        return { data: [{ id: "1" }], meta: {} }
    }
    protected override async _patch(query: any, values: any, context: any) {
        this.state.writes.push("patch")
        if (this.state.failNextWrite) {
            this.state.failNextWrite = false
            throw new Error("write failed")
        }
        return { data: [{ id: "1" }], meta: {} }
    }
    protected override async _delete(query: any, context: any) {
        this.state.writes.push("delete")
        return { data: [{ id: "1" }], meta: {} }
    }
}

const newState = (): SourceState => ({ reads: 0, writes: [], failNextRead: false, failNextWrite: false })

const cached = (options?: { id?: string }) => {
    const source = new Source(newState())
    return { source: source.state, pipeline: source.pipe(Cache(options)) }
}

describe("Cache", function () {
    it("should not cache anything while no scope is open", async function () {
        const { source, pipeline } = cached()
        await pipeline.read({})
        await pipeline.read({})
        expect(source.reads).to.eql(2)
    })

    it("should read a repeated query once within a scope", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        const first = await pipeline.read({}, context)
        const second = await pipeline.read({}, context)
        expect(source.reads).to.eql(1)
        expect(second.data).to.eql(first.data)
        expect(second.meta).to.eql(first.meta)
    })

    it("should recognise a repeated query whatever the order of its properties", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        await pipeline.read({ id: "1", group: "a" }, context)
        await pipeline.read({ group: "a", id: "1" }, context)
        expect(source.reads).to.eql(1)
    })

    it("should keep distinct queries apart", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        await pipeline.read({ id: "1" }, context)
        await pipeline.read({ id: "2" }, context)
        expect(source.reads).to.eql(2)
    })

    it("should share a single read between calls that overlap in time", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        const [first, second] = await Promise.all([pipeline.read({}, context), pipeline.read({}, context)])
        expect(source.reads).to.eql(1)
        expect(second.data).to.eql(first.data)
    })

    it("should deduplicate reads issued from different points of one sequence", async function () {
        // The case this exists for: two pipes of one pipeline both reading the same resource from
        // another pipeline, with nothing modifying it in between.
        const { source, pipeline: shared } = cached()
        const holder = new Source(newState()).pipe(() => ({
            read: async (next: any, query: any, context: any) => {
                await shared.read({ id: "1" }, context)
                return next(query, context)
            },
        })).pipe(() => ({
            read: async (next: any, query: any, context: any) => {
                await shared.read({ id: "1" }, context)
                return next(query, context)
            },
        }))
        await holder.read({}, openCacheScope({}))
        expect(source.reads).to.eql(1)
    })

    it("should deduplicate a relation resolved against a cached target", async function () {
        const target = new Source(newState())
        const cachedTarget = target.pipe(Cache())
        const holder = new Source(newState()).addRelationWithOne("target", cachedTarget as any, { id: ":id" })
        const context = openCacheScope({})
        await holder.read({ withTarget: true } as any, context)
        await holder.read({ withTarget: true } as any, context)
        expect(target.state.reads).to.eql(1)
    })

    it("should give each caller its own envelope", async function () {
        const { pipeline } = cached()
        const context = openCacheScope({})
        const first = await pipeline.read({}, context)
        first.data.push({ id: "2" })
        ;(first.meta as any).stamped = true
        const second = await pipeline.read({}, context)
        expect(second.data).to.have.lengthOf(1)
        expect((second.meta as any).stamped).to.eql(undefined)
    })

    it("should hand out the same resources to every caller", async function () {
        // Documented behaviour: envelopes are per-caller, resources are shared and must not be mutated.
        const { pipeline } = cached()
        const context = openCacheScope({})
        const first = await pipeline.read({}, context)
        const second = await pipeline.read({}, context)
        expect(second.data[0]).to.equal(first.data[0])
    })

    it("should not pin a failed read for the life of the scope", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        source.failNextRead = true
        await expect(pipeline.read({}, context)).to.be.rejectedWith("source unavailable")
        const retried = await pipeline.read({}, context)
        expect(source.reads).to.eql(2)
        expect(retried.data).to.have.lengthOf(1)
    })

    it("should reject every caller waiting on a read that fails", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        source.failNextRead = true
        const [first, second] = await Promise.allSettled([pipeline.read({}, context), pipeline.read({}, context)])
        expect(first.status).to.eql("rejected")
        expect(second.status).to.eql("rejected")
        expect(source.reads).to.eql(1)
    })

    for (const [action, run] of [
        ["create", (p: any, c: any) => p.create([{ id: "1" }], {}, c)],
        ["patch", (p: any, c: any) => p.patch({ id: "1" }, {}, c)],
        ["delete", (p: any, c: any) => p.delete({ id: "1" }, c)],
    ] as const) {
        it(`should empty the scope on ${action}`, async function () {
            const { source, pipeline } = cached()
            const context = openCacheScope({})
            await pipeline.read({}, context)
            await run(pipeline, context)
            await pipeline.read({}, context)
            expect(source.writes).to.eql([action])
            expect(source.reads).to.eql(2)
        })
    }

    it("should empty the scope even when the write fails", async function () {
        // A write that throws may still have changed something, so the scope cannot keep serving
        // what it read before it.
        const { source, pipeline } = cached()
        const context = openCacheScope({})
        await pipeline.read({}, context)
        source.failNextWrite = true
        await expect(pipeline.patch({ id: "1" }, {}, context)).to.be.rejectedWith("write failed")
        await pipeline.read({}, context)
        expect(source.reads).to.eql(2)
    })

    it("should keep two pipelines' entries apart", async function () {
        const a = cached()
        const b = cached()
        const context = openCacheScope({})
        await a.pipeline.read({}, context)
        await b.pipeline.read({}, context)
        expect(a.source.reads).to.eql(1)
        expect(b.source.reads).to.eql(1)
    })

    it("should let two pipelines share entries under an explicit id", async function () {
        const a = cached({ id: "shared" })
        const b = cached({ id: "shared" })
        const context = openCacheScope({})
        await a.pipeline.read({}, context)
        await b.pipeline.read({}, context)
        expect(a.source.reads).to.eql(1)
        expect(b.source.reads).to.eql(0)
    })

    it("should ignore a scope that reached it through a deep copy of the context", async function () {
        const { source, pipeline } = cached()
        const context = _.cloneDeep(openCacheScope({}))
        await pipeline.read({}, context)
        await pipeline.read({}, context)
        expect(source.reads).to.eql(2)
    })

    it("should start empty when a scope is opened inside another", async function () {
        const { source, pipeline } = cached()
        const outer = openCacheScope({})
        await pipeline.read({}, outer)
        await pipeline.read({}, openCacheScope(outer))
        expect(source.reads).to.eql(2)
        await pipeline.read({}, outer)
        expect(source.reads).to.eql(2)
    })

    it("should open a scope without being given a context", async function () {
        const { source, pipeline } = cached()
        const context = openCacheScope()
        await pipeline.read({}, context)
        await pipeline.read({}, context)
        expect(source.reads).to.eql(1)
    })

    it("should stay invisible to context validation", async function () {
        const strictSchemas = { ...schemas, context: SchemaBuilder.emptySchema().addString("user") }
        const source = new Source(newState())
        ;(source as any).schemaBuilders = strictSchemas
        const pipeline = source.pipe(Cache())
        const context = openCacheScope({ user: "u1" })
        await pipeline.read({}, context)
        await pipeline.read({}, context)
        expect(source.state.reads).to.eql(1)
        expect(Object.keys(context)).to.eql(["user"])
    })

    describe("flushCacheScope", function () {
        it("should empty an open scope", async function () {
            const { source, pipeline } = cached()
            const context = openCacheScope({})
            await pipeline.read({}, context)
            flushCacheScope(context)
            await pipeline.read({}, context)
            expect(source.reads).to.eql(2)
        })

        it("should do nothing when there is no scope to empty", function () {
            expect(() => flushCacheScope(undefined)).to.not.throw()
            expect(() => flushCacheScope({})).to.not.throw()
        })
    })
})

describe("stableKey", function () {
    it("should separate values by type", function () {
        expect(stableKey(1)).to.not.eql(stableKey("1"))
        expect(stableKey(null)).to.not.eql(stableKey("null"))
        expect(stableKey(undefined)).to.not.eql(stableKey(null))
    })

    it("should ignore property order but not nesting", function () {
        expect(stableKey({ a: 1, b: { c: 2, d: 3 } })).to.eql(stableKey({ b: { d: 3, c: 2 }, a: 1 }))
        expect(stableKey({ a: { b: 1 } })).to.not.eql(stableKey({ a: 1, b: 1 }))
    })

    it("should keep array order", function () {
        expect(stableKey([1, 2])).to.not.eql(stableKey([2, 1]))
        expect(stableKey([1, 2])).to.eql(stableKey([1, 2]))
    })
})
