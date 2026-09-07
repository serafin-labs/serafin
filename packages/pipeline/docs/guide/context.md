# Context

Every action takes a **context** as its last argument. A query is about the data; the context is
about the call — who is making it, in which transaction, with which request id.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
await users.read({ firstName: "Nico" }, { _userId: "u1" })
```

It is validated against the `context` schema builder, which starts empty, so a pipeline only accepts
the context properties its pipes declared:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
// ---cut---
const OnlyMine = (p: Builders) => {
    const context = p.context.addString("_userId")
    return {
        context,
        read: async (next: PipeReadNext<User, Builders["readQuery"]["T"]>, query: any, ctx: typeof context.T) =>
            next({ ...query, ownerId: ctx._userId }, ctx),
    }
}
```

The context travels to every pipe and to the implementation, unchanged unless a pipe changes it.

## The `_` convention

**A context property whose name starts with `_` is private.** It is supplied by the code around the
pipeline — a transport, a job runner, a test — and never by a remote caller.

That is a convention, not an enforcement: nothing in this library strips `_` properties. It is the
transport's job. Anything exposing a pipeline over HTTP, or as an MCP tool, must remove
`_`-prefixed properties from what the user provided before passing a context down.

Which is why it is worth the discipline. `_userId` filled in from a verified session is a security
control; `_userId` a client can set is a hole. The prefix is how a reviewer can tell which properties
must never be user-settable, without reading the transport.

## What travels invisibly

Two things ride on the context under **symbol** keys, which keeps them out of `Object.keys` and so
invisible to schema validation and to pipeline implementations:

- the **relation depth counter**, so nested relation reads can enforce `maximumRelationDepth`;
- the **cache scope**, when one is open. See [Caching](./caching).

Both use `Symbol.for`, so an ESM and a CJS copy of the library loaded in the same process agree on
the keys.

::: warning Don't deep-copy the context
The context is deliberately **shallow**-copied by every action, so what it carries — a transaction, a
logger, a cache scope — stays the same object all the way down. A pipe that does
`_.cloneDeep(context)` duplicates the cache scope, and two duplicate scopes diverge: flushing one
would leave the other serving what it just invalidated.

That case is detected and handled safely — a copied scope is treated as *no* scope, so the caching
is lost but nothing goes stale. Still, spread the context rather than cloning it.
:::

## Undefined properties

Every action drops properties whose value is `undefined` from its inputs before validating them.

`undefined` has no JSON representation, so it can only ever come from code, never from a transport.
Left in place it means two things at once: the validator reads it as an absent property, while an
implementation iterating `Object.keys` or testing `"field" in query` reads it as a present one.
Dropping it leaves a single meaning, and makes an in-process call behave like one that arrived as
JSON.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), nickname: [SB.stringSchema(), undefined] },
)
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico", nickname: "nico" }] })
// ---cut---
await users.patch({ id: "1" }, { nickname: undefined }) // leaves `nickname` alone
await users.patch({ id: "1" }, { nickname: null }) // removes it
```

The rules, precisely:

- **Queries, values, options and create resources** are cleaned at **every depth**.
- **Arrays keep their length** — dropping an element would shift every index after it.
- Anything that is not a plain object — a `Date`, a `RegExp`, a class instance — is **left as it is**.
- The **context** is cleaned **one level only**. It is shallow-copied rather than cloned, so reaching
  into it would mean deleting keys from objects the caller still holds.

For `patch`, this is what makes `undefined` mean *leave this property alone*, per
[RFC 7396](https://tools.ietf.org/html/rfc7396), while `null` clears it — which is why `patchValues`
is declared with `toNullable()`.

## What's next

- [Errors](./errors) — what comes back when an action refuses
- [Caching](./caching) — the one feature built on context scopes
