import { expect } from "chai"
import { QueryTemplate } from "../QueryTemplate"

describe("QueryTemplate", function () {
    it("should return separately the templated and non-templated parts of a relation query", function () {
        let query = { id: "1", method: ":method", someVar: "a", someOtherVar: ":b" }
        expect(QueryTemplate.getTemplatedParts(query)).to.deep.equal({ method: ":method", someOtherVar: ":b" })
        expect(QueryTemplate.getNonTemplatedParts(query)).to.deep.equal({ id: "1", someVar: "a" })
    })
})
