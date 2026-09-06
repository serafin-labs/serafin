import * as chai from "chai"
import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { SchemaBuilder } from "@serafin/schema-builder"
import { PipelineAbstract } from "../PipelineAbstract.js"
import { defaultSchemaBuilders } from "../SchemaBuildersInterface.js"
import { Relation } from "../Relation.js"
import { RelationType } from "../RelationType.js"
import { QueryTemplate } from "../QueryTemplate.js"
import { inlineRelations } from "../inlineRelations.js"

chai.use(chaiAsPromised)

const employeeSchema = SchemaBuilder.emptySchema().addString("id").addString("companyId")
const companySchema = SchemaBuilder.emptySchema().addString("id").addString("name")

class Store extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    public reads: any[] = []
    constructor(
        schemaBuilders: any,
        public rows: any[] = [],
        options?: { validationEnabled?: boolean; name?: string },
    ) {
        super(schemaBuilders, options)
    }
    protected override async _read(query: any) {
        this.reads.push(query)
        const keys = Object.keys(query)
        return {
            data: this.rows.filter((r) => keys.every((k) => (Array.isArray(query[k]) ? query[k].includes(r[k]) : r[k] === query[k]))),
            meta: {},
        }
    }
    protected override async _create() {
        return { data: this.rows, meta: {} }
    }
    protected override async _patch() {
        return { data: this.rows, meta: {} }
    }
    protected override async _delete() {
        return { data: this.rows, meta: {} }
    }
}

/** A pipeline that implements nothing, to reach the not-implemented placeholders. */
class Bare extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {}

const employees = (rows = [{ id: "e1", companyId: "c1" }]) => new Store(defaultSchemaBuilders(employeeSchema), rows)
const companies = (rows = [{ id: "c1", name: "Acme" }]) => new Store(defaultSchemaBuilders(companySchema), rows)

describe("PipelineAbstract internals", function () {
    it("should expose the model schema builder", function () {
        const p = employees()
        expect(p.modelSchemaBuilder).to.equal(p.schemaBuilders.model)
    })

    it("should throw a not-implemented error for every action a pipeline does not provide", async function () {
        const p = new Bare(defaultSchemaBuilders(employeeSchema))
        await expect(p.create([{ id: "e1", companyId: "c1" }])).to.be.rejectedWith(/'create' can't be called .* Bare/)
        await expect(p.read({})).to.be.rejectedWith(/'read' can't be called .* Bare/)
        await expect(p.patch({ id: "e1" }, {})).to.be.rejectedWith(/'patch' can't be called .* Bare/)
        await expect(p.delete({ id: "e1" })).to.be.rejectedWith(/'delete' can't be called .* Bare/)
    })

    it("should accept a pipe given as a class instance", async function () {
        const p = employees().pipe({
            transform: (s: any) => ({
                readQuery: s.readQuery.addString("extra", {}, false),
                read: async (next: any, query: any, context: any) => {
                    const result = await next(query, context)
                    return { ...result, meta: { ...result.meta, viaClass: true } }
                },
            }),
        } as any)
        expect((p.schemaBuilders.readQuery.schema as any).properties).to.have.property("extra")
        expect((await p.read({})).meta).to.eql({ viaClass: true })
    })

    it("should accept a pipe that changes neither schemas nor behaviour", async function () {
        const base = employees()
        const p = base.pipe(() => ({}))
        expect(p.schemaBuilders).to.eql(base.schemaBuilders)
        expect((await p.read({})).data).to.eql([{ id: "e1", companyId: "c1" }])
    })

    it("should skip pipes that do not implement the action being called", async function () {
        const p = employees()
            .pipe(() => ({ create: async (next: any, ...args: any[]) => next(...args) }))
            .pipe(() => ({
                read: async (next: any, query: any, context: any) => {
                    const result = await next(query, context)
                    return { ...result, meta: { ...result.meta, seen: true } }
                },
            }))
        expect((await p.read({})).meta).to.eql({ seen: true })
    })

    it("should skip validation entirely when it is disabled", async function () {
        const p = new Store(defaultSchemaBuilders(employeeSchema), [], { validationEnabled: false })
        await p.read({ id: 42 } as any)
        expect(p.reads[0]).to.eql({ id: 42 })
    })

    it("should name the pipeline in validation errors when a name is configured", async function () {
        const p = new Store(defaultSchemaBuilders(employeeSchema), [], { name: "employees" })
        await expect(p.read({ id: 42 } as any)).to.be.rejectedWith(/Store::employees::read\(query\)/)
    })

    it("should reject create payloads that are not a non-empty array", async function () {
        const p = employees()
        await expect(p.create("nope" as any)).to.be.rejectedWith(/data must be array/)
        await expect(p.create([])).to.be.rejectedWith(/data must NOT have fewer than 1 items/)
        await expect(p.create([{ id: "e1", companyId: "c1" }, { id: 42 } as any])).to.be.rejectedWith(/entry at index 1 is invalid/)
    })

    it("should accumulate several relations in the shared meta schema", async function () {
        // both orders, so each of the two relation methods sees an already-declared `relations` key
        const reversed: any = employees()
            .addRelationWithMany("peers", companies(), { id: ":companyId" })
            .addRelationWithOne("company", companies(), { id: ":companyId" })
        expect(Object.keys((reversed.schemaBuilders.meta.schema as any).properties.relations.properties)).to.have.members(["company", "peers"])
        const p: any = employees()
            .addRelationWithOne("company", companies(), { id: ":companyId" })
            .addRelationWithMany("peers", companies(), { id: ":companyId" })
        const properties = (p.schemaBuilders.meta.schema as any).properties.relations.properties
        expect(Object.keys(properties)).to.have.members(["company", "peers"])
        const result = await p.read({ withCompany: true, withPeers: true })
        expect(Object.keys(result.meta.relations)).to.have.members(["company", "peers"])
        expect(result.meta.relations.company.type).to.eql("one")
        expect(result.meta.relations.peers.type).to.eql("many")
    })

    it("should skip a many relation on read when it is not requested", async function () {
        const targets = companies()
        const p: any = employees().addRelationWithMany("company", targets, { id: ":companyId" })
        expect((await p.read({})).meta).to.not.have.property("relations")
        expect(targets.reads).to.eql([])
    })

    it("should resolve relations on create, patch and delete as well as read", async function () {
        for (const kind of ["one", "many"] as const) {
            const targets = companies()
            const holder =
                kind === "one"
                    ? employees().addRelationWithOne("company", targets, { id: ":companyId" })
                    : employees().addRelationWithMany("company", targets, { id: ":companyId" })
            const p = holder as any
            const results = [
                await p.create([{ id: "e1", companyId: "c1" }], { withCompany: true }),
                await p.patch({ id: "e1", withCompany: true }, {}),
                await p.delete({ id: "e1", withCompany: true }),
            ]
            for (const result of results) {
                expect(result.meta.relations.company.type, kind).to.eql(kind)
                expect(result.meta.relations.company.data.c1, kind).to.eql({ id: "c1", name: "Acme" })
            }
            // and each action skips the relation when it is not asked for
            expect((await p.create([{ id: "e1", companyId: "c1" }])).meta).to.not.have.property("relations")
            expect((await p.patch({ id: "e1" }, {})).meta).to.not.have.property("relations")
            expect((await p.delete({ id: "e1" })).meta).to.not.have.property("relations")
        }
    })
})

describe("Relation internals", function () {
    const relationOf = (query: any, type = RelationType.one, target = companies()) =>
        new Relation(employees() as any, "company", target as any, query, type)

    it("should fetch and inline for a single resource", async function () {
        const relation = relationOf({ id: ":companyId" })
        const fetched = await relation.fetch({ id: "e1", companyId: "c1" } as any)
        expect(fetched.data).to.eql([{ id: "c1", name: "Acme" }])
        const assigned = await relation.assignToResource({ id: "e1", companyId: "c1" } as any)
        expect(assigned).to.eql({ id: "e1", companyId: "c1", company: { id: "c1", name: "Acme" } })
    })

    it("should return an empty contribution for an empty page", async function () {
        expect(await relationOf({ id: ":companyId" }).resolve([])).to.eql({ type: RelationType.one, data: {}, index: {} })
    })

    it("should leave a resource out of the index when the target has no match", async function () {
        const relation = relationOf({ id: ":companyId" }, RelationType.one, companies([]))
        const meta = await relation.resolve([{ id: "e1", companyId: "c1" }] as any)
        expect(meta.data).to.eql({})
        expect(meta.index).to.eql({})
    })

    it("should give a many relation an empty list when the target has no match", async function () {
        const relation = relationOf({ id: ":companyId" }, RelationType.many, companies([]))
        const meta = await relation.resolve([{ id: "e1", companyId: "c1" }] as any)
        expect(meta.index).to.eql({ e1: [] })
    })

    it("should key on a batched target that matches several resources at once", async function () {
        // companies -> employees, keyed on the target's companyId: two employees share c1
        const staff = new Store(defaultSchemaBuilders(employeeSchema), [
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c1" },
            { id: "e3", companyId: "c2" },
        ])
        const p: any = new Store(defaultSchemaBuilders(companySchema), [
            { id: "c1", name: "Acme" },
            { id: "c2", name: "Globex" },
        ]).addRelationWithMany("staff", staff, { companyId: ":id" })
        const result = await p.read({ withStaff: true })
        expect(staff.reads).to.eql([{ companyId: ["c1", "c2"] }])
        expect(result.meta.relations.staff.index).to.eql({ c1: ["e1", "e2"], c2: ["e3"] })
        expect(Object.keys(result.meta.relations.staff.data)).to.have.members(["e1", "e2", "e3"])
    })

    it("should batch on a query field declared directly as an array", async function () {
        const arrayOnly = {
            ...defaultSchemaBuilders(companySchema),
            readQuery: SchemaBuilder.emptySchema().addProperty("id", SchemaBuilder.arraySchema(SchemaBuilder.stringSchema()), false),
        }
        const target = new Store(arrayOnly, [
            { id: "c1", name: "Acme" },
            { id: "c2", name: "Globex" },
        ])
        const relation = new Relation(employees() as any, "company", target as any, { id: ":companyId" } as any, RelationType.one)
        const meta = await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c2" },
        ] as any)
        expect(target.reads).to.eql([{ id: ["c1", "c2"] }])
        expect(meta.index).to.eql({ e1: "c1", e2: "c2" })
    })

    it("should collapse resources whose relation query holds an identical array literal", async function () {
        const taggedSchema = SchemaBuilder.emptySchema().addString("id").addArray("tags", SchemaBuilder.emptySchema().addString("label"))
        const target = new Store(defaultSchemaBuilders(taggedSchema), [{ id: "c1", tags: [{ label: "a" }] }])
        const relation = new Relation(employees() as any, "company", target as any, { tags: [{ label: "a" }] } as any, RelationType.one)
        await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c1" },
        ] as any)
        // both resources hydrate to the same structured query, so it is read once rather than twice
        expect(target.reads).to.eql([{ tags: [{ label: "a" }] }])
    })

    it("should ignore a combination keyword that is not a list of schemas", async function () {
        const target = new Store(defaultSchemaBuilders(companySchema), [{ id: "c1", name: "Acme" }], { validationEnabled: false })
        ;(target.schemaBuilders.readQuery.schema as any).properties.id = { oneOf: { notAList: true } }
        const relation = new Relation(employees() as any, "company", target as any, { id: ":companyId" } as any, RelationType.one)
        await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c2" },
        ] as any)
        expect(target.reads.length).to.eql(2)
    })

    it("should not batch on a field the target's read query does not accept at all", async function () {
        // `name` is on the target's model but absent from its read query
        const narrow = { ...defaultSchemaBuilders(companySchema), readQuery: SchemaBuilder.emptySchema().addString("id", {}, false) }
        const target = new Store(narrow, [{ id: "c1", name: "Acme" }], { validationEnabled: false })
        const relation = new Relation(employees() as any, "company", target as any, { name: ":companyId" } as any, RelationType.one)
        await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c2" },
        ] as any)
        expect(target.reads.length).to.eql(2)
    })

    it("should batch on a field whose type is a list including array", async function () {
        const target = new Store(defaultSchemaBuilders(companySchema), [{ id: "c1", name: "Acme" }], { validationEnabled: false })
        ;(target.schemaBuilders.readQuery.schema as any).properties.id = { type: ["string", "array"] }
        const relation = new Relation(employees() as any, "company", target as any, { id: ":companyId" } as any, RelationType.one)
        await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c2" },
        ] as any)
        expect(target.reads).to.eql([{ id: ["c1", "c2"] }])
    })

    it("should leave a batched resource unindexed when its key matched nothing", async function () {
        const target = companies([{ id: "c1", name: "Acme" }])
        const relation = new Relation(employees() as any, "company", target as any, { id: ":companyId" } as any, RelationType.one)
        const meta = await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "missing" },
        ] as any)
        expect(target.reads).to.eql([{ id: ["c1", "missing"] }])
        expect(meta.index).to.eql({ e1: "c1" })
    })

    it("should inline a many relation as a list for a single resource", async function () {
        const relation = relationOf({ id: ":companyId" }, RelationType.many)
        const assigned: any = await relation.assignToResource({ id: "e1", companyId: "c1" } as any)
        expect(assigned.company).to.eql([{ id: "c1", name: "Acme" }])
    })

    it("should not batch when more than one field is templated", async function () {
        const target = companies([
            { id: "c1", name: "Acme" },
            { id: "c2", name: "Acme" },
        ])
        const relation = relationOf({ id: ":companyId", name: ":companyName" }, RelationType.one, target)
        await relation.resolve([
            { id: "e1", companyId: "c1", companyName: "Acme" },
            { id: "e2", companyId: "c2", companyName: "Acme" },
        ] as any)
        expect(target.reads).to.have.deep.members([
            { id: "c1", name: "Acme" },
            { id: "c2", name: "Acme" },
        ])
    })

    it("should not batch on a query field the target does not declare on its model", async function () {
        const searchable = { ...defaultSchemaBuilders(companySchema), readQuery: defaultSchemaBuilders(companySchema).readQuery.addString("search", {}, false) }
        const target = new Store(searchable, [{ id: "c1", name: "Acme" }])
        const relation = new Relation(employees() as any, "company", target as any, { search: ":companyId" } as any, RelationType.one)
        await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c2" },
        ] as any)
        expect(target.reads.length).to.eql(2)
    })

    it("should group resources whose relation query is a structured value", async function () {
        const target = companies()
        const relation = new Relation(employees() as any, "company", target as any, { id: ":companyId" } as any, RelationType.one)
        // two resources, identical object-valued key -> a single read
        await relation.resolve([
            { id: "e1", companyId: "c1" },
            { id: "e2", companyId: "c1" },
        ] as any)
        expect(target.reads).to.eql([{ id: "c1" }])
    })
})

describe("QueryTemplate escaping", function () {
    it("should unescape a literal value that begins with a colon", function () {
        expect(QueryTemplate.hydrate({ v: "\\:literal" }, {})).to.eql({ v: ":literal" })
        expect(QueryTemplate.escape("\\:x")).to.eql(":x")
        expect(QueryTemplate.escape("plain")).to.eql("plain")
        expect(QueryTemplate.escape(42)).to.eql(42)
    })
})

describe("inlineRelations edge cases", function () {
    it("should pass a result through untouched when relations is empty", function () {
        const result = { data: [{ id: "e1" }], meta: { relations: {} } }
        expect(inlineRelations(result as any)).to.equal(result)
    })

    it("should pass a result through untouched when there is no meta at all", function () {
        const result = { data: [{ id: "e1" }] } as any
        expect(inlineRelations(result)).to.equal(result)
    })

    it("should drop dangling references rather than emitting holes", function () {
        const result = {
            data: [{ id: "e1" }, { id: "e2" }],
            meta: {
                relations: {
                    tags: { type: RelationType.many, data: { t1: { id: "t1" } }, index: { e1: ["t1", "missing"] } },
                    owner: { type: RelationType.one, data: {}, index: { e1: "gone" } },
                },
            },
        }
        const inlined: any = inlineRelations(result as any)
        expect(inlined.data[0].tags).to.eql([{ id: "t1" }])
        expect(inlined.data[0].owner).to.eql(undefined)
        // a resource absent from the index gets an empty list for many, nothing for one
        expect(inlined.data[1].tags).to.eql([])
        expect(inlined.data[1]).to.not.have.property("owner")
    })
})
