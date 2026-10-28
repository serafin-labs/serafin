# Actions & Schemas

A pipeline has four actions, and thirteen schema builders derived from the model to describe their
inputs and outputs. Each pipe may replace any of them.

```ts
create(resources: CV[], options?: CO, context?: CTX): Promise<ResultsInterface<M, META & CM>>
read(query: RQ, context?: CTX): Promise<ResultsInterface<M, META & RM>>
patch(query: PQ, values: PV, context?: CTX): Promise<ResultsInterface<M, META & PM>>
delete(query: DQ, context?: CTX): Promise<ResultsInterface<M, META & DM>>
```

A **query** selects resources or alters what an action does with them. **Values** are what to write.
**Options** are `create`'s query, since there is nothing to select. The **context** is about the
caller rather than the data — see [Context](./context). Each action strips `undefined` properties
from its inputs, validates them, and runs the pipe chain down to the implementation.

## The thirteen schema builders

| Builder         | Describes                         | Derived from the model as                               |
| --------------- | --------------------------------- | ------------------------------------------------------- |
| `model`         | one resource                      | given                                                   |
| `createValues`  | each entry `create` accepts       | `setOptionalProperties(["id"])`                         |
| `createOptions` | `create`'s options                | empty                                                   |
| `readQuery`     | `read`'s query                    | `transformPropertiesToArray().toOptionals()`            |
| `patchQuery`    | which resources `patch` selects   | `pickProperties(["id"]).transformPropertiesToArray()`   |
| `patchValues`   | what `patch` writes               | `omitProperties(["id"]).toNullable().toDeepOptionals()` |
| `deleteQuery`   | which resources `delete` selects  | `pickProperties(["id"]).transformPropertiesToArray()`   |
| `createMeta`, `readMeta`, `patchMeta`, `deleteMeta` | each action's own meta | empty   |
| `meta`          | meta shared by all four actions   | empty                                                   |
| `context`       | the context every action accepts  | empty                                                   |

Each is a JSON Schema at runtime and a type at compile time:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, defaultSchemaBuilders } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
const users = new MemoryPipeline(userSchema)
users.schemaBuilders.readQuery.schema // a JSON Schema document
type PatchValues = typeof users.schemaBuilders.patchValues.T // the matching type

// the derivation on its own; MemoryPipeline starts from it and merges its read options in
const builders = defaultSchemaBuilders(userSchema)
type CreateValues = typeof builders.createValues.T
//   ^?
```

::: info The model must be closed
`setOptionalProperties` only works on a simple object schema, so a model accepting additional
properties is refused. In exchange, a pipeline knows every property a resource may hold.
:::

## create

Takes an **array**, always; an empty one is rejected. Each entry is validated against `createValues`,
the model with `id` optional, so the pipeline can hand out ids:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
const { data } = await users.create([{ firstName: "Nico" }, { firstName: "Seb", id: "chosen" }])
data[0].id // generated
data[1].id // "chosen"
```

`options` starts empty; pipes add to it, and relations put their `with<Name>` options there.

## read

Every property of `readQuery` is **optional**, so `read({})` matches everything, and **accepts an
array**, meaning *any of these values*:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
await users.read({}) // everything
await users.read({ firstName: "Nico" }) // one value
await users.read({ firstName: ["Nico", "Seb"] }) // either value
```

::: warning An array means "any of", not "equals this array"
This diverges from mongodb on purpose: it lets relation resolution read a whole page in one call.
With `MemoryPipeline`, literal array equality is `{ $eq: [...] }` — see
[Query Operators](./query-operators).
:::

What else a read query accepts is up to the implementation. `MemoryPipeline` adds `skip`, `limit`,
`sort` and `withCount`, under the names a mongodb source uses.

## patch and delete

`patchQuery` and `deleteQuery` select by `id` — **required**, one or several — so neither action is a
bulk operation by accident. `delete` returns what it deleted, so a pipe above can see what was lost.

`patchValues` is every property except `id`, optional at every depth, and nullable. That is
[JSON merge patch](https://tools.ietf.org/html/rfc7396): **absent leaves alone, `null` deletes**.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), nickname: [SB.stringSchema(), undefined] },
)
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico", nickname: "nico" }] })
// ---cut---
await users.patch({ id: "1" }, { firstName: "Nicolas" }) // set it
await users.patch({ id: "1" }, { nickname: undefined }) // leave it alone
await users.patch({ id: "1" }, { nickname: null }) // clear it
await users.patch({ id: ["1", "2"] }, { firstName: "same" }) // several at once

const { data } = await users.delete({ id: "1" })
data[0].firstName // what was there a moment ago
```

`undefined` leaves a property alone because it is stripped before validation, as JSON would lose it —
see [Undefined properties](./context#undefined-properties).

## The schema, read out

The derived schemas are ordinary JSON Schema documents — what a transport generates its OpenAPI
operation from, or an MCP tool declares as its `inputSchema`, after every pipe:

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
    "title": "User",
    "type": "object",
    "properties": {
        "id": { "oneOf": [{ "type": "string" }, { "type": "array", "items": { "type": "string" } }] },
        "firstName": { "oneOf": [{ "type": "string" }, { "type": "array", "items": { "type": "string" } }] },
        "skip": { "description": "Offset of the first resource to return", "minimum": 0, "type": "integer" },
        "limit": { "description": "Number of resources to return", "minimum": 0, "type": "integer" },
        "withCount": { "description": "Indicate if the result should contain the count of all resources matching the query", "type": "boolean" },
        "sort": {
            "description": "Properties to sort on, 1 for ascending and -1 for descending",
            "type": "object",
            "additionalProperties": { "type": "number", "enum": [-1, 1] }
        }
    },
    "additionalProperties": false
}
```

`getCreateFunction()`, `getReadFunction()`, `getPatchFunction()` and `getDeleteFunction()` return one
action as a bound function, so a pipe can depend on one action of a pipeline without holding it.
