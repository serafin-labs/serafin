# Schema Builders

A pipeline carries thirteen [`SchemaBuilder`](https://serafin-labs.github.io/schema-builder/)s — one
for the model, and one for every input and output of the four actions. Together they are the
pipeline's interface, in both senses: a JSON Schema you can publish, and a TypeScript type that
checks your calls.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
const users = new MemoryPipeline(userSchema)

users.schemaBuilders.readQuery.schema // a JSON Schema document, at runtime
type ReadQuery = typeof users.schemaBuilders.readQuery.T // the matching type, at compile time
```

## The thirteen

| Builder         | What it describes                     | Derived from the model as                                       |
| --------------- | ------------------------------------- | --------------------------------------------------------------- |
| `model`         | one resource                          | given                                                            |
| `createValues`  | each entry `create` accepts           | `setOptionalProperties(["id"])`                                  |
| `createOptions` | `create`'s second argument            | empty                                                            |
| `readQuery`     | `read`'s filter                       | `transformPropertiesToArray().toOptionals()`                     |
| `patchQuery`    | which resources `patch` selects       | `pickProperties(["id"]).transformPropertiesToArray()`            |
| `patchValues`   | what `patch` writes                   | `omitProperties(["id"]).toNullable().toDeepOptionals()`          |
| `deleteQuery`   | which resources `delete` selects      | `pickProperties(["id"]).transformPropertiesToArray()`            |
| `createMeta`    | `create`'s meta                       | empty                                                            |
| `readMeta`      | `read`'s meta                         | empty                                                            |
| `patchMeta`     | `patch`'s meta                        | empty                                                            |
| `deleteMeta`    | `delete`'s meta                       | empty                                                            |
| `context`       | the context every action accepts      | empty                                                            |
| `meta`          | meta shared by all four actions       | empty                                                            |

`defaultSchemaBuilders(model)` is the function that produces them, and a pipeline implementation is
free to start from something else — `MemoryPipeline` starts from the defaults and merges its read
options in.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { defaultSchemaBuilders } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const builders = defaultSchemaBuilders(userSchema)

type CreateValues = typeof builders.createValues.T
//   ^?
```

::: info The model must be closed
`defaultSchemaBuilders` uses `setOptionalProperties`, which only works on a simple object schema.
A model that accepts additional properties is refused — which is also why a pipeline can rely on
knowing every property a resource may hold.
:::

## Why derived and not declared

Each derivation is a statement about the action, and it holds for any model:

- `id` is optional on **create** because the pipeline may generate it.
- **read** is all-optional because a filter is a narrowing, and `read({})` has to mean everything.
- **read** takes arrays because "any of these" is the query shape relations need.
- **patch** and **delete** select on `id` because they are not bulk operations by accident.
- **patch** values are deeply optional and nullable because that is exactly
  [JSON merge patch](https://tools.ietf.org/html/rfc7396): absent leaves alone, `null` deletes.

Write the model once and all seven follow. Change the model and they follow again.

## Two kinds of meta

`readMeta`, `createMeta`, `patchMeta` and `deleteMeta` are per-action. `meta` is shared by all four:
what an action returns is typed as `META & RM`, so anything cross-cutting is declared once instead of
four times.

Relations use the shared one — they contribute to every action's meta — under the reserved `relations`
key. Pipes with something to say about one action only should use that action's own builder.

## How a pipe changes them

A pipe receives all thirteen and returns the ones it changed. Everything else is carried forward:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
// ---cut---
const Paged = (p: Builders) => {
    const readQuery = p.readQuery.addInteger("page", { minimum: 1 }, false)
    const readMeta = p.readMeta.addInteger("pages", {}, false)
    return {
        readQuery,
        readMeta,
        read: async (next: PipeReadNext<User, Builders["readQuery"]["T"], Builders["readMeta"]["T"]>, query: typeof readQuery.T, context: any) => {
            const { page, ...rest } = query
            const result = await next({ ...rest, skip: ((page ?? 1) - 1) * 20, limit: 20, withCount: true }, context)
            return { ...result, meta: { ...result.meta, pages: Math.ceil((result.meta.count ?? 0) / 20) } }
        },
    }
}

const users = new MemoryPipeline(userSchema).pipe(Paged)

// `page` is on the query now; `skip` and `limit` still are, since the pipe only added to the schema
const result = await users.read({ page: 2 })
result.meta.pages
//           ^?
```

Note the two types in play. `next` is typed with the schemas as they were **below** the pipe, and the
pipe's own `query` parameter with the schema it just produced. Translating between the two is the
pipe's job — that is what a pipe *is*.

## Reading the schema out

The schemas are ordinary JSON Schema documents, which is the point:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
JSON.stringify(users.schemaBuilders.readQuery.schema, null, 2)
```

```json
{
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "id": { "oneOf": [{ "type": "string" }, { "type": "array", "items": { "type": "string" } }] },
        "firstName": { "oneOf": [{ "type": "string" }, { "type": "array", "items": { "type": "string" } }] },
        "skip": { "type": "integer", "minimum": 0, "description": "Offset of the first resource to return" },
        "limit": { "type": "integer", "minimum": 0, "description": "Number of resources to return" },
        "withCount": { "type": "boolean", "description": "Indicate if the result should contain the count of all resources matching the query" },
        "sort": { "type": "object", "additionalProperties": { "enum": [-1, 1] }, "description": "Properties to sort on, 1 for ascending and -1 for descending" }
    }
}
```

That is what a transport generates its OpenAPI operation from, and what an MCP tool declares as its
`inputSchema` — after every pipe, so it describes what the pipeline really accepts.

## What's next

- [Results & Meta](./results) — the output side
- [Writing a Pipe](./writing-a-pipe) — changing these in anger
