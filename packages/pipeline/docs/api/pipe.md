# Pipe types

A pipe is a function from the pipeline's schema builders to the changes it wants to make. These are
the types that describe one.

## The three forms

```ts
type PipeFunction<...> = (p: PipePropsInterface<...>) => PipeResultsInterface<...>

type PipeClassInstance<...> = { transform: PipeFunction<...> }

interface PipeClass<P extends any[], ...> {
    new (...params: P): PipeClassInstance<...>
}

type Pipe<...> = PipeFunction<...> | PipeClassInstance<...>
```

`pipe()` accepts either a function or an object with a `transform` method. A factory returning a
`PipeFunction` is the common shape, since that is how a pipe takes configuration.

## `PipePropsInterface`

What a pipe receives: the thirteen schema builders, unchanged.

```ts
interface PipePropsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>
    extends SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META> {}
```

A pipe that only touches a couple of them can declare just those, since the parameter is structurally
typed:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
// ---cut---
declare const pipe: (p: { readQuery: SB<{ id?: string }> }) => unknown
```

## `PipeResultsInterface`

What a pipe returns: any subset of the thirteen builders, any subset of the four action wrappers, and
optionally its capabilities.

```ts
interface PipeResultsInterface<...>
    extends Partial<SchemaBuildersInterface<...>>,
        PipeActionsInterface<...>,
        PipeCapabilitiesInterface {}
```

Builders the pipe does not return are carried forward unchanged.

## `PipeCapabilitiesInterface`

```ts
interface PipeCapabilitiesInterface {
    /** Names this pipe hands down to whatever is below it. */
    requires?: readonly string[]
    /** Names this pipe implements itself, on behalf of the pipes attached after it. */
    provides?: readonly string[]
}
```

Free-form names the two sides agree on — typically operator names. `requires` is checked at
`pipe()` time against the pipeline's `capabilities`; `provides` is added to what the pipes attached
*after* this one may require. See [Capabilities](/guide/capabilities).

## `next`

The rest of the chain, ending at the pipeline's implementation.

```ts
type PipeCreateNext<M, CV, CO, CM, CTX, META> = (
    resources: CV[],
    options: CO,
    context: CTX,
) => Promise<ResultsInterface<M, META & CM>>

type PipeReadNext<M, RQ, RM, CTX, META> = (
    query: RQ | SourceQuery<RQ>,
    context: CTX,
) => Promise<ResultsInterface<M, META & RM>>

type PipePatchNext<M, PQ, PV, PM, CTX, META> = (
    query: PQ | SourceQuery<PQ>,
    values: PV | SourceValues<PV>,
    context: CTX,
) => Promise<ResultsInterface<M, META & PM>>

type PipeDeleteNext<M, DQ, DM, CTX, META> = (
    query: DQ | SourceQuery<DQ>,
    context: CTX,
) => Promise<ResultsInterface<M, DM & META>>
```

The three query-bearing ones accept `RQ | SourceQuery<RQ>`, which is what the runtime always
accepted: a `next` call is never revalidated, so a pipe may hand down a condition where the schema
declares a value. `PipeCreateNext` is not widened — insert documents carry no operators.

See [SourceQuery & SourceValues](/guide/source-query).

## Action wrappers

```ts
type PipeReadAction<M, RQ, RM, CTX, META, M2, RQ2, RM2, CTX2, META2, ...> = (
    next: PipeReadNext<M, RQ, RM, CTX, META>,
    query: RQ2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => Promise<ResultsInterface<M2, META2 & RM2>>
```

`PipeCreateAction`, `PipePatchAction` and `PipeDeleteAction` follow the same shape for their actions.

Note the two generations of type parameters. The unsuffixed ones — `RQ`, `RM` — are the schemas as
they were **below** the pipe, and they type `next`. The suffixed ones — `RQ2`, `RM2` — are the
schemas the pipe **produced**, and they type its own parameters and result. Translating between the
two is what a pipe does.

`pipeline` is the pipeline as it was when the pipe was attached, so pipes added later are not part of
it.

## `PipeActionsInterface`

All four wrappers, each optional:

```ts
interface PipeActionsInterface<...> {
    create?: PipeCreateAction<...>
    read?: PipeReadAction<...>
    patch?: PipePatchAction<...>
    delete?: PipeDeleteAction<...>
}
```

A pipe implementing none of them changes only the schemas — which is a legitimate pipe: it declares a
parameter for another pipe to honour.

## Built-in pipes

### `Cache(options?)`

```ts
function Cache<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>(options?: CacheOptions): PipeFunction<...>

interface CacheOptions {
    /** What separates this cache's entries from those of every other cache sharing the scope. */
    id?: string
}
```

Reads each distinct query once per open [cache scope](/guide/caching). Attach it **first**, so it
sits immediately above the implementation. Any write through it empties the whole scope.

```ts twoslash
import { Cache, openCacheScope, flushCacheScope } from "@serafin/pipeline"
declare const context: any
// ---cut---
openCacheScope(context) // a context that deduplicates reads made through it
flushCacheScope(context) // drop everything its scope has cached
```

### `SetReadQueryParameterDefaultValue(accessor, value)`

```ts
function SetReadQueryParameterDefaultValue<M, RQ, RM, CTX, V>(
    queryParameterAccessor: PropertyAccessorResolver<RQ, V | undefined>,
    value: V | ((query: RQ, context: CTX) => Promise<V>),
): PipeFunction<...>
```

Fills in a read query parameter the caller left out. The schema is **not** modified — the parameter
must already exist on it. `value` may be a function of the query and context, so the default can be
computed per call.
