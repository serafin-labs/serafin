import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js"
import { Api } from "@serafin/api"
import { defaultSchemaBuilders, MemoryPipeline, PipelineAbstract, type SchemaBuildersInterface } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import express5 from "express"
import express4 from "express4"
import { McpTransport, type McpOptions } from "../McpTransport.js"

/**
 * The HTTP tests run against both major versions of express the package supports.
 */
export const expressVersions = [
    { label: "express 5", express: express5 as unknown as typeof express5 },
    { label: "express 4", express: express4 as unknown as typeof express5 },
]

export const bookModel = SchemaBuilder.emptySchema({ title: "Book", description: "A book of the library" })
    .addString("id")
    .addString("title", { description: "The title of the book" })
    .addInteger("year", {}, false)
    .addArray("tags", SchemaBuilder.stringSchema(), {}, false)
    .addString("authorId", {}, false)

export const authorModel = SchemaBuilder.emptySchema({ title: "Author" }).addString("id").addString("name")

/**
 * A library: books held in memory, related to their author.
 */
export function library() {
    const authors = new MemoryPipeline(authorModel, { initialData: [{ id: "a1", name: "Ursula" }] })
    let next = 1
    const books = new MemoryPipeline(bookModel, {
        generateId: () => `b${next++}`,
        initialData: [
            { id: "1", title: "The Dispossessed", year: 1974, tags: ["sf"], authorId: "a1" },
            { id: "2", title: "The Lathe of Heaven", year: 1971, tags: ["sf", "classic"], authorId: "a1" },
        ],
    }).addRelationWithOne("author", authors, { id: ":authorId" })
    return { authors, books }
}

/**
 * A pipeline that answers every action with what it received, to observe how tool calls are read.
 */
export class EchoPipeline extends PipelineAbstract<any> {
    constructor(
        schemaBuilders: SchemaBuildersInterface<any>,
        private readonly answer?: (action: string, args: unknown[]) => unknown,
    ) {
        super(schemaBuilders)
    }
    private respond(action: string, ...args: unknown[]): Promise<any> {
        return Promise.resolve(this.answer ? this.answer(action, args) : { data: [{ id: "1", action, args }], meta: {} })
    }
    protected _create(resources: any, options: any, context: any) {
        return this.respond("create", resources, options, context)
    }
    protected _read(query: any, context: any) {
        return this.respond("read", query, context)
    }
    protected _patch(query: any, values: any, context: any) {
        return this.respond("patch", query, values, context)
    }
    protected _delete(query: any, context: any) {
        return this.respond("delete", query, context)
    }
}

const echoQueryModel = SchemaBuilder.emptySchema().addString("id").addString("name", {}, false)

/** Open, as the echo pipeline answers with what it received. */
export const echoModel = echoQueryModel.addAdditionalProperties()

export function echoSchemaBuilders(overrides: Partial<SchemaBuildersInterface<any>> = {}) {
    return {
        ...defaultSchemaBuilders(echoQueryModel),
        model: echoModel,
        context: SchemaBuilder.emptySchema().addString("lang", {}, false).addString("_user", {}, false),
        ...overrides,
    } as SchemaBuildersInterface<any>
}

export interface Setup {
    api: Api
    transport: McpTransport
    logged: unknown[][]
    app: ReturnType<typeof express5>
}

/**
 * An Api exposing pipelines as MCP tools.
 */
export function setup(options: McpOptions = {}, express: typeof express5 = express5): Setup {
    const app = express()
    const logged: unknown[][] = []
    const transport = new McpTransport({ logger: { error: (...data) => logged.push(data) }, ...options })
    const api = new Api(app, { basePath: "/v1", openApi: { title: "Library", version: "1.0.0", description: "Books and their authors" } }).configure(transport)
    return { api, transport, logged, app }
}

/**
 * A client connected in memory to a new server of the transport.
 */
export async function connect(transport: McpTransport): Promise<Client> {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: "test", version: "1.0.0" })
    await Promise.all([transport.createServer().connect(serverSide), client.connect(clientSide)])
    return client
}

/**
 * Call a tool, and read the JSON of its first text content.
 */
export async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
    const result = (await client.callTool({ name, arguments: args })) as CallToolResult
    const text = result.content[0]
    return { result, json: text?.type === "text" ? JSON.parse(text.text) : undefined }
}
