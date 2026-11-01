// Pre-publish smoke test, see scripts/check-exports.mjs at the root of the repository.
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { checkExports, interop } from "../../../scripts/check-exports.mjs"

const require = createRequire(import.meta.url)

await checkExports(import.meta, {
    name: "@serafin/api",
    // expose a pipeline and call it, exercising the express, qs, verror, pipeline and open-api interop
    async usable(label, mod, load) {
        for (const name of ["Api", "RestTransport", "documentPipeline"]) {
            assert.equal(typeof mod[name], "function", `${label}: ${name} export is missing`)
        }
        const express = interop(await load("express"))
        const { MemoryPipeline } = await load("@serafin/pipeline")
        const { SchemaBuilder } = await load("@serafin/schema-builder")
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
            assert.deepEqual(await invalid.json(), { code: 400, name: "BadRequest", message: "Unknown query parameter: unknown" }, `${label}: unexpected error body`)
        } finally {
            await new Promise((resolve) => server.close(resolve))
        }
    },
    consumer: [
        `import express from "express"`,
        `import { SchemaBuilder } from "@serafin/schema-builder"`,
        `import { MemoryPipeline } from "@serafin/pipeline"`,
        `import { Api, RestTransport, type ErrorResponse } from "@serafin/api"`,
        `const pipeline = new MemoryPipeline(SchemaBuilder.emptySchema().addString("id").addString("name"))`,
        `const api = new Api(express(), { openApi: { title: "t", version: "1" } })`,
        `    .configure(new RestTransport({ context: (req) => ({ _user: req.get("X-User") }), unknownParameters: "ignore", formatError: (response, error, req) => response }))`,
        `    .use(pipeline, "item")`,
        `api.openApi = api.openApi.mapOperations((operation) => ({ ...operation, deprecated: true }))`,
        `export const error: ErrorResponse = { code: 400, name: "BadRequest", message: "m" }`,
    ],
    dependencies: ["@serafin/pipeline", "@serafin/schema-builder", "@serafin/open-api"],
    compilerOptions: {
        esModuleInterop: true,
        typeRoots: [fileURLToPath(new URL("../node_modules/@types", import.meta.url))],
        paths: { express: [require.resolve("@types/express/index.d.ts")] },
    },
    summary: "import, serve requests and type-check correctly",
})
