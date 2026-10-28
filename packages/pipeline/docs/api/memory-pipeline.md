# MemoryPipeline

```ts
class MemoryPipeline<M extends IdentityInterface> extends PipelineAbstract<M, ...>
constructor(model: SchemaBuilder<M>, options?: MemoryPipelineOptions<M>)
```

One type parameter, the model; every schema is derived from it by `memorySchemaBuilders`. The guide
is [In-memory Pipeline](/guide/memory-pipeline).

## `MemoryPipelineOptions`

Extends [`PipelineAbstractOptions`](./pipeline-abstract#pipelineabstractoptions).

| Option | Type | Default | Meaning |
| ------ | ---- | ------- | ------- |
| `initialData` | `M[]` | — | resources to start from; the array is copied |
| `clone` | `boolean` | `true` | deep-copy resources in and out of the store |
| `generateId` | `() => string` | `crypto.randomUUID()` | id for a resource created without one |
| `capabilities` | `readonly string[]` | `memoryCapabilities` | what it declares it understands |

## Store access

| Member | Meaning |
| ------ | ------- |
| `size` | number of resources held |
| `snapshot()` | every resource, in insertion order |
| `restore(resources)` | replace the contents, validating each resource against the model |
| `clear()` | empty the store |

## Read options

Merged into `readQuery` by `memorySchemaBuilders`, with `count` merged into `readMeta`.

| Property | Type | Meaning |
| -------- | ---- | ------- |
| `skip` | `integer >= 0` | offset of the first resource to return |
| `limit` | `integer >= 0` | how many to return |
| `withCount` | `boolean` | put the total number matching in `meta.count` |
| `sort` | `{ [path]: 1 \| -1 }` | properties to sort on, ascending or descending |

```ts twoslash
import { memoryCapabilities, memoryReadOptionsSchemaBuilder, memoryReadMetaSchemaBuilder, memorySchemaBuilders } from "@serafin/pipeline"
import { SchemaBuilder as SB } from "@serafin/schema-builder"
declare const userSchema: SB<{ id: string }>
// ---cut---
memoryReadOptionsSchemaBuilder.schema // the four read options
memoryReadMetaSchemaBuilder.schema // `count`
memorySchemaBuilders(userSchema) // the defaults, with those merged in
memoryCapabilities
//   ^?
```

`memoryCapabilities` is every entry of `queryOperators`, `logicalQueryOperators` and
`updateOperators`, plus `$each`, `dotted-paths`, the four read options and `count`.

## Errors

| Situation | Error |
| --------- | ----- |
| a query property the model does not declare | `SerafinSchemaValidationError` |
| an operator it does not implement | `SerafinSchemaValidationError` |
| a duplicate id on create | `SerafinConflictError` |
| a patch that would change an id | `SerafinSchemaValidationError` |
| a patched resource that no longer satisfies the model | `SerafinValidationError` |
