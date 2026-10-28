# API Reference

Everything `@serafin/pipeline` exports from the package root, grouped by what it is for.

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

See [Actions & Schemas](/guide/actions).

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

See [SourceQuery & Capabilities](/guide/source-query).

## Built-in pipes

| Export | What it is |
| ------ | ---------- |
| `Cache`, `CacheOptions`, `openCacheScope`, `flushCacheScope` | reads each distinct query once per [scope](/guide/caching) |
| `SetReadQueryParameterDefaultValue` | fills in a read query parameter the caller left out |

See [Pipe types](./pipe#built-in-pipes).

## Relations

| Export | What it is |
| ------ | ---------- |
| `Relation` | one declared relation; reachable through `pipeline.relations` |
| `RelationType` | `one` or `many` |
| `RelationMeta` | what a relation contributes to `meta.relations` |
| `maximumRelationDepth` | how deep nesting may go — `10` |
| `inlineRelations`, `WithInlinedRelations` | joins a normalized result back into the inlined shape |
| `QueryTemplate` | hydrates a `:field` template against a resource |

See [Relations](/guide/relations).

## Query engine, paths and errors

`matchQuery`, `matchValue`, `assertQueryProperties`, `queryOperators`, `logicalQueryOperators`,
`compareValues`, `compareForSort`, `applyPatch`, `isUpdateDocument`, `updateOperators`, the path
helpers, `stableKey`, and `error` with its constructors — see [Helpers & errors](./helpers).
