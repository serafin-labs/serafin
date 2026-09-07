# MemoryPipeline

An in-memory pipeline: resources in a `Map`, mongodb-style query and update operators, sorting,
paging, and atomic writes.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
```

```ts
class MemoryPipeline<M extends IdentityInterface> extends PipelineAbstract<M, ...>
```

One type parameter: the model. Everything else is derived from it by `memorySchemaBuilders`. See
[In-memory Pipeline](/guide/memory-pipeline) for the guide.

## Constructor

```ts
constructor(model: SchemaBuilder<M>, options?: MemoryPipelineOptions<M>)
```

### `MemoryPipelineOptions`

Extends `PipelineAbstractOptions`, so `validationEnabled` and `name` apply too.

| Option | Type | Default | Meaning |
| ------ | ---- | ------- | ------- |
| `initialData` | `M[]` | — | resources to start from; copied, so the array is never written to |
| `clone` | `boolean` | `true` | copy resources in and out of the store |
| `generateId` | `() => string` | `crypto.randomUUID()` | id for a resource created without one |

`capabilities` defaults to `memoryCapabilities` and can be overridden like any other option.

::: info About `clone`
On by default, and it is what keeps a caller that mutates a resource it read from corrupting the
store. Turning it off makes reads cheap and the store's contents shared — sound only if everything
holding a resource treats it as immutable.
:::

## Store access

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
users.size // number of resources held
users.snapshot() // every resource, in insertion order
users.restore([{ id: "1", firstName: "Nico" }]) // replace the contents; each is validated
users.clear() // empty it
```

`restore` validates each resource against the model, so a fixture that has drifted from the schema
fails at setup rather than mid-test.

## Read options

`memorySchemaBuilders` merges these into `readQuery`, and `count` into `readMeta` — deliberately
under the names a mongodb source uses.

| Property | Type | Meaning |
| -------- | ---- | ------- |
| `skip` | `integer >= 0` | offset of the first resource to return |
| `limit` | `integer >= 0` | how many to return |
| `withCount` | `boolean` | put the total number matching in `meta.count` |
| `sort` | `{ [path]: 1 \| -1 }` | properties to sort on, ascending or descending |

`count` is the number of resources matching the query, not the number on the page.

```ts twoslash
import { memoryReadOptionsSchemaBuilder, memoryReadMetaSchemaBuilder, memorySchemaBuilders } from "@serafin/pipeline"
import { SchemaBuilder as SB } from "@serafin/schema-builder"
declare const userSchema: SB<{ id: string }>
// ---cut---
memoryReadOptionsSchemaBuilder.schema // the four read options, as JSON Schema
memoryReadMetaSchemaBuilder.schema // `count`
memorySchemaBuilders(userSchema) // the defaults, with those merged in
```

## `memoryCapabilities`

What `MemoryPipeline` declares it understands: every entry of `queryOperators`,
`logicalQueryOperators` and `updateOperators`, plus `$each`, `dotted-paths`, the four read options,
and `count`.

```ts twoslash
import { memoryCapabilities } from "@serafin/pipeline"

memoryCapabilities
//   ^?
```

A pipe whose `requires` names something outside that list is refused when it is attached. See
[Capabilities](/guide/capabilities).

## Implementation notes

**`_read`, `_patch` and `_delete` declare `SourceQuery`/`SourceValues`** rather than the schema types
— which is how a source states in the type that it accepts more than its schemas promise.
`_create` does not: insert documents carry no operators.

**Every action mutates the store synchronously**, so each one is atomic. A create assigns ids and
checks the whole batch for conflicts before writing any of it; a patch computes and validates every
patched resource before writing any of it.

**A read filtering on `id` alone is served from the `Map`** rather than by a scan — the shape relation
resolution uses for a whole page. Every other query is a full scan.

**The store is a `Map`, not an object.** Ids come from whoever writes to the store, and `__proto__`
as a key of a plain object is not a key at all.

## Errors

| Situation | Error |
| --------- | ----- |
| a query property the model does not declare | `SerafinSchemaValidationError` |
| an operator it does not implement | `SerafinSchemaValidationError` |
| a duplicate id on create | `SerafinConflictError` |
| a patch that would change an id | `SerafinSchemaValidationError` |
| a patched resource that no longer satisfies the model | `SerafinValidationError` |
