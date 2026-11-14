import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
    type CallToolResult,
    type ServerNotification,
    type ServerRequest,
} from "@modelcontextprotocol/sdk/types.js"
import { errorResponse, type Api, type ErrorResponse, type ExposedPipeline, type TransportInterface } from "@serafin/api"
import type { Request, RequestHandler, Response } from "express"
import VError from "verror"
import { pipelineTools, type PipelineTool, type ToolResults } from "./tools.js"

/**
 * What the MCP server knows about a tool call: the authenticated client in `authInfo`, the HTTP headers in `requestInfo`...
 */
export type McpRequestExtra = RequestHandlerExtra<ServerRequest, ServerNotification>

export interface McpOptions {
    /**
     * Where the MCP endpoint is served, relative to the `basePath` of the Api, or `false` to not serve it over HTTP,
     * e.g. to connect `createServer()` to a stdio transport instead.
     * @default "/mcp"
     */
    path?: string | false
    /**
     * The internal context the tools run in, such as the authenticated user. It is merged over the context arguments
     * of the agent: the properties it sets override theirs, but the agent still sets the ones it leaves out, unless
     * they are internal (see `isInternal`).
     */
    context?: (extra: McpRequestExtra) => Record<string, unknown> | Promise<Record<string, unknown>>
    /**
     * Whether a context property is internal: the agent cannot set it, and it is not part of the tools.
     * @default names starting with `_`
     */
    isInternal?: (name: string) => boolean
    /**
     * Also expose the tools that patch or delete every resource matching a query, rather than a single resource
     * selected by its id. Off by default: an agent could change or delete every resource with an empty query.
     * @default false
     */
    byQuery?: boolean
    /**
     * The maximum length of the results of a tool call, in characters of JSON. Results are left out, from the last one,
     * until the response fits, and the response says how many were returned. The meta and the first result are always
     * returned, however long, so that any resource can be read. `Infinity` turns the limit off.
     * @default 50000
     */
    maxCharacters?: number
    /**
     * The origins of the web pages allowed to call the tools over HTTP, such as `https://agent.example.com`.
     * Browsers send the origin of the page with every request, and requests from any other origin are refused,
     * so that a web page cannot call the tools, e.g. of a server on localhost through DNS rebinding.
     * Agents that are not browsers send no origin, and are always allowed.
     * @default [] no web page
     */
    allowedOrigins?: string[]
    /**
     * Instructions for the agent on how to use the server.
     * @default the description of the OpenAPI document of the Api
     */
    instructions?: string
    /**
     * Change the error returned to the agent, e.g. to hide the message of server errors.
     * Its `code` is the HTTP status the error would have over REST.
     */
    formatError?: (response: ErrorResponse, error: unknown) => ErrorResponse
    /**
     * Where unexpected errors are logged.
     * @default console
     */
    logger?: { error(...data: unknown[]): void }
}

/**
 * Exposes pipelines as Model Context Protocol tools, so AI agents can use them.
 *
 * For a `book` pipeline exposed as `books`, depending on the actions the pipeline implements:
 * - `find_books` finds the books matching a query,
 * - `get_book` gets a book by its id,
 * - `create_books` creates books,
 * - `patch_book` changes a book,
 * - `delete_book` deletes a book,
 * - `patch_books` and `delete_books` change and delete every book matching a query, with the `byQuery` option.
 *
 * The tools are served over Streamable HTTP, without session, on the express application of the Api.
 * Tool calls answer `{ data, meta }`, or an error result holding an `ErrorResponse`, as the REST transport does.
 */
export class McpTransport implements TransportInterface {
    private api: Api | undefined
    private readonly tools = new Map<string, PipelineTool>()
    private readonly isInternal: (name: string) => boolean
    private readonly maxCharacters: number

    constructor(private readonly options: McpOptions = {}) {
        this.isInternal = options.isInternal ?? ((name) => name.startsWith("_"))
        this.maxCharacters = options.maxCharacters ?? 50000
        if (!(this.maxCharacters > 0)) {
            throw new Error(`maxCharacters must be a positive number, or Infinity, got ${options.maxCharacters}`)
        }
    }

    init(api: Api) {
        if (this.api) {
            throw new Error("The transport is already used by an Api")
        }
        this.api = api
        const path = this.options.path ?? "/mcp"
        if (path !== false) {
            const allowedOrigins = new Set(this.options.allowedOrigins ?? [])
            const refuse = (res: Response, status: number, message: string) =>
                res.status(status).json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null })
            const handler: RequestHandler = (req, res, next) => {
                const { origin } = req.headers
                if (origin !== undefined && !allowedOrigins.has(origin)) {
                    refuse(res, 403, `The origin ${origin} is not allowed`)
                    return
                }
                this.handle(req, res).catch(next)
            }
            const notAllowed: RequestHandler = (req, res) => {
                refuse(res.set("Allow", "POST"), 405, `${req.method} is not allowed, the server is stateless: use POST`)
            }
            api.application.post(`${api.basePath}${path}`, handler)
            api.application.all(`${api.basePath}${path}`, notAllowed)
        }
    }

    /**
     * Refuse a pipeline whose tools cannot be built, or are named as the tools of another pipeline.
     */
    validate(exposed: ExposedPipeline) {
        this.toolsOf(exposed)
    }

    use(exposed: ExposedPipeline) {
        this.toolsOf(exposed).forEach((tool) => this.tools.set(tool.tool.name, tool))
    }

    private toolsOf(exposed: ExposedPipeline): PipelineTool[] {
        if (!this.api) {
            throw new Error("The transport must be added to an Api with `api.configure` before exposing pipelines")
        }
        const tools = pipelineTools(exposed, { isInternal: this.isInternal, byQuery: this.options.byQuery ?? false })
        const taken = tools.filter(({ tool }) => this.tools.has(tool.name)).map(({ tool }) => tool.name)
        if (taken.length > 0) {
            throw new Error(`Cannot expose '${exposed.pluralName}' as tools: the tools ${taken.join(", ")} already exist`)
        }
        return tools
    }

    /**
     * A new MCP server holding the tools of the pipelines, to connect to any MCP transport, such as stdio:
     *
     * ```ts
     * await mcp.createServer().connect(new StdioServerTransport())
     * ```
     */
    createServer(): Server {
        if (!this.api) {
            throw new Error("The transport must be added to an Api with `api.configure` before creating a server")
        }
        const { info } = this.api.openApi.document
        const instructions = this.options.instructions ?? info.description
        const server = new Server(
            { name: info.title, version: info.version },
            { capabilities: { tools: {} }, ...(instructions !== undefined ? { instructions } : {}) },
        )
        server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: [...this.tools.values()].map(({ tool }) => tool) }))
        server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
            const tool = this.tools.get(request.params.name)
            if (!tool) {
                throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${request.params.name}`)
            }
            try {
                const internal = this.options.context ? await this.options.context(extra) : {}
                return this.result(tool, await tool.call(request.params.arguments ?? {}, internal))
            } catch (error) {
                return this.error(request.params.name, error)
            }
        })
        return server
    }

    /**
     * Answer a request of the Streamable HTTP transport, with a server of its own as there is no session.
     */
    private async handle(req: Request, res: Response) {
        const server = this.createServer()
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
        res.on("close", () => {
            void server.close()
        })
        await server.connect(transport)
        // the body is read by the transport, unless the application already parsed it
        await transport.handleRequest(req, res, req.body)
    }

    /**
     * The results as structured content, and as text for the clients that only read text.
     * Results are left out, from the last one, until the response fits in `maxCharacters`, but for the first one.
     */
    private result({ action }: PipelineTool, { data, meta }: ToolResults): CallToolResult {
        const max = this.maxCharacters
        // room for the `truncated` property
        let length = JSON.stringify({ data: [], meta, truncated: { returned: data.length, total: data.length } }).length
        let returned = 0
        while (returned < data.length) {
            length += JSON.stringify(data[returned]).length + 1
            if (length > max && returned > 0) {
                break
            }
            returned++
        }
        const content = returned === data.length ? { data, meta } : { data: data.slice(0, returned), meta, truncated: { returned, total: data.length } }
        const text = [{ type: "text" as const, text: JSON.stringify(content) }]
        if (returned < data.length) {
            const done = { create: "created", patch: "changed", delete: "deleted" }
            text.push({
                type: "text",
                text:
                    action === "read"
                        ? `Only ${returned} of the ${data.length} results are returned, to stay under ${max} characters. Narrow the query to get the others.`
                        : `The ${data.length} resources were ${done[action]}, but only ${returned} of them are returned, to stay under ${max} characters.`,
            })
        }
        return { structuredContent: content, content: text }
    }

    private error(tool: string, error: unknown): CallToolResult {
        const { response, unexpected } = errorResponse(error)
        if (unexpected) {
            this.log(`The tool ${tool} failed`, error)
        }
        let body = response
        try {
            body = this.options.formatError?.(response, error) ?? response
        } catch (formatError) {
            this.log("The formatError option failed", formatError)
        }
        return { isError: true, content: [{ type: "text", text: JSON.stringify(body) }] }
    }

    private log(message: string, error: unknown) {
        this.logger.error(message, error instanceof Error ? VError.fullStack(error) : error)
    }

    private get logger() {
        return this.options.logger ?? console
    }
}
