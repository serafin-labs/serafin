import * as chai from "chai"
import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { SchemaBuilder } from "@serafin/schema-builder"
import { PipelineAbstract } from "../PipelineAbstract.js"
import { defaultSchemaBuilders } from "../SchemaBuildersInterface.js"
import { Cache, openCacheScope } from "../pipe/Cache.js"

chai.use(chaiAsPromised)

/**
 * What each action was handed, once the pipeline was done normalizing it.
 */
interface Seen {
    query?: any
    values?: any
    resources?: any
    options?: any
    context?: any
    reads: number
}

const modelSchema = SchemaBuilder.emptySchema().addString("id").addString("group", {}, false)

class Recorder extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(public seen: Seen, options?: { validationEnabled?: boolean }) {
        super(defaultSchemaBuilders(modelSchema) as any, { validationEnabled: false, ...options })
    }
    protected override async _read(query: any, context: any) {
        Object.assign(this.seen, { query, context })
        this.seen.reads++
        return { data: [{ id: "1" }], meta: {} }
    }
    protected override async _create(resources: any[], options: any, context: any) {
        Object.assign(this.seen, { resources, options, context })
        return { data: [{ id: "1" }], meta: {} }
    }
    protected override async _patch(query: any, values: any, context: any) {
        Object.assign(this.seen, { query, values, context })
        return { data: [{ id: "1" }], meta: {} }
    }
    protected override async _delete(query: any, context: any) {
        Object.assign(this.seen, { query, context })
        return { data: [{ id: "1" }], meta: {} }
    }
}

const recorder = (options?: { validationEnabled?: boolean }) => {
    const seen: Seen = { reads: 0 }
    return { seen, pipeline: new Recorder(seen, options) }
}

describe("undefined properties", function () {
    it("should drop an undefined query property rather than pass it on as present", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.read({ id: "1", group: undefined })
        expect(seen.query).to.eql({ id: "1" })
        expect("group" in seen.query).to.eql(false)
    })

    it("should drop them at every depth of a query", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.read({ id: "1", nested: { kept: 1, gone: undefined, deeper: { gone: undefined } } })
        expect(seen.query).to.eql({ id: "1", nested: { kept: 1, deeper: {} } })
    })

    it("should keep every element of an array in place", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.read({ id: ["1", undefined, "2"] })
        expect(seen.query.id).to.have.lengthOf(3)
        expect(seen.query.id).to.eql(["1", undefined, "2"])
    })

    it("should still clean the objects an array holds", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.read({ any: [{ kept: 1, gone: undefined }] })
        expect(seen.query.any).to.eql([{ kept: 1 }])
    })

    it("should leave alone anything that is not a plain object", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.read({ when: new Date(0), pattern: /x/g, tags: new Set(["a"]) })
        expect(seen.query.when).to.be.an.instanceOf(Date)
        expect(seen.query.when.getTime()).to.eql(0)
        expect(seen.query.pattern).to.be.an.instanceOf(RegExp)
        expect(seen.query.tags).to.be.an.instanceOf(Set)
    })

    it("should drop them from create resources and options", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.create([{ id: "1", group: undefined }], { opt: undefined, kept: true })
        expect(seen.resources).to.eql([{ id: "1" }])
        expect(seen.options).to.eql({ kept: true })
    })

    it("should drop them from a delete query", async function () {
        const { seen, pipeline } = recorder()
        await pipeline.delete({ id: "1", group: undefined })
        expect(seen.query).to.eql({ id: "1" })
    })

    describe("patch values", function () {
        it("should read an undefined value as leaving the property alone", async function () {
            // RFC 7396: an absent property is left as it is. `undefined` is not JSON, so the only
            // coherent reading is the same one -- deletion is `null`, which `patchValues` declares.
            const { seen, pipeline } = recorder()
            await pipeline.patch({ id: "1" }, { group: undefined })
            expect(seen.values).to.eql({})
            expect("group" in seen.values).to.eql(false)
        })

        it("should carry a null value through as the request to clear it", async function () {
            const { seen, pipeline } = recorder()
            await pipeline.patch({ id: "1" }, { group: null })
            expect(seen.values).to.eql({ group: null })
        })
    })

    describe("context", function () {
        it("should drop its own undefined properties", async function () {
            const { seen, pipeline } = recorder()
            await pipeline.read({}, { user: "u1", tenant: undefined })
            expect(Object.keys(seen.context)).to.eql(["user"])
        })

        it("should keep the symbol-keyed values it carries", async function () {
            const { seen, pipeline } = recorder()
            const scope = Symbol.for("@serafin/pipeline.cacheScope")
            const store = new Map()
            await pipeline.read({}, { user: "u1", tenant: undefined, [scope]: store } as any)
            expect(seen.context[scope]).to.equal(store)
        })

        it("should not reach into the objects it carries", async function () {
            // The context is shallow-copied on purpose, so what it holds is still the caller's.
            const { seen, pipeline } = recorder()
            const config = { kept: 1, unset: undefined }
            await pipeline.read({}, { config })
            expect(seen.context.config).to.equal(config)
            expect("unset" in config).to.eql(true)
        })
    })

    it("should let two spellings of one query share a cache entry", async function () {
        const seen: Seen = { reads: 0 }
        const pipeline = new Recorder(seen).pipe(Cache())
        const context = openCacheScope({})
        await pipeline.read({ id: "1" }, context)
        await pipeline.read({ id: "1", group: undefined }, context)
        expect(seen.reads).to.eql(1)
    })

    it("should strip before validating, without hiding a genuinely invalid value", async function () {
        const { seen, pipeline } = recorder({ validationEnabled: true })
        await pipeline.read({ id: "1", group: undefined })
        expect(seen.query).to.eql({ id: "1" })
        await expect(pipeline.read({ id: "1", group: 42 })).to.be.rejectedWith("Validation failed")
    })
})
