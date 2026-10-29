import * as chai from "chai"
import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { SchemaBuilder } from "@serafin/schema-builder"
import { MemoryPipeline } from "../pipeline/MemoryPipeline.js"

chai.use(chaiAsPromised)

const looseSchema = SchemaBuilder.emptySchema().addString("id").addProperty("meta", SchemaBuilder.emptySchema().addAdditionalProperties(), false)

const loose = (options: any = {}) =>
    new MemoryPipeline(looseSchema, {
        initialData: [
            { id: "1", meta: { a: 1 } },
            { id: "2", meta: { $exists: true } },
            { id: "3" },
        ],
        ...options,
    })

describe("operators in a caller's query", function () {
    it("should refuse one sent where the schema only accepts any object", async function () {
        const p = loose()
        await expect(p.read({ meta: { $exists: true } })).to.be.rejectedWith(/Validation failed/)
        await expect(p.read({ meta: { $regex: "x" } as any })).to.be.rejectedWith(/Validation failed/)
        await expect(p.patch({ meta: { $exists: true } } as any, { meta: { b: 2 } })).to.be.rejectedWith(/Validation failed/)
        await expect(p.delete({ meta: { $exists: true } } as any)).to.be.rejectedWith(/Validation failed/)
        expect(p.size).to.eql(3)
    })

    it("should say which key it refused, and where", async function () {
        const error = await loose()
            .read({ meta: { $exists: true } })
            .catch((e) => e)
        expect(error.message).to.match(/'\/meta\/\$exists' is not declared by the schema/)
    })

    it("should refuse one at any depth and in any element", async function () {
        const p = loose()
        await expect(p.read({ meta: { a: { $gt: 0 } } })).to.be.rejectedWith(/Validation failed/)
        await expect(p.read({ meta: [{ $exists: true }] })).to.be.rejectedWith(/Validation failed/)
        await expect(p.read({ sort: { $natural: 1 } } as any)).to.be.rejectedWith(/Validation failed/)
    })

    it("should refuse one inside a relation's sub-query", async function () {
        const p = loose().addRelationWithMany("others", loose(), { id: ":id" })
        await expect(p.read({ withOthers: { meta: { $exists: true } } })).to.be.rejectedWith(/Validation failed/)
    })

    it("should still match a free-form value that holds no operator", async function () {
        expect((await loose().read({ meta: { a: 1 } })).data.map((r) => r.id)).to.eql(["1"])
    })

    it("should accept one a pipe hands down through next", async function () {
        const p = loose().pipe(() => ({
            read: (next: any, query: any, context: any) => next({ meta: { $exists: true } }, context),
        }))
        expect((await p.read({})).data.map((r) => r.id)).to.eql(["1", "2"])
    })

    it("should accept one the schema declares by name", async function () {
        const p = loose().pipe((builders) => ({
            readQuery: builders.readQuery.replaceProperty("meta" as any, () => SchemaBuilder.emptySchema().addBoolean("$exists"), false),
        }))
        expect((await p.read({ meta: { $exists: false } } as any)).data.map((r) => r.id)).to.eql(["3"])
    })

    it("should let a pipeline with validation off pass one through", async function () {
        expect((await loose({ validationEnabled: false }).read({ meta: { $exists: true } })).data.map((r) => r.id)).to.eql(["1", "2"])
    })
})
