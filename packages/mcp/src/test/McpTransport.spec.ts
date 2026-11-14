import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { Api, HttpError, RestTransport } from "@serafin/api"
import { conflictError, defaultSchemaBuilders } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import { expect } from "chai"
import express from "express"
import type { AddressInfo } from "node:net"
import { McpTransport } from "../McpTransport.js"
import { call, connect, EchoPipeline, echoModel, echoSchemaBuilders, expressVersions, library, setup } from "./fixtures.js"

async function serveOnce(app: ReturnType<typeof express>) {
    const server = app.listen(0, "127.0.0.1")
    await new Promise((resolve) => server.once("listening", resolve))
    return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
}

describe("McpTransport", function () {
    describe("tools", function () {
        it("lists a tool for each action of a pipeline, by id for patch and delete", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const { tools } = await (await connect(transport)).listTools()
            expect(tools.map((t) => t.name)).to.eql(["find_books", "get_book", "create_books", "patch_book", "delete_book"])

            const find = tools[0]!
            expect(find.title).to.eql("Find books")
            expect(find.description).to.eql("Find the books matching the query.\n\nBook: A book of the library")
            expect(find.annotations).to.eql({ title: "Find books", openWorldHint: false, readOnlyHint: true })
            expect(find.inputSchema.additionalProperties).to.eql(false)
            expect(find.inputSchema.properties).to.include.keys("id", "title", "withAuthor")
            expect(find.inputSchema.required).to.eql([])
            expect(find.outputSchema!.required).to.eql(["data", "meta"])

            const get = tools[1]!
            expect(get.inputSchema.properties!.id).to.eql({ type: "string", description: "The id of the book" })
            expect(get.inputSchema.required).to.eql(["id"])

            const create = tools[2]!
            expect(create.inputSchema.required).to.eql(["values"])
            expect(create.annotations).to.include({ destructiveHint: false, idempotentHint: false })
            expect(tools[3]!.inputSchema.required).to.eql(["id", "values"])
            expect(tools[3]!.annotations).to.include({ destructiveHint: true, idempotentHint: false })
            expect(tools[4]!.annotations).to.include({ destructiveHint: true, idempotentHint: true })
        })

        it("adds the tools that patch and delete by query with the byQuery option", async function () {
            const { api, transport } = setup({ byQuery: true })
            api.use(library().books, "book").use(new EchoPipeline(echoSchemaBuilders()), "sheep", "sheep")
            const { tools } = await (await connect(transport)).listTools()
            expect(tools.map((t) => t.name)).to.include.members([
                "patch_books",
                "delete_books",
                "patch_many_sheep",
                "delete_many_sheep",
                "get_sheep",
                "find_sheep",
            ])
            expect(tools.find((t) => t.name === "delete_books")!.inputSchema.required).to.eql(["id"])
        })

        it("only lists the actions the pipeline exposes", async function () {
            const { api, transport } = setup({ byQuery: true })
            api.use(library().books, "book", { actions: ["read"] })
            const { tools } = await (await connect(transport)).listTools()
            expect(tools.map((t) => t.name)).to.eql(["find_books", "get_book"])
        })

        it("leaves out the tools by id when the query cannot select by id", async function () {
            const { api, transport } = setup({ byQuery: true })
            const noId = SchemaBuilder.emptySchema().addString("title", {}, false)
            api.use(new EchoPipeline(echoSchemaBuilders({ readQuery: noId, patchQuery: noId, deleteQuery: noId })), "book")
            const { tools } = await (await connect(transport)).listTools()
            expect(tools.map((t) => t.name)).to.eql(["find_books", "create_books", "patch_books", "delete_books"])
        })

        it("documents the public context, and accepts any schema as an argument", async function () {
            const { api, transport } = setup()
            const model = SchemaBuilder.emptySchema().addString("name")
            const readQuery = SchemaBuilder.fromJsonSchema({ type: "object", properties: { any: true, none: false }, additionalProperties: false } as any)
            api.use(new EchoPipeline({ ...echoSchemaBuilders(), model, readQuery }), "item")
            const { tools } = await (await connect(transport)).listTools()
            expect(tools[0]!.inputSchema.properties).to.eql({ any: {}, none: { not: {} }, lang: { type: "string" } })
            expect(tools.map((t) => t.name)).not.to.include("get_item")
        })

        it("gives the id the type of the model, or a string", async function () {
            const { api, transport } = setup()
            const model = SchemaBuilder.emptySchema().addInteger("id")
            api.use(new EchoPipeline({ ...defaultSchemaBuilders(model as any) }), "item")
            const { tools } = await (await connect(transport)).listTools()
            expect(tools.find((t) => t.name === "get_item")!.inputSchema.properties!.id).to.eql({ type: "integer", description: "The id of the item" })

            const untyped = setup()
            untyped.api.use(new EchoPipeline(echoSchemaBuilders({ model: SchemaBuilder.emptySchema().addAdditionalProperties() })), "item")
            const listed = await (await connect(untyped.transport)).listTools()
            expect(listed.tools.find((t) => t.name === "get_item")!.inputSchema.properties!.id).to.eql({ type: "string", description: "The id of the item" })
        })

        it("refuses arguments the agent could not tell apart", function () {
            const { api } = setup()
            const context = SchemaBuilder.emptySchema().addString("title", {}, false)
            expect(() =>
                api.use(new EchoPipeline(echoSchemaBuilders({ context, readQuery: echoSchemaBuilders().readQuery.addString("title", {}, false) })), "book"),
            ).to.throw("Cannot expose 'books' as tools: several arguments of find_books are named title")
            const values = SchemaBuilder.emptySchema().addString("values", {}, false)
            expect(() => setup().api.use(new EchoPipeline(echoSchemaBuilders({ context: values })), "book", { actions: ["create"] })).to.throw(
                "several arguments of create_books are named values",
            )
            const patchQuery = echoSchemaBuilders().patchQuery.addString("values", {}, false)
            expect(() => setup().api.use(new EchoPipeline(echoSchemaBuilders({ patchQuery })), "book", { actions: ["patch"] })).to.throw(
                "several arguments of patch_book are named values",
            )
        })

        it("refuses a pipeline through every transport when one of them refuses it", async function () {
            const { api, app } = setup()
            api.configure(new RestTransport())
            const patchQuery = echoSchemaBuilders().patchQuery.addString("values", {}, false)
            expect(() => api.use(new EchoPipeline(echoSchemaBuilders({ patchQuery })), "book")).to.throw("several arguments of patch_book")
            expect(api.pipelines).to.eql([])
            const { server, url } = await serveOnce(app)
            try {
                expect((await fetch(`${url}/v1/books`)).status).to.eql(404)
            } finally {
                server.close()
            }
        })

        it("names the tools on several resources apart when the names only differ by invalid characters", async function () {
            const { api, transport } = setup({ byQuery: true })
            api.use(new EchoPipeline(echoSchemaBuilders()), "sheep!", "sheep?")
            const { tools } = await (await connect(transport)).listTools()
            expect(tools.map((t) => t.name)).to.include.members(["delete_sheep_", "delete_many_sheep_", "patch_sheep_", "patch_many_sheep_"])
        })

        it("lets the internal context be chosen", async function () {
            const { api, transport } = setup({ isInternal: (name) => name === "lang" })
            api.use(new EchoPipeline(echoSchemaBuilders()), "item")
            const client = await connect(transport)
            const { tools } = await client.listTools()
            expect(tools[0]!.inputSchema.properties).to.have.keys("id", "name", "_user")
            expect((await call(client, "find_items", { lang: "en" })).json.message).to.eql("Unknown argument: lang")
        })

        it("lets pipes add properties to the meta of the results", async function () {
            const { api, transport } = setup()
            api.use(new EchoPipeline(echoSchemaBuilders(), () => ({ data: [], meta: { added: true } })), "item")
            const client = await connect(transport)
            const { tools } = await client.listTools()
            expect(tools[0]!.outputSchema!.properties!.meta).not.to.have.any.keys("additionalProperties", "unevaluatedProperties")
            expect((await call(client, "find_items")).result.structuredContent).to.eql({ data: [], meta: { added: true } })
        })

        it("refuses tools that already exist", function () {
            const { api } = setup()
            api.use(library().books, "book")
            expect(() => api.use(library().books, "book", "bookz")).to.throw(
                "Cannot expose 'bookz' as tools: the tools get_book, patch_book, delete_book already exist",
            )
        })

        it("names the server after the OpenAPI document", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const client = await connect(transport)
            expect(client.getServerVersion()).to.include({ name: "Library", version: "1.0.0" })
            expect(client.getInstructions()).to.eql("Books and their authors")
            const instructed = setup({ instructions: "Use find_books first" })
            expect((await connect(instructed.transport)).getInstructions()).to.eql("Use find_books first")
            const bare = new McpTransport()
            new Api(express(), { openApi: { title: "t", version: "1" } }).configure(bare)
            expect((await connect(bare)).getInstructions()).to.be.undefined
        })
    })

    describe("calls", function () {
        it("finds resources, as structured content and text", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const { result, json } = await call(await connect(transport), "find_books", { tags: ["classic"], withAuthor: true })
            expect(result.isError).to.be.undefined
            expect(json.data.map((b: any) => b.id)).to.eql(["2"])
            expect(json.meta.relations.author.data).to.eql({ a1: { id: "a1", name: "Ursula" } })
            expect(result.structuredContent).to.eql(json)
        })

        it("gets a resource by id, or answers not found", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const client = await connect(transport)
            expect((await call(client, "get_book", { id: "2" })).json.data[0].title).to.eql("The Lathe of Heaven")
            const missing = await call(client, "get_book", { id: "9" })
            expect(missing.result.isError).to.be.true
            expect(missing.json).to.eql({ code: 404, name: "NotFound", message: "The entity book:9 does not exist." })
        })

        it("creates resources", async function () {
            const { api, transport } = setup()
            const { books } = library()
            api.use(books, "book")
            const client = await connect(transport)
            const { json } = await call(client, "create_books", { values: [{ title: "Always Coming Home" }] })
            expect(json.data).to.eql([{ id: "b1", title: "Always Coming Home" }])
            expect((await books.read({ id: ["b1"] })).data).to.have.length(1)
            const invalid = await call(client, "create_books", { values: { title: "Not a list" } })
            expect(invalid.json).to.eql({ code: 400, name: "BadRequest", message: "values must be a list of books" })
        })

        it("explains validation errors value by value", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const { result, json } = await call(await connect(transport), "create_books", { values: [{ title: "x", year: "soon" }] })
            expect(result.isError).to.be.true
            expect(json.code).to.eql(400)
            expect(json.errors).to.eql([{ path: "/0/year", message: "must be integer" }])
        })

        it("patches and deletes a resource by id", async function () {
            const { api, transport } = setup()
            const { books } = library()
            api.use(books, "book")
            const client = await connect(transport)
            expect((await call(client, "patch_book", { id: "1", values: { year: 1975 } })).json.data[0].year).to.eql(1975)
            expect((await call(client, "patch_book", { id: "9", values: { year: 1975 } })).json.name).to.eql("NotFound")
            expect((await call(client, "delete_book", { id: "1" })).json.data[0].id).to.eql("1")
            expect((await call(client, "delete_book", { id: "1" })).json.name).to.eql("NotFound")
            expect((await books.read({})).data.map((b) => b.id)).to.eql(["2"])
        })

        it("patches and deletes every resource matching a query with the byQuery option", async function () {
            const { api, transport } = setup({ byQuery: true })
            const { books } = library()
            api.use(books, "book")
            const client = await connect(transport)
            expect((await call(client, "patch_books", { id: ["1", "2"], values: { tags: [] } })).json.data).to.have.length(2)
            expect((await call(client, "delete_books", { id: ["1", "2"] })).json.data).to.have.length(2)
            expect((await books.read({})).data).to.eql([])
        })

        it("refuses unknown and missing arguments, and lists of ids where a single one is expected", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const client = await connect(transport)
            expect((await call(client, "find_books", { titel: "x", yaer: 1 })).json).to.eql({
                code: 400,
                name: "BadRequest",
                message: "Unknown arguments: titel, yaer",
            })
            expect((await call(client, "find_books", { _user: "x" })).json.message).to.eql("Unknown argument: _user")
            expect((await call(client, "delete_book")).json.message).to.eql("Missing argument: id")
            expect((await call(client, "patch_book", { id: "1" })).json.message).to.eql("Missing argument: values")
            expect((await call(client, "delete_book", { id: ["1", "2"] })).json.message).to.eql("The id must be a single value")
            expect((await call(client, "find_books", { constructor: "x", toString: "y" })).json.message).to.eql("Unknown arguments: constructor, toString")
        })

        it("runs the tools in the context of the arguments, merged with the internal context", async function () {
            const { api, transport } = setup({ context: (extra) => ({ _user: "u1", lang: `${extra.requestId}` === "" ? "none" : "fr" }) })
            api.use(new EchoPipeline(echoSchemaBuilders()), "item")
            const client = await connect(transport)
            const { json } = await call(client, "find_items", { lang: "en", id: ["1"] })
            expect(json.data[0].args).to.eql([{ id: ["1"] }, { lang: "fr", _user: "u1" }])
            const created = await call(client, "create_items", { values: [{ name: "x" }], lang: "en" })
            expect(created.json.data[0].args).to.eql([[{ name: "x" }], {}, { lang: "fr", _user: "u1" }])
        })

        it("waits for the internal context, and answers its errors", async function () {
            const { api, transport } = setup({ context: async () => ({ _user: "u2" }) })
            api.use(new EchoPipeline(echoSchemaBuilders()), "item")
            expect((await call(await connect(transport), "find_items")).json.data[0].args[1]).to.eql({ _user: "u2" })

            const failing = setup({ context: () => Promise.reject(new HttpError(401, "Sign in first")) })
            failing.api.use(new EchoPipeline(echoSchemaBuilders()), "item")
            expect((await call(await connect(failing.transport), "find_items")).json).to.eql({ code: 401, name: "Unauthorized", message: "Sign in first" })
        })

        it("calls the tools without arguments", async function () {
            const { api, transport } = setup()
            api.use(new EchoPipeline(echoSchemaBuilders()), "item")
            const client = await connect(transport)
            const result = await client.request(
                { method: "tools/call", params: { name: "find_items" } },
                (await import("@modelcontextprotocol/sdk/types.js")).CallToolResultSchema,
            )
            expect(result.structuredContent).to.eql({ data: [{ id: "1", action: "read", args: [{}, {}] }], meta: {} })
        })

        it("answers an unknown tool with a protocol error", async function () {
            const { api, transport } = setup()
            api.use(library().books, "book")
            const client = await connect(transport)
            let error: unknown
            await client.callTool({ name: "drop_books" }).catch((e) => (error = e))
            expect((error as Error).message).to.include("Unknown tool: drop_books")
        })

        it("leaves out results to stay under maxCharacters", async function () {
            const titles = Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, text: "x".repeat(100) }))
            const { api, transport } = setup({ maxCharacters: 500 })
            api.use(new EchoPipeline(echoSchemaBuilders({ model: echoModel }), () => ({ data: titles, meta: {} })), "item")
            const { result, json } = await call(await connect(transport), "find_items")
            expect(json.data).to.have.length(3)
            expect(json.truncated).to.eql({ returned: 3, total: 10 })
            expect(JSON.stringify(json).length).to.be.at.most(500)
            expect(result.content[1]).to.eql({
                type: "text",
                text: "Only 3 of the 10 results are returned, to stay under 500 characters. Narrow the query to get the others.",
            })

            const tiny = setup({ maxCharacters: 10 })
            tiny.api.use(new EchoPipeline(echoSchemaBuilders({ model: echoModel }), () => ({ data: titles, meta: {} })), "item")
            expect((await call(await connect(tiny.transport), "find_items")).json).to.eql({
                data: [titles[0]],
                meta: {},
                truncated: { returned: 1, total: 10 },
            })

            const unlimited = setup({ maxCharacters: Infinity })
            unlimited.api.use(new EchoPipeline(echoSchemaBuilders({ model: echoModel }), () => ({ data: titles, meta: {} })), "item")
            expect((await call(await connect(unlimited.transport), "find_items")).json.data).to.have.length(10)
        })

        it("says that a write is done when its results are left out", async function () {
            const titles = Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, text: "x".repeat(100) }))
            const { api, transport } = setup({ maxCharacters: 500 })
            api.use(new EchoPipeline(echoSchemaBuilders({ model: echoModel }), () => ({ data: titles, meta: {} })), "item")
            const { result } = await call(await connect(transport), "delete_item", { id: "1" })
            expect(result.content[1]).to.eql({
                type: "text",
                text: "The 10 resources were deleted, but only 3 of them are returned, to stay under 500 characters.",
            })
        })

        it("refuses a maxCharacters that is not a positive number", function () {
            for (const maxCharacters of [0, -1, NaN]) {
                expect(() => new McpTransport({ maxCharacters })).to.throw(`maxCharacters must be a positive number, or Infinity, got ${maxCharacters}`)
            }
        })
    })

    describe("errors", function () {
        it("answers pipeline errors with their status", async function () {
            const { api, transport, logged } = setup()
            api.use(new EchoPipeline(echoSchemaBuilders(), () => Promise.reject(conflictError("taken"))), "item")
            const { result, json } = await call(await connect(transport), "find_items")
            expect(result.isError).to.be.true
            expect(json).to.eql({ code: 409, name: "Conflict", message: "The modifications to the entity taken failed because of a conflict." })
            expect(logged).to.eql([])
        })

        it("answers and logs unexpected errors", async function () {
            const { api, transport, logged } = setup()
            api.use(new EchoPipeline(echoSchemaBuilders(), () => Promise.reject(new Error("boom"))), "item")
            expect((await call(await connect(transport), "find_items")).json).to.eql({ code: 500, name: "InternalServerError", message: "boom" })
            expect(logged[0]![0]).to.eql("The tool find_items failed")
            expect(logged[0]![1]).to.include("Error: boom")
        })

        it("lets the errors be changed, and logs a failing formatError", async function () {
            const hidden = setup({ formatError: (response, error) => (response.code >= 500 ? { ...response, message: `hidden ${String(error)}` } : response) })
            hidden.api.use(new EchoPipeline(echoSchemaBuilders(), () => Promise.reject("boom")), "item")
            expect((await call(await connect(hidden.transport), "find_items")).json.message).to.eql("hidden boom")
            expect(hidden.logged[0]).to.eql(["The tool find_items failed", "boom"])

            const failing = setup({
                formatError: () => {
                    throw new Error("format")
                },
            })
            failing.api.use(library().books, "book")
            expect((await call(await connect(failing.transport), "get_book", { id: "9" })).json.name).to.eql("NotFound")
            expect(failing.logged[0]![0]).to.eql("The formatError option failed")
        })

        it("logs to the console by default", async function () {
            const transport = new McpTransport()
            new Api(express(), { openApi: { title: "t", version: "1" } })
                .configure(transport)
                .use(new EchoPipeline(echoSchemaBuilders(), () => Promise.reject(new Error("boom"))), "item")
            const original = console.error
            const logged: unknown[][] = []
            console.error = (...data: unknown[]) => logged.push(data)
            try {
                await call(await connect(transport), "find_items")
            } finally {
                console.error = original
            }
            expect(logged[0]![0]).to.eql("The tool find_items failed")
        })

        it("must be added to a single Api before use", function () {
            const transport = new McpTransport()
            expect(() => transport.use({ pipeline: library().books, name: "book", pluralName: "books" })).to.throw("added to an Api")
            expect(() => transport.createServer()).to.throw("added to an Api")
            const api = new Api(express(), { openApi: { title: "t", version: "1" } }).configure(transport)
            expect(() => api.configure(transport)).to.throw("already used by an Api")
        })
    })

    for (const { label, express } of expressVersions) {
        describe(`over HTTP (${label})`, function () {
            async function serve(app: ReturnType<typeof express>) {
                const server = app.listen(0, "127.0.0.1")
                await new Promise((resolve) => server.once("listening", resolve))
                return { server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }
            }
            // so a later test listening on the same port cannot be reached through a kept alive connection
            function close(server: ReturnType<ReturnType<typeof express>["listen"]>) {
                server.close()
                server.closeAllConnections()
            }

            it("serves the tools on the path of the Api, without session", async function () {
                const { api, app } = setup({}, express)
                api.use(library().books, "book")
                const { server, url } = await serve(app)
                try {
                    const client = new Client({ name: "test", version: "1.0.0" })
                    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/v1/mcp`)))
                    expect((await client.listTools()).tools).to.have.length(5)
                    const { json } = await call(client, "get_book", { id: "1" })
                    expect(json.data[0].title).to.eql("The Dispossessed")
                    await client.close()

                    const get = await fetch(`${url}/v1/mcp`, { headers: { Accept: "text/event-stream" } })
                    expect(get.status).to.eql(405)
                    expect(get.headers.get("allow")).to.eql("POST")
                    expect((await fetch(`${url}/v1/mcp`, { method: "DELETE" })).status).to.eql(405)
                } finally {
                    close(server)
                }
            })

            it("reads a body the application already parsed, on another path", async function () {
                const { api, app } = setup({ path: "/agents" }, express)
                app.use(express.json())
                api.use(library().books, "book")
                const { server, url } = await serve(app)
                try {
                    const client = new Client({ name: "test", version: "1.0.0" })
                    await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/v1/agents`)))
                    expect((await call(client, "find_books", { id: ["2"] })).json.data).to.have.length(1)
                    await client.close()
                } finally {
                    close(server)
                }
            })

            it("refuses web pages of origins that are not allowed", async function () {
                const { api, app } = setup({ allowedOrigins: ["https://agent.example.com"] }, express)
                api.use(library().books, "book")
                const { server, url } = await serve(app)
                const list = (origin: string) =>
                    fetch(`${url}/v1/mcp`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Origin: origin },
                        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
                    })
                try {
                    const refused = await list("http://evil.localhost:3000")
                    expect(refused.status).to.eql(403)
                    expect((await refused.json()).error.message).to.eql("The origin http://evil.localhost:3000 is not allowed")
                    expect((await list("https://agent.example.com")).status).to.eql(200)
                } finally {
                    close(server)
                }
            })

            it("is not served over HTTP when the path is false", async function () {
                const { api, app } = setup({ path: false }, express)
                api.use(library().books, "book")
                const { server, url } = await serve(app)
                try {
                    expect((await fetch(`${url}/v1/mcp`, { method: "POST" })).status).to.eql(404)
                } finally {
                    close(server)
                }
            })
        })
    }
})
