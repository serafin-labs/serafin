<p align="center"><img src="https://raw.githubusercontent.com/serafin-labs/serafin/master/docs/public/logo.png" width="200"/></p>

# Serafin MCP

Expose [Serafin pipelines](https://serafin-labs.github.io/serafin/pipeline/) to AI agents as [Model Context Protocol](https://modelcontextprotocol.io) tools: the schemas of the pipeline become the input and output schemas of the tools, and the agent gets the same validation, errors and context as the REST endpoints.

📚 **Documentation: [serafin-labs.github.io/serafin/mcp](https://serafin-labs.github.io/serafin/mcp/)**

```
npm i @serafin/mcp @serafin/api @serafin/pipeline @serafin/schema-builder @modelcontextprotocol/sdk express
```

```ts
import express from "express"
import { Api, RestTransport } from "@serafin/api"
import { McpTransport } from "@serafin/mcp"
import { MemoryPipeline } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"

const book = SchemaBuilder.emptySchema({ description: "A book of the library" }).addString("id").addString("title").addInteger("year", {}, false)

const app = express()
new Api(app, { basePath: "/v1", openApi: { title: "Library", version: "1.0.0" } })
    .configure(new RestTransport())
    .configure(new McpTransport({ context: (extra) => ({ _user: extra.authInfo?.clientId }) }))
    .use(new MemoryPipeline(book), "book")

app.listen(3000) // REST on /v1/books, MCP on /v1/mcp
```

The packages of the Api and the pipelines are peer dependencies, shared with the application, as is the MCP SDK.

## Tools

For a pipeline exposed as `book`, depending on the actions the pipeline implements:

| Tool                          | Action                                                                    | Annotations             |
| ----------------------------- | ------------------------------------------------------------------------- | ----------------------- |
| `find_books`                  | Find the books matching the query                                         | read-only               |
| `get_book`                    | Get a book by its id, or a `NotFound` error                               | read-only               |
| `create_books`                | Create books, one for each element of `values`                            |                         |
| `patch_book`                  | Change some properties of a book, selected by its id                      | destructive             |
| `delete_book`                 | Delete a book, selected by its id                                         | destructive, idempotent |
| `patch_books`, `delete_books` | Change or delete every book matching the query, with the `byQuery` option | destructive             |

Restrict what agents can do as for any other transport, with a pipe or with `api.use(pipeline, "book", { actions: ["read"] })`.

The arguments of a tool are the properties of the query of the action (or of the create options), the `values` of a create or a patch, and the public properties of the context. Their descriptions come from the schemas, as does the description of the model, which ends the description of every tool: describe the schemas for the agent. Unknown or missing arguments are refused, so a typo never widens a read, a patch or a delete.

Patching and deleting by query is off by default: an agent could change or delete every resource with an empty query. Turn it on with `byQuery: true`.

## Results and errors

A tool call answers the results of the pipeline, `{ data, meta }`, as structured content described by the output schema of the tool, and as JSON text for the clients that only read text.

Results can be long, and the context of an agent is not: results are left out, from the last one, until the response fits in `maxCharacters` (50,000 by default). The response then has a `truncated` property, `{ returned, total }`, and tells the agent to narrow its query.

Errors are tool results with `isError` set, holding the same `ErrorResponse` as the REST transport, so the agent can read what is wrong and correct its call:

```json
{ "code": 400, "name": "BadRequest", "message": "...", "errors": [{ "path": "/0/year", "message": "must be integer" }] }
```

Unexpected errors are logged and still carry their message. Hide it with `formatError`.

## Serving

The tools are served on the express application of the Api, on `/mcp` under its `basePath`, over [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#streamable-http) without session: every request is answered on its own, so the server scales like the REST endpoints. Protect it as the rest of the application, e.g. with the bearer auth middleware of the SDK, whose `req.auth` reaches the `context` option as `extra.authInfo`.

To serve the tools over another MCP transport, such as stdio for a local agent, connect a server of the transport to it:

```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

const mcp = new McpTransport({ path: false })
new Api(express(), { openApi: { title: "Library", version: "1.0.0" } }).configure(mcp).use(bookPipeline, "book")
await mcp.createServer().connect(new StdioServerTransport())
```

The server is named after the OpenAPI document of the Api, whose description is the instructions given to the agent.

## Options

| Option                         | Default                                 |                                                                                                           |
| ------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `path`                         | `"/mcp"`                                | Where the tools are served, relative to the `basePath` of the Api, or `false` to not serve them over HTTP |
| `context(extra)`               |                                         | The internal context of a tool call, such as the authenticated user. May be async                         |
| `isInternal(name)`             | starts with `_`                         | Which context properties the agent cannot set                                                             |
| `byQuery`                      | `false`                                 | Also expose the tools that patch or delete every resource matching a query                                |
| `maxCharacters`                | `50000`                                 | The maximum length of the results of a tool call, in characters of JSON. `Infinity` turns it off          |
| `instructions`                 | the description of the OpenAPI document | Instructions for the agent on how to use the server                                                       |
| `formatError(response, error)` |                                         | Changes the error returned to the agent                                                                   |
| `logger`                       | `console`                               | Where unexpected errors are logged                                                                        |
