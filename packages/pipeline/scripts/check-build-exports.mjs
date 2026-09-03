// Pre-publish smoke test: verifies the published package can be consumed through its
// `exports` map in BOTH module systems. It self-references the package by name so it
// goes through the exact conditional resolution (`require` -> CJS, `import` -> ESM) that
// real consumers hit, then checks a known export is present and functional at runtime.
//
// Run against the built `lib/` output (after `npm run build`), not the source.
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const PKG = "@serafin/pipeline"
const require = createRequire(import.meta.url)

/** Exercise real exports: pure logic (lodash interop) and the @serafin/schema-builder interop. */
function assertUsable(label, mod, SchemaBuilder) {
    assert.equal(typeof mod.PipelineAbstract, "function", `${label}: PipelineAbstract export is missing`)
    assert.equal(typeof mod.QueryTemplate, "function", `${label}: QueryTemplate export is missing`)
    assert.equal(mod.RelationType?.one, "one", `${label}: RelationType export is missing`)
    assert.deepEqual(mod.QueryTemplate.hydrate({ id: ":id", kind: "a" }, { id: "42" }), { id: "42", kind: "a" }, `${label}: QueryTemplate.hydrate misbehaved`)

    // builds the full set of schema builders from a model, exercising the schema-builder interop
    const schemas = mod.defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id").addString("method"))
    for (const key of mod.schemaBuildersInterfaceKeys) {
        assert.ok(schemas[key], `${label}: defaultSchemaBuilders did not produce '${key}'`)
    }
    schemas.model.validate({ id: "1", method: "get" })
    assert.throws(() => schemas.model.validate({ id: 1, method: "get" }), `${label}: model validation did not reject bad input`)
}

// CJS condition
const cjsPath = require.resolve(PKG)
assert.match(cjsPath, /[/\\]lib[/\\]cjs[/\\]/, `require() resolved to unexpected path: ${cjsPath}`)
assertUsable("cjs (require)", require(PKG), require("@serafin/schema-builder").SchemaBuilder)
console.log(`✓ cjs  require("${PKG}") -> ${cjsPath}`)

// ESM condition
const esmMod = await import(PKG)
const esmPath = fileURLToPath(import.meta.resolve(PKG))
assert.match(esmPath, /[/\\]lib[/\\]esm[/\\]/, `import() resolved to unexpected path: ${esmPath}`)
assertUsable("esm (import)", esmMod, (await import("@serafin/schema-builder")).SchemaBuilder)
console.log(`✓ esm  import("${PKG}")  -> ${esmPath}`)

console.log("\nBoth builds import and run correctly.")
