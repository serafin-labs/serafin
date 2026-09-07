# Writing a Pipeline

A pipeline implementation is a class extending `PipelineAbstract` with up to four protected methods.
The base class owns everything public — cleaning inputs, validating them, running the pipes,
resolving relations — so the subclass only has to touch the data.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, PipelineAbstract, ResultsInterface, defaultSchemaBuilders } from "@serafin/pipeline"

class ReadOnlyList<M extends IdentityInterface> extends PipelineAbstract<M, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(
        model: SB<M>,
        private resources: M[],
    ) {
        super(defaultSchemaBuilders(model) as any)
    }

    protected override async _read(query: any): Promise<ResultsInterface<M, any>> {
        const keys = Object.keys(query)
        return {
            data: this.resources.filter((resource) =>
                keys.every((key) => {
                    const condition = query[key]
                    // the read query accepts a value or an array of them: an array means "any of"
                    return Array.isArray(condition) ? condition.includes((resource as any)[key]) : (resource as any)[key] === condition
                }),
            ),
            meta: {},
        }
    }
}

const countries = new ReadOnlyList(
    SB.objectSchema({ title: "Country" }, { id: SB.stringSchema(), name: SB.stringSchema() }),
    [{ id: "fr", name: "France" }, { id: "be", name: "Belgium" }],
)

await countries.read({ id: ["fr", "be"] })
```

Thirty lines, and it is a real pipeline: pipes attach to it, relations point at it, its read query is
a JSON Schema, and calls to it are validated and typed.

An action you don't implement throws `SerafinNotImplementedError` when called, which is what makes
the read-only pipeline above legitimate rather than half-built.

## What the base class does for you

Before your `_read` sees a query, `read` has already:

1. **deep-copied** it, so you own what you are handed;
2. **stripped `undefined`** properties at every depth, so `Object.keys` and `in` agree with the
   validator;
3. **validated** it against `readQuery`;
4. **shallow-copied** the context and stripped its own `undefined` properties;
5. **run every pipe**, outermost first.

So `_read` receives a query that satisfies the schema, plus whatever the pipes added on the way down.
Which brings us to the interesting part.

## Declare what you accept

Pipes hand operators down through `next`, and nothing revalidates that call. Your implementation is
therefore free to accept more than its schemas describe — and should say so, in two places.

**In the types**, with `SourceQuery` and `SourceValues`:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, PipelineAbstract, ResultsInterface, SourceQuery, SourceValues } from "@serafin/pipeline"
// ---cut---
class MySource<M extends IdentityInterface> extends PipelineAbstract<M, any, any, any, any, any, any, any, any, any, any, any, any> {
    protected override async _read(query: SourceQuery<any>, context: any): Promise<ResultsInterface<M, any>> {
        return { data: [], meta: {} }
    }
    protected override async _patch(query: SourceQuery<any>, values: SourceValues<any>, context: any): Promise<ResultsInterface<M, any>> {
        return { data: [], meta: {} }
    }
}
```

A widened parameter on an override is allowed — TypeScript's method parameters are bivariant. Note
that `_create` is *not* widened: insert documents carry no operators.

**In the capabilities**, so `pipe()` can check a pipe's `requires` at attach time:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { PipelineAbstract, defaultSchemaBuilders, logicalQueryOperators, queryOperators, updateOperators } from "@serafin/pipeline"
// ---cut---
class MySource extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(model: SB<any>) {
        super(defaultSchemaBuilders(model) as any, {
            capabilities: [...queryOperators, ...logicalQueryOperators, ...updateOperators, "dotted-paths"],
        })
    }
}
```

Declare only what you really interpret. A source that matches values but cannot compare should say
so — that is the whole value of the mechanism. See [Capabilities](./capabilities).

## Reusable parts

The pieces `MemoryPipeline` is built from are exported, so a source that stores JSON documents and
has no query engine of its own can borrow them rather than reimplement mongodb semantics:

```ts twoslash
import { applyPatch, compareForSort, matchQuery, matchValue, isUpdateDocument } from "@serafin/pipeline"
import { getAtPath, hasAtPath, parsePath, setAtPath, unsetAtPath, valuesAtPath } from "@serafin/pipeline"
// ---cut---
declare const resource: any
declare const query: any
declare const values: any

matchQuery(query, resource) // does this resource match? -- the full query vocabulary
applyPatch(resource, values) // a patched copy -- update document or merge patch, by shape
compareForSort(1, 2) // the ordering `sort` uses: by type, then by value
```

`parsePath`, `valuesAtPath`, `getAtPath`, `setAtPath` and `unsetAtPath` are the path helpers, with
`__proto__`, `constructor` and `prototype` rejected as segments.

Here is a source that keeps resources in a `Map` and hands all the semantics to those:

```ts twoslash
import _ from "lodash"
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

// ---cut---
class TinySource<M extends IdentityInterface> extends PipelineAbstract<M, any, any, any, any, any, any, any, any, any, any, any, any> {
    private store = new Map<string, M>()

    constructor(model: SB<M>) {
        super(defaultSchemaBuilders(model) as any, {
            capabilities: [...queryOperators, ...logicalQueryOperators, ...updateOperators],
        })
    }

    private select(query: any): M[] {
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
```

`MemoryPipeline` is that, plus the parts this leaves out: copying resources in and out, checking a
whole batch before writing any of it, validating patched resources against the model, refusing a
query property the model does not declare, sorting, paging, and the `id`-only fast path.

## Adding to the schemas

A source that supports more than the defaults says so by extending them. `MemoryPipeline` merges its
read options in, which is the pattern:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, defaultSchemaBuilders } from "@serafin/pipeline"
// ---cut---
export function mySchemaBuilders<M extends IdentityInterface>(model: SB<M>) {
    const defaults = defaultSchemaBuilders(model)
    return {
        ...defaults,
        readQuery: defaults.readQuery.mergeProperties(
            SB.emptySchema()
                .addInteger("skip", { minimum: 0 }, false)
                .addInteger("limit", { minimum: 0 }, false)
                .addBoolean("withCount", {}, false),
        ),
        readMeta: defaults.readMeta.addInteger("count", { minimum: 0 }, false),
    }
}
```

Keep the names a mongodb source uses — `skip`, `limit`, `sort`, `withCount`, `count` — so moving a
prototype from memory to a database is a change of pipeline and nothing else.

::: info The model must be closed
`defaultSchemaBuilders` derives `createValues` with `setOptionalProperties`, which only works on a
simple object schema. A model that allows additional properties is refused — which is also what lets
an implementation rely on knowing every property a resource may hold.
:::

## Making it fully typed

The examples above use `any` for the thirteen type parameters, which is fine for a source private to
one project. A source meant to be published should thread the types through from its schema builders,
the way `MemoryPipeline` does:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, PipelineAbstract, defaultSchemaBuilders } from "@serafin/pipeline"
declare function mySchemaBuilders<M extends IdentityInterface>(model: SB<M>): ReturnType<typeof defaultSchemaBuilders<M>>
// ---cut---
type Builders<M extends IdentityInterface> = ReturnType<typeof mySchemaBuilders<M>>
type TypeOf<M extends IdentityInterface, K extends keyof Builders<M>> = Builders<M>[K]["T"]

class TypedSource<M extends IdentityInterface> extends PipelineAbstract<
    M,
    TypeOf<M, "createValues">,
    TypeOf<M, "createOptions">,
    TypeOf<M, "readQuery">,
    TypeOf<M, "patchQuery">,
    TypeOf<M, "patchValues">,
    TypeOf<M, "deleteQuery">,
    TypeOf<M, "createMeta">,
    TypeOf<M, "readMeta">,
    TypeOf<M, "patchMeta">,
    TypeOf<M, "deleteMeta">,
    TypeOf<M, "context">,
    TypeOf<M, "meta">
> {
    constructor(model: SB<M>) {
        super(mySchemaBuilders(model) as any)
    }
}
```

The `TypeOf` alias is worth the two lines — without it every parameter is
`ReturnType<typeof mySchemaBuilders<M>>["readQuery"]["T"]` spelled out thirteen times.

## Wrapping another pipeline

`ForkedPipeline` delegates every action to a pipeline you give it, with a retitled model. It is how
one store is exposed as two differently-described resources:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { ForkedPipeline, MemoryPipeline } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
const users = new MemoryPipeline(userSchema)

// a fork's type parameters have to line up with the pipeline it wraps
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

staff.schemaBuilders.model.schema // titled "Staff", described as an employee
await staff.read({ firstName: "Nico" }) // delegated to `users`
```

The type parameters are not optional decoration here: a fork declared with `any` for them is not
assignable from a concretely-typed pipeline, so mirroring the base's own builders is the pattern.

The fork's validation is separate from the base's — passing `false` as its fourth constructor
argument skips revalidating what the base pipeline is about to validate anyway.

## A checklist

- **Be atomic where you can.** Compute everything, check everything, then write. A `create` that
  discovers a conflict halfway through has already written half a batch.
- **Reject what you do not understand.** An operator silently dropped returns a plausible page of the
  wrong resources. `MemoryPipeline` throws, and so should you.
- **Reject a query property the model does not declare.** `assertQueryProperties` does this — it is
  how a missing or misordered pipe becomes an error instead of an empty page.
- **Declare `capabilities`**, and only what you really interpret.
- **Copy resources out**, or document loudly that you do not.
- **Keep the mongodb names** for whatever you add to the read query.

## What's next

- [Capabilities](./capabilities) — declaring what you honour
- [SourceQuery & SourceValues](./source-query) — the types to declare on your methods
- [API Reference](/api/) — every export
