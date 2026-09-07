# API Reference

Everything `@serafin/pipeline` exports, grouped by what it is for. The pages that follow go into
detail; this is the map.

## Pipelines

| Export | What it is |
| ------ | ---------- |
| [`PipelineAbstract`](./pipeline-abstract) | the base class every pipeline extends |
| [`MemoryPipeline`](./memory-pipeline) | an in-memory implementation, with mongodb-style operators |
| `ForkedPipeline` | delegates every action to another pipeline, with a retitled model |
| `PipelineInterface` | the four actions plus `schemaBuilders`, as an interface |
| `ReadOnlyPipelineInterface` | just `read` and `schemaBuilders` — what a relation target must be |
| `CreateOnlyPipelineInterface`, `PatchOnlyPipelineInterface`, `DeleteOnlyPipelineInterface` | the same, per action |
| `PipelineCreateFunction`, `PipelineReadFunction`, `PipelinePatchFunction`, `PipelineDeleteFunction` | the type of one extracted action |
| `pipelineMethods`, `PipelineMethods` | `["create", "read", "patch", "delete"]`, and its union type |

## Schemas and models

| Export | What it is |
| ------ | ---------- |
| `SchemaBuildersInterface` | the thirteen builders a pipeline carries |
| `defaultSchemaBuilders` | derives all thirteen from a model |
| `schemaBuildersInterfaceKeys` | their names, as a tuple |
| `IdentityInterface` | `{ id: string }` — all the library assumes of a model |
| `ResultsInterface` | `{ data, meta }` — what every action returns |

See [Schema Builders](/guide/schema-builders).

## Pipes

| Export | What it is |
| ------ | ---------- |
| [`PipePropsInterface`](./pipe) | the thirteen builders, as a pipe receives them |
| `PipeResultsInterface` | what a pipe may return |
| `PipeCapabilitiesInterface` | `requires` and `provides` |
| `PipeCreateNext`, `PipeReadNext`, `PipePatchNext`, `PipeDeleteNext` | the type of `next`, per action |
| `PipeCreateAction`, `PipeReadAction`, `PipePatchAction`, `PipeDeleteAction` | the type of a wrapper, per action |
| `PipeActionsInterface` | all four wrappers |
| `Pipe`, `PipeFunction`, `PipeClass`, `PipeClassInstance` | the forms a pipe may take |

See [Writing a Pipe](/guide/writing-a-pipe).

## What a pipe hands down

| Export | What it is |
| ------ | ---------- |
| `SourceQuery` | a query as an implementation receives it — values or operator conditions |
| `SourceValues` | patch values as an implementation receives them — merge patch or update document |
| `QueryOperators` | the operators that may stand in for one value |
| `UpdateOperators` | the update operators |
| `QueryTypeName` | the type names `$type` accepts |

See [SourceQuery & SourceValues](/guide/source-query).

## Built-in pipes

| Export | What it is |
| ------ | ---------- |
| `Cache`, `CacheOptions` | reads each distinct query once per scope |
| `openCacheScope`, `flushCacheScope` | opening and emptying a scope |
| `SetReadQueryParameterDefaultValue` | fills in a read query parameter the caller left out |

See [Caching](/guide/caching).

## Relations

| Export | What it is |
| ------ | ---------- |
| `Relation` | one declared relation; reachable through `pipeline.relations` |
| `RelationType` | `one` or `many` |
| `RelationMeta` | what a relation contributes to `meta.relations` |
| `maximumRelationDepth` | how deep nesting may go — `10` |
| `inlineRelations`, `WithInlinedRelations` | joins a normalized result back into the inlined shape |
| `QueryTemplate` | hydrates a `:field` template against a resource |

See [Declaring Relations](/guide/relations).

## The query engine

Exported so a source of your own can reuse them rather than reimplement mongodb semantics.

| Export | What it is |
| ------ | ---------- |
| `matchQuery` | does a resource match a query? |
| `matchValue` | does one value match one condition? |
| `assertQueryProperties` | refuse a query filtering on something the model does not declare |
| `queryOperators`, `logicalQueryOperators` | the query vocabulary, as tuples |
| `compareValues`, `compareForSort` | same-type comparison, and the total order `sort` uses |
| `applyPatch` | a patched copy of a resource |
| `isUpdateDocument` | is this an update document or a merge patch? |
| `updateOperators` | the update vocabulary, in application order |
| `parsePath`, `valuesAtPath`, `getAtPath`, `hasAtPath`, `setAtPath`, `unsetAtPath` | the path helpers |
| `stableKey` | a stable string for any JSON value |

See [Helpers & errors](./helpers) and [Writing a Pipeline](/guide/writing-a-pipeline).

## Errors

`error`, and the constructors and names listed in [Errors](/guide/errors).

## Importing

Everything is exported from the package root:

```ts twoslash
import { MemoryPipeline, PipelineAbstract, Cache, inlineRelations, matchQuery, applyPatch } from "@serafin/pipeline"
```
