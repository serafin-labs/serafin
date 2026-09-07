# Writing a Pipe

A pipe is a function. It receives the pipeline's thirteen schema builders and returns whatever it
wants to change: schema builders, action wrappers, or both.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const LimitToTen = (p: Builders) => ({
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) =>
        next({ ...query, limit: Math.min(query.limit ?? 10, 10) }, context),
})

const users = new MemoryPipeline(userSchema).pipe(LimitToTen)
```

Attach it with `.pipe()`, which returns a **new** pipeline. The one you piped is unchanged.

## The three forms

A pipe can be a plain function, a factory returning one, or a class with a `transform` method.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipePropsInterface, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
// 1. a function -- when the pipe needs no arguments
const Simple = (p: Builders) => ({ readMeta: p.readMeta.addBoolean("simple", {}, false) })

// 2. a factory -- when it takes configuration. This is the common one.
const Configurable = (flag: string) => (p: Builders) => ({ readMeta: p.readMeta.addBoolean(flag, {}, false) })

// 3. a class -- when it has state, or when you want it named and subclassable
class Stateful {
    private calls = 0
    transform = (p: Builders) => ({
        read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
            this.calls++
            return next(query, context)
        },
    })
}

const users = new MemoryPipeline(userSchema).pipe(Simple).pipe(Configurable("loud")).pipe(new Stateful())
```

The factory form is what most pipes want: `Cache()` and `SetReadQueryParameterDefaultValue(...)` are
both factories.

## Adding a parameter

The interesting pipes translate. They put a parameter on the public schema and turn it into something
the layer below already understands:

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

// ---cut---
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

Three things are worth noticing there.

**The parameter is removed before `next`.** `includeDeleted` exists only on this pipe's schema. The
implementation below was built without it, and passing it down would reach a source that has never
heard of it. Destructuring it out is the idiom.

**`next` is typed with the schema from below, the query parameter with the one above.** That
asymmetry *is* the pipe. `PipeReadNext<User, ReadQuery>` is the query as the layer below accepts it;
`typeof readQuery.T` is the query as this pipe accepts it.

**`{ deletedAt: { $exists: false } }` is not a `ReadQuery`.** It is a widening of one — the schema
says `deletedAt` is a string, and this passes a condition. That is legitimate and intended: nothing
revalidates a `next` call, so a pipe may hand down more than the schema describes. `PipeReadNext`
accepts it because it is declared as `RQ | SourceQuery<RQ>`. See
[SourceQuery & SourceValues](./source-query), and [Capabilities](./capabilities) for what `requires`
does about it.

## Wrapping the result

A pipe sits on both sides of `next`, so it can change what comes back as easily as what goes down:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext, forbiddenError } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema(), secret: [SB.stringSchema(), undefined] })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
/** Strips a property nobody outside should see, and says so on the model. */
const HideSecret = (p: Builders) => {
    const model = p.model.omitProperties(["secret"])
    return {
        model,
        read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
            const result = await next(query, context)
            return { ...result, data: result.data.map(({ secret, ...rest }) => rest) }
        },
    }
}
```

Changing `model` is how a pipe says the resources it returns are not quite the ones below it. Every
schema derived from the model further up sees the change.

## Not calling `next`

Nothing obliges a pipe to call `next` at all — which is how a permission check refuses:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeDeleteNext, forbiddenError } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
// ---cut---
const AdminsOnlyDelete = (p: Builders) => {
    const context = p.context.addBoolean("_isAdmin", {}, false)
    return {
        context,
        delete: async (next: PipeDeleteNext<User, Builders["deleteQuery"]["T"]>, query: any, ctx: typeof context.T) => {
            if (!ctx._isAdmin) {
                throw forbiddenError("only an admin may delete a user")
            }
            return next(query, ctx)
        },
    }
}
```

It can equally call `next` **more than once** — reading a resource to check it before patching it, or
retrying on a conflict.

## Typing a pipe, practically

The verbose part of a pipe is its types, and there are two ways to keep it manageable.

**Take only what you use.** A pipe's parameter is structurally typed, so it can declare just the
builders it touches:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<User>>["readQuery"]["T"]
// ---cut---
const MinLength = (p: { readQuery: SB<ReadQuery> }) => {
    const readQuery = p.readQuery.addInteger("minLength", {}, false)
    return {
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { minLength, ...rest } = query
            const result = await next(rest, context)
            return { ...result, data: result.data.filter((user) => user.firstName.length >= (minLength ?? 0)) }
        },
    }
}
```

**Or be generic**, for a pipe meant to work on any pipeline. `PipePropsInterface` is the full set of
thirteen, parameterised the same way `PipelineAbstract` is:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, MemoryPipeline, PipePropsInterface, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
/** Works on any pipeline, whatever it stores. */
function CountReads<M extends IdentityInterface, RQ, RM, CTX>() {
    let reads = 0
    return (p: PipePropsInterface<M, any, any, RQ, any, any, any, any, RM, any, any, CTX>) => ({
        read: async (next: PipeReadNext<M, RQ, RM, CTX>, query: RQ, context: CTX) => {
            reads++
            return next(query, context)
        },
    })
}

const users = new MemoryPipeline(userSchema).pipe(CountReads())
```

## The pipeline argument

Every action wrapper gets one more argument after the context: the pipeline itself.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext, PipelineInterface } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const UsesPipeline = (p: Builders) => ({
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any, pipeline: PipelineInterface<User>) => {
        pipeline.schemaBuilders.model // the model as it was when this pipe was attached
        return next(query, context)
    },
})
```

It is the pipeline **as it was at the moment the pipe was attached** — pipes added later are not part
of it. Reaching for it is rare; a pipe that needs another pipeline should usually be given it as a
factory argument instead.

## Rules of thumb

- **Remove your own parameters before calling `next`.** They exist on your schema, not below it.
- **Merge into meta rather than replacing it.** Everything below has already contributed.
- **Don't mutate the query, values, or resources you were handed.** Spread them. Another pipe may
  hold a reference, and with caching the resources may be shared with other callers.
- **Declare `requires`** when you hand an operator down. It is a one-line statement that turns a
  silent mismatch into a startup error. See [Capabilities](./capabilities).

## What's next

- [Order & Composition](./pipe-order) — why the order matters and how to reason about it
- [Capabilities](./capabilities) — declaring what a pipe needs from below
- [SourceQuery & SourceValues](./source-query) — typing what a pipe hands down
