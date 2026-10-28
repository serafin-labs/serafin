import * as chai from "chai"
import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { SchemaBuilder } from "@serafin/schema-builder"
import { MemoryPipeline, memoryCapabilities } from "../pipeline/MemoryPipeline.js"
import { matchQuery, matchValue, compareValues, compareForSort } from "../pipeline/memory/matchQuery.js"
import { applyPatch, isUpdateDocument } from "../pipeline/memory/applyPatch.js"
import { getAtPath, hasAtPath, parsePath, setAtPath, unsetAtPath, valuesAtPath } from "../pipeline/memory/path.js"
import { Cache, openCacheScope } from "../pipe/Cache.js"
import { inlineRelations } from "../inlineRelations.js"

chai.use(chaiAsPromised)

const widgetSchema = SchemaBuilder.emptySchema({ title: "Widget" })
    .addString("id")
    .addString("name")
    .addNumber("size", {}, false)
    .addBoolean("active", {}, false)
    .addArray("tags", SchemaBuilder.stringSchema(), {}, false)
    .addProperty("owner", SchemaBuilder.emptySchema().addString("company").addString("team", {}, false), false)
    .addArray("parts", SchemaBuilder.emptySchema().addString("sku").addNumber("qty"), {}, false)

type Widget = typeof widgetSchema.T

const widgets = (): Widget[] => [
    { id: "1", name: "bolt", size: 3, active: true, tags: ["metal", "small"], owner: { company: "acme", team: "hardware" } },
    { id: "2", name: "nut", size: 7, active: false, tags: ["metal"], parts: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] },
    { id: "3", name: "washer", tags: [], owner: { company: "globex" } },
]

const pipeline = (options: any = {}) => new MemoryPipeline(widgetSchema, { initialData: widgets(), ...options })

describe("path", function () {
    it("should reject the segments that would reach the prototype", function () {
        for (const path of ["__proto__", "constructor", "a.prototype", "a..b", ""]) {
            expect(() => parsePath(path)).to.throw(/not a valid property path/)
        }
        expect(parsePath("a.b")).to.eql(["a", "b"])
    })

    it("should reach into every element of an array on the way to a property", function () {
        const resource = { parts: [{ sku: "a" }, { sku: "b" }, "not an object"] }
        expect(valuesAtPath(resource, ["parts", "sku"])).to.eql(["a", "b"])
        expect(valuesAtPath(resource, ["parts", "0"])).to.eql([{ sku: "a" }])
        expect(valuesAtPath(resource, ["parts", "9"])).to.eql([])
        expect(valuesAtPath(resource, ["missing", "sku"])).to.eql([])
    })

    it("should read and test through an array index", function () {
        const resource = { parts: [{ sku: "a" }, { sku: "b" }] }
        expect(getAtPath(resource, ["parts", "0", "sku"])).to.eql("a")
        expect(hasAtPath(resource, ["parts", "1", "sku"])).to.eql(true)
        expect(getAtPath(resource, ["parts", "9", "sku"])).to.eql(undefined)
        setAtPath(resource, ["parts", "1", "sku"], "z")
        expect(resource.parts[1]).to.eql({ sku: "z" })
    })

    it("should not reach into a value that is not a plain object", function () {
        expect(valuesAtPath({ at: new Date(0) }, ["at", "getTime"])).to.eql([])
        expect(valuesAtPath({ at: "text" }, ["at", "length"])).to.eql([])
    })

    it("should read, test, write and remove a property at a path", function () {
        const resource: any = { owner: { company: "acme" }, tags: ["a", "b"] }
        expect(getAtPath(resource, ["owner", "company"])).to.eql("acme")
        expect(getAtPath(resource, ["owner", "team"])).to.eql(undefined)
        expect(getAtPath(resource, ["missing", "deep"])).to.eql(undefined)
        expect(getAtPath(resource, ["owner", "company", "deep"])).to.eql(undefined)
        expect(getAtPath(resource, ["owner", "company", "deep", "deeper"])).to.eql(undefined)
        expect(getAtPath(resource, ["tags", "1"])).to.eql("b")
        expect(getAtPath(resource, ["tags", "x"])).to.eql(undefined)
        expect(hasAtPath(resource, ["owner", "company"])).to.eql(true)
        expect(hasAtPath(resource, ["owner", "team"])).to.eql(false)
        expect(hasAtPath(resource, ["missing", "deep"])).to.eql(false)
        expect(hasAtPath(resource, ["tags", "0"])).to.eql(true)
        expect(hasAtPath(resource, ["tags", "9"])).to.eql(false)
        setAtPath(resource, ["owner", "team"], "hardware")
        setAtPath(resource, ["a", "b", "c"], 1)
        setAtPath(resource, ["tags", "0"], "z")
        expect(resource).to.eql({ owner: { company: "acme", team: "hardware" }, tags: ["z", "b"], a: { b: { c: 1 } } })
        unsetAtPath(resource, ["owner", "team"])
        unsetAtPath(resource, ["missing", "deep"])
        expect(resource.owner).to.eql({ company: "acme" })
    })

    it("should leave a null behind rather than shift an array when removing by index", function () {
        const resource = { tags: ["a", "b", "c"] }
        unsetAtPath(resource, ["tags", "1"])
        expect(resource.tags).to.eql(["a", null, "c"])
        unsetAtPath(resource, ["tags", "9"])
        unsetAtPath(resource, ["tags", "x"])
        expect(resource.tags).to.eql(["a", null, "c"])
    })

    it("should refuse a property name where an array index is required", function () {
        expect(() => setAtPath({ tags: ["a"] }, ["tags", "name"], 1)).to.throw(/not an index/)
        expect(() => setAtPath({ tags: [{ a: 1 }] }, ["tags", "name", "b"], 1)).to.throw(/not an index/)
    })

    it("should refuse to create a property through a value that cannot hold one", function () {
        expect(() => setAtPath({ name: "text" }, ["name", "deep"], 1)).to.throw(/cannot be created/)
        expect(() => setAtPath({ tags: [{ a: 1 }] }, ["tags", "5", "b"], 1)).to.throw(/cannot be created/)
        expect(() => setAtPath({ owner: { at: new Date(0) } }, ["owner", "at", "deep"], 1)).to.throw(/cannot be created/)
    })
})

describe("compareValues", function () {
    it("should compare within a type and refuse across types", function () {
        expect(compareValues(1, 2)).to.be.lessThan(0)
        expect(compareValues("b", "a")).to.eql(1)
        expect(compareValues("a", "b")).to.eql(-1)
        expect(compareValues("a", "a")).to.eql(0)
        expect(compareValues(true, false)).to.eql(1)
        expect(compareValues(new Date(1), new Date(2))).to.eql(-1)
        expect(compareValues("1", 1)).to.eql(undefined)
        expect(compareValues({}, {})).to.eql(undefined)
    })

    it("should order by type before value, so a mixed set still sorts", function () {
        expect(compareForSort(null, 1)).to.be.lessThan(0)
        expect(compareForSort(1, "a")).to.be.lessThan(0)
        expect(compareForSort("a", true)).to.be.lessThan(0)
        expect(compareForSort(true, new Date(0))).to.be.lessThan(0)
        expect(compareForSort(new Date(0), {})).to.be.lessThan(0)
        expect(compareForSort({}, {})).to.eql(0)
        expect(compareForSort(undefined, null)).to.eql(0)
        expect(compareForSort(2, 2)).to.eql(0)
    })
})

describe("matchQuery", function () {
    const doc = widgets()[0]
    const nut = widgets()[1]

    it("should match everything on an empty or absent query", function () {
        expect(matchQuery({}, doc)).to.eql(true)
        expect(matchQuery(undefined, doc)).to.eql(true)
        expect(matchQuery(null, doc)).to.eql(true)
    })

    it("should refuse a query that is not an object", function () {
        expect(() => matchQuery("nope", doc)).to.throw(/must be an object/)
    })

    it("should read an array on a property as 'any of these values'", function () {
        expect(matchQuery({ name: ["bolt", "nut"] }, doc)).to.eql(true)
        expect(matchQuery({ name: ["nut"] }, doc)).to.eql(false)
        // mongo would read this as equality with that exact array; `$eq` asks for it here
        expect(matchQuery({ tags: { $eq: ["metal", "small"] } }, doc)).to.eql(true)
        expect(matchQuery({ tags: { $eq: ["metal"] } }, doc)).to.eql(false)
    })

    it("should match a scalar against an array property by containment", function () {
        expect(matchQuery({ tags: "metal" }, doc)).to.eql(true)
        expect(matchQuery({ tags: "wood" }, doc)).to.eql(false)
    })

    it("should treat null as 'absent or null'", function () {
        expect(matchQuery({ size: null }, widgets()[2])).to.eql(true)
        expect(matchQuery({ size: null }, doc)).to.eql(false)
        expect(matchQuery({ size: { $ne: null } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $ne: null } }, widgets()[2])).to.eql(false)
        expect(matchQuery({ size: { $in: [null, 99] } }, widgets()[2])).to.eql(true)
    })

    it("should compare with $gt, $gte, $lt and $lte within a type only", function () {
        expect(matchQuery({ size: { $gt: 2 } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $gt: 3 } }, doc)).to.eql(false)
        expect(matchQuery({ size: { $gte: 3, $lte: 3 } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $lt: 3 } }, doc)).to.eql(false)
        expect(matchQuery({ size: { $gt: "2" } }, doc)).to.eql(false)
    })

    it("should support $in, $nin, $ne and $exists", function () {
        expect(matchQuery({ size: { $in: [3, 4] } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $nin: [3, 4] } }, doc)).to.eql(false)
        expect(matchQuery({ name: { $ne: "nut" } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $exists: true } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $exists: false } }, doc)).to.eql(false)
        expect(matchQuery({ owner: { $exists: false } }, nut)).to.eql(true)
    })

    it("should support $regex with $options, and a bare regular expression", function () {
        expect(matchQuery({ name: { $regex: "^bo" } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $regex: "^BO" } }, doc)).to.eql(false)
        expect(matchQuery({ name: { $regex: "^BO", $options: "i" } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $regex: /^BO/, $options: "i" } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $regex: /^bo/ } }, doc)).to.eql(true)
        expect(matchQuery({ name: /^bo/ }, doc)).to.eql(true)
        expect(matchQuery({ size: { $regex: "3" } }, doc)).to.eql(false)
    })

    it("should support $mod, $size, $all, $type and $not", function () {
        expect(matchQuery({ size: { $mod: [2, 1] } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $mod: [2, 0] } }, doc)).to.eql(false)
        expect(matchQuery({ tags: { $size: 2 } }, doc)).to.eql(true)
        expect(matchQuery({ tags: { $size: 5 } }, doc)).to.eql(false)
        expect(matchQuery({ tags: { $all: ["metal", "small"] } }, doc)).to.eql(true)
        expect(matchQuery({ tags: { $all: ["metal", "wood"] } }, doc)).to.eql(false)
        expect(matchQuery({ name: { $all: ["bolt"] } }, doc)).to.eql(true)
        expect(matchQuery({ size: { $type: "number" } }, doc)).to.eql(true)
        expect(matchQuery({ tags: { $type: "array" } }, doc)).to.eql(true)
        expect(matchQuery({ owner: { $type: "object" } }, doc)).to.eql(true)
        expect(matchQuery({ active: { $type: "boolean" } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $type: "string" } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $type: "date" } }, doc)).to.eql(false)
        expect(matchQuery({ name: { $type: "regex" } }, doc)).to.eql(false)
        expect(matchQuery({ name: { $type: "null" } }, doc)).to.eql(false)
        expect(matchQuery({ size: { $not: { $gt: 5 } } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $not: /^bo/ } }, doc)).to.eql(false)
    })

    it("should match a dotted path, including through an array", function () {
        expect(matchQuery({ "owner.company": "acme" }, doc)).to.eql(true)
        expect(matchQuery({ "owner.team": { $exists: false } }, widgets()[2])).to.eql(true)
        expect(matchQuery({ "parts.sku": "b" }, nut)).to.eql(true)
        expect(matchQuery({ "parts.qty": { $gt: 4 } }, nut)).to.eql(true)
    })

    it("should let conditions on an array be satisfied by different elements, and $elemMatch by one", function () {
        expect(matchQuery({ "parts.qty": { $gt: 4, $lt: 3 } }, nut)).to.eql(true)
        expect(matchQuery({ parts: { $elemMatch: { qty: { $gt: 4, $lt: 3 } } } }, nut)).to.eql(false)
        expect(matchQuery({ parts: { $elemMatch: { sku: "b", qty: 5 } } }, nut)).to.eql(true)
        expect(matchQuery({ parts: { $elemMatch: { sku: "b", qty: 2 } } }, nut)).to.eql(false)
        expect(matchQuery({ tags: { $elemMatch: { $regex: "^met" } } }, doc)).to.eql(true)
        expect(matchQuery({ name: { $elemMatch: { $regex: "^bo" } } }, doc)).to.eql(false)
    })

    it("should match a whole subdocument when the condition has no operator", function () {
        expect(matchQuery({ owner: { company: "acme", team: "hardware" } }, doc)).to.eql(true)
        expect(matchQuery({ owner: { company: "acme" } }, doc)).to.eql(false)
    })

    it("should support $and, $or and $nor", function () {
        expect(matchQuery({ $and: [{ name: "bolt" }, { size: 3 }] }, doc)).to.eql(true)
        expect(matchQuery({ $and: [{ name: "bolt" }, { size: 4 }] }, doc)).to.eql(false)
        expect(matchQuery({ $or: [{ name: "nut" }, { size: 3 }] }, doc)).to.eql(true)
        expect(matchQuery({ $or: [{ name: "nut" }] }, doc)).to.eql(false)
        expect(matchQuery({ $nor: [{ name: "nut" }] }, doc)).to.eql(true)
        expect(matchQuery({ $nor: [{ name: "bolt" }] }, doc)).to.eql(false)
        expect(matchQuery({ $or: [{ name: "nut" }, { size: 3 }], active: true }, doc)).to.eql(true)
    })

    it("should refuse an operator it does not implement rather than ignore it", function () {
        expect(() => matchQuery({ name: { $nope: 1 } }, doc)).to.throw(/is not an operator/)
        expect(() => matchQuery({ size: { $bitsAllSet: 1 } }, doc)).to.throw(/is not an operator/)
        expect(() => matchQuery({ $where: "true" }, doc)).to.throw(/not valid at the top level/)
    })

    it("should refuse a condition that mixes operators and properties", function () {
        expect(() => matchQuery({ owner: { $exists: true, company: "acme" } }, doc)).to.throw(/cannot mix operators and properties/)
    })

    it("should refuse malformed operands", function () {
        expect(() => matchQuery({ size: { $in: 3 } }, doc)).to.throw(/expects an array/)
        expect(() => matchQuery({ size: { $mod: [2] } }, doc)).to.throw(/divisor, remainder/)
        expect(() => matchQuery({ size: { $mod: "2" } }, doc)).to.throw(/expects an array/)
        expect(() => matchQuery({ name: { $regex: 3 } }, doc)).to.throw(/string or a regular expression/)
        expect(() => matchQuery({ name: { $type: "objectId" } }, doc)).to.throw(/is not a type/)
        expect(() => matchQuery({ name: { $options: "i" } }, doc)).to.throw(/only valid next to/)
        expect(() => matchQuery({ $or: [] }, doc)).to.throw(/at least one clause/)
        expect(() => matchQuery({ $and: "nope" }, doc)).to.throw(/expects an array/)
        expect(() => matchQuery({ tags: { $all: "metal" } }, doc)).to.throw(/expects an array/)
    })

    it("should match a single value for $pull's benefit", function () {
        expect(matchValue({ $gt: 2 }, 3)).to.eql(true)
        expect(matchValue("a", "a")).to.eql(true)
    })
})

describe("applyPatch", function () {
    it("should tell an update document from a merge patch", function () {
        expect(isUpdateDocument({ $set: { a: 1 } })).to.eql(true)
        expect(isUpdateDocument({ a: 1 })).to.eql(false)
        expect(isUpdateDocument("nope")).to.eql(false)
        expect(() => isUpdateDocument({ $set: { a: 1 }, b: 2 })).to.throw(/cannot mix update operators and properties/)
    })

    it("should apply a merge patch, where null deletes and anything else replaces", function () {
        const resource = { id: "1", name: "bolt", owner: { company: "acme", team: "hardware" }, tags: ["a"] }
        expect(applyPatch(resource, { name: "screw", owner: { team: null }, tags: ["b"] })).to.eql({
            id: "1",
            name: "screw",
            owner: { company: "acme" },
            tags: ["b"],
        })
        expect(applyPatch(resource, { owner: "flat" })).to.eql({ ...resource, owner: "flat" })
        expect(applyPatch(resource, { size: { deep: 1 } })).to.eql({ ...resource, size: { deep: 1 } })
        // the original is untouched
        expect(resource.name).to.eql("bolt")
    })

    it("should replace a non-object target on the way down", function () {
        expect(applyPatch({ id: "1", name: "bolt" }, { name: { first: "b" } })).to.eql({ id: "1", name: { first: "b" } })
    })

    it("should support $set, $unset and $rename", function () {
        const resource = { id: "1", name: "bolt", owner: { company: "acme", team: "hardware" } }
        expect(applyPatch(resource, { $set: { "owner.team": "software", size: 4 } })).to.eql({
            ...resource,
            owner: { company: "acme", team: "software" },
            size: 4,
        })
        expect(applyPatch(resource, { $unset: { "owner.team": "" } })).to.eql({ id: "1", name: "bolt", owner: { company: "acme" } })
        expect(applyPatch(resource, { $rename: { name: "label" } })).to.eql({ id: "1", label: "bolt", owner: resource.owner })
        expect(applyPatch(resource, { $rename: { missing: "label" } })).to.eql(resource)
        expect(() => applyPatch(resource, { $rename: { name: 4 } })).to.throw(/expects a property path/)
    })

    it("should support $inc, $mul, $min and $max", function () {
        const resource = { id: "1", size: 3 }
        expect(applyPatch(resource, { $inc: { size: 2, count: 1 } })).to.eql({ id: "1", size: 5, count: 1 })
        expect(applyPatch(resource, { $mul: { size: 2, count: 3 } })).to.eql({ id: "1", size: 6, count: 0 })
        expect(applyPatch(resource, { $min: { size: 1 } })).to.eql({ id: "1", size: 1 })
        expect(applyPatch(resource, { $min: { size: 9 } })).to.eql({ id: "1", size: 3 })
        expect(applyPatch(resource, { $max: { size: 9 } })).to.eql({ id: "1", size: 9 })
        expect(applyPatch(resource, { $max: { size: 1 } })).to.eql({ id: "1", size: 3 })
        expect(applyPatch(resource, { $min: { other: 2 } })).to.eql({ id: "1", size: 3, other: 2 })
        expect(applyPatch(resource, { $max: { other: 2 } })).to.eql({ id: "1", size: 3, other: 2 })
        expect(applyPatch(resource, { $min: { size: "a" } })).to.eql({ id: "1", size: 3 })
        expect(applyPatch(resource, { $max: { size: "a" } })).to.eql({ id: "1", size: 3 })
        expect(() => applyPatch(resource, { $inc: { size: "a" } })).to.throw(/expects a number/)
        expect(() => applyPatch(resource, { $mul: { size: "a" } })).to.throw(/expects a number/)
        expect(() => applyPatch({ id: "1", name: "bolt" }, { $inc: { name: 1 } })).to.throw(/not a number/)
    })

    it("should support $push and $addToSet, with $each", function () {
        const resource = { id: "1", tags: ["a"] }
        expect(applyPatch(resource, { $push: { tags: "b" } })).to.eql({ id: "1", tags: ["a", "b"] })
        expect(applyPatch(resource, { $push: { tags: { $each: ["b", "a"] } } })).to.eql({ id: "1", tags: ["a", "b", "a"] })
        expect(applyPatch(resource, { $push: { other: "b" } })).to.eql({ id: "1", tags: ["a"], other: ["b"] })
        expect(applyPatch(resource, { $addToSet: { tags: { $each: ["b", "a"] } } })).to.eql({ id: "1", tags: ["a", "b"] })
        expect(applyPatch(resource, { $addToSet: { tags: "a" } })).to.eql({ id: "1", tags: ["a"] })
        expect(applyPatch(resource, { $addToSet: { other: "b" } })).to.eql({ id: "1", tags: ["a"], other: ["b"] })
        expect(applyPatch(resource, { $push: { tags: { sku: "a" } } })).to.eql({ id: "1", tags: ["a", { sku: "a" }] })
        expect(() => applyPatch(resource, { $push: { tags: { $each: ["b"], $position: 0 } } })).to.throw(/does not support the '\$position'/)
        expect(() => applyPatch(resource, { $push: { tags: { $each: "b" } } })).to.throw(/'\$each' expects an array/)
        expect(() => applyPatch({ id: "1", name: "bolt" }, { $push: { name: "b" } })).to.throw(/not an array/)
    })

    it("should support $pull, $pullAll and $pop", function () {
        const resource = { id: "1", tags: ["a", "b", "c"], parts: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }
        expect(applyPatch(resource, { $pull: { tags: "b" } }).tags).to.eql(["a", "c"])
        expect(applyPatch(resource, { $pull: { tags: { $gt: "b" } } }).tags).to.eql(["a", "b"])
        expect(applyPatch(resource, { $pull: { parts: { sku: "a" } } }).parts).to.eql([{ sku: "b", qty: 5 }])
        expect(applyPatch(resource, { $pull: { missing: "a" } })).to.eql(resource)
        expect(applyPatch(resource, { $pullAll: { tags: ["a", "c"] } }).tags).to.eql(["b"])
        expect(applyPatch(resource, { $pullAll: { missing: ["a"] } })).to.eql(resource)
        expect(applyPatch(resource, { $pop: { tags: 1 } }).tags).to.eql(["a", "b"])
        expect(applyPatch(resource, { $pop: { tags: -1 } }).tags).to.eql(["b", "c"])
        expect(applyPatch({ id: "1", tags: [] }, { $pop: { tags: 1 } }).tags).to.eql([])
        expect(applyPatch(resource, { $pop: { missing: 1 } })).to.eql(resource)
        expect(() => applyPatch(resource, { $pullAll: { tags: "a" } })).to.throw(/'\$pullAll' expects an array/)
        expect(() => applyPatch(resource, { $pop: { tags: 2 } })).to.throw(/expects 1 to remove the last/)
    })

    it("should refuse an update operator it does not implement, and a malformed operand", function () {
        expect(() => applyPatch({ id: "1" }, { $currentDate: { at: true } })).to.throw(/is not an update operator/)
        expect(() => applyPatch({ id: "1" }, { $set: "nope" })).to.throw(/expects an object of property paths/)
    })

    it("should apply operators in a fixed order, whatever order they were written in", function () {
        const resource = { id: "1", size: 1 }
        expect(applyPatch(resource, { $inc: { size: 1 }, $set: { size: 10 } })).to.eql({ id: "1", size: 11 })
        expect(applyPatch(resource, { $set: { size: 10 }, $inc: { size: 1 } })).to.eql({ id: "1", size: 11 })
    })
})

describe("MemoryPipeline", function () {
    it("should start empty, or from the data it was given", async function () {
        expect(new MemoryPipeline(widgetSchema).size).to.eql(0)
        const p = pipeline()
        expect(p.size).to.eql(3)
        expect((await p.read({})).data.map((w) => w.id)).to.eql(["1", "2", "3"])
    })

    it("should not share the array it was seeded with", async function () {
        const seed = widgets()
        const p = new MemoryPipeline(widgetSchema, { initialData: seed })
        seed[0].name = "changed"
        expect((await p.read({ id: "1" })).data[0].name).to.eql("bolt")
    })

    it("should validate the resources it is restored with", function () {
        expect(() => new MemoryPipeline(widgetSchema, { initialData: [{ id: "1" } as any] })).to.throw(/Validation failed in MemoryPipeline::restore/)
    })

    it("should snapshot, restore and clear", async function () {
        const p = pipeline()
        const snapshot = p.snapshot()
        expect(snapshot.map((w) => w.id)).to.eql(["1", "2", "3"])
        await p.delete({ id: ["1", "2"] })
        expect(p.size).to.eql(1)
        p.restore(snapshot)
        expect(p.size).to.eql(3)
        p.clear()
        expect(p.size).to.eql(0)
    })

    describe("create", function () {
        it("should generate an id when none is given", async function () {
            const p = new MemoryPipeline(widgetSchema)
            const { data } = await p.create([{ name: "bolt" }])
            expect(data[0].id).to.match(/^[0-9a-f-]{36}$/)
            expect((await p.read({ id: data[0].id })).data[0].name).to.eql("bolt")
        })

        it("should keep an id that is given", async function () {
            const { data } = await new MemoryPipeline(widgetSchema).create([{ id: "chosen", name: "bolt" }])
            expect(data[0].id).to.eql("chosen")
        })

        it("should refuse a conflict, and write nothing when it does", async function () {
            const p = pipeline()
            await expect(p.create([{ id: "4", name: "new" }, { id: "1", name: "clash" }])).to.be.rejectedWith(/conflict/)
            expect(p.size).to.eql(3)
        })

        it("should refuse a batch that conflicts with itself", async function () {
            const p = new MemoryPipeline(widgetSchema)
            await expect(p.create([{ id: "a", name: "one" }, { id: "a", name: "two" }])).to.be.rejectedWith(/conflict/)
            expect(p.size).to.eql(0)
        })
    })

    describe("read", function () {
        it("should filter on the model properties", async function () {
            const p = pipeline()
            expect((await p.read({ name: "nut" })).data.map((w) => w.id)).to.eql(["2"])
            // `tags` is an array on the model, so the read query takes a list of the values to match
            expect((await p.read({ tags: ["metal"] })).data.map((w) => w.id)).to.eql(["1", "2"])
            expect((await p.read({ id: ["1", "3"] })).data.map((w) => w.id)).to.eql(["1", "3"])
        })

        it("should serve an id-only query straight from the store", async function () {
            const p = pipeline()
            expect((await p.read({ id: "2" })).data.map((w) => w.id)).to.eql(["2"])
            expect((await p.read({ id: "missing" })).data).to.eql([])
            expect((await p.read({ id: ["2", "2"] })).data.map((w) => w.id)).to.eql(["2"])
            expect((await p.read({ id: ["missing"] })).data).to.eql([])
            // still correct when the id query is joined by another property
            expect((await p.read({ id: ["1", "2"], name: "nut" })).data.map((w) => w.id)).to.eql(["2"])
        })

        it("should sort, skip, limit and count", async function () {
            const p = pipeline()
            expect((await p.read({ sort: { name: 1 } })).data.map((w) => w.name)).to.eql(["bolt", "nut", "washer"])
            expect((await p.read({ sort: { name: -1 } })).data.map((w) => w.name)).to.eql(["washer", "nut", "bolt"])
            // size is absent on one resource, which sorts before the numbers
            expect((await p.read({ sort: { size: 1 } })).data.map((w) => w.id)).to.eql(["3", "1", "2"])
            expect((await p.read({ sort: { active: 1, name: 1 } })).data.map((w) => w.id)).to.eql(["3", "2", "1"])
            expect((await p.read({ sort: { "owner.company": 1 } })).data.map((w) => w.id)).to.eql(["2", "1", "3"])
            // two resources that compare equal on every criterion keep the order they were selected in
            expect((await p.read({ sort: { owner: 1 } })).data.map((w) => w.id)).to.eql(["2", "1", "3"])
            expect((await p.read({ skip: 1 })).data.map((w) => w.id)).to.eql(["2", "3"])
            expect((await p.read({ limit: 2 })).data.map((w) => w.id)).to.eql(["1", "2"])
            expect((await p.read({ skip: 1, limit: 1 })).data.map((w) => w.id)).to.eql(["2"])
            expect((await p.read({})).meta.count).to.eql(undefined)
            const counted = await p.read({ limit: 1, withCount: true })
            expect(counted.data.length).to.eql(1)
            expect(counted.meta.count).to.eql(3)
            expect((await p.read({ name: "nut", withCount: true })).meta.count).to.eql(1)
        })

        it("should hand out copies, so a caller cannot write into the store", async function () {
            const p = pipeline()
            const { data } = await p.read({ id: "1" })
            data[0].name = "mutated"
            data[0].tags!.push("mutated")
            expect((await p.read({ id: "1" })).data[0]).to.eql(widgets()[0])
        })

        it("should share its resources when copying is turned off", async function () {
            const p = pipeline({ clone: false })
            const first = await p.read({ id: "1" })
            const second = await p.read({ id: "1" })
            expect(first.data[0]).to.equal(second.data[0])
        })
    })

    describe("patch", function () {
        it("should apply a merge patch to every match", async function () {
            const p = pipeline()
            const { data } = await p.patch({ id: ["1", "2"] }, { name: "renamed" })
            expect(data.map((w) => w.name)).to.eql(["renamed", "renamed"])
            expect((await p.read({ name: "renamed" })).data.length).to.eql(2)
        })

        it("should read null as a deletion, per RFC 7396", async function () {
            const p = pipeline()
            const { data } = await p.patch({ id: "1" }, { size: null })
            expect("size" in data[0]).to.eql(false)
        })

        it("should accept the update operators a mongo-facing pipe emits", async function () {
            const p = pipeline({ validationEnabled: false })
            expect((await p.patch({ id: "1" }, { $addToSet: { tags: { $each: ["large"] } } } as any)).data[0].tags).to.eql(["metal", "small", "large"])
            expect((await p.patch({ id: "1" }, { $pullAll: { tags: ["metal"] } } as any)).data[0].tags).to.eql(["small", "large"])
            expect((await p.patch({ id: "2" }, { $inc: { size: 1 } } as any)).data[0].size).to.eql(8)
        })

        it("should refuse a patch that would change an id", async function () {
            const p = pipeline({ validationEnabled: false })
            await expect(p.patch({ id: "1" }, { $set: { id: "9" } } as any)).to.be.rejectedWith(/cannot change the id/)
            expect(p.size).to.eql(3)
        })

        it("should write nothing when one of the matches fails validation", async function () {
            const p = pipeline()
            await expect(p.patch({ id: ["1", "2"] }, { name: null } as any)).to.be.rejectedWith(/Validation failed in MemoryPipeline::patch/)
            expect((await p.read({ id: "1" })).data[0].name).to.eql("bolt")
        })

        it("should match nothing without touching the store", async function () {
            const p = pipeline()
            expect((await p.patch({ id: "missing" }, { name: "x" })).data).to.eql([])
        })
    })

    describe("delete", function () {
        it("should remove the matches and return them", async function () {
            const p = pipeline()
            const { data } = await p.delete({ id: ["1", "3"] })
            expect(data.map((w) => w.id)).to.eql(["1", "3"])
            expect((await p.read({})).data.map((w) => w.id)).to.eql(["2"])
        })
    })

    describe("with pipes", function () {
        // A pipe rewrites a declared query property into an operator on the way down. Nothing
        // revalidates below the entry point, which is how the operator reaches the source at all --
        // `readQuery` still declares `size` as a plain number.
        const AsGreaterThan = (property: string) => () => ({
            read: async (next: any, query: any, context: any) =>
                property in query ? next({ ...query, [property]: { $gt: query[property] } }, context) : next(query, context),
        })

        it("should accept the operators a pipe passes down below validation", async function () {
            const p = pipeline().pipe(AsGreaterThan("size"))
            expect((await p.read({ size: 3 })).data.map((w) => w.id)).to.eql(["2"])
            expect((await p.read({})).data.length).to.eql(3)
        })

        it("should refuse a query property the model does not declare", async function () {
            // the shape of a pipe that was forgotten, or attached in the wrong order: its public
            // parameter reaches the implementation untranslated
            const Untranslated = () => () => ({ read: async (next: any, query: any, context: any) => next({ ...query, minSize: 4 }, context) })
            const p = pipeline().pipe(Untranslated() as any)
            await expect(p.read({})).to.be.rejectedWith(/'minSize' is not a property of Widget/)
            await expect(p.read({})).to.be.rejectedWith(/attached in the wrong order/)
        })

        it("should refuse an unknown property inside a logical operator, and at the first segment of a path", async function () {
            const Inject = (query: any) => () => () => ({ read: async (next: any, _q: any, context: any) => next(query, context) })
            const reads = (query: any) => pipeline().pipe(Inject(query)() as any).read({})
            await expect(reads({ $or: [{ name: "nut" }, { minSize: 4 }] })).to.be.rejectedWith(/'minSize' is not a property/)
            await expect(reads({ "missing.deep": 1 })).to.be.rejectedWith(/'missing' is not a property/)
            await expect(reads({ "owner.company": "acme" })).to.eventually.have.nested.property("data[0].id", "1")
            // a stray operator at the top level is the matcher's to reject, with its own message
            await expect(reads({ $where: "true" })).to.be.rejectedWith(/not valid at the top level/)
            // a query on the elements of an array is not the model's to declare
            await expect(reads({ parts: { $elemMatch: { sku: "a" } } })).to.eventually.have.nested.property("data[0].id", "2")
            // clauses that are all fine are left to the matcher
            expect((await reads({ $or: [{ name: "nut" }, { name: "bolt" }] })).data.map((w: any) => w.id)).to.eql(["1", "2"])
            // and so is a malformed one, which the matcher reports better than this check could
            await expect(reads({ $or: "nope" })).to.be.rejectedWith(/'\$or' expects an array/)
            await expect(reads({ $or: [{ name: "nut" }, "nope"] })).to.be.rejectedWith(/must be an object/)
        })

        it("should fall back to naming the model generically when it has no title", async function () {
            const untitled = new MemoryPipeline(SchemaBuilder.emptySchema().addString("id"), { initialData: [{ id: "1" }] })
            const Inject = () => () => ({ read: async (next: any, _q: any, context: any) => next({ nope: 1 }, context) })
            await expect(untitled.pipe(Inject() as any).read({})).to.be.rejectedWith(/'nope' is not a property of the model/)
        })

        it("should check the same on a patch and a delete query", async function () {
            const Inject = () => () => ({
                patch: async (next: any, _q: any, values: any, context: any) => next({ minSize: 4 }, values, context),
                delete: async (next: any, _q: any, context: any) => next({ minSize: 4 }, context),
            })
            const p = pipeline().pipe(Inject() as any)
            await expect(p.patch({ id: "1" }, { name: "x" })).to.be.rejectedWith(/'minSize' is not a property/)
            await expect(p.delete({ id: "1" })).to.be.rejectedWith(/'minSize' is not a property/)
        })

        it("should declare the operators it understands, and refuse a pipe needing more", function () {
            expect(memoryCapabilities).to.include.members(["$gt", "$elemMatch", "$addToSet", "$each", "sort", "dotted-paths"])
            const needing = (requires: readonly string[]) => () => ({ requires, read: async (next: any, q: any, c: any) => next(q, c) })
            expect(() => pipeline().pipe(needing(["$gt", "$push"]) as any)).to.not.throw()
            expect(() => pipeline().pipe(needing(["$bitsAllSet"]) as any)).to.throw(/needs '\$bitsAllSet', which MemoryPipeline does not declare/)
        })

        it("should deduplicate reads under a cache scope", async function () {
            const p = pipeline().pipe(Cache())
            const context = openCacheScope({})
            const first = await p.read({ id: "1" }, context)
            const second = await p.read({ id: "1" }, context)
            expect(second.data[0]).to.equal(first.data[0])
            await p.patch({ id: "1" }, { name: "renamed" }, context)
            expect((await p.read({ id: "1" }, context)).data[0].name).to.eql("renamed")
        })

        it("should resolve a relation against another memory pipeline in one read", async function () {
            const ownerSchema = SchemaBuilder.emptySchema({ title: "Company" }).addString("id").addString("label")
            const companies = new MemoryPipeline(ownerSchema, { initialData: [{ id: "acme", label: "Acme" }, { id: "globex", label: "Globex" }] })
            const widgetsWithOwner = new MemoryPipeline(
                widgetSchema.addString("companyId", {}, false),
                { initialData: [{ id: "1", name: "bolt", companyId: "acme" }, { id: "2", name: "nut", companyId: "acme" }] },
            ).addRelationWithOne("company", companies, { id: ":companyId" })
            const { meta } = await widgetsWithOwner.read({ withCompany: true })
            expect(meta.relations?.company?.data).to.eql({ acme: { id: "acme", label: "Acme" } })
            expect(meta.relations?.company?.index).to.eql({ "1": "acme", "2": "acme" })
        })

        it("should carry a nested relation's own relations one level down in meta", async function () {
            const citySchema = SchemaBuilder.emptySchema({ title: "City" }).addString("id").addString("name")
            const addressSchema = SchemaBuilder.emptySchema({ title: "Address" }).addString("id").addString("cityId")
            const companySchema = SchemaBuilder.emptySchema({ title: "Company" }).addString("id").addString("addressId")
            const userSchema = SchemaBuilder.emptySchema({ title: "User" }).addString("id").addString("addressId").addString("companyId")
            const cities = new MemoryPipeline(citySchema, {
                initialData: [
                    { id: "paris", name: "Paris" },
                    { id: "lyon", name: "Lyon" },
                ],
            })
            const addresses = new MemoryPipeline(addressSchema, {
                initialData: [
                    { id: "a1", cityId: "paris" },
                    { id: "a2", cityId: "lyon" },
                    { id: "a3", cityId: "paris" },
                ],
            }).addRelationWithOne("city", cities, { id: ":cityId" })
            const companies = new MemoryPipeline(companySchema, { initialData: [{ id: "acme", addressId: "a3" }] }).addRelationWithOne("address", addresses, {
                id: ":addressId",
            })
            const users = new MemoryPipeline(userSchema, {
                initialData: [
                    { id: "1", addressId: "a1", companyId: "acme" },
                    { id: "2", addressId: "a2", companyId: "acme" },
                ],
            })
                .addRelationWithOne("address", addresses, { id: ":addressId" })
                .addRelationWithOne("company", companies, { id: ":companyId" })

            const result = await users.read({ withAddress: { withCity: true }, withCompany: { withAddress: { withCity: true } } })
            const { address, company } = result.meta.relations ?? {}
            expect(address?.index).to.eql({ "1": "a1", "2": "a2" })
            expect(address?.relations?.city?.data).to.eql({ paris: { id: "paris", name: "Paris" }, lyon: { id: "lyon", name: "Lyon" } })
            expect(address?.relations?.city?.index).to.eql({ a1: "paris", a2: "lyon" })
            // the company's `address` relation shares the name but not the level, so neither overwrites the other
            expect(company?.relations?.address?.index).to.eql({ acme: "a3" })
            expect(company?.relations?.address?.relations?.city?.index).to.eql({ a3: "paris" })
            // a relation asked for without nested options carries no `relations` key
            expect((await users.read({ withAddress: true })).meta.relations?.address).to.not.have.property("relations")

            const inlined = inlineRelations(result)
            expect(inlined.data[0].address?.city?.name).to.eql("Paris")
            expect(inlined.data[1].company?.address?.city?.name).to.eql("Paris")
        })
    })
})
