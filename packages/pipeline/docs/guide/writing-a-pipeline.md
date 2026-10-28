# Writing a Pipeline

A pipeline implementation is a class extending `PipelineAbstract` with up to four protected methods.
The base class owns everything public — cleaning and validating inputs, running the pipes, resolving
relations — so the subclass only touches the data. An action left unimplemented throws
`SerafinNotImplementedError`, which makes a read-only pipeline legitimate rather than half-built.

Here is a complete source keeping resources in a `Map`. It borrows its semantics from the functions
`MemoryPipeline` is built on, so it understands the full [query](./query-operators) and
[update](./update-operators) vocabulary:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import {
    IdentityInterface,
    PipelineAbstract,
    ResultsInterface,
    SourceQuery,
    SourceValues,
    applyPatch,
    defaultSchemaBuilders,
    logicalQueryOperators,
    matchQuery,
    queryOperators,
    updateOperators,
} from "@serafin/pipeline"

class TinySource<M extends IdentityInterface> extends PipelineAbstract<M, any, any, any, any, any, any, any, any, any, any, any, any> {
    private store = new Map<string, M>()

    constructor(model: SB<M>) {
        super(defaultSchemaBuilders(model) as any, {
            // what this source interprets of what pipes hand down
            capabilities: [...queryOperators, ...logicalQueryOperators, ...updateOperators],
        })
    }

    private select(query: SourceQuery<any>): M[] {
        return [...this.store.values()].filter((resource) => matchQuery(query, resource))
    }

    protected override async _create(resources: any[]): Promise<ResultsInterface<M, any>> {
        const created = resources.map((resource) => ({ ...resource, id: resource.id ?? crypto.randomUUID() }) as M)
        created.forEach((resource) => this.store.set(resource.id, resource))
        return { data: created, meta: {} }
    }

    protected override async _read(query: SourceQuery<any>): Promise<ResultsInterface<M, any>> {
        return { data: this.select(query), meta: {} }
    }

    protected override async _patch(query: SourceQuery<any>, values: SourceValues<any>): Promise<ResultsInterface<M, any>> {
        const patched = this.select(query).map((resource) => applyPatch(resource, values))
        patched.forEach((resource) => this.store.set(resource.id, resource))
        return { data: patched, meta: {} }
    }

    protected override async _delete(query: SourceQuery<any>): Promise<ResultsInterface<M, any>> {
        const matched = this.select(query)
        matched.forEach((resource) => this.store.delete(resource.id))
        return { data: matched, meta: {} }
    }
}

const countries = new TinySource(SB.objectSchema({ title: "Country" }, { id: SB.stringSchema(), name: SB.stringSchema() }))
await countries.create([{ id: "fr", name: "France" }])
await countries.read({ id: ["fr", "be"] })
```

That is a real pipeline: pipes attach to it, relations point at it, its read query is a JSON Schema,
and calls to it are validated and typed. `MemoryPipeline` is the same thing plus copying resources in
and out, checking a whole batch before writing any of it, validating patched resources, refusing
undeclared query properties, sorting, paging, and an `id`-only fast path.

## What the base class does for you

Before `_read` sees a query, `read` has already **deep-copied** it, **stripped `undefined`**
properties at every depth, **validated** it against `readQuery`, **shallow-copied** the context, and
**run every pipe**. So `_read` receives a query that satisfies the schema, plus whatever the pipes
added on the way down.

## Declare what you accept

Pipes hand operators down through `next`, which nothing revalidates
([SourceQuery & Capabilities](./source-query)). An implementation that interprets them says so
twice. **In the types**, by widening `_read`, `_patch` and `_delete` to `SourceQuery` and
`SourceValues` as above — a widened parameter on an override is allowed, since method parameters are
bivariant; `_create` is not widened, as insert documents carry no operators. **In its
capabilities**, so `.pipe()` can check a pipe's `requires` when it is attached. Declare only what you
really interpret: a source that matches values but cannot compare should say so.

## Reusable parts

`matchQuery` (does a resource match a query?), `applyPatch` (a patched copy, from an update document
or a merge patch), `compareForSort`, `assertQueryProperties` and the path helpers `parsePath`,
`valuesAtPath`, `getAtPath`, `setAtPath` and `unsetAtPath` are exported for sources that store JSON
documents without a query engine of their own. See the [API reference](/api/helpers).

## Adding to the schemas

A source that supports more than the defaults extends them. `MemoryPipeline` merges its read options
in, which is the pattern:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, defaultSchemaBuilders } from "@serafin/pipeline"
// ---cut---
export function mySchemaBuilders<M extends IdentityInterface>(model: SB<M>) {
    const defaults = defaultSchemaBuilders(model)
    return {
        ...defaults,
        readQuery: defaults.readQuery.mergeProperties(
            SB.emptySchema().addInteger("skip", { minimum: 0 }, false).addInteger("limit", { minimum: 0 }, false).addBoolean("withCount", {}, false),
        ),
        readMeta: defaults.readMeta.addInteger("count", { minimum: 0 }, false),
    }
}
```

Keep the names a mongodb source uses — `skip`, `limit`, `sort`, `withCount`, `count` — so moving a
prototype from memory to a database is a change of pipeline and nothing else.

## Type parameters

The examples above pass `any` for the thirteen type parameters, which is fine for a source private to
one project. A published source threads them through from its schema builders, as `MemoryPipeline`
does and as the fork below shows. Defining `type T<K> = Builders[K]["T"]` saves spelling out
`ReturnType<typeof mySchemaBuilders<M>>["readQuery"]["T"]` thirteen times.

## Wrapping another pipeline

`ForkedPipeline` delegates every action to a pipeline you give it, with a retitled model — one store
exposed as two differently-described resources:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { ForkedPipeline, MemoryPipeline } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
const users = new MemoryPipeline(userSchema)

// a fork's type parameters must line up with the pipeline it wraps
type Builders = MemoryPipeline<User>["schemaBuilders"]
type T<K extends keyof Builders> = Builders[K]["T"]

class Staff extends ForkedPipeline<
    User,
    T<"createValues">,
    T<"createOptions">,
    T<"readQuery">,
    T<"patchQuery">,
    T<"patchValues">,
    T<"deleteQuery">,
    T<"createMeta">,
    T<"readMeta">,
    T<"patchMeta">,
    T<"deleteMeta">,
    T<"context">,
    T<"meta">
> {}

const staff = new Staff(users, "Staff", "An employee of the company")
await staff.read({ firstName: "Nico" }) // delegated to `users`
```

A fork declared with `any` for its type parameters is not assignable from a concretely-typed
pipeline, so mirroring the base's builders is the pattern. Passing `false` as the fourth constructor
argument skips revalidating what the base pipeline validates anyway.

## A checklist

- **Be atomic where you can.** Compute and check everything, then write.
- **Reject what you do not understand.** A dropped operator returns a plausible page of the wrong
  resources.
- **Reject a query property the model does not declare**, with `assertQueryProperties`: a missing or
  misordered pipe then fails instead of returning an empty page.
- **Declare `capabilities`**, and only what you really interpret.
- **Copy resources out**, or document loudly that you do not.
