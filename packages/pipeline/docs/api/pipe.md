# Pipe types

The types describing a pipe. The guide is [Writing a Pipe](/guide/writing-a-pipe).

## Forms

```ts
type PipeFunction<...> = (p: PipePropsInterface<...>) => PipeResultsInterface<...>
type PipeClassInstance<...> = { transform: PipeFunction<...> }
type Pipe<...> = PipeFunction<...> | PipeClassInstance<...>

interface PipeClass<P extends any[], ...> {
    new (...params: P): PipeClassInstance<...>
}
```

## In and out

```ts
// what a pipe receives: the thirteen schema builders
interface PipePropsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>
    extends SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META> {}

// what it returns: any of the builders, any of the four wrappers, and its capabilities
interface PipeResultsInterface<...> extends Partial<SchemaBuildersInterface<...>>, PipeActionsInterface<...>, PipeCapabilitiesInterface {}

interface PipeActionsInterface<...> {
    create?: PipeCreateAction<...>
    read?: PipeReadAction<...>
    patch?: PipePatchAction<...>
    delete?: PipeDeleteAction<...>
}

interface PipeCapabilitiesInterface {
    /** Names this pipe hands down to whatever is below it. */
    requires?: readonly string[]
    /** Names this pipe implements itself, on behalf of the pipes attached after it. */
    provides?: readonly string[]
}
```

Builders the pipe does not return are carried forward unchanged. `requires` is checked at `pipe()`
time against the pipeline's `capabilities` — see [Capabilities](/guide/source-query#capabilities).

## `next` and action wrappers

```ts
type PipeReadNext<M, RQ, RM, CTX, META> = (query: RQ | SourceQuery<RQ>, context: CTX) => Promise<ResultsInterface<M, META & RM>>

type PipeReadAction<M, RQ, RM, CTX, META, M2, RQ2, RM2, CTX2, META2, ...> = (
    next: PipeReadNext<M, RQ, RM, CTX, META>,
    query: RQ2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => Promise<ResultsInterface<M2, META2 & RM2>>
```

`PipePatchNext` takes `PQ | SourceQuery<PQ>` and `PV | SourceValues<PV>`, `PipeDeleteNext` takes
`DQ | SourceQuery<DQ>`, and `PipeCreateNext` takes `(resources: CV[], options: CO, context: CTX)`,
unwidened. `PipeCreateAction`, `PipePatchAction` and `PipeDeleteAction` follow the shape above.

The unsuffixed type parameters are the schemas **below** the pipe and type `next`; the suffixed ones
are the schemas the pipe **produced** and type its own parameters and result. `pipeline` is the
pipeline as it was when the pipe was attached.

## Built-in pipes

```ts
function Cache<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>(options?: { id?: string }): PipeFunction<...>
function openCacheScope<CTX extends object>(context?: CTX): CTX
function flushCacheScope(context: any): void
```

`Cache` reads each distinct query once per open [cache scope](/guide/caching); `id` separates its
entries from other caches sharing the scope. Attach it first.

```ts
function SetReadQueryParameterDefaultValue<M, RQ, RM, CTX, V>(
    queryParameterAccessor: PropertyAccessorResolver<RQ, V | undefined>,
    value: V | ((query: RQ, context: CTX) => Promise<V>),
): PipeFunction<...>
```

Fills in a read query parameter the caller left out, possibly computed from the query and context.
It does **not** modify the schema: the parameter must already exist on it.
