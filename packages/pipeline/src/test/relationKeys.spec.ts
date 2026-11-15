import { expect } from "chai"
import { SchemaBuilder } from "@serafin/schema-builder"
import { MemoryPipeline } from "../pipeline/MemoryPipeline.js"
import { inlineRelations } from "../inlineRelations.js"

const companySchema = SchemaBuilder.emptySchema().addString("id").addString("name").addArray("tagIds", SchemaBuilder.stringSchema(), {}, false)
const employeeSchema = SchemaBuilder.emptySchema()
    .addString("id")
    .addString("companyId")
    .addString("bossId", {}, false)
    .addArray("companyIds", SchemaBuilder.stringSchema(), {}, false)
const tagSchema = SchemaBuilder.emptySchema().addString("id")

/**
 * Counts the reads that reach a pipeline, so a test can tell a batched resolution from one made per
 * resource.
 */
const counted = <P extends MemoryPipeline<any>>(pipeline: P) => {
    const reads: any[] = []
    const piped = pipeline.pipe(() => ({
        read: async (next: any, query: any, context: any) => {
            reads.push(query)
            return next(query, context)
        },
    }))
    return { reads, pipeline: piped }
}

const companies = () =>
    new MemoryPipeline(companySchema, {
        initialData: [
            { id: "c1", name: "x", tagIds: ["t1", "t2"] },
            { id: "c2", name: "y", tagIds: ["t2"] },
        ],
    })

const employees = () =>
    new MemoryPipeline(employeeSchema, {
        initialData: [
            { id: "e1", companyId: "c1", companyIds: ["c1", "c2"] },
            { id: "e2", companyId: "c1", companyIds: ["c2"] },
            { id: "e3", companyId: "c2", companyIds: ["c1"] },
            { id: "e4", companyId: "c2", bossId: "e1", companyIds: [] },
        ],
    })

describe("Relation keys", function () {
    describe("a related read that pages its result", function () {
        it("should apply limit to each resource rather than to the whole page", async function () {
            const target = counted(employees())
            const p = companies().addRelationWithMany("employees", target.pipeline, { companyId: ":id" })
            const result = await p.read({ withEmployees: { limit: 1 } })
            expect(result.meta.relations!.employees!.index).to.eql({ c1: ["e1"], c2: ["e3"] })
            expect(target.reads.length).to.eql(2)
        })

        it("should apply skip to each resource too", async function () {
            const p = companies().addRelationWithMany("employees", employees(), { companyId: ":id" })
            const result = await p.read({ withEmployees: { skip: 1 } })
            expect(result.meta.relations!.employees!.index).to.eql({ c1: ["e2"], c2: ["e4"] })
        })

        it("should still batch a related read that only sorts", async function () {
            const target = counted(employees())
            const p = companies().addRelationWithMany("employees", target.pipeline, { companyId: ":id" })
            const result = await p.read({ withEmployees: { sort: { id: -1 } } })
            expect(result.meta.relations!.employees!.index).to.eql({ c1: ["e2", "e1"], c2: ["e4", "e3"] })
            expect(target.reads.length).to.eql(1)
        })
    })

    describe("a target holding a list of keys", function () {
        it("should send a single resource's key as a list of one", async function () {
            const p = new MemoryPipeline(tagSchema, { initialData: [{ id: "t1" }, { id: "t2" }] }).addRelationWithMany("companies", companies(), {
                tagIds: ":id" as any,
            })
            const result = await p.read({ id: "t2", withCompanies: true })
            expect(result.meta.relations!.companies!.index).to.eql({ t2: ["c1", "c2"] })
        })

        it("should file a batched entry under each of its keys", async function () {
            const target = counted(companies())
            const p = new MemoryPipeline(tagSchema, { initialData: [{ id: "t1" }, { id: "t2" }] }).addRelationWithMany("companies", target.pipeline, {
                tagIds: ":id" as any,
            })
            const result = await p.read({ withCompanies: true })
            expect(result.meta.relations!.companies!.index).to.eql({ t1: ["c1"], t2: ["c1", "c2"] })
            expect(target.reads).to.eql([{ tagIds: ["t1", "t2"] }])
        })
    })

    describe("a resource holding a list of keys", function () {
        it("should read every key a page holds once, and give each resource its own", async function () {
            const target = counted(companies())
            const p = employees().addRelationWithMany("companies", target.pipeline, { id: ":companyIds" })
            const result = await p.read({ withCompanies: true })
            expect(result.meta.relations!.companies!.index).to.eql({ e1: ["c1", "c2"], e2: ["c2"], e3: ["c1"], e4: [] })
            expect(target.reads).to.eql([{ id: ["c1", "c2"] }])
        })

        it("should resolve a single resource's list without batching", async function () {
            const p = employees().addRelationWithMany("companies", companies(), { id: ":companyIds" })
            const result = await p.read({ id: "e1", withCompanies: true })
            expect(result.meta.relations!.companies!.index).to.eql({ e1: ["c1", "c2"] })
        })
    })

    describe("a resource missing its key", function () {
        it("should leave it unindexed rather than failing the page", async function () {
            const p = employees().addRelationWithOne("boss", employees(), { id: ":bossId" })
            const result = await p.read({ withBoss: true })
            expect(result.meta.relations!.boss!.index).to.eql({ e4: "e1" })
        })

        it("should read nothing when no resource has a key", async function () {
            const target = counted(employees())
            const p = employees().addRelationWithOne("boss", target.pipeline, { id: ":bossId" })
            const result = await p.read({ id: ["e1", "e2"], withBoss: true })
            expect(result.meta.relations!.boss).to.eql({ type: "one", data: {}, index: {} })
            expect(target.reads).to.eql([])
        })
    })

    describe("what the relation sets itself", function () {
        it("cannot be changed by the query of the relation", async function () {
            const p = companies().addRelationWithMany("employees", employees(), { companyId: ":id" })
            const option = (p.schemaBuilders.readQuery.schema as any).properties.withEmployees.oneOf[1]
            expect(option.properties).not.to.have.property("companyId")
            let error: any
            await p.read({ withEmployees: { companyId: "c2" } as any }).catch((e) => (error = e))
            expect(error?.message).to.include("Validation failed")
        })
    })

    describe("a key that is null", function () {
        it("relates to nothing, and leaves the resource out of the index", async function () {
            const people = new MemoryPipeline(SchemaBuilder.emptySchema().addString("id").addProperty("bossId", SchemaBuilder.stringSchema({}, true)), {
                initialData: [
                    { id: "p1", bossId: null },
                    { id: "p2", bossId: "p1" },
                ],
            })
            const p = people.addRelationWithOne("boss", people, { id: ":bossId" })
            const result = await p.read({ withBoss: true })
            expect(result.meta.relations!.boss!.index).to.eql({ p2: "p1" })
        })
    })

    describe("ids named as the properties of objects", function () {
        it("are keys like any other", async function () {
            const people = new MemoryPipeline(SchemaBuilder.emptySchema().addString("id").addString("bossId", {}, false), {
                initialData: [{ id: "__proto__" }, { id: "constructor", bossId: "__proto__" }, { id: "toString", bossId: "constructor" }],
            })
            const p = people.addRelationWithOne("boss", people, { id: ":bossId" }).addRelationWithMany("reports", people, { bossId: ":id" })
            const result = await p.read({ withBoss: true, withReports: true })
            const boss = result.meta.relations!.boss!
            expect(Object.keys(boss.data).sort()).to.eql(["__proto__", "constructor"])
            expect(Object.getPrototypeOf(boss.index)).to.equal(null)
            expect(JSON.parse(JSON.stringify(boss.index))).to.eql({ constructor: "__proto__", toString: "constructor" })
            const inlined = inlineRelations(result).data as any[]
            expect(inlined.map((person) => person.boss?.id)).to.eql([undefined, "__proto__", "constructor"])
            expect(inlined.map((person) => person.reports.map((report: any) => report.id))).to.eql([["constructor"], ["toString"], []])
        })

        it("are not read on the prototype of a meta that went through JSON", function () {
            const meta = JSON.parse('{"relations":{"boss":{"type":"one","data":{},"index":{}}}}')
            expect((inlineRelations({ data: [{ id: "constructor" }], meta }).data[0] as any).boss).to.equal(undefined)
        })
    })

    describe("a target whose model has an $id", function () {
        it("can be the target of several relations", async function () {
            const users = new MemoryPipeline(SchemaBuilder.emptySchema().addString("id").addString("name").setId("https://example.com/user"), {
                initialData: [{ id: "u1", name: "Jane" }],
            })
            const docSchema = SchemaBuilder.emptySchema().addString("id").addString("authorId").addString("editorId")
            const docs = new MemoryPipeline(docSchema, { initialData: [{ id: "d1", authorId: "u1", editorId: "u1" }] })
                .addRelationWithOne("author", users, { id: ":authorId" })
                .addRelationWithOne("editor", users, { id: ":editorId" })
            const result = await docs.read({ withAuthor: true, withEditor: { name: "Jane" } })
            expect(result.meta.relations!.author!.index).to.eql({ d1: "u1" })
            expect(result.meta.relations!.editor!.index).to.eql({ d1: "u1" })
        })
    })
})
