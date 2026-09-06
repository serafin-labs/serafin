import { expect } from "chai"
import { QueryTemplate } from "../QueryTemplate.js"

describe("QueryTemplate", function () {
    it("should return separately the templated and non-templated parts of a relation query", function () {
        let query = { id: "1", method: ":method", someVar: "a", someOtherVar: ":b" }
        expect(QueryTemplate.getTemplatedParts(query)).to.deep.equal({ method: ":method", someOtherVar: ":b" })
        expect(QueryTemplate.getNonTemplatedParts(query)).to.deep.equal({ id: "1", someVar: "a" })
    })

    it("should hydrate falsy resource values", function () {
        expect(QueryTemplate.hydrate({ v: ":f" }, { f: false })).to.deep.equal({ v: false })
        expect(QueryTemplate.hydrate({ v: ":f" }, { f: 0 })).to.deep.equal({ v: 0 })
        expect(QueryTemplate.hydrate({ v: ":f" }, { f: "" })).to.deep.equal({ v: "" })
        expect(QueryTemplate.hydrate({ v: ":f" }, { f: null })).to.deep.equal({ v: null })
    })

    it("should still reject a template referring to a missing resource field", function () {
        expect(() => QueryTemplate.hydrate({ v: ":f" }, {})).to.throw("Resource field f not found")
        expect(() => QueryTemplate.hydrate({ v: ":f" }, { f: undefined })).to.throw("Resource field f not found")
    })
})
