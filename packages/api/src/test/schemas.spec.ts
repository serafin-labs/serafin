import { expect } from "chai"
import { allowsArray, isObjectSchema, onlyAllowsArray, schemaDescription, schemaProperties } from "../rest/schemas.js"

describe("schemas", function () {
    it("collects the properties of an object schema and of its branches", function () {
        const { properties, required } = schemaProperties({
            properties: { a: { type: "string" } },
            required: ["a"],
            allOf: [{ properties: { b: true }, required: ["b"] }, false],
            oneOf: [{ properties: { c: true }, required: ["c"] }],
            anyOf: [{ properties: { a: { type: "integer" }, d: true }, required: ["d"] }],
        })
        expect(properties).to.eql({ a: { type: "string" }, b: true, c: true, d: true })
        expect([...required]).to.eql(["a", "b"])
        expect(schemaProperties(true)).to.eql({ properties: {}, required: new Set() })
    })

    it("tells whether a schema accepts arrays", function () {
        expect(allowsArray({ type: "array" })).to.be.true
        expect(allowsArray({ type: ["string", "array"] })).to.be.true
        expect(allowsArray({ anyOf: [{ type: "string" }, { oneOf: [{ type: "array" }] }] })).to.be.true
        expect(allowsArray({ type: "string" })).to.be.false
        expect(allowsArray({})).to.be.false
        expect(allowsArray(true)).to.be.true
        expect(allowsArray(false)).to.be.false
        expect(allowsArray(undefined)).to.be.false
    })

    it("tells whether a schema only accepts arrays", function () {
        expect(onlyAllowsArray({ type: "array" })).to.be.true
        expect(onlyAllowsArray({ type: ["array"] })).to.be.true
        expect(onlyAllowsArray({ type: ["array", "null"] })).to.be.false
        expect(onlyAllowsArray({})).to.be.false
        expect(onlyAllowsArray(true)).to.be.false
    })

    it("tells whether a schema describes an object", function () {
        expect(isObjectSchema({ type: "object" })).to.be.true
        expect(isObjectSchema({ type: ["object", "null"] })).to.be.true
        expect(isObjectSchema({ type: "string" })).to.be.false
        expect(isObjectSchema(true)).to.be.false
    })

    it("finds the description of a schema or of its branches", function () {
        expect(schemaDescription({ description: "a" })).to.eql("a")
        expect(schemaDescription({ oneOf: [{ description: "a" }, { type: "array" }] })).to.eql("a")
        expect(schemaDescription({ anyOf: [{ description: "a" }, { description: "b" }] })).to.be.undefined
        expect(schemaDescription({})).to.be.undefined
        expect(schemaDescription(true)).to.be.undefined
    })
})
