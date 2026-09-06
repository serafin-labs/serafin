import * as chai from "chai"
import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { SchemaBuilder } from "@serafin/schema-builder"
import { PipelineAbstract } from "../PipelineAbstract.js"
import { defaultSchemaBuilders } from "../SchemaBuildersInterface.js"
import { ForkedPipeline } from "../pipeline/ForkedPipeline.js"
import { SetReadQueryParameterDefaultValue } from "../pipe/SetQueryParameterDefaultValue.js"
import { ResultsInterface } from "../ResultsInterface.js"

chai.use(chaiAsPromised)

const modelSchema = SchemaBuilder.emptySchema().addString("id").addString("method")
const schemas = defaultSchemaBuilders(modelSchema)

class Recorder extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    public calls: [string, any[]][] = []
    constructor(schemaBuilders: any, options?: { validationEnabled?: boolean; name?: string }) {
        super(schemaBuilders, options)
    }
    protected override async _create(resources: any, options: any, context: any) {
        this.calls.push(["create", [resources, options, context]])
        return { data: [{ id: "1", method: "create" }], meta: {} }
    }
    protected override async _read(query: any, context: any) {
        this.calls.push(["read", [query, context]])
        return { data: [{ id: "1", method: "read" }], meta: {} }
    }
    protected override async _patch(query: any, values: any, context: any) {
        this.calls.push(["patch", [query, values, context]])
        return { data: [{ id: "1", method: "patch" }], meta: {} }
    }
    protected override async _delete(query: any, context: any) {
        this.calls.push(["delete", [query, context]])
        return { data: [{ id: "1", method: "delete" }], meta: {} }
    }
}

describe("ForkedPipeline", function () {
    class Fork extends ForkedPipeline<any, any, any, any, any, any, any, any, any, any, any, any, any> {}
    const forked = () => {
        const base = new Recorder(schemas)
        return { base, fork: new Fork(base, "Fork title", "Fork description") }
    }

    it("should retitle the model without touching the base pipeline", function () {
        const { base, fork } = forked()
        expect((fork.schemaBuilders.model.schema as any).title).to.eql("Fork title")
        expect((fork.schemaBuilders.model.schema as any).description).to.eql("Fork description")
        expect((base.schemaBuilders.model.schema as any).title).to.eql(undefined)
    })

    it("should delegate every action to the base pipeline, context included", async function () {
        const { base, fork } = forked()
        await fork.create([{ method: "create" }], {}, {})
        await fork.read({}, {})
        await fork.patch({ id: "1" }, {}, {})
        await fork.delete({ id: "1" }, {})
        expect(base.calls.map(([name]) => name)).to.eql(["create", "read", "patch", "delete"])
        for (const [, args] of base.calls) {
            expect(args[args.length - 1]).to.eql({})
        }
    })

    it("should be able to skip its own validation", async function () {
        // the fork validates nothing, but still delegates to a base that does
        const validatingBase = new Recorder(schemas)
        class Unvalidated extends ForkedPipeline<any, any, any, any, any, any, any, any, any, any, any, any, any> {}
        await expect(new Unvalidated(validatingBase, "t", "d", false).read({ id: true } as any)).to.be.rejectedWith(
            /Validation failed in Recorder::read/,
        )
        // with the base opted out too, the query goes through untouched
        const quietBase = new Recorder(schemas, { validationEnabled: false })
        const fork = new Unvalidated(quietBase, "t", "d", false)
        await expect(fork.read({ id: true } as any)).to.eventually.have.property("data")
        expect(quietBase.calls[0][1][0]).to.eql({ id: true })
    })
})

describe("SetReadQueryParameterDefaultValue", function () {
    const querySchemas = { ...defaultSchemaBuilders(modelSchema), readQuery: SchemaBuilder.emptySchema().addString("method", {}, false) }

    it("should set the default when the parameter is absent", async function () {
        const p = new Recorder(querySchemas).pipe(SetReadQueryParameterDefaultValue((a: any) => a.method, "fallback") as any)
        await p.read({})
        expect((p as any).calls[0][1][0]).to.eql({ method: "fallback" })
    })

    it("should leave an explicitly provided value alone", async function () {
        const p = new Recorder(querySchemas).pipe(SetReadQueryParameterDefaultValue((a: any) => a.method, "fallback") as any)
        await p.read({ method: "explicit" })
        expect((p as any).calls[0][1][0]).to.eql({ method: "explicit" })
    })

    it("should accept a function producing the default from the query and context", async function () {
        const p = new Recorder(querySchemas).pipe(
            SetReadQueryParameterDefaultValue((a: any) => a.method, async (query: any, context: any) => `computed:${Object.keys(context).length}`) as any,
        )
        await p.read({}, {} as any)
        expect((p as any).calls[0][1][0]).to.eql({ method: "computed:0" })
    })
})
