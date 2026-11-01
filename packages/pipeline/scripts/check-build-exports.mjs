// Pre-publish smoke test: verifies the published package can be consumed through its
// `exports` map in BOTH module systems. It self-references the package by name so it
// goes through the exact conditional resolution (`require` -> CJS, `import` -> ESM) that
// real consumers hit, then checks a known export is present and functional at runtime.
//
// Run against the built `lib/` output (after `npm run build`), not the source.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { createRequire } from "node:module"
import path from "node:path"
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

/**
 * Compile a consumer against the emitted declarations.
 *
 * `tsc` is happy to *emit* a `.d.ts` it cannot read back: a type inferred through a stack of
 * homomorphic mapped types can be written out referring to an `infer` binding the emit did not
 * carry over. That produces a package whose runtime is fine and whose types do not compile, which
 * nothing else here would notice -- so type-check the built declarations as a consumer sees them.
 */
function assertDeclarationsCompile(label, entry) {
    const dir = mkdtempSync(path.join(tmpdir(), "serafin-dts-"))
    try {
        writeFileSync(
            path.join(dir, "consumer.ts"),
            [
                `import { SchemaBuilder as SB } from "@serafin/schema-builder"`,
                `import { MemoryPipeline, defaultSchemaBuilders, memorySchemaBuilders } from "${PKG}"`,
                `const model = SB.emptySchema({ title: "M" }).addString("id").addString("name")`,
                `type M = typeof model.T`,
                `export type Builders = ReturnType<typeof defaultSchemaBuilders<M>>`,
                `export type MemoryBuilders = ReturnType<typeof memorySchemaBuilders<M>>`,
                // every builder's `T`, so a declaration that cannot be read back fails here
                ...["createValues", "createOptions", "readQuery", "patchQuery", "patchValues", "deleteQuery", "context", "meta"].map(
                    (key) => `export type ${key}T = MemoryBuilders["${key}"]["T"]`,
                ),
                `export const pipeline = new MemoryPipeline(model)`,
                "",
            ].join("\n"),
        )
        writeFileSync(
            path.join(dir, "tsconfig.json"),
            JSON.stringify({
                compilerOptions: {
                    strict: true,
                    noEmit: true,
                    target: "esnext",
                    module: "esnext",
                    moduleResolution: "bundler",
                    types: [],
                    paths: {
                        [PKG]: [entry],
                        // resolved through the package's own `exports`, then swapped to the declarations next to it
                        "@serafin/schema-builder": [require.resolve("@serafin/schema-builder").replace(/\.js$/, ".d.ts")],
                    },
                },
                include: ["consumer.ts"],
            }),
        )
        execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--project", path.join(dir, "tsconfig.json")], {
            stdio: "pipe",
            encoding: "utf8",
        })
        console.log(`✓ ${label} declarations type-check for a consumer`)
    } catch (e) {
        const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim()
        throw new Error(`${label}: the built declarations do not compile\n${output || e.message}`)
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
}

assertDeclarationsCompile("esm", fileURLToPath(new URL("../lib/esm/index.d.ts", import.meta.url)))
assertDeclarationsCompile("cjs", fileURLToPath(new URL("../lib/cjs/index.d.ts", import.meta.url)))

console.log("\nBoth builds import, run and type-check correctly.")
