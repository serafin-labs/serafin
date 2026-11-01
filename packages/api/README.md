<p align="center"><img src="https://serafin-labs.github.io/images/logo-serafin-with-text-1080.png" width="300"/></p>

# Serafin API

A RESTful, self-descriptive API on top of [Serafin pipelines](https://github.com/serafin-labs/pipeline): expose a pipeline, get its REST endpoints and their [OpenAPI 3.2](https://spec.openapis.org/oas/v3.2.html) documentation.

```
npm i @serafin/api express
```

```ts
import express from "express"
import { MemoryPipeline } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import { Api, RestTransport } from "@serafin/api"

const book = SchemaBuilder.emptySchema().addString("id").addString("title").addInteger("year", {}, false)

const app = express()
const api = new Api(app, { basePath: "/v1", openApi: { title: "Library", version: "1.0.0" } })
    .configure(new RestTransport({ context: (req) => ({ _user: req.get("X-User") }) }))
    .use(new MemoryPipeline(book), "book")

app.listen(3000)
```

`express` is a peer dependency: versions 4 and 5 are supported.

## Endpoints

For a pipeline exposed as `book`, depending on the actions the pipeline implements:

| Route | Action |
| --- | --- |
| `GET /v1/books` | Find the books matching the query string |
| `GET /v1/books/{id}` | Get a book, 404 if it does not exist |
| `POST /v1/books` | Create a book, or several from a list. A single created book is given a `Location` header |
| `PATCH /v1/books/{id}` | Patch a book with a JSON merge patch (`application/json` or `application/merge-patch+json`) |
| `PATCH /v1/books` | Patch the books matching the query string, when the patch query can select several |
| `DELETE /v1/books/{id}` | Delete a book |
| `DELETE /v1/books` | Delete the books matching the query string, when the delete query can select several |
| `GET /v1/openapi.json` | The OpenAPI document |

Responses are `{ data, meta }`. Other methods are answered with `405` and an `Allow` header, `OPTIONS` with the allowed methods. Restrict the exposed actions with `api.use(pipeline, "book", { actions: ["read"] })`.

## Query string

The query string holds the pipeline query (or the create options) and the context. It is parsed by the transport, whatever the `query parser` setting of the application:

- `id=1&id=2` and `id[]=1&id[]=2` are lists, a single value of a list property is a one element list,
- `sort[year]=-1` is an object (`deepObject` in the OpenAPI document),
- values are coerced to the type of their schema: `year=1974` is a number, `withCount=true` a boolean.

Unknown parameters are refused with a `400` rather than ignored, so a typo in a filter never widens a read, a patch or a delete. Clients that still send them can be served during a transition with the `unknownParameters: "ignore"` option, which drops them as earlier versions did and logs a warning for each request that sent some.

Context properties starting with `_` are internal: the client cannot set them and they are not documented. Provide them with the `context` option, which is merged over the context of the query string.

## Errors

Errors are JSON:

```json
{ "code": 400, "name": "BadRequest", "message": "Invalid parameters: data/year must be integer", "errors": [{ "path": "/year", "message": "must be integer" }] }
```

Pipeline errors are mapped to their status: validation `400`, unauthorized `401`, forbidden `403`, not found `404`, conflict `409`, moved permanently `301` with a `Location`, not implemented `501`. The transport answers `406` to clients that do not accept JSON, `415` to bodies that are not JSON and `413` to bodies over `bodyLimit`. Any other error is answered with a `500` carrying its message, and logged.

`code` is the HTTP status, as in earlier versions, and `name` the status in PascalCase. Change the body of error responses with `formatError`, for example to hide the details of server errors in production:

```ts
new RestTransport({
    formatError: (response) => (response.code >= 500 ? { ...response, message: "An unexpected error occurred" } : response),
})
```

## OpenAPI document

The document describes every route, with the schemas of the pipeline (`Book`, `BookCreateValues`, `BookPatchValues`, `BookReadResults`...), its query and context parameters, and the meta of each action, relations included. It is an [`OpenApiBuilder`](https://github.com/serafin-labs/open-api): decorate it at any time, it is served as it is when requested.

```ts
api.openApi = api.openApi
    .addComponent("securitySchemes", "bearer", { type: "http", scheme: "bearer" })
    .mapOperations((operation) => ({ ...operation, security: [{ bearer: [] }] }))
    .replaceOperation("/books", "get", (operation) => ({ ...operation, summary: "Search the catalog" }))
```

## Options

| Option | Default | |
| --- | --- | --- |
| `context(req)` | | The internal context of a request, such as the authenticated user. May be async |
| `isInternal(name)` | starts with `_` | Which context properties the client cannot set |
| `unknownParameters` | `"reject"` | `"ignore"` to drop the unknown query parameters, with a warning, rather than answer `400` |
| `onSuccess(req, res, data)` | | Called before a successful response is sent |
| `onError(req, res, error)` | | Called before an error response is sent |
| `formatError(response, error, req)` | | Changes the body of an error response |
| `logger` | `console` | Where unexpected errors and ignored parameters are logged, with `error` and `warn` |
| `bodyLimit` | `"1mb"` | The maximum size of a request body |
