<p align="center"><img src="https://raw.githubusercontent.com/serafin-labs/serafin/master/docs/public/logo.png" width="300"/></p>

# Serafin Open API

TypeScript definitions for [OpenAPI 3.2](https://spec.openapis.org/oas/v3.2.html), and an immutable builder to create and change OpenAPI documents safely.

```
npm i @serafin/open-api
```

📚 **Full documentation: [serafin-labs.github.io/serafin/open-api](https://serafin-labs.github.io/serafin/open-api/).**

## Types

Every object of the specification is typed: `OpenAPIObject`, `OperationObject`, `ParameterObject`, `SchemaObject`, and so on.

- Specification extensions are typed as `x-${string}` fields, so a typo in a regular field is still a compile error.
- Parameters are typed by location: a path parameter must be `required`, `deepObject` is only a query style.
- `SchemaObject` is JSON Schema 2020-12 with the OpenAPI vocabulary (`discriminator`, `xml`, `externalDocs`). The `JSONSchema` of `@serafin/schema-builder` is assignable to it.

## OpenApiBuilder

```ts
import { OpenApiBuilder } from "@serafin/open-api"

let builder = OpenApiBuilder.create({ title: "Library", version: "1.0.0" })
    .addServer({ url: "https://example.com/v1" })
    .addTag({ name: "books" })
    .addComponent("schemas", "Book", { type: "object", properties: { id: { type: "string" } }, required: ["id"] })
    .addComponent("securitySchemes", "bearer", { type: "http", scheme: "bearer" })

builder = builder
    .addOperation("/books/{id}", "get", {
        operationId: "getBook",
        tags: ["books"],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "A book", content: { "application/json": { schema: builder.ref("schemas", "Book") } } } },
    })
    .mapOperations((operation) => ({ ...operation, security: [{ bearer: [] }] }))

const document = builder.validate().document
```

The builder is immutable: every method returns a new builder, and the document it holds is frozen. Unchanged parts of the document are shared between builders, so keeping intermediate builders is cheap.

Every kind of element (servers, tags, paths, operations, webhooks, components) follows the same conventions:

| Method | Behavior |
| --- | --- |
| `add*` | Adds the element, fails if it already exists |
| `set*` | Adds the element, or overwrites it |
| `replace*` | Replaces the element, fails if it does not exist. Accepts a function of a mutable copy of the current value |
| `remove*` | Removes the element, fails if it does not exist |
| `get*`, `has*` | Read the element |

The builder keeps the document consistent and fails with an `OpenApiBuilderError` rather than producing a broken document:

- `ref(type, name)` only returns references to components that exist, and `removeComponent` refuses to remove a referenced component.
- Operation ids are unique, and equivalent templated paths (`/books/{id}` and `/books/{key}`) are refused.
- Renaming a tag renames it in every operation, removing it removes it from the operations, and tags cannot nest in a cycle.
- Security requirements can only use declared security schemes.
- Component names must match `^[a-zA-Z0-9._-]+$`.

`transform(fn)` is the escape hatch for anything else: it receives a mutable copy of the document.

## Validation

`builder.validate()` throws an `OpenApiValidationError` listing every issue, and `validateOpenApi(document)` returns them. A document is checked against the [official OpenAPI 3.2 JSON Schema](https://spec.openapis.org/oas/3.2/schema/2026-08-30), then against the rules the schema cannot express: local references resolve, operation ids are unique, path parameters match the path templates, templated paths are not equivalent, and tags do not nest in a cycle.
