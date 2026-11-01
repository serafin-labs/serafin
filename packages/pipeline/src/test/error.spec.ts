import { expect } from "chai"
import VError from "verror"
import {
    ConflictErrorName,
    ForbiddenErrorName,
    MovedPermanentlyErrorName,
    NotFoundErrorName,
    NotImplementedErrorName,
    UnauthorizedErrorName,
    ValidationErrorName,
    conflictError,
    error,
    forbiddenError,
    movedPermanentlyError,
    notFoundError,
    notImplementedError,
    unauthorizedError,
    validationError,
} from "../error.js"

describe("error", function () {
    it("should build a named error carrying info and a cause", function () {
        const cause = new Error("underlying")
        const e = error("SomeName", "something went wrong", { a: 1 }, cause)
        expect(e.name).to.eql("SomeName")
        expect(e.message).to.eql("something went wrong: underlying")
        expect(VError.info(e)).to.eql({ a: 1 })
        expect(VError.cause(e)).to.equal(cause)
    })

    it("should build a named error without info or cause", function () {
        const e = error("Bare", "no extras")
        expect(e.name).to.eql("Bare")
        expect(e.message).to.eql("no extras")
        expect(VError.cause(e)).to.eql(null)
    })

    it("should provide one factory per error kind", function () {
        const cases: [Error, string, RegExp][] = [
            [notFoundError("42"), NotFoundErrorName, /The entity 42 does not exist/],
            [validationError("bad"), ValidationErrorName, /Invalid parameters: bad/],
            [conflictError("42"), ConflictErrorName, /entity 42 failed because of a conflict/],
            [notImplementedError("read", "MyPipeline"), NotImplementedErrorName, /'read' can't be called .* MyPipeline/],
            [unauthorizedError("no token"), UnauthorizedErrorName, /Action not authorized : no token/],
            [forbiddenError("nope"), ForbiddenErrorName, /Action forbidden : nope/],
            [movedPermanentlyError("/elsewhere"), MovedPermanentlyErrorName, /moved permanently to '\/elsewhere'/],
        ]
        for (const [e, name, message] of cases) {
            expect(e.name).to.eql(name)
            expect(e.message).to.match(message)
        }
    })

    it("should carry info and cause through every factory", function () {
        const cause = new Error("root")
        const e = notFoundError("42", { id: "42" }, cause)
        expect(VError.info(e)).to.eql({ id: "42" })
        expect(VError.cause(e)).to.equal(cause)
    })
})
