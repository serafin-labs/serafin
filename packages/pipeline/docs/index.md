---
layout: home

hero:
    name: Pipeline
    text: CRUD data access that composes
    tagline: A data source, and the behaviour around it, as separate pieces that snap together — each one carrying its own schema and its own inferred TypeScript type.
    image:
        src: /logo.png
        alt: Serafin Pipeline
    actions:
        - theme: brand
          text: Get Started
          link: /guide/getting-started
        - theme: alt
          text: Why Pipeline?
          link: /guide/why
        - theme: alt
          text: View on GitHub
          link: https://github.com/serafin-labs/pipeline

features:
    - icon: 🔌
      title: Behaviour as pipes
      details: Permissions, timestamps, soft deletes, caching — each one a pipe you wrap around any pipeline, in the order you choose, instead of a branch inside your data access code.
    - icon: 🧬
      title: Schemas that follow the pipes
      details: A pipe that adds a query parameter changes the pipeline's schema and its TypeScript type together. Both are derived from the model, never declared twice.
    - icon: 🔗
      title: Relations, resolved on demand
      details: Link pipelines together and ask for a relation per request. A whole page resolves in one read, normalized so a target shared by many resources is carried once.
    - icon: 🧠
      title: Batteries for prototyping
      details: MemoryPipeline speaks mongodb query and update operators, so the pipes you write against it keep working when the store becomes a database.
---

## A quick taste

A pipeline is a data source you call through four actions. Give it a model, and it derives every
related schema — the create values, the read query, the patch values — from that one definition.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    {
        id: SB.stringSchema(),
        firstName: SB.stringSchema(),
        lastName: SB.stringSchema(),
        age: [SB.integerSchema(), undefined],
    },
)

const users = new MemoryPipeline(userSchema)

// `id` is optional on create -- the pipeline hands one out
await users.create([{ firstName: "Nico", lastName: "Degardin" }])

const result = await users.read({ lastName: ["Degardin"] })
//    ^?
```

Then wrap behaviour around it with `.pipe()`. A pipe can change what the actions accept, and the
change shows up in the schema and in the type together:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), age: [SB.integerSchema(), undefined] },
)
type User = typeof userSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<User>>["readQuery"]["T"]

// ---cut---
/** Adds a public `minAge` parameter, and hands the source the `$gt` condition it means. */
const MinAge = (p: { readQuery: SB<ReadQuery> }) => {
    const readQuery = p.readQuery.addNumber("minAge", { minimum: 0 }, false)
    return {
        requires: ["$gt"],
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { minAge, ...rest } = query
            return next(minAge === undefined ? rest : { ...rest, age: { $gt: minAge } }, context)
        },
    }
}

const users = new MemoryPipeline(userSchema).pipe(MinAge)

await users.read({ minAge: 18 })
```

`minAge` is now part of the read query — as a JSON Schema property and as a TypeScript parameter —
while the source below never hears of it. And because the pipe declares `requires: ["$gt"]`,
`.pipe()` checks that against what the pipeline says it understands: a source that cannot do `$gt`
refuses the pipe the moment you attach it, rather than on the first request that needed it.
