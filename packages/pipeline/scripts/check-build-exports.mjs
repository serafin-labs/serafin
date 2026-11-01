// Pre-publish smoke test, see scripts/check-exports.mjs at the root of the repository.
import assert from "node:assert/strict"
import { checkExports } from "../../../scripts/check-exports.mjs"

await checkExports(import.meta, {
    name: "@serafin/pipeline",
    // exercise pure logic (lodash interop) and the @serafin/schema-builder interop
    async usable(label, mod, load) {
        const { SchemaBuilder } = await load("@serafin/schema-builder")
        assert.equal(typeof mod.PipelineAbstract, "function", `${label}: PipelineAbstract export is missing`)
        assert.equal(typeof mod.QueryTemplate, "function", `${label}: QueryTemplate export is missing`)
        assert.equal(mod.RelationType?.one, "one", `${label}: RelationType export is missing`)
        assert.deepEqual(mod.QueryTemplate.hydrate({ id: ":id", kind: "a" }, { id: "42" }), { id: "42", kind: "a" }, `${label}: QueryTemplate.hydrate misbehaved`)

        // builds the full set of schema builders from a model
        const schemas = mod.defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id").addString("method"))
        for (const key of mod.schemaBuildersInterfaceKeys) {
            assert.ok(schemas[key], `${label}: defaultSchemaBuilders did not produce '${key}'`)
        }
        schemas.model.validate({ id: "1", method: "get" })
        assert.throws(() => schemas.model.validate({ id: 1, method: "get" }), `${label}: model validation did not reject bad input`)
    },
    consumer: [
        `import { SchemaBuilder as SB } from "@serafin/schema-builder"`,
        `import { MemoryPipeline, defaultSchemaBuilders, memorySchemaBuilders } from "@serafin/pipeline"`,
        `const model = SB.emptySchema({ title: "M" }).addString("id").addString("name")`,
        `type M = typeof model.T`,
        `export type Builders = ReturnType<typeof defaultSchemaBuilders<M>>`,
        `export type MemoryBuilders = ReturnType<typeof memorySchemaBuilders<M>>`,
        // every builder's `T`, so a declaration that cannot be read back fails here
        ...["createValues", "createOptions", "readQuery", "patchQuery", "patchValues", "deleteQuery", "context", "meta"].map(
            (key) => `export type ${key}T = MemoryBuilders["${key}"]["T"]`,
        ),
        `export const pipeline = new MemoryPipeline(model)`,
    ],
    dependencies: ["@serafin/schema-builder"],
    summary: "import, run and type-check correctly",
})
