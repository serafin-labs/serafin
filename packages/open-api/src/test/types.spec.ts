import { expect } from "chai"
import { OpenApiBuilder, type OpenAPIObject, type OperationObject, type ParameterObject, type SchemaObject } from "../index.js"

// These checks run at compile time, through `npm run typecheck`.
describe("types", function () {
    it("accepts extensions and rejects unknown fields", function () {
        const operation: OperationObject = { "x-internal": true, responses: { 200: { description: "ok" }, "4XX": { description: "client error" } } }
        // @ts-expect-error a field that is neither defined by the specification nor an extension
        const typo: OperationObject = { summmary: "typo" }
        // @ts-expect-error status codes start with 1 to 5
        const status: OperationObject = { responses: { 600: { description: "invalid" } } }
        expect([operation, typo, status]).to.have.length(3)
    })

    it("types parameters by location", function () {
        const path: ParameterObject = { in: "path", name: "id", required: true, style: "label" }
        // @ts-expect-error path parameters are required
        const optional: ParameterObject = { in: "path", name: "id" }
        // @ts-expect-error deepObject is a query style
        const header: ParameterObject = { in: "header", name: "h", style: "deepObject" }
        expect([path, optional, header]).to.have.length(3)
    })

    it("uses references as schemas", function () {
        const builder = OpenApiBuilder.create({ title: "t", version: "1" }).addComponent("schemas", "A", true)
        const schema: SchemaObject = { type: "array", items: builder.ref("schemas", "A") }
        expect(schema.items).to.eql({ $ref: "#/components/schemas/A" })
    })

    it("accepts schemas typed by interfaces, as the ones of @serafin/schema-builder", function () {
        interface JSONSchema {
            type?: "string" | "object" | "array"
            properties?: { [key: string]: JSONSchema | boolean }
            items?: JSONSchema | boolean
            discriminator?: { propertyName: string; mapping?: { [key: string]: string } }
        }
        const fromLibrary: JSONSchema = { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } }
        const schema: SchemaObject = fromLibrary
        expect(schema).to.equal(fromLibrary)
    })

    it("exposes a read-only document", function () {
        const document = OpenApiBuilder.create({ title: "t", version: "1" }).document
        // @ts-expect-error the document is frozen
        const assign = () => (document.info.title = "x")
        const copy: OpenAPIObject = structuredClone(document) as OpenAPIObject
        expect([assign, copy]).to.have.length(2)
    })
})
