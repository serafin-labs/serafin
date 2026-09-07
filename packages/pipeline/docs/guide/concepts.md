# Core Concepts

Five words carry the whole library: **pipeline**, **action**, **pipe**, **schema builders**, and
**results**.

## Pipeline

A pipeline gives access to a set of resources through four actions. It is an object with `create`,
`read`, `patch` and `delete`, a `schemaBuilders` property describing what each of them accepts, and
`relations` describing what it is linked to.

Concretely, a pipeline is a class extending `PipelineAbstract`. The base class owns the public
actions — cleaning inputs, validating them, running the pipes — and the subclass implements the four
protected methods that actually touch the data:

```
        create()  read()  patch()  delete()      <- public, validated
            |       |       |        |
        [ pipes, outermost first ]
            |       |       |        |
       _create() _read() _patch() _delete()      <- protected, yours
```

`MemoryPipeline` is one such subclass. `ForkedPipeline` is another: it delegates to a pipeline you
give it, which is how a pipeline gets a new title and description without a new implementation.
Writing your own is [four methods](./writing-a-pipeline).

Every resource has a string `id` — that is the whole of `IdentityInterface`, and the only thing the
library assumes about your model.

## Action

The four actions, and what each one takes:

| Action   | Arguments                    | Selects with | Returns          |
| -------- | ---------------------------- | ------------ | ---------------- |
| `create` | `resources`, `options`, `ctx`| —            | what was created |
| `read`   | `query`, `ctx`               | `query`      | what matched     |
| `patch`  | `query`, `values`, `ctx`     | `query`      | what was patched |
| `delete` | `query`, `ctx`               | `query`      | what was deleted |

A **query** filters resources or alters what an action does with them. **Values** are what to write.
**Options** are `create`'s equivalent of a query, since there is nothing to filter. And the
**context** is a separate channel for things that are about the caller rather than the data — see
[Context](./context).

All four are async, and all four answer with an array, `create` included.

## Pipe

A pipe is a function from schema builders to *changed* schema builders plus action wrappers:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const Loud = (p: Builders) => ({
    // 1. schemas it changes -- any of the thirteen builders
    readMeta: p.readMeta.addBoolean("loud", {}, false),

    // 2. actions it wraps -- any of the four
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
        const result = await next(query, context)
        return { ...result, meta: { ...result.meta, loud: true } }
    },
})
```

Both halves are optional. A pipe that only changes schemas adds a parameter someone else honours; a
pipe that only wraps actions adds behaviour nobody has to know about.

`next` is the rest of the chain, ending at the pipeline's own implementation. A pipe decides what to
do around that call: change the query going down, change the result coming back, refuse to call it,
or call it more than once.

::: info The pipeline is the last argument
Every action wrapper receives the pipeline as an extra final argument, after the context. It is the
pipeline **as it was when the pipe was attached** — useful for reading a sibling relation, but note
it does not include pipes attached later.
:::

## Schema builders

Thirteen [`SchemaBuilder`](https://serafin-labs.github.io/schema-builder/)s, one per thing an action
touches. All of them are derived from the model by `defaultSchemaBuilders`, and each pipe may replace
any of them.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
const users = new MemoryPipeline(userSchema)

users.schemaBuilders.readQuery.schema // JSON Schema of what `read` accepts
users.schemaBuilders.patchValues.T // the type of what `patch` writes -- compile time only
```

[Schema Builders](./schema-builders) goes through all thirteen and what each is derived as.

## Results

Every action answers a `ResultsInterface`: `data`, the resources, and `meta`, everything else.

```ts twoslash
import { ResultsInterface } from "@serafin/pipeline"
declare const result: ResultsInterface<{ id: string }, { count?: number }>
// ---cut---
result.data // Array<{ id: string }>
result.meta.count // number | undefined
```

`meta` is where a pipe puts what it has to say about the call as a whole — a total count, a
timing, a request id — and where relations are returned. See [Results & Meta](./results).

## How they fit

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), userId: SB.stringSchema(), city: SB.stringSchema() })

const addresses = new MemoryPipeline(addressSchema)

const users = new MemoryPipeline(userSchema) // a pipeline, over a store
    .pipe(Cache()) // a pipe, wrapping its actions
    .addRelationWithMany("addresses", addresses, { userId: ":id" }) // a relation, which is a pipe too

const context = openCacheScope({}) // context, carrying the cache scope
const result = await users.read({ withAddresses: true }, context) // an action
result.data // the users
result.meta.relations?.addresses // their addresses, normalized
```

## What's next

- [create, read, patch, delete](./actions) — each action in detail
- [Schema Builders](./schema-builders) — the thirteen, and how they are derived
- [Writing a Pipe](./writing-a-pipe) — the shape of a pipe, and how to type one
