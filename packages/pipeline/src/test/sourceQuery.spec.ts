import { expect } from "chai"
import { SchemaBuilder } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders } from "../pipeline/MemoryPipeline.js"
import { logicalQueryOperators, matchQuery, queryOperators } from "../pipeline/memory/matchQuery.js"
import { applyPatch, updateOperators } from "../pipeline/memory/applyPatch.js"
import { QueryOperators, SourceQuery, SourceValues, UpdateOperators } from "../SourceQuery.js"
import { PipeReadNext } from "../PipeInterface.js"

const widgetSchema = SchemaBuilder.emptySchema({ title: "Widget" })
    .addString("id")
    .addString("name")
    .addNumber("size", {}, false)
    .addArray("tags", SchemaBuilder.stringSchema(), {}, false)
    .addArray("parts", SchemaBuilder.emptySchema().addString("sku").addNumber("qty"), {}, false)

type Widget = typeof widgetSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<Widget>>["readQuery"]["T"]
type PatchValues = ReturnType<typeof memorySchemaBuilders<Widget>>["patchValues"]["T"]

const widgets = (): Widget[] => [
    { id: "1", name: "bolt", size: 3, tags: ["metal", "small"] },
    { id: "2", name: "nut", size: 7, tags: ["metal"], parts: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] },
    // no size, so a query for an absent property has something to match
    { id: "3", name: "washer" },
]

describe("SourceQuery", function () {
    it("should describe every query the matcher accepts", function () {
        // one value per operator, typed -- if the type is too narrow this file stops compiling
        const queries: SourceQuery<ReadQuery>[] = [
            { size: { $gt: 2, $lte: 3 } },
            { size: { $ne: null } },
            { name: { $in: ["bolt", "nut"] } },
            { name: { $nin: ["nut"] } },
            { name: { $regex: "^bo", $options: "i" } },
            { name: { $regex: /^bo/ } },
            { name: /^bo/ },
            { name: { $not: /^nut/ } },
            { size: { $not: { $gt: 5 } } },
            { size: { $exists: true } },
            { size: { $mod: [2, 1] } },
            { size: { $type: "number" } },
            { tags: { $size: 2 } },
            { tags: { $all: ["metal", "small"] } },
            { tags: { $eq: ["metal", "small"] } },
            { tags: ["metal"] },
            { tags: { $elemMatch: { $regex: "^met" } } },
            { parts: { $elemMatch: { sku: "b", qty: { $gt: 4 } } } },
            { "parts.qty": { $gt: 4 } },
            { $or: [{ name: "bolt" }, { size: { $gt: 5 } }] },
            { $and: [{ name: "bolt" }], $nor: [{ size: 99 }] },
            { size: null },
        ]
        // and the matcher agrees at runtime: each of them selects at least one of the two resources
        for (const query of queries) {
            expect(widgets().some((widget) => matchQuery(query, widget)), JSON.stringify(query)).to.eql(true)
        }
    })

    it("should describe every update the patcher accepts", function () {
        const updates: SourceValues<PatchValues>[] = [
            { name: "screw" },
            { size: null },
            { $set: { name: "screw", size: 4 } },
            { $set: { "parts.0.qty": 9 } },
            { $unset: { size: "" } },
            { $rename: { name: "label" } },
            { $inc: { size: 1 } },
            { $mul: { size: 2 } },
            { $min: { size: 1 } },
            { $max: { size: 9 } },
            { $push: { tags: "large" } },
            { $push: { tags: { $each: ["large", "heavy"] } } },
            { $addToSet: { parts: { sku: "c", qty: 1 } } },
            { $pull: { tags: "metal" } },
            { $pull: { parts: { sku: "a" } } },
            { $pull: { tags: { $regex: "^met" } } },
            { $pullAll: { tags: ["metal"] } },
            { $pop: { tags: 1 } },
        ]
        for (const values of updates) {
            expect(() => applyPatch(widgets()[1], values), JSON.stringify(values)).to.not.throw()
        }
    })

    it("should still refuse what a pipe has no business passing down", function () {
        const wrong: SourceQuery<ReadQuery>[] = [
            // a property the model does not declare -- the pipe that should have translated it is
            // missing or attached in the wrong order
            // @ts-expect-error
            { minSize: 4 },
            // an operand of the wrong type
            // @ts-expect-error
            { size: { $gt: "4" } },
            // a regular expression against a number
            // @ts-expect-error
            { size: /3/ },
            // @ts-expect-error
            { size: { $regex: /3/ } },
            // an operator that does not exist
            // @ts-expect-error
            { size: { $gtt: 4 } },
            // a logical operator whose clause is not a query
            // @ts-expect-error
            { $or: ["nope"] },
        ]
        const wrongValues: SourceValues<PatchValues>[] = [
            // $push on a property that is not an array
            // @ts-expect-error
            { $push: { name: "x" } },
            // an element of the wrong type
            // @ts-expect-error
            { $push: { tags: { $each: [4] } } },
            // @ts-expect-error
            { $pop: { tags: 2 } },
            // @ts-expect-error
            { $inc: { size: "1" } },
        ]
        // the type is the assertion; at runtime they are just objects
        expect(wrong.length + wrongValues.length).to.eql(10)
    })

    it("should stay in step with the operators the implementation interprets", function () {
        // the literal must have exactly the keys of the type, and they must be exactly the runtime
        // list -- so an operator added to one without the other does not compile, or fails here
        const queryKeys: Record<keyof QueryOperators<number>, true> = {
            $eq: true,
            $ne: true,
            $gt: true,
            $gte: true,
            $lt: true,
            $lte: true,
            $in: true,
            $nin: true,
            $exists: true,
            $regex: true,
            $options: true,
            $mod: true,
            $size: true,
            $all: true,
            $elemMatch: true,
            $type: true,
            $not: true,
        }
        expect(Object.keys(queryKeys).sort()).to.eql([...queryOperators].sort())

        const updateKeys: Record<keyof UpdateOperators<Widget>, true> = {
            $set: true,
            $unset: true,
            $rename: true,
            $inc: true,
            $mul: true,
            $min: true,
            $max: true,
            $push: true,
            $addToSet: true,
            $pull: true,
            $pullAll: true,
            $pop: true,
        }
        expect(Object.keys(updateKeys).sort()).to.eql([...updateOperators].sort())

        const logicalKeys: Record<Exclude<keyof SourceQuery<ReadQuery>, keyof ReadQuery | `${string}.${string}`>, true> = {
            $and: true,
            $or: true,
            $nor: true,
        }
        expect(Object.keys(logicalKeys).sort()).to.eql([...logicalQueryOperators].sort())
    })

    it("should let a pipe hand an operator down without a cast", async function () {
        // The worked example: a public `minSize` parameter on the query, a `$gt` condition on the
        // way down. `next` is typed with the widened query, so the operator needs no cast -- and
        // `requires` is checked against the pipeline's capabilities when the pipe is attached.
        const GreaterThanSize = (p: { readQuery: SchemaBuilder<ReadQuery> }) => {
            const readQuery = p.readQuery.addNumber("minSize", { minimum: 0 }, false)
            return {
                requires: ["$gt"],
                readQuery,
                read: async (next: PipeReadNext<Widget, ReadQuery, any, any, any>, query: typeof readQuery.T, context: any) => {
                    const { minSize, ...rest } = query
                    return next(minSize === undefined ? rest : { ...rest, size: { $gt: minSize } }, context)
                },
            }
        }

        const pipeline = new MemoryPipeline(widgetSchema, { initialData: widgets() }).pipe(GreaterThanSize)
        expect((await pipeline.read({ minSize: 4 })).data.map((widget) => widget.id)).to.eql(["2"])
        expect((await pipeline.read({})).data.map((widget) => widget.id)).to.eql(["1", "2", "3"])

        // and the widening is not a licence to pass anything: a dotted path is fine, its own public
        // parameter left in place is not
        const check = async (next: PipeReadNext<Widget, ReadQuery, any, any, any>) => {
            await next({ "parts.qty": { $gt: 4 } }, {})
            // @ts-expect-error
            await next({ minSize: 4 }, {})
            // @ts-expect-error
            await next({ size: { $gt: "4" } }, {})
        }
        await check(async () => ({ data: [], meta: {} }))
    })
})
