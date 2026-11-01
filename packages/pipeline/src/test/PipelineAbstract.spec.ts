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
import { maximumRelationDepth, Relation } from "../Relation.js"
import { inlineRelations } from "../inlineRelations.js"
import { RelationType } from "../RelationType.js"
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
    META extends object = object,
> extends PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META> {
    constructor(
        schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
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
    // and it must accept a query for the target, not only a boolean
    const _boolean: Parameters<typeof p.read>[0] = { withTest: true }
    const _subQuery: Parameters<typeof p.read>[0] = { withTest: { id: "42" } }
}

// A relation's contribution to the shared META must be precisely typed on every action's result,
// not widened to `any` -- that is the whole point of putting relations in meta rather than the model.
{
    const related = new TestPipeline(schemas, defaultResults)
    const p = new TestPipeline(schemas, defaultResults).addRelationWithOne("test", related, {})
    type ReadRelations = NonNullable<Awaited<ReturnType<typeof p.read>>["meta"]["relations"]>
    type PatchRelations = NonNullable<Awaited<ReturnType<typeof p.patch>>["meta"]["relations"]>
    type Rel = NonNullable<ReadRelations["test"]>
    const _one: RelationType.one = null as any as Rel["type"]
    const _data: Record<string, { id: string; method: string }> = null as any as Rel["data"]
    const _index: Record<string, string> = null as any as Rel["index"]
    // the same shape reaches patch, because META is shared across the four actions
    const _shared: Rel = null as any as NonNullable<PatchRelations["test"]>
    // and it must not have leaked onto the resource -- purely a type check, nothing runs
    type Resource = Awaited<ReturnType<typeof p.read>>["data"][number]
    const _notAny: IsAny<Resource> = false
    const _notOnResource: "test" extends keyof Resource ? false : true = true
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
        expect(companies.readQueries).to.eql([{ id: "c1" }])
        // the resource itself is untouched; the relation lands in meta
        expect(result.data[0]).to.eql({ id: "e1", companyId: "c1" })
        expect(result.meta.relations.company).to.eql({
            type: "one",
            data: { c1: { id: "c1", name: "Acme" } },
            index: { e1: "c1" },
        })
    })

    it("should carry a shared target once, not once per resource", async function () {
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
        const relation = result.meta.relations.company
        // three employees, two companies: Acme is stored once and referenced twice
        expect(Object.keys(relation.data)).to.have.members(["c1", "c2"])
        expect(relation.index).to.eql({ e1: "c1", e2: "c2", e3: "c1" })
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
        expect(companies.readQueries).to.have.deep.members([{ id: "c1" }, { id: "c2" }])
        expect(companies.readQueries.length).to.eql(2)
        expect(result.meta.relations.company.index).to.eql({ e1: "c1", e2: "c2", e3: "c1" })
    })

    it("should leave the resources it was given untouched", async function () {
        const store = [{ id: "e1", companyId: "c1" }]
        const { employees } = relatedPipelines(store)
        const result = await employees.read({ withCompany: true })
        expect(result.data[0]).to.not.have.property("company")
        expect(store[0]).to.eql({ id: "e1", companyId: "c1" })
    })

    it("should index a many relation by holding resource", async function () {
        const companies = new RecordingPipeline({ ...defaultSchemaBuilders(companySchema), context: relationContextSchema }, [
            { id: "c1", name: "Acme" },
            { id: "c2", name: "Globex" },
        ])
        const employees = new RecordingPipeline({ ...defaultSchemaBuilders(employeeSchema), context: relationContextSchema }, [
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c2" },
        ]).addRelationWithMany("companies", companies, { id: ":companyId" })
        const result: any = await employees.read({ withCompanies: true })
        expect(companies.readQueries.length).to.eql(1)
        expect(result.meta.relations.companies).to.eql({
            type: "many",
            data: { c1: { id: "c1", name: "Acme" }, c2: { id: "c2", name: "Globex" } },
            index: { e1: ["c1"], e2: ["c2"] },
        })
    })

    it("should narrow the related read with the query given as the relation option", async function () {
        const { companies, employees } = relatedPipelines(
            [{ id: "e1", companyId: "c1" }],
            [
                { id: "c1", name: "Acme" },
                { id: "c2", name: "Globex" },
            ],
        )
        await employees.read({ withCompany: { name: "Globex" } })
        expect(companies.readQueries).to.eql([{ id: "c1", name: "Globex" }])
    })

    it("should resolve a relation nested inside another relation's query", async function () {
        const countrySchema = SchemaBuilder.emptySchema().addString("id").addString("label")
        const companyWithCountrySchema = SchemaBuilder.emptySchema().addString("id").addString("name").addString("countryId")
        const countries = new RecordingPipeline({ ...defaultSchemaBuilders(countrySchema), context: relationContextSchema }, [
            { id: "fr", label: "France" },
        ])
        const companies = new RecordingPipeline(
            { ...defaultSchemaBuilders(companyWithCountrySchema), context: relationContextSchema },
            [{ id: "c1", name: "Acme", countryId: "fr" }],
        ).addRelationWithOne("country", countries, { id: ":countryId" })
        const employees = new RecordingPipeline({ ...defaultSchemaBuilders(employeeSchema), context: relationContextSchema }, [
            { id: "e1", companyId: "c1" },
        ]).addRelationWithOne("company", companies, { id: ":companyId" })

        const result: any = await employees.read({ withCompany: { withCountry: true } })
        expect(countries.readQueries).to.eql([{ id: "fr" }])
        expect(result.meta.relations.company.data.c1.name).to.eql("Acme")
        // the nested relation is resolved by the target pipeline, so it rides along in its own meta
        expect(result.meta.relations.company.type).to.eql("one")
    })

    it("should refuse to resolve relations past the maximum depth", async function () {
        const { employees } = relatedPipelines()
        const relation = (employees as any).relations.company
        const alreadyDeep = { [Symbol.for("@serafin/pipeline.relationDepth")]: maximumRelationDepth }
        await expect(relation.resolve([{ id: "e1", companyId: "c1" }], {}, alreadyDeep)).to.be.rejectedWith(
            /nested deeper than the maximum/,
        )
    })

    it("should join a normalized result back together with inlineRelations", async function () {
        const { employees } = relatedPipelines(
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
        const inlined = inlineRelations(await employees.read({ withCompany: true }))
        expect(inlined.data.map((e: any) => e.company.name)).to.eql(["Acme", "Globex", "Acme"])
        // the two resources sharing a company get the very same object, not copies
        expect((inlined.data[0] as any).company).to.equal((inlined.data[2] as any).company)
        // meta is passed through untouched, so the call is idempotent
        expect(inlineRelations(inlined as any).data).to.eql(inlined.data)
    })

    it("should inline nothing when the relation was not requested", async function () {
        const { employees } = relatedPipelines()
        const inlined = inlineRelations(await employees.read({}))
        expect(inlined.data[0]).to.eql({ id: "e1", companyId: "c1" })
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

describe("pipe capabilities", function () {
    class Source extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
        constructor(capabilities?: readonly string[]) {
            super(schemas as any, capabilities ? { capabilities } : {})
        }
        protected override async _read() {
            return readResult as any
        }
    }

    const passThrough = { read: async (next: any, query: any, context: any) => next(query, context) }
    const needing = (requires: readonly string[], provides?: readonly string[]) => () => ({ requires, provides, ...passThrough })

    it("should attach a pipe whose requirements the pipeline declares", async function () {
        const p = new Source(["$gt", "$in"]).pipe(needing(["$gt"]) as any)
        expect((await p.read({})).data).to.eql(readResult.data)
        expect([...p.capabilities!]).to.eql(["$gt", "$in"])
    })

    it("should refuse a pipe that needs something the pipeline does not declare", function () {
        expect(() => new Source(["$gt"]).pipe(needing(["$gt", "$push", "$pull"]) as any)).to.throw(/needs '\$push', '\$pull', which Source does not declare/)
    })

    it("should not check a pipeline that has declared nothing", function () {
        const p = new Source()
        expect(p.capabilities).to.eql(undefined)
        expect(() => p.pipe(needing(["$anything"]) as any)).to.not.throw()
    })

    it("should name the pipe in the error, however it was written", function () {
        function OperatorPipe() {
            return { requires: ["$push"], ...passThrough }
        }
        class ClassPipe {
            transform() {
                return { requires: ["$push"], ...passThrough }
            }
        }
        expect(() => new Source([]).pipe(OperatorPipe as any)).to.throw(/^OperatorPipe needs/)
        expect(() => new Source([]).pipe(new ClassPipe() as any)).to.throw(/^ClassPipe needs/)
        expect(() => new Source([]).pipe((() => ({ requires: ["$push"], ...passThrough })) as any)).to.throw(/^The pipe needs/)
    })

    it("should let a pipe answer for what it implements itself", function () {
        const withSort = new Source(["$gt"]).pipe(needing([], ["sort"]) as any)
        expect([...withSort.capabilities!]).to.eql(["$gt", "sort"])
        // the pipe attached after it is the one above it in the chain, so it may rely on that
        expect(() => withSort.pipe(needing(["sort"]) as any)).to.not.throw()
        // and the pipeline it was attached to is left alone
        expect([...new Source(["$gt"]).capabilities!]).to.eql(["$gt"])
    })

    it("should ignore what a pipe provides when the pipeline declared nothing", function () {
        expect(new Source().pipe(needing([], ["sort"]) as any).capabilities).to.eql(undefined)
    })

    it("should ignore an empty requires or provides", function () {
        const p = new Source(["$gt"]).pipe((() => ({ requires: [], provides: [], ...passThrough })) as any)
        expect([...p.capabilities!]).to.eql(["$gt"])
    })
})
