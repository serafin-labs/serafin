# Why Pipeline?

Data access code starts simple: `readUsers(query)` hits the database and returns rows. Then the
requirements arrive. Only return users the caller may see. Stamp `updatedAt` on every write. Hide the
soft-deleted ones unless an admin asks. Don't read the same user twice in one request. Publish the
whole thing as OpenAPI, accurately.

Each of those cuts across all four actions and none of them belongs to the database. Added one at a
time, they become branches inside the function that was supposed to just read users, and the schema
you publish drifts away from what the code accepts.

## The idea

A **pipeline** is a data source reachable through four actions: `create`, `read`, `patch`, `delete`.
A **pipe** is one concern, written once and wrapped around a pipeline. Unlike middleware, **a pipe
carries schema changes, not just behaviour**:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), ownerId: SB.stringSchema(), deletedAt: [SB.stringSchema(), undefined] },
)
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
const SoftDelete = (p: Builders) => {
    const readQuery = p.readQuery.addBoolean("includeDeleted", {}, false)
    return {
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { includeDeleted, ...rest } = query
            return next(includeDeleted ? rest : { ...rest, deletedAt: null }, context)
        },
    }
}
const OnlyMine = (p: { context: Builders["context"] }) => {
    const context = p.context.addString("_userId")
    return {
        context,
        read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, ctx: typeof context.T) => next({ ...query, ownerId: ctx._userId }, ctx),
    }
}
// ---cut---
const users = new MemoryPipeline(userSchema)
    .pipe(Cache())
    .pipe(OnlyMine) // adds `_userId` to the context
    .pipe(SoftDelete) // adds `includeDeleted` to the read query

// both are now part of the pipeline's JSON Schema and of its TypeScript type
await users.read({ includeDeleted: true }, { _userId: "u1" })

users.schemaBuilders.readQuery.schema // what `read` accepts, after every pipe
```

The pipeline `.pipe()` returns has a different read query, type and JSON Schema. Attach three pipes
and the accepted parameters are the composition of all three, described once, in the pipes that
implement them. **The interface of your data access layer is derived from the pieces it is built
out of**, by way of [`@serafin/schema-builder`](https://serafin-labs.github.io/schema-builder/), so
there is no separate document to keep in step with the code.

## What you get from that

- **A schema that cannot lie.** `schemaBuilders.readQuery.schema` is exactly what `read` accepts.
  Feed it to OpenAPI, an MCP tool definition or a form generator.
- **Validation at the boundary.** Every action validates its inputs before the first pipe runs, so
  a pipe never defends itself against a malformed query.
- **Types that follow.** `users.read({ includeDeleted: true })` compiles; a typo does not.
- **Reusable pipes.** A pipe receives schema builders and returns schema builders and action
  wrappers. It does not know which pipeline it is attached to, so a permission check written for
  users works on invoices.
- **Somewhere to put the store.** `MemoryPipeline` is a real implementation with mongodb-style
  operators, sorting, paging and atomic writes. Prototype and test on it, then swap in a
  database-backed pipeline.

## What it is not

**Not an ORM.** Nothing maps objects to tables or manages migrations. Storage lives in a pipeline's
implementation, which is [a class with four methods](./writing-a-pipeline).

**Not a query language.** A query means what its implementation makes it mean. The library
standardises the vocabulary pipes and implementations use to talk about queries, and
[checks that the two sides agree](./source-query#capabilities).

**Not a transport.** There is no HTTP server here. A pipeline is a plain object with four async
methods and a JSON Schema for each, which is what a transport needs to generate its surface.

`@serafin/pipeline` is the data access component of the [Serafin](https://github.com/serafin-labs/serafin)
framework. Next: [Getting Started](./getting-started).
