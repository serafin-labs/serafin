# PipelineAbstract

The base class every pipeline extends. It owns the public actions and the pipe chain; a subclass
implements the protected methods that touch the data.

```ts
abstract class PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, R>
```

The thirteen type parameters mirror the [thirteen schema builders](/guide/actions#the-thirteen-schema-builders), plus `R`
for the declared relations. All of them default to `any`.

## Constructor

```ts
constructor(schemaBuilders: SchemaBuildersInterface<...>, options?: PipelineAbstractOptions)
```

### `PipelineAbstractOptions`

| Option | Type | Default | Meaning |
| ------ | ---- | ------- | ------- |
| `validationEnabled` | `boolean` | `true` | validate every action's inputs against the schemas |
| `name` | `string` | — | included in validation error messages |
| `capabilities` | `readonly string[]` | — | what the implementation understands of what a pipe hands down |

Leaving `capabilities` out means a pipe's `requires` is **not checked**. See
[Capabilities](/guide/source-query#capabilities).

## Actions

```ts
create(resources: CV[], options?: CO, context?: CTX): Promise<ResultsInterface<M, META & CM>>
read(query: RQ, context?: CTX): Promise<ResultsInterface<M, META & RM>>
patch(query: PQ, values: PV, context?: CTX): Promise<ResultsInterface<M, META & PM>>
delete(query: DQ, context?: CTX): Promise<ResultsInterface<M, META & DM>>
```

See [Actions & Schemas](/guide/actions).

## Methods to implement

```ts
protected _create(resources: CV[], options: CO, context: CTX): Promise<ResultsInterface<M, CM>>
protected _read(query: RQ, context: CTX): Promise<ResultsInterface<M, RM>>
protected _patch(query: PQ, values: PV, context: CTX): Promise<ResultsInterface<M, PM>>
protected _delete(query: DQ, context: CTX): Promise<ResultsInterface<M, DM>>
```

Each throws `SerafinNotImplementedError` unless overridden. An implementation may widen `_read`,
`_patch` and `_delete` to [`SourceQuery`/`SourceValues`](/guide/source-query).

## `pipe(pipe)`

```ts
pipe<M2, CV2, ...>(pipe: Pipe<...>): PipelineAbstract<M2, CV2, ...>
```

Runs the pipe, checks its `requires` against this pipeline's `capabilities`, and returns a **new**
pipeline carrying the schemas the pipe produced and the pipe at the head of its chain — `pipe()`
**prepends** ([Order & Composition](/guide/pipe-order)). Throws `SerafinCapabilityError`, with
`{ missing, declared }` in its `info`, when the pipeline declared capabilities that do not cover the
pipe's `requires`. Builders the pipe does not return are carried forward unchanged: replacing `model`
does not re-derive the others.

## `addRelationWithOne` / `addRelationWithMany`

```ts
addRelationWithOne<NameKey, RelationModel, ReadQuery, ReadMeta>(
    name: NameKey,
    pipeline: ReadOnlyPipelineInterface<RelationModel, ReadQuery, ReadMeta>,
    query: Partial<ReadQuery>,
)
```

Implemented with `pipe()`: returns a new pipeline with a `with<Name>` option on all four actions, the
relation in the `meta` schema under `relations`, and `relations[name]` set. A `:field` value in the
query is replaced by that field of the holding resource. See [Relations](/guide/relations).

## Standalone action functions

```ts
getCreateFunction(): PipelineCreateFunction<M, CV, CO, CM, CTX, META>
getReadFunction(): PipelineReadFunction<M, RQ, RM, CTX, META>
getPatchFunction(): PipelinePatchFunction<M, PQ, PV, PM, CTX, META>
getDeleteFunction(): PipelineDeleteFunction<M, DQ, DM, CTX, META>
```

A bound function for one action.

## Properties

| Property | Type | Meaning |
| -------- | ---- | ------- |
| `schemaBuilders` | `SchemaBuildersInterface<...>` | the thirteen builders |
| `modelSchemaBuilder` | `SchemaBuilder<M>` | shorthand for `schemaBuilders.model` |
| `relations` | `R` | the declared relations, by name |
| `capabilities` | `ReadonlySet<string> \| undefined` | what was declared, plus what pipes below have `provides`-ed |

## `clone()`

```ts
clone(): this
```

A copy with its own `relations`, `schemaBuilders` and pipe chain; **everything else is shared**,
including the data source, so piping a pipeline never forks its connection or store.

## ForkedPipeline

```ts
abstract class ForkedPipeline<M, CV, ...> extends PipelineAbstract<M, CV, ...> {
    constructor(basePipeline: PipelineAbstract<M, CV, ...>, title: string, description: string, validationEnabled = true)
}
```

Delegates all four actions to `basePipeline`, with the model retitled and described. Its type
parameters must line up with the base pipeline's — see
[Wrapping another pipeline](/guide/writing-a-pipeline#wrapping-another-pipeline).
