# Why Pipeline?

Data access code starts simple. `readUsers(query)` hits the database, returns rows, done.

Then the requirements arrive. Only return users the caller is allowed to see. Stamp `updatedAt` on
every write. Never return the soft-deleted ones — unless an admin asks. Don't hit the database twice
for the same user inside one request. Expose `minAge` to the API, even though the column is `age`.
Publish the whole thing as OpenAPI, so the schema had better be accurate.

Each of those is a concern that cuts across all four actions, and none of them belongs to the
database. Added one at a time, they end up as branches inside the function that was supposed to just
read users — and the schema you publish drifts away from what the code actually accepts.

## The idea

A **pipeline** is a data source reachable through four actions: `create`, `read`, `patch`, `delete`.
A **pipe** is one of those concerns, written once and wrapped around a pipeline:

```ts twoslash
// @noErrors
const users = new MemoryPipeline(userSchema)
    .pipe(Cache())
    .pipe(Timestamps())
    .pipe(SoftDelete())
    .pipe(OnlyVisibleTo())
```

Nothing new so far — that is middleware, and every framework has it. What makes this different is
that **a pipe carries schema changes, not just behaviour**:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<User>>["readQuery"]["T"]
// ---cut---
const MinAge = (p: { readQuery: SB<ReadQuery> }) => {
    // the pipe hands back a *new* read query schema, with its own parameter on it
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

// `minAge` exists on the read query now -- in the JSON Schema and in the type
await users.read({ minAge: 18 })

// and it is validated before any pipe runs
users.schemaBuilders.readQuery.schema
```

The pipeline you get back from `.pipe()` is a different pipeline, with a different read query, a
different type, and a different JSON Schema. Attach three pipes and the accepted parameters are the
composition of all three — described once, in the pipes that implement them.

That is the whole bet: **the interface of your data access layer is derived from the pieces it is
built out of, rather than written down next to them.** There is no separate document to keep in step
with the code, because the document *is* the code, by way of
[`@serafin/schema-builder`](https://serafin-labs.github.io/schema-builder/).

## What you get from that

**A schema that cannot lie.** `pipeline.schemaBuilders.readQuery.schema` is a JSON Schema of exactly
what `read` accepts, after every pipe. Feed it to OpenAPI, to an MCP tool definition, to a form
generator. It was not transcribed by hand, so it cannot be out of date.

**Validation for free, at the boundary.** Every action validates its inputs against those schemas
before the first pipe runs, so a pipe never has to defend itself against a malformed query.

**Types that follow.** `users.read({ minAge: 18 })` compiles; `users.read({ minAeg: 18 })` does not.
The pipeline's own types are computed from the same builders as the schema.

**Pipes that are worth reusing.** A pipe is written against `PipePropsInterface` — schema builders in,
schema builders and action wrappers out. It doesn't know which pipeline it will be attached to, so
the permission check you write for users works on invoices.

**Somewhere to put the store.** `MemoryPipeline` is a real implementation, not a stub: mongodb-style
query and update operators, sorting, paging, atomic writes. Prototype on it, test on it, and swap it
for a database-backed pipeline when the data needs to outlive the process.

## What it is not

It is **not an ORM**. Nothing here maps objects to tables, generates migrations, or manages a schema
in a database. A pipeline's concrete implementation is where the storage lives, and writing one is
[a small class with four methods](./writing-a-pipeline).

It is **not a query language**. The query a pipeline accepts means whatever its implementation makes
it mean. What the library standardises is the vocabulary pipes and implementations use to talk about
queries — and, with [capabilities](./capabilities), a way to check the two sides agree.

It is **not a transport**. There is no HTTP server here. A pipeline is a plain object with four
async methods and a JSON Schema for each of them, which is roughly the least a transport needs to
generate its own surface.

## Where it comes from

`@serafin/pipeline` is the data access component of the **Serafin** framework, and the reason
`@serafin/schema-builder` is built around transformation rather than declaration. The two are
usable on their own; together they are a way to describe a resource once and get the API for it.

## What's next

[Getting Started](./getting-started) installs the library and builds a first pipeline, or
[Core Concepts](./concepts) lays out the vocabulary first.

> `pipeline` is a component of the **Serafin** framework. Learn more at [github.com/serafin-labs/serafin](https://github.com/serafin-labs/serafin).
