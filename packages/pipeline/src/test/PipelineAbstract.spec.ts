import * as chai from "chai"
import * as util from "util"
import { expect } from "chai"
import { SchemaBuilder } from "@serafin/schema-builder"
import { PipelineAbstract } from "../PipelineAbstract"
import { defaultSchemaBuilders, SchemaBuildersInterface } from "../SchemaBuildersInterface"
import { IdentityInterface } from "../IdentityInterface"
import { PipeCreateNext, PipeDeleteNext, PipePatchNext, PipePropsInterface, PipeReadNext } from "../PipeInterface"
import { Relation } from "../Relation"
import { ResultsInterface } from "../ResultsInterface"
import { RelationType } from "../RelationType"

chai.use(require("chai-as-promised"))

const modelSchema = SchemaBuilder.emptySchema().addString("id").addString("method")
const schemas = defaultSchemaBuilders(modelSchema)

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
> extends PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM> {
    constructor(
        schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>,
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
            create: async (next: PipeCreateNext<M, CV, CO, CM>, resources: CV2[], options: CO2) => {
                const result = await next(resources, options)
                return { data: result.data.map((e) => ({ ...e, pipe: "create" })), meta: { ...result.meta, pipe: "create" } }
            },
            read: async (next: PipeReadNext<M, RQ, RM>, query: RQ2) => {
                const result = await next(query)
                return { data: result.data.map((e) => ({ ...e, pipe: "read" })), meta: { ...result.meta, pipe: "read" } }
            },
            patch: async (next: PipePatchNext<M, PQ, PV, PM>, query: PQ2, values: PV2) => {
                const result = await next(query, values)
                return { data: result.data.map((e) => ({ ...e, pipe: "patch" })), meta: { ...result.meta, pipe: "patch" } }
            },
            delete: async (next: PipeDeleteNext<M, DQ, DM>, query: DQ2) => {
                const result = await next(query)
                return { data: result.data.map((e) => ({ ...e, pipe: "delete" })), meta: { ...result.meta, pipe: "delete" } }
            },
        }
    }
}

describe("PipelineAbstract", function () {
    it("should be implemented by a concrete class", function () {
        let p = new TestPipeline(schemas, defaultResults)
        expect(p).to.be.an.instanceOf(TestPipeline)
        expect(p).to.be.an.instanceOf(PipelineAbstract)
    })

    it("should represent itself as JSONSchema definitions", function () {
        let p = new TestPipeline(schemas, defaultResults)
        expect(p.toString()).to.be.equal(
            util.inspect(
                {
                    model: {
                        type: "object",
                        additionalProperties: false,
                        properties: { id: { type: "string" }, method: { type: "string" } },
                        required: ["id", "method"],
                    },
                    createValues: {
                        type: "object",
                        additionalProperties: false,
                        properties: { id: { type: "string" }, method: { type: "string" } },
                        required: ["method"],
                    },
                    createOptions: { type: "object", additionalProperties: false },
                    readQuery: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            id: {
                                oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
                            },
                            method: {
                                oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
                            },
                        },
                    },
                    patchQuery: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            id: {
                                oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
                            },
                        },
                        required: ["id"],
                    },
                    patchValues: {
                        type: "object",
                        additionalProperties: false,
                        properties: { method: { type: "string" } },
                    },
                    deleteQuery: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            id: {
                                oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
                            },
                        },
                        required: ["id"],
                    },
                    readMeta: { type: "object", additionalProperties: false },
                    createMeta: { type: "object", additionalProperties: false },
                    patchMeta: { type: "object", additionalProperties: false },
                    deleteMeta: { type: "object", additionalProperties: false },
                },
                false,
                null,
            ),
        )
    })

    it(`should call pipeline methods`, async function () {
        let p = new TestPipeline(schemas, defaultResults)
        await expect(p.create([{ method: "create" }])).to.eventually.eqls(createResult)
        await expect(p.read({})).to.eventually.eqls(readResult)
        await expect(p.patch({ id: "42" }, {})).to.eventually.eqls(patchResult)
        await expect(p.delete({ id: "42" })).to.eventually.eqls(deleteResult)
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
})
