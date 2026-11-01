// Pre-publish smoke test: verifies the published package can be consumed through its
// `exports` map in BOTH module systems. It self-references the package by name so it
// goes through the exact conditional resolution (`require` -> CJS, `import` -> ESM) that
// real consumers hit, then builds and validates a document, exercising the ajv interop.
//
// Run against the built `lib/` output (after `npm run build`), not the source.
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const PKG = "@serafin/open-api"
const require = createRequire(import.meta.url)

function assertUsable(label, mod) {
    assert.equal(typeof mod.OpenApiBuilder, "function", `${label}: OpenApiBuilder export is missing`)
    assert.equal(typeof mod.validateOpenApi, "function", `${label}: validateOpenApi export is missing`)
    let builder = mod.OpenApiBuilder.create({ title: "smoke", version: "1" }).addComponent("schemas", "Item", { type: "object" })
    builder = builder.addOperation("/items", "get", { responses: { 200: { content: { "application/json": { schema: builder.ref("schemas", "Item") } } } } })
    builder.validate()
    assert.throws(() => mod.OpenApiBuilder.create({ title: "smoke", version: "1" }).validate(), mod.OpenApiValidationError, `${label}: validation did not reject an empty document`)
    assert.throws(() => builder.removeComponent("schemas", "Item"), mod.OpenApiBuilderError, `${label}: a referenced component was removed`)
}

const cjsPath = require.resolve(PKG)
assert.match(cjsPath, /[/\\]lib[/\\]cjs[/\\]/, `require() resolved to unexpected path: ${cjsPath}`)
assertUsable("cjs (require)", require(PKG))
console.log(`✓ cjs  require("${PKG}") -> ${cjsPath}`)

const esmMod = await import(PKG)
const esmPath = fileURLToPath(import.meta.resolve(PKG))
assert.match(esmPath, /[/\\]lib[/\\]esm[/\\]/, `import() resolved to unexpected path: ${esmPath}`)
assertUsable("esm (import)", esmMod)
console.log(`✓ esm  import("${PKG}")  -> ${esmPath}`)

console.log("\nBoth builds import and run correctly.")
