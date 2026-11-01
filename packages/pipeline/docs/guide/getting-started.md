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

Models are defined with [`@serafin/schema-builder`](https://serafin-labs.github.io/schema-builder/).
The package ships ESM and CommonJS builds with bundled types, imports no Node built-in, and is meant
for TypeScript in `strict` mode.

## Your first pipeline

A pipeline needs a **model**: a `SchemaBuilder` describing one resource, with a string `id`.

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

// create takes an array, and hands out an id when you don't
const created = await users.create([
    { firstName: "Nico", lastName: "Degardin" },
    { firstName: "Seb", lastName: "De Saint-Florent", age: 42 },
])

// read filters; an array on a property means "any of these"
const page = await users.read({ lastName: ["Degardin", "De Saint-Florent"], withCount: true })
page.data
//   ^?
page.meta.count

// patch and delete select by id
await users.patch({ id: created.data[0].id }, { age: 30 })
await users.delete({ id: created.data[1].id })
```

The pipeline derives the schema of every action from the model — what `create` accepts, what `read`
filters on, what `patch` may set — so there is nothing else to declare. Every action is async and
answers `{ data, meta }`: `data` is always an array of resources, `meta` whatever the pipeline and its
pipes had to say about the call.

Inputs are validated against those schemas before anything runs. TypeScript catches this one; the
same call from JavaScript or a transport is rejected at runtime with a `SerafinValidationError`:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
// @errors: 2353
await users.read({ nickname: "nico" })
```

## How a pipeline is built

A pipeline is a class extending `PipelineAbstract`. The base class owns the public actions —
cleaning and validating inputs, running the pipes — and the subclass implements the protected methods
that touch the data:

```
     create()  read()  patch()  delete()      <- public, validated
         |       |       |        |
     [ pipes, last attached first ]
         |       |       |        |
    _create() _read() _patch() _delete()      <- protected, the implementation
```

`MemoryPipeline` is one implementation; [writing your own](./writing-a-pipeline) is four methods.

## Adding a pipe

A pipe is a function. It receives the pipeline's schema builders and returns the ones it changes,
wrappers around the actions it cares about, or both. A wrapper receives `next`, the rest of the
chain, and decides what to do around it.

Pipes are written against types derived from the model. These three lines are the idiom every pipe
in this documentation starts from:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })

type User = typeof userSchema.T // the resource
type Builders = ReturnType<typeof memorySchemaBuilders<User>> // the schema builders a MemoryPipeline<User> carries
type ReadQuery = Builders["readQuery"]["T"] // what `read` accepts

/** Never returns more than ten users at once. */
const LimitToTen = (p: Builders) => ({
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) =>
        next({ ...query, limit: Math.min(query.limit ?? 10, 10) }, context),
})

const users = new MemoryPipeline(userSchema).pipe(LimitToTen)
```

`PipeReadNext<User, ReadQuery>` types `next` with the query the layer below accepts. `.pipe()`
returns a **new** pipeline and leaves the original untouched, so a base pipeline can be kept and
specialised per audience.

This pipe only wraps behaviour. A pipe can also add a parameter, and the parameter then appears in
the pipeline's JSON Schema and TypeScript type — see [Writing a Pipe](./writing-a-pipe).

## Next steps

- [Actions & Schemas](./actions) — the four actions and the schemas derived for them
- [Writing a Pipe](./writing-a-pipe) — changing schemas, wrapping results, typing a pipe
- [Relations](./relations) — linking pipelines to each other
- [In-memory Pipeline](./memory-pipeline) — what `MemoryPipeline` can do
