// Pre-publish smoke test, see scripts/check-exports.mjs at the root of the repository.
import assert from "node:assert/strict"
import { checkExports, interop } from "../../../scripts/check-exports.mjs"

await checkExports(import.meta, {
    name: "@serafin/mcp",
    // expose a pipeline and call it over HTTP with an MCP client, exercising the SDK, express, verror, pipeline and api interop
    async usable(label, mod, load) {
        for (const name of ["McpTransport", "pipelineTools"]) {
            assert.equal(typeof mod[name], "function", `${label}: ${name} export is missing`)
        }
        const express = interop(await load("express"))
        const { Api } = await load("@serafin/api")
        const { MemoryPipeline } = await load("@serafin/pipeline")
        const { SchemaBuilder } = await load("@serafin/schema-builder")
        const { Client } = await load("@modelcontextprotocol/sdk/client/index.js")
        const { StreamableHTTPClientTransport } = await load("@modelcontextprotocol/sdk/client/streamableHttp.js")
        const model = SchemaBuilder.emptySchema().addString("id").addString("name")
        const pipeline = new MemoryPipeline(model, { initialData: [{ id: "1", name: "one" }] })

        const app = express()
        new Api(app, { basePath: "/api", openApi: { title: "smoke", version: "1" } }).configure(new mod.McpTransport()).use(pipeline, "item")
        const server = await new Promise((resolve) => {
            const s = app.listen(0, "127.0.0.1", () => resolve(s))
        })
        const client = new Client({ name: "smoke", version: "1" })
        try {
            await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/api/mcp`)))
            const { tools } = await client.listTools()
            assert.deepEqual(
                tools.map((t) => t.name),
                ["find_items", "get_item", "create_items", "patch_item", "delete_item"],
                `${label}: unexpected tools`,
            )
            const found = await client.callTool({ name: "get_item", arguments: { id: "1" } })
            assert.deepEqual(found.structuredContent, { data: [{ id: "1", name: "one" }], meta: {} }, `${label}: get returned unexpected data`)
            const missing = await client.callTool({ name: "get_item", arguments: { id: "2" } })
            assert.equal(missing.isError, true, `${label}: a missing item was found`)
            assert.equal(JSON.parse(missing.content[0].text).name, "NotFound", `${label}: unexpected error`)
        } finally {
            await client.close()
            await new Promise((resolve) => server.close(resolve))
        }
    },
    consumer: [
        `import express from "express"`,
        `import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"`,
        `import { Api } from "@serafin/api"`,
        `import { MemoryPipeline } from "@serafin/pipeline"`,
        `import { SchemaBuilder } from "@serafin/schema-builder"`,
        `import { McpTransport, type McpOptions } from "@serafin/mcp"`,
        `const options: McpOptions = { context: (extra) => ({ _user: extra.authInfo?.clientId }), byQuery: true, maxCharacters: 10000 }`,
        `const mcp = new McpTransport({ ...options, formatError: (response) => response })`,
        `new Api(express(), { openApi: { title: "t", version: "1" } }).configure(mcp).use(new MemoryPipeline(SchemaBuilder.emptySchema().addString("id")), "item")`,
        `export const connected: Promise<void> = mcp.createServer().connect(new StdioServerTransport())`,
    ],
    compilerOptions: {
        esModuleInterop: true,
        // the declarations of the SDK use the fetch types of the DOM library
        lib: ["esnext", "dom"],
    },
    summary: "imports, answers an MCP client and type-checks correctly",
})
