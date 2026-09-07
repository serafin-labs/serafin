# PipelineAbstract

The base class every pipeline extends. It owns the public actions and the pipe chain; a subclass
implements the protected methods that touch the data.

```ts
abstract class PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, R>
```

The thirteen type parameters mirror the [thirteen schema builders](/guide/schema-builders), plus `R`
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

Leaving `capabilities` out means a pipe's `requires` is **not checked** — undeclared is not
incapable. See [Capabilities](/guide/capabilities).

## Actions

```ts
create(resources: CV[], options?: CO, context?: CTX): Promise<ResultsInterface<M, META & CM>>
read(query: RQ, context?: CTX): Promise<ResultsInterface<M, META & RM>>
patch(query: PQ, values: PV, context?: CTX): Promise<ResultsInterface<M, META & PM>>
delete(query: DQ, context?: CTX): Promise<ResultsInterface<M, META & DM>>
```

Each one deep-copies its inputs, strips `undefined` properties, validates against the matching schema
builder, shallow-copies the context, and then runs the pipe chain. See
[create, read, patch, delete](/guide/actions).

## Methods to implement

```ts
protected _create(resources: CV[], options: CO, context: CTX): Promise<ResultsInterface<M, CM>>
protected _read(query: RQ, context: CTX): Promise<ResultsInterface<M, RM>>
protected _patch(query: PQ, values: PV, context: CTX): Promise<ResultsInterface<M, PM>>
protected _delete(query: DQ, context: CTX): Promise<ResultsInterface<M, DM>>
```

Each throws `SerafinNotImplementedError` unless overridden, so a read-only pipeline implements
`_read` and nothing else.

An implementation may **widen** these parameters to
[`SourceQuery`](/guide/source-query)/`SourceValues` — a widened parameter on an override is allowed,
and it is how a source states that it accepts more than its schemas promise.

## `pipe(pipe)`

```ts
pipe<M2, CV2, ...>(pipe: Pipe<...>): PipelineAbstract<M2, CV2, ...>
```

Runs the pipe, checks its `requires` against this pipeline's `capabilities`, and returns a **new**
pipeline carrying the schemas the pipe produced and the pipe in its chain.

`pipe()` **prepends**: the first pipe attached is the innermost, closest to the implementation.
See [Order & Composition](/guide/pipe-order).

Throws `SerafinCapabilityError` if the pipe requires something this pipeline has declared
capabilities but not that one. The error's `info` carries `{ missing, declared }`.

## `addRelationWithOne` / `addRelationWithMany`

```ts
addRelationWithOne<NameKey, RelationModel, ReadQuery, ReadMeta>(
    name: NameKey,
    pipeline: ReadOnlyPipelineInterface<RelationModel, ReadQuery, ReadMeta>,
    query: Partial<ReadQuery>,
)
```

Both are implemented with `pipe()`, so both return a new pipeline. Declaring a relation adds a
`with<Name>` option to all four actions, adds the relation to the `meta` schema under `relations`,
and registers it on `relations[name]`.

The query is a template: a value starting with `:` is replaced at runtime by that field of the
holding resource, and a literal `:` is escaped as `\:`. See
[Declaring Relations](/guide/relations).

## Standalone action functions

```ts
getCreateFunction(): PipelineCreateFunction<M, CV, CO, CM, CTX, META>
getReadFunction(): PipelineReadFunction<M, RQ, RM, CTX, META>
getPatchFunction(): PipelinePatchFunction<M, PQ, PV, PM, CTX, META>
getDeleteFunction(): PipelineDeleteFunction<M, DQ, DM, CTX, META>
```

A bound function for one action, so a pipe can depend on one action of one pipeline without holding
the pipeline itself.

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

A copy that can take a pipe without affecting the original. `relations`, `schemaBuilders` and the
pipe chain get their own copy; **everything else is shared** — including whatever a concrete pipeline
holds as its data source, so piping a pipeline never forks its connection, cache or store.

## ForkedPipeline

```ts
abstract class ForkedPipeline<M, CV, ...> extends PipelineAbstract<M, CV, ...> {
    constructor(basePipeline: PipelineAbstract<M, CV, ...>, title: string, description: string, validationEnabled = true)
}
```

Delegates all four actions to `basePipeline`, with the model retitled and described. Its type
parameters must line up with the base pipeline's — see
[Wrapping another pipeline](/guide/writing-a-pipeline#wrapping-another-pipeline).
