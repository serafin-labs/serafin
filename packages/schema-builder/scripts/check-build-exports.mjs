// Pre-publish smoke test, see scripts/check-exports.mjs at the root of the repository.
import assert from "node:assert/strict"
import { checkExports } from "../../../scripts/check-exports.mjs"

await checkExports(import.meta, {
    name: "@serafin/schema-builder",
    // instantiate a SchemaBuilder and run validation, exercising the ajv/ajv-formats interop
    usable(label, mod) {
        assert.equal(typeof mod.SchemaBuilder, "function", `${label}: SchemaBuilder export is missing`)
        const schema = mod.SchemaBuilder.emptySchema().addString("email", { format: "email" })
        schema.validate({ email: "a@b.com" })
        assert.throws(() => schema.validate({ email: "not-an-email" }), `${label}: format validation did not reject bad input`)
    },
    consumer: [
        `import { SchemaBuilder } from "@serafin/schema-builder"`,
        `const user = SchemaBuilder.emptySchema({ title: "User" }).addString("id").addString("email", { format: "email" }).addInteger("age", {}, false)`,
        `export type User = typeof user.T`,
        `export const id: User["id"] = "1"`,
        `export const patch = user.omitProperties(["id"]).toOptionals()`,
        `export type Patch = typeof patch.T`,
        `export const values: Patch = { age: 42 }`,
    ],
    summary: "import, run and type-check correctly",
})
