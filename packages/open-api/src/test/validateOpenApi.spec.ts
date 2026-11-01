import { expect } from "chai"
import { OpenApiValidationError, validateOpenApi, type OpenAPIObject } from "../index.js"

const info = { title: "Library", version: "1.0.0" }
const document = (fields: Partial<OpenAPIObject>): OpenAPIObject => ({ openapi: "3.2.0", info, paths: {}, ...fields })
const messages = (d: OpenAPIObject) => validateOpenApi(d).issues.map((i) => `${i.path} ${i.message}`)
const idParameter = { in: "path" as const, name: "id", required: true as const, schema: { type: "string" as const } }

describe("validateOpenApi", function () {
    it("accepts a valid document", function () {
        expect(validateOpenApi(document({}))).to.eql({ valid: true, issues: [] })
    })

    it("reports structural errors against the OpenAPI 3.2 schema", function () {
        expect(messages({ openapi: "3.2.0", paths: {} } as any)).to.include(" must have required property 'info'")
        expect(messages(document({ openapi: "3.1.0" }))).to.include('/openapi must match pattern "^3\\.2\\.[0-9]+(-.+)?$"')
        expect(messages(document({ components: { schemas: { "a b": {} } } }))).to.include('/components/schemas must match pattern "^[a-zA-Z0-9._-]+$"')
    })

    it("names the properties the schema does not allow", function () {
        expect(messages(document({ swagger: "2.0" } as any))).to.include(" must NOT have unevaluated properties: 'swagger'")
        expect(messages(document({ servers: [{ url: "/", extra: true }] } as any))).to.include("/servers/0 must NOT have unevaluated properties: 'extra'")
    })

    it("accepts documents with only components or webhooks", function () {
        expect(validateOpenApi({ openapi: "3.2.0", info, components: {} }).valid).to.be.true
        expect(validateOpenApi({ openapi: "3.2.0", info, webhooks: {} }).valid).to.be.true
    })

    it("checks media ranges", function () {
        const content = (mediaType: string) => document({ components: { requestBodies: { a: { content: { [mediaType]: {} } } } } })
        expect(validateOpenApi(content("text/*")).valid).to.be.true
        expect(messages(content("text"))).to.include('/components/requestBodies/a/content must match format "media-range"')
    })

    it("reports local references that do not resolve", function () {
        const d = document({
            components: {
                schemas: {
                    Book: { type: "object", properties: { author: { $ref: "#/components/schemas/Author" }, tags: { $ref: "#/components/schemas/Book" } } },
                    Remote: { $ref: "https://example.com/schema.json" },
                    Own: { $id: "https://example.com/own", $defs: { a: true }, properties: { a: { $ref: "#/$defs/a" }, b: { $ref: "#/$defs/missing" } } },
                },
            },
            tags: [{ name: "a" }],
        })
        expect(messages(d)).to.eql(["/components/schemas/Book/properties/author/$ref reference '#/components/schemas/Author' does not resolve"])
    })

    it("decodes references", function () {
        const d = document({
            paths: { "/a~b/{id}": { parameters: [idParameter], get: { responses: { 200: { description: "ok" } } } } },
            components: { schemas: { A: { $ref: "#/paths/~1a~0b~1%7Bid%7D/parameters/0/schema" }, Root: { properties: { self: { $ref: "#" } } } } },
        })
        expect(validateOpenApi(d).valid).to.be.true
    })

    it("reports duplicated operation ids, webhooks included", function () {
        const operation = { operationId: "same", responses: { 200: { description: "ok" } } }
        const d = document({ paths: { "/a": { get: operation, put: { responses: { 200: { description: "ok" } } } }, "/b": { get: operation } }, webhooks: { w: { post: operation } } })
        expect(messages(d)).to.eql([
            "/paths/~1b/get/operationId operationId 'same' is already used at /paths/~1a/get/operationId",
            "/webhooks/w/post/operationId operationId 'same' is already used at /paths/~1a/get/operationId",
        ])
    })

    it("reports equivalent templated paths", function () {
        const d = document({ paths: { "/a/{id}": {}, "/a/{key}": {}, "x-ignored": {} } as any })
        expect(messages(d)).to.eql(["/paths/~1a~1{key} path is equivalent to '/a/{id}'"])
    })

    it("checks path parameters against the path template", function () {
        const responses = { 200: { description: "ok" } }
        const d = document({
            paths: {
                "/a/{id}": { get: { responses } },
                "/b/{id}": { parameters: [idParameter], get: { responses }, additionalOperations: { COPY: { parameters: [{ $ref: "#/components/parameters/id" }], responses } } },
                "/c": { get: { parameters: [idParameter], responses } },
                "/d/{id}": { get: { parameters: [{ $ref: "#/components/parameters/missing" }, { $ref: "https://example.com/p" }], responses } },
                "/e/{id}": { parameters: [{ ...idParameter, name: "other" }], get: { parameters: [{ in: "query", name: "id", schema: true }, idParameter], responses } },
            },
            components: { parameters: { id: idParameter } },
        })
        expect(messages(d)).to.eql([
            "/paths/~1d~1{id}/get/parameters/0/$ref reference '#/components/parameters/missing' does not resolve",
            "/paths/~1a~1{id}/get path variable 'id' has no matching path parameter",
            "/paths/~1c/get path parameter 'id' does not appear in the path",
            "/paths/~1d~1{id}/get path variable 'id' has no matching path parameter",
            "/paths/~1e~1{id}/get path parameter 'other' does not appear in the path",
        ])
    })

    it("checks the nesting of tags", function () {
        const d = document({ tags: [{ name: "a" }, { name: "a" }, { name: "b", parent: "c" }, { name: "d", parent: "e" }, { name: "e", parent: "d" }] })
        expect(messages(d)).to.eql([
            "/tags/1 tag 'a' is declared more than once",
            "/tags/2 parent tag 'c' is not declared",
            "/tags/3 tag 'd' is nested in a cycle",
            "/tags/4 tag 'e' is nested in a cycle",
        ])
    })

    it("lists every issue in the error it throws", function () {
        const error = new OpenApiValidationError([{ path: "", message: "a" }, { path: "/b", message: "b" }])
        expect(error.name).to.eql("OpenApiValidationError")
        expect(error.message).to.eql("Invalid OpenAPI document:\n  /: a\n  /b: b")
    })
})
