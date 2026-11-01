// Pre-publish smoke test: verifies the published package can be consumed through its
// `exports` map in BOTH module systems. It self-references the package by name so it
// goes through the exact conditional resolution (`require` -> CJS, `import` -> ESM) that
// real consumers hit, then serves a pipeline over HTTP and type-checks a consumer against
// the emitted declarations.
//
// Run against the built `lib/` output (after `npm run build`), not the source.
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PKG = "@serafin/api"
const require = createRequire(import.meta.url)

/**
 * Expose a pipeline and call it, exercising the express, qs, verror, pipeline and open-api interop of the build.
 */
async function assertUsable(label, mod, { express, MemoryPipeline, SchemaBuilder }) {
    for (const name of ["Api", "RestTransport", "documentPipeline"]) {
        assert.equal(typeof mod[name], "function", `${label}: ${name} export is missing`)
    }
    const model = SchemaBuilder.emptySchema().addString("id").addString("name").addArray("tags", SchemaBuilder.stringSchema(), {}, false)
    const pipeline = new MemoryPipeline(model, { initialData: [{ id: "1", name: "one", tags: ["a"] }] })

    const app = express()
    const api = new mod.Api(app, { basePath: "/api", openApi: { title: "smoke", version: "1" } }).configure(new mod.RestTransport()).use(pipeline, "item")
    api.openApi.validate()

    const server = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s))
    })
    try {
        const base = `http://127.0.0.1:${server.address().port}/api`
        const spec = await (await fetch(`${base}/openapi.json`)).json()
        assert.equal(spec.paths["/items/{id}"]?.get?.operationId, "getItem", `${label}: the document is missing the read endpoint`)

        const found = await fetch(`${base}/items?tags=a&sort[name]=1`, { headers: { Accept: "*/*" } })
        assert.equal(found.status, 200, `${label}: find failed`)
        assert.deepEqual((await found.json()).data, [{ id: "1", name: "one", tags: ["a"] }], `${label}: find returned unexpected data`)

        const created = await fetch(`${base}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "2", name: "two" }) })
        assert.equal(created.status, 201, `${label}: create failed`)
        assert.equal(created.headers.get("location"), "/api/items/2", `${label}: create returned an unexpected location`)

        const invalid = await fetch(`${base}/items?unknown=1`)
        assert.equal(invalid.status, 400, `${label}: an unknown parameter was accepted`)
        assert.deepEqual((await invalid.json()), { code: 400, name: "BadRequest", message: "Unknown query parameter: unknown" }, `${label}: unexpected error body`)
    } finally {
        await new Promise((resolve) => server.close(resolve))
    }
}

// CJS condition
const cjsPath = require.resolve(PKG)
assert.match(cjsPath, /[/\\]lib[/\\]cjs[/\\]/, `require() resolved to unexpected path: ${cjsPath}`)
await assertUsable("cjs (require)", require(PKG), { express: require("express"), ...require("@serafin/pipeline"), ...require("@serafin/schema-builder") })
console.log(`✓ cjs  require("${PKG}") -> ${cjsPath}`)

// ESM condition
const esmMod = await import(PKG)
const esmPath = fileURLToPath(import.meta.resolve(PKG))
assert.match(esmPath, /[/\\]lib[/\\]esm[/\\]/, `import() resolved to unexpected path: ${esmPath}`)
await assertUsable("esm (import)", esmMod, {
    express: (await import("express")).default,
    ...(await import("@serafin/pipeline")),
    ...(await import("@serafin/schema-builder")),
})
console.log(`✓ esm  import("${PKG}")  -> ${esmPath}`)

/**
 * Compile a consumer against the emitted declarations, as `tsc` can emit declarations it cannot read back.
 */
function assertDeclarationsCompile(label, entry) {
    const dir = mkdtempSync(path.join(tmpdir(), "serafin-api-dts-"))
    try {
        writeFileSync(
            path.join(dir, "consumer.ts"),
            [
                `import express from "express"`,
                `import { SchemaBuilder } from "@serafin/schema-builder"`,
                `import { MemoryPipeline } from "@serafin/pipeline"`,
                `import { Api, RestTransport, type ErrorResponse } from "${PKG}"`,
                `const pipeline = new MemoryPipeline(SchemaBuilder.emptySchema().addString("id").addString("name"))`,
                `const api = new Api(express(), { openApi: { title: "t", version: "1" } })`,
                `    .configure(new RestTransport({ context: (req) => ({ _user: req.get("X-User") }), unknownParameters: "ignore", formatError: (response, error, req) => response }))`,
                `    .use(pipeline, "item")`,
                `api.openApi = api.openApi.mapOperations((operation) => ({ ...operation, deprecated: true }))`,
                `export const error: ErrorResponse = { code: 400, name: "BadRequest", message: "m" }`,
                "",
            ].join("\n"),
        )
        const declarations = (pkg) => require.resolve(pkg).replace(/\.js$/, ".d.ts")
        writeFileSync(
            path.join(dir, "tsconfig.json"),
            JSON.stringify({
                compilerOptions: {
                    strict: true,
                    noEmit: true,
                    target: "esnext",
                    module: "esnext",
                    moduleResolution: "bundler",
                    esModuleInterop: true,
                    types: [],
                    typeRoots: [fileURLToPath(new URL("../node_modules/@types", import.meta.url))],
                    paths: {
                        [PKG]: [entry],
                        "@serafin/pipeline": [declarations("@serafin/pipeline")],
                        "@serafin/schema-builder": [declarations("@serafin/schema-builder")],
                        "@serafin/open-api": [declarations("@serafin/open-api")],
                        express: [fileURLToPath(new URL("../node_modules/@types/express/index.d.ts", import.meta.url))],
                    },
                },
                include: ["consumer.ts"],
            }),
        )
        execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--project", path.join(dir, "tsconfig.json")], { stdio: "pipe", encoding: "utf8" })
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

console.log("\nBoth builds import, serve requests and type-check correctly.")
