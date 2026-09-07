# Getting Started

## Installation

::: code-group

```bash [npm]
npm install @serafin/pipeline @serafin/schema-builder
```

```bash [pnpm]
pnpm add @serafin/pipeline @serafin/schema-builder
```

```bash [yarn]
yarn add @serafin/pipeline @serafin/schema-builder
```

:::

[`@serafin/schema-builder`](https://serafin-labs.github.io/schema-builder/) is where models are
defined, so you will import from both. The package ships **ESM** and **CommonJS** builds with
bundled type declarations.

```ts twoslash
import { MemoryPipeline, Cache, inlineRelations } from "@serafin/pipeline"
```

```js
// CommonJS
const { MemoryPipeline } = require("@serafin/pipeline")
```

::: tip Requirements
This is a TypeScript-first library, and `strict` mode is where its inference pays off. It runs on
any modern JavaScript runtime — nothing here imports a Node built-in.
:::

## Your first pipeline

A pipeline needs a **model**: a `SchemaBuilder` describing one resource. The only requirement is a
string `id`.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema(),
        firstName: SB.stringSchema(),
        lastName: SB.stringSchema(),
        age: [SB.integerSchema(), undefined], // optional
    },
)

const users = new MemoryPipeline(userSchema)
```

That single model is enough. The pipeline derives the schema of every action from it — what `create`
accepts, what `read` filters on, what `patch` may set — so there is nothing else to declare.

## The four actions

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), lastName: SB.stringSchema(), age: [SB.integerSchema(), undefined] },
)
const users = new MemoryPipeline(userSchema)
// ---cut---
// create takes an array, and hands out an id when you don't
const created = await users.create([
    { firstName: "Nico", lastName: "Degardin" },
    { firstName: "Seb", lastName: "De Saint-Florent", age: 42 },
])

// read filters; an array on a property means "any of these"
const some = await users.read({ lastName: ["Degardin", "De Saint-Florent"] })

// patch selects with a query and applies values
await users.patch({ id: created.data[0].id }, { age: 30 })

// delete selects the same way
await users.delete({ id: created.data[1].id })
```

Every action is asynchronous, and every one of them answers with the same shape: `data`, an array of
resources, and `meta`, whatever the pipeline and its pipes had to say about the call.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
const page = await users.read({ limit: 10, withCount: true })

page.data // the resources
//   ^?
page.meta.count // how many matched in total, because `withCount` asked
```

## Validation comes with it

Inputs are validated against the derived schemas before anything else happens:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
// @errors: 2353
await users.read({ nickname: "nico" })
```

TypeScript catches that one at compile time. The same call written in JavaScript, or arriving from a
transport, is rejected at runtime with a `SerafinValidationError` naming the pipeline, the action and
the offending value.

## Adding a pipe

`.pipe()` returns a **new** pipeline. The original is untouched, which is what makes a pipeline safe
to keep around and specialise:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeCreateNext, PipePatchNext } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), updatedAt: [SB.stringSchema({ format: "date-time" }), undefined] },
)
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>

// ---cut---
/** Stamps `updatedAt` on everything that goes in. */
const Timestamps = () => ({
    create: async (next: PipeCreateNext<User, Builders["createValues"]["T"]>, resources: any[], options: any, context: any) =>
        next(
            resources.map((resource) => ({ ...resource, updatedAt: new Date().toISOString() })),
            options,
            context,
        ),
    patch: async (next: PipePatchNext<User, Builders["patchQuery"]["T"], Builders["patchValues"]["T"]>, query: any, values: any, context: any) =>
        next(query, { ...values, updatedAt: new Date().toISOString() }, context),
})

const users = new MemoryPipeline(userSchema).pipe(Timestamps)

const { data } = await users.create([{ firstName: "Nico" }])
data[0].updatedAt // set by the pipe
```

A pipe that only wraps behaviour, like this one, needs no schema changes. A pipe that adds a
parameter returns a new schema builder for it — see [Writing a Pipe](./writing-a-pipe).

## Next steps

- [Core Concepts](./concepts) — the vocabulary: pipelines, pipes, actions, schema builders
- [In-memory Pipeline](./memory-pipeline) — what `MemoryPipeline` can do, and where it stops
- [Writing a Pipe](./writing-a-pipe) — the shape of a pipe, and how to type one
- [Relations](./relations) — linking pipelines to each other
