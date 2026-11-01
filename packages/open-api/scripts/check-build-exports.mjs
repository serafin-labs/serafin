// Pre-publish smoke test, see scripts/check-exports.mjs at the root of the repository.
import assert from "node:assert/strict"
import { checkExports } from "../../../scripts/check-exports.mjs"

await checkExports(import.meta, {
    name: "@serafin/open-api",
    // build and validate a document, exercising the ajv interop
    usable(label, mod) {
        assert.equal(typeof mod.OpenApiBuilder, "function", `${label}: OpenApiBuilder export is missing`)
        assert.equal(typeof mod.validateOpenApi, "function", `${label}: validateOpenApi export is missing`)
        let builder = mod.OpenApiBuilder.create({ title: "smoke", version: "1" }).addComponent("schemas", "Item", { type: "object" })
        builder = builder.addOperation("/items", "get", { responses: { 200: { content: { "application/json": { schema: builder.ref("schemas", "Item") } } } } })
        builder.validate()
        assert.throws(() => mod.OpenApiBuilder.create({ title: "smoke", version: "1" }).validate(), mod.OpenApiValidationError, `${label}: validation did not reject an empty document`)
        assert.throws(() => builder.removeComponent("schemas", "Item"), mod.OpenApiBuilderError, `${label}: a referenced component was removed`)
    },
    consumer: [
        `import { OpenApiBuilder, type OperationObject, type SchemaObject } from "@serafin/open-api"`,
        `const item: SchemaObject = { type: "object", properties: { id: { type: "string" } } }`,
        `const builder = OpenApiBuilder.create({ title: "t", version: "1" }).addComponent("schemas", "Item", item)`,
        `const operation: OperationObject = { responses: { 200: { content: { "application/json": { schema: builder.ref("schemas", "Item") } } } } }`,
        `export const document = builder.addOperation("/items", "get", operation).mapOperations((o) => ({ ...o, deprecated: true })).validate().document`,
    ],
    summary: "import, run and type-check correctly",
})
