# Context

Every action takes a **context** as its last argument. A query is about the data; the context is about
the call — who makes it, in which transaction, with which request id.

It is validated against the `context` schema builder, which starts empty, so a pipeline only accepts
the context properties its pipes declared:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), ownerId: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const OnlyMine = (p: Builders) => {
    const context = p.context.addString("_userId")
    return {
        context,
        read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, ctx: typeof context.T) =>
            next({ ...query, ownerId: ctx._userId }, ctx),
    }
}

const users = new MemoryPipeline(userSchema).pipe(OnlyMine)
await users.read({}, { _userId: "u1" })
```

The context travels to every pipe and to the implementation, unchanged unless a pipe changes it.

## The `_` convention

**A context property whose name starts with `_` is private**: supplied by the code around the
pipeline — a transport, a job runner, a test — and never by a remote caller.

Nothing in this library enforces it: a transport exposing a pipeline over HTTP or as an MCP tool must
strip `_`-prefixed properties from what the user sent. `_userId` filled in from a verified session is
a security control; `_userId` a client can set is a hole.

## What travels invisibly

Two things ride on the context under `Symbol.for` keys, invisible to `Object.keys`, to validation and
to implementations, and shared by ESM and CJS copies of the library in one process:

- the **relation depth counter**, enforcing `maximumRelationDepth`;
- the **cache scope**, when one is open — see [Caching](./caching).

::: warning Spread the context, don't deep-copy it
Every action **shallow**-copies the context, so what it carries — a transaction, a logger, a cache
scope — stays the same object all the way down. A pipe that deep-clones it duplicates the cache scope;
a duplicate is treated as *no* scope, so nothing goes stale, but the caching is lost.
:::

## Undefined properties

Every action drops properties whose value is `undefined` from its inputs before validating them.
Left in place, `undefined` means two things: the validator reads an absent property, while an
implementation iterating `Object.keys` reads a present one. Dropping it makes an in-process call
behave like one that arrived as JSON, and makes `undefined` mean *leave alone* in a patch.

- **Queries, values, options and create resources** are cleaned at **every depth**.
- **Arrays keep their length** — dropping an element would shift every index after it.
- Anything that is not a plain object — a `Date`, a `RegExp`, a class instance — is **left as is**.
- The **context** is cleaned **one level only**: it is shallow-copied, so reaching deeper would delete
  keys from objects the caller still holds.
