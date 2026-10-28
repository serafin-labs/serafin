# Writing a Pipe

A pipe is a function. It receives the pipeline's thirteen schema builders and returns what it
changes: schema builders, action wrappers, or both. Builders it does not return are carried forward
as they are.

## Adding a parameter

The interesting pipes translate: they put a parameter on the public schema and turn it into something
the layer below understands.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), deletedAt: [SB.stringSchema({ format: "date-time" }), undefined] },
)

type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]

/** Hides soft-deleted users unless `includeDeleted` asks for them. */
const SoftDelete = (p: Builders) => {
    const readQuery = p.readQuery.addBoolean("includeDeleted", {}, false)
    return {
        requires: ["$exists"],
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { includeDeleted, ...rest } = query
            return next(includeDeleted ? rest : { ...rest, deletedAt: { $exists: false } }, context)
        },
    }
}

const users = new MemoryPipeline(userSchema).pipe(SoftDelete)

await users.read({ includeDeleted: true }) // everyone
await users.read({}) // only the living
```

**`next` is typed with the schema from below, the query with the one above.**
`PipeReadNext<User, ReadQuery>` is the query as the layer below accepts it; `typeof readQuery.T` is
the query as this pipe accepts it. Translating between the two is what a pipe does.

**The parameter is removed before `next`.** `includeDeleted` exists only on this pipe's schema;
passing it down would reach a source that never heard of it. Destructuring it out is the idiom.

**`{ $exists: false }` is not a value of `deletedAt`'s type.** A pipe may hand an operator condition
down where the schema describes a value, and `requires` declares that it does. Both are explained in
[SourceQuery & Capabilities](./source-query).

## The three forms

A pipe can be a plain function, a factory returning one, or an object with a `transform` method:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const Simple = (p: Builders) => ({ readMeta: p.readMeta.addBoolean("simple", {}, false) })

// a factory takes configuration -- the common form, like `Cache()`
const Flagged = (flag: string) => (p: Builders) => ({ readMeta: p.readMeta.addBoolean(flag, {}, false) })

// a class instance holds state
class CountReads {
    reads = 0
    transform = (p: Builders) => ({
        read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
            this.reads++
            return next(query, context)
        },
    })
}

const users = new MemoryPipeline(userSchema).pipe(Simple).pipe(Flagged("loud")).pipe(new CountReads())
```

## Wrapping the result

A pipe sits on both sides of `next`, so it can change what comes back as easily as what goes down:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema(), secret: [SB.stringSchema(), undefined] })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
/** Strips a property nobody outside should see, from the resources and from the schemas. */
const HideSecret = (p: Builders) => ({
    model: p.model.omitProperties(["secret"]),
    readQuery: p.readQuery.omitProperties(["secret"]),
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
        const result = await next(query, context)
        return { ...result, data: result.data.map(({ secret, ...rest }) => rest) }
    },
})
```

Replacing `model` says the resources this pipe returns are not quite the ones below it. It replaces
**only** `model`: the other builders were derived when the pipeline was built and are carried forward
unchanged, which is why `HideSecret` replaces `readQuery` too. A pipe hiding a property everywhere
replaces every builder that mentions it.

## Not calling `next`

Nothing obliges a pipe to call `next`, which is how a permission check refuses:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { memorySchemaBuilders, PipeDeleteNext, forbiddenError } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
// ---cut---
const AdminsOnlyDelete = (p: Builders) => {
    const context = p.context.addBoolean("_isAdmin", {}, false)
    return {
        context,
        delete: async (next: PipeDeleteNext<User, Builders["deleteQuery"]["T"]>, query: Builders["deleteQuery"]["T"], ctx: typeof context.T) => {
            if (!ctx._isAdmin) {
                throw forbiddenError("only an admin may delete a user")
            }
            return next(query, ctx)
        },
    }
}
```

It can equally call `next` more than once — reading a resource before patching it, or retrying on a
conflict.

## Typing a pipe for any pipeline

The parameter is structurally typed, so a pipe can declare only the builders it touches —
`(p: { context: Builders["context"] })`. A pipe meant for any pipeline is generic over
`PipePropsInterface`, the thirteen builders parameterised like `PipelineAbstract`:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, MemoryPipeline, PipePropsInterface, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
function LogReads<M extends IdentityInterface, RQ, RM, CTX>() {
    return (p: PipePropsInterface<M, any, any, RQ, any, any, any, any, RM, any, any, CTX>) => ({
        read: async (next: PipeReadNext<M, RQ, RM, CTX>, query: RQ, context: CTX) => {
            console.log(p.model.schema.title, query)
            return next(query, context)
        },
    })
}

const users = new MemoryPipeline(userSchema).pipe(LogReads())
```

Every wrapper also receives, after the context, the pipeline **as it was when the pipe was
attached**. A pipe needing another pipeline is usually better given it as a factory argument.

## Rules of thumb

- **Remove your own parameters before calling `next`.**
- **Merge into `meta` rather than replacing it.**
- **Don't mutate the query, values or resources you were handed.** Spread them: another pipe may hold
  a reference, and with caching the resources are shared between callers.
- **Declare `requires`** when you hand an operator down.
