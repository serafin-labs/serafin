import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"
import { expect } from "chai"
import { SchemaBuilder } from "@serafin/schema-builder"
import { PipelineAbstract } from "../PipelineAbstract.js"
import { defaultSchemaBuilders, SchemaBuildersInterface } from "../SchemaBuildersInterface.js"
import { IdentityInterface } from "../IdentityInterface.js"
import {
    PipeCreateAction,
    PipeCreateNext,
    PipeDeleteAction,
    PipeDeleteNext,
    PipePatchAction,
    PipePatchNext,
    PipePropsInterface,
    PipeReadAction,
    PipeReadNext,
} from "../PipeInterface.js"
import { Relation } from "../Relation.js"
import { ResultsInterface } from "../ResultsInterface.js"
import { ReadOnlyPipelineInterface } from "../PipelineInterface.js"
import { ForkedPipeline } from "../pipeline/ForkedPipeline.js"

chai.use(chaiAsPromised)

const modelSchema = SchemaBuilder.emptySchema().addString("id").addString("method")
const schemas = { ...defaultSchemaBuilders(modelSchema), context: SchemaBuilder.emptySchema().addBoolean("_private", {}, false) }

const createResult = { data: [{ id: "1", method: "create" }], meta: {} }
const readResult = { data: [{ id: "1", method: "read" }], meta: {} }
const patchResult = { data: [{ id: "1", method: "patch" }], meta: {} }
const deleteResult = { data: [{ id: "1", method: "delete" }], meta: {} }
const defaultResults = { createResult, readResult, patchResult, deleteResult }

class TestPipeline<
    M extends IdentityInterface = IdentityInterface,
    CV extends object = object,
    CO extends object = object,
    RQ extends object = object,
    PQ extends object = object,
    PV extends object = object,
    DQ extends object = object,
    CM extends object = object,
    RM extends object = object,
    PM extends object = object,
    DM extends object = object,
    CTX extends object = object,
> extends PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX> {
    constructor(
        schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
        private results: {
            createResult?: ResultsInterface<M, CM>
            readResult?: ResultsInterface<M, RM>
            patchResult?: ResultsInterface<M, PM>
            deleteResult?: ResultsInterface<M, DM>
        },
    ) {
        super(schemaBuilders)
    }
    protected override _create(resources: CV[], options: CO) {
        if (!this.results.createResult) {
            throw new Error("No result")
        }
        return Promise.resolve(this.results.createResult)
    }
    protected override _read(query: RQ) {
        if (!this.results.readResult) {
            throw new Error("No result")
        }
        return Promise.resolve(this.results.readResult)
    }
    protected override _patch(query: PQ, values: PV) {
        if (!this.results.patchResult) {
            throw new Error("No result")
        }
        return Promise.resolve(this.results.patchResult)
    }
    protected override _delete(query: DQ) {
        if (!this.results.deleteResult) {
            throw new Error("No result")
        }
        return Promise.resolve(this.results.deleteResult)
    }
}

function TestPipe<
    M extends IdentityInterface,
    CV extends object,
    CO extends object,
    RQ extends object,
    PQ extends object,
    PV extends object,
    DQ extends object,
    CM extends object,
    RM extends object,
    PM extends object,
    DM extends object,
    CTX extends object,
>() {
    return (p: PipePropsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>) => {
        const model = p.model.addString("pipe", {}, false)
        const createValues = p.createValues.addString("pipe", {}, false)
        const createOptions = p.createOptions.addString("pipe", {}, false)
        const readQuery = p.readQuery.addString("pipe", {}, false)
        const patchQuery = p.patchQuery.addString("pipe", {}, false)
        const patchValues = p.patchValues.addString("pipe", {}, false)
        const deleteQuery = p.deleteQuery.addString("pipe", {}, false)
        const createMeta = p.createMeta.addString("pipe", {}, false)
        const readMeta = p.readMeta.addString("pipe", {}, false)
        const patchMeta = p.patchMeta.addString("pipe", {}, false)
        const deleteMeta = p.deleteMeta.addString("pipe", {}, false)
        type CV2 = typeof createValues.T
        type CO2 = typeof createOptions.T
        type RQ2 = typeof readQuery.T
        type PQ2 = typeof patchQuery.T
        type PV2 = typeof patchValues.T
        type DQ2 = typeof deleteQuery.T
        return {
            model,
            createValues,
            createOptions,
            readQuery,
            patchQuery,
            patchValues,
            deleteQuery,
            createMeta,
            readMeta,
            patchMeta,
            deleteMeta,
            create: async (next: PipeCreateNext<M, CV, CO, CM, CTX>, resources: CV2[], options: CO2, context: CTX, pipeline: ReadOnlyPipelineInterface<M>) => {
                const result = await next(resources, options, context)
                return { data: result.data.map((e) => ({ ...e, pipe: "create" })), meta: { ...result.meta, pipe: "create" } }
            },
            read: async (next: PipeReadNext<M, RQ, RM>, query: RQ2, context: CTX, pipeline: ReadOnlyPipelineInterface<M>) => {
                const result = await next(query, context)
                return { data: result.data.map((e) => ({ ...e, pipe: "read" })), meta: { ...result.meta, pipe: "read" } }
            },
            patch: async (next: PipePatchNext<M, PQ, PV, PM>, query: PQ2, values: PV2, context: CTX, pipeline: ReadOnlyPipelineInterface<M>) => {
                const result = await next(query, values, context)
                return { data: result.data.map((e) => ({ ...e, pipe: "patch" })), meta: { ...result.meta, pipe: "patch" } }
            },
            delete: async (next: PipeDeleteNext<M, DQ, DM>, query: DQ2, context: CTX, pipeline: ReadOnlyPipelineInterface<M>) => {
                const result = await next(query, context)
                return { data: result.data.map((e) => ({ ...e, pipe: "delete" })), meta: { ...result.meta, pipe: "delete" } }
            },
        }
    }
}

/**
 * Records what actually reaches the concrete implementation, and filters on array-valued
 * query keys so relations can be resolved against it.
 */
class RecordingPipeline extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any> {
    public readQueries: any[] = []
    public readContexts: any[] = []
    constructor(
        schemaBuilders: any,
        public store: any[] = [],
    ) {
        super(schemaBuilders)
    }
    protected override async _read(query: any, context: any) {
        this.readQueries.push(query)
        this.readContexts.push(context)
        const keys = Object.keys(query)
        return {
            data: this.store.filter((resource) =>
                keys.every((key) => (Array.isArray(query[key]) ? query[key].includes(resource[key]) : resource[key] === query[key])),
            ),
            meta: {},
        }
    }
}

const relationContextSchema = SchemaBuilder.emptySchema().addBoolean("_private", {}, false)

const companySchema = SchemaBuilder.emptySchema().addString("id").addString("name")
const employeeSchema = SchemaBuilder.emptySchema().addString("id").addString("companyId")

function relatedPipelines(
    employeeStore: any[] = [{ id: "e1", companyId: "c1" }],
    companyStore: any[] = [{ id: "c1", name: "Acme" }],
    companySchemaBuilders?: any,
) {
    const companies = new RecordingPipeline(
        { ...(companySchemaBuilders ?? defaultSchemaBuilders(companySchema)), context: relationContextSchema },
        companyStore,
    )
    const employees = new RecordingPipeline({ ...defaultSchemaBuilders(employeeSchema), context: relationContextSchema }, employeeStore)
    return { companies, employees: employees.addRelationWithOne("company", companies, { id: ":companyId" }) }
}

/**
 * Compile-time guards. These have no runtime assertions -- they fail `npm run typecheck` instead.
 */
type IsAny<T> = 0 extends 1 & T ? true : false

// The `with<Name>` option a relation installs must reach the static type of every action it hooks
// into. Only `readQuery` used to, because only the `read` handler annotated its parameter and so
// anchored inference; the other three fell back to their `= CO` / `= PQ` / `= DQ` defaults.
{
    const related = new TestPipeline(schemas, defaultResults)
    const p = new TestPipeline(schemas, defaultResults).addRelationWithOne("test", related, {})
    type Declares<T> = "withTest" extends keyof T ? true : false
    const _readQuery: Declares<Parameters<typeof p.read>[0]> = true
    const _createOptions: Declares<NonNullable<Parameters<typeof p.create>[1]>> = true
    const _patchQuery: Declares<Parameters<typeof p.patch>[0]> = true
    const _deleteQuery: Declares<Parameters<typeof p.delete>[0]> = true
}

// Every `Pipe*Action` must thread CTX into the `next` it hands the pipe, rather than leaving the
// parameter at its `any` default.
{
    type Ctx = { _private?: boolean }
    type NextCtx<A> = A extends (next: infer N, ...rest: any[]) => any ? (N extends (...args: infer P) => any ? P[P["length"] extends 3 ? 2 : 1] : never) : never
    const _create: IsAny<NextCtx<PipeCreateAction<IdentityInterface, {}, {}, {}, Ctx>>> = false
    const _read: IsAny<NextCtx<PipeReadAction<IdentityInterface, {}, {}, Ctx>>> = false
    const _patch: IsAny<NextCtx<PipePatchAction<IdentityInterface, {}, {}, {}, Ctx>>> = false
    const _delete: IsAny<NextCtx<PipeDeleteAction<IdentityInterface, {}, {}, Ctx>>> = false
}

describe("PipelineAbstract", function () {
    it("should be implemented by a concrete class", function () {
        let p = new TestPipeline(schemas, defaultResults)
        expect(p).to.be.an.instanceOf(TestPipeline)
        expect(p).to.be.an.instanceOf(PipelineAbstract)
    })

    it(`should call pipeline methods`, async function () {
        let p = new TestPipeline(schemas, defaultResults)
        await expect(p.create([{ method: "create" }])).to.eventually.eqls(createResult)
        await expect(p.read({})).to.eventually.eqls(readResult)
        await expect(p.patch({ id: "42" }, {})).to.eventually.eqls(patchResult)
        await expect(p.delete({ id: "42" })).to.eventually.eqls(deleteResult)
    })

    it("should get standalone methods", async function () {
        let p = new TestPipeline(schemas, defaultResults)
        const create = p.getCreateFunction()
        const read = p.getReadFunction()
        const patch = p.getPatchFunction()
        const deleteFunc = p.getDeleteFunction()
        await expect(create([{ method: "create" }])).to.eventually.eqls(createResult)
        await expect(read({})).to.eventually.eqls(readResult)
        await expect(patch({ id: "42" }, {})).to.eventually.eqls(patchResult)
        await expect(deleteFunc({ id: "42" })).to.eventually.eqls(deleteResult)
    })

    it(`should fail to call pipeline methods with invalid parameters`, async function () {
        let p = new TestPipeline(schemas, defaultResults)
        await expect(p.create([{ id: true, method: "create" } as any])).to.be.rejected
        await expect(p.create([{ method: "create" }], { error: true })).to.be.rejected
        await expect(p.read({ id: true } as any)).to.be.rejected
        await expect(p.patch({ id: true } as any, {})).to.be.rejected
        await expect(p.patch({ id: "42" }, { method: true } as any)).to.be.rejected
        await expect(p.delete({ id: true } as any)).to.be.rejected
    })

    it(`should modify schemas when associating a pipe`, function () {
        let p = new TestPipeline(schemas, defaultResults).pipe(TestPipe())
        expect(p.schemaBuilders.model.properties).to.contains("pipe")
        expect(p.schemaBuilders.createValues.properties).to.contains("pipe")
        expect(p.schemaBuilders.createOptions.properties).to.contains("pipe")
        expect(p.schemaBuilders.readQuery.properties).to.contains("pipe")
        expect(p.schemaBuilders.patchQuery.properties).to.contains("pipe")
        expect(p.schemaBuilders.patchValues.properties).to.contains("pipe")
        expect(p.schemaBuilders.deleteQuery.properties).to.contains("pipe")
        expect(p.schemaBuilders.createMeta.properties).to.contains("pipe")
        expect(p.schemaBuilders.readMeta.properties).to.contains("pipe")
        expect(p.schemaBuilders.patchMeta.properties).to.contains("pipe")
        expect(p.schemaBuilders.deleteMeta.properties).to.contains("pipe")
    })

    it(`should modify methods behavior when associating a pipe`, async function () {
        let p = new TestPipeline(schemas, defaultResults).pipe(TestPipe())
        await expect(p.create([{ method: "create" }])).to.eventually.eqls({
            data: [{ id: "1", method: "create", pipe: "create" }],
            meta: { pipe: "create" },
        })
        await expect(p.read({})).to.eventually.eqls({ data: [{ id: "1", method: "read", pipe: "read" }], meta: { pipe: "read" } })
        await expect(p.patch({ id: "1" }, {})).to.eventually.eqls({ data: [{ id: "1", method: "patch", pipe: "patch" }], meta: { pipe: "patch" } })
        await expect(p.delete({ id: "1" })).to.eventually.eqls({ data: [{ id: "1", method: "delete", pipe: "delete" }], meta: { pipe: "delete" } })
    })

    it(`should be cloned after each pipe`, async function () {
        const pipeline1 = new TestPipeline(schemas, defaultResults)
        const pipeline2 = pipeline1.pipe(TestPipe())
        expect(pipeline1).to.not.equals(pipeline2)
    })

    it("should add relations", function () {
        let p2 = new TestPipeline(schemas, defaultResults)
        let p1 = new TestPipeline(schemas, defaultResults).addRelationWithOne("test", p2, {})
        expect(p1.relations).to.exist
        expect(p1.relations.test).to.be.an.instanceof(Relation)
        expect(Object.keys(p1.relations).length).to.eql(1)
    })

    it("should inherit relations", function () {
        let p2 = new TestPipeline(schemas, defaultResults)
        let p1 = new TestPipeline(schemas, defaultResults).addRelationWithOne("test", p2, {}).pipe(TestPipe())
        expect(p1.relations).to.exist
        expect(p1.relations.test).to.be.an.instanceof(Relation)
    })

    it("should support templated relations", function () {
        let p2 = new TestPipeline(schemas, defaultResults)
        let p1 = new TestPipeline(schemas, defaultResults).addRelationWithOne("p2", p2, { id: ":id" })
        expect(p1.relations.p2).to.be.an.instanceof(Relation)
        return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.eventually.deep.equal({ data: [{ id: "1", method: "read" }], meta: {} })
    })

    it("should associate properly the remote pipeline properties and allow arrays", function () {
        const model2Schema = SchemaBuilder.emptySchema().addString("id").addArray("test", SchemaBuilder.emptySchema().addString("hop"))
        const schemas2 = defaultSchemaBuilders(model2Schema)
        const readResult = { data: [{ id: "1", test: [{ hop: "la" }] }], meta: {} }
        let p2 = new TestPipeline(schemas2, { readResult })
        let p1 = new TestPipeline(schemas, defaultResults).addRelationWithMany("p2", p2, { test: [{ hop: "la" }] })
        return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.eventually.deep.equal(readResult)
    })

    it("should not resolve a relation unless it is requested", async function () {
        const { companies, employees } = relatedPipelines()
        expect((await employees.read({})).data[0]).to.not.have.property("company")
        expect((await employees.read({ withCompany: false })).data[0]).to.not.have.property("company")
        expect(companies.readQueries).to.eql([])
    })

    it("should resolve a relation when it is requested", async function () {
        const { companies, employees } = relatedPipelines()
        const result = await employees.read({ withCompany: true })
        expect(result.data[0].company).to.eql({ id: "c1", name: "Acme" })
        expect(companies.readQueries).to.eql([{ id: "c1" }])
    })

    it("should strip the relation option before the query reaches the implementation", async function () {
        const { employees } = relatedPipelines()
        await employees.read({ withCompany: true })
        await employees.read({ withCompany: false })
        expect((employees as any).readQueries).to.eql([{}, {}])
    })

    it("should pass the context down to the related pipeline", async function () {
        const { companies, employees } = relatedPipelines()
        await employees.read({ withCompany: true }, { _private: true })
        expect(companies.readContexts).to.eql([{ _private: true }])
    })

    it("should forward the context through a forked pipeline", async function () {
        const base = new RecordingPipeline({ ...defaultSchemaBuilders(modelSchema), context: relationContextSchema }, [{ id: "1", method: "read" }])
        class Fork extends ForkedPipeline<any, any, any, any, any, any, any, any, any, any, any, any> {}
        const forked = new Fork(base as any, "Fork", "a forked pipeline")
        await forked.read({}, { _private: true })
        expect(base.readContexts).to.eql([{ _private: true }])
    })

    it("should resolve a whole page of resources with a single read", async function () {
        const { companies, employees } = relatedPipelines(
            [
                { id: "e1", companyId: "c1" },
                { id: "e2", companyId: "c2" },
                { id: "e3", companyId: "c1" },
            ],
            [
                { id: "c1", name: "Acme" },
                { id: "c2", name: "Globex" },
            ],
        )
        const result = await employees.read({ withCompany: true })
        expect(companies.readQueries).to.eql([{ id: ["c1", "c2"] }])
        expect(result.data.map((employee: any) => employee.company.name)).to.eql(["Acme", "Globex", "Acme"])
    })

    it("should fall back to one read per distinct target when the target rejects arrays", async function () {
        const noArrayQuery = { ...defaultSchemaBuilders(companySchema), readQuery: companySchema.toOptionals() }
        const { companies, employees } = relatedPipelines(
            [
                { id: "e1", companyId: "c1" },
                { id: "e2", companyId: "c2" },
                { id: "e3", companyId: "c1" },
            ],
            [
                { id: "c1", name: "Acme" },
                { id: "c2", name: "Globex" },
            ],
            noArrayQuery,
        )
        const result = await employees.read({ withCompany: true })
        // three employees, two distinct companies -> two reads, not three
        expect(companies.readQueries).to.have.deep.members([{ id: "c1" }, { id: "c2" }])
        expect(companies.readQueries.length).to.eql(2)
        expect(result.data.map((employee: any) => employee.company.name)).to.eql(["Acme", "Globex", "Acme"])
    })

    it("should not write the relation into the resources it was given", async function () {
        const store = [{ id: "e1", companyId: "c1" }]
        const { employees } = relatedPipelines(store)
        const result = await employees.read({ withCompany: true })
        expect(result.data[0]).to.have.property("company")
        expect(store[0]).to.not.have.property("company")
    })

    it("should give each resource its own array for a many relation", async function () {
        const companies = new RecordingPipeline({ ...defaultSchemaBuilders(companySchema), context: relationContextSchema }, [
            { id: "c1", name: "Acme" },
        ])
        const employees = new RecordingPipeline({ ...defaultSchemaBuilders(employeeSchema), context: relationContextSchema }, [
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c1" },
        ]).addRelationWithMany("companies", companies, { id: ":companyId" })
        const result: any = await employees.read({ withCompanies: true })
        expect(companies.readQueries.length).to.eql(1)
        expect(result.data[0].companies).to.eql([{ id: "c1", name: "Acme" }])
        expect(result.data[0].companies).to.not.equal(result.data[1].companies)
    })

    it("should share the data source with the pipeline it was piped from", async function () {
        const store = [{ id: "e1", companyId: "c1" }]
        const base = new RecordingPipeline({ ...defaultSchemaBuilders(employeeSchema), context: relationContextSchema }, store)
        const piped = base.pipe(() => ({}))
        store.push({ id: "e2", companyId: "c2" })
        expect((await piped.read({})).data.length).to.eql(2)
        expect((piped as any).store).to.equal(store)
    })

    it("should keep the identity of the values carried by the context", async function () {
        class Transaction {
            commit() {
                return "committed"
            }
        }
        const handle = new Transaction()
        const contextSchema = SchemaBuilder.emptySchema().addProperty("_handle", SchemaBuilder.emptySchema(), false)
        const pipeline = new RecordingPipeline({ ...defaultSchemaBuilders(employeeSchema), context: contextSchema as any }, [])
        await pipeline.read({}, { _handle: handle } as any)
        expect(pipeline.readContexts[0]._handle).to.equal(handle)
        expect(pipeline.readContexts[0]._handle.commit()).to.eql("committed")
    })

    it("should fail for templated relations referring to a non existing property", function () {
        let p2 = new TestPipeline(schemas, defaultResults)
        let p1 = new TestPipeline(schemas, defaultResults).addRelationWithMany("p2", p2, { id: ":blabliblou" })
        expect(p1.relations.p2).to.be.an.instanceof(Relation)
        return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.be.rejected
    })
})
