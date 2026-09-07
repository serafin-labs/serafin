# Capabilities

A pipe that translates a parameter into an operator depends on the implementation below it
understanding that operator. Nothing in the types can express that, and nothing revalidates a `next`
call — so the two sides agree by convention.

`requires` and `capabilities` make the convention checkable.

## The failure they catch

Here is the mismatch, without the check. A pipe hands `$gt` down to a source that has never heard of
it:

```ts twoslash
// @noErrors
const SomeSource = /* a source that ignores anything it does not recognise */

const users = new SomeSource(userSchema).pipe(MinAge)

await users.read({ minAge: 18 })
// -> every user, or none of them. No error, no warning.
```

The query reached the source as `{ age: { $gt: 18 } }`. A source that drops what it does not
understand returns everything; one that treats it as a value to compare returns nothing. Either way
you get **a plausible page of the wrong resources**, at runtime, with nothing to point at.

## Declaring it

A pipe says what it hands down:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const MinAge = (p: Builders) => {
    const readQuery = p.readQuery.addNumber("minAge", { minimum: 0 }, false)
    return {
        requires: ["$gt"], // <-- this
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { minAge, ...rest } = query
            return next(minAge === undefined ? rest : { ...rest, age: { $gt: minAge } }, context)
        },
    }
}
```

And a pipeline says what it understands, in its constructor options:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { PipelineAbstract, defaultSchemaBuilders } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
// ---cut---
class ExactMatchSource extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(model: SB<any>) {
        super(defaultSchemaBuilders(model) as any, {
            capabilities: ["$in", "$eq"], // no comparisons -- this source only matches values
        })
    }
    protected override async _read(query: any) {
        return { data: [], meta: {} }
    }
}
```

Attaching the one to the other now fails immediately:

```ts twoslash
// @errors: 2345
// @noErrors
new ExactMatchSource(userSchema).pipe(MinAge)
// SerafinCapabilityError: MinAge needs '$gt', which ExactMatchSource does not declare
```

At `.pipe()` time — when the pipeline is being assembled, not on the request that would have gone
wrong. The error carries `{ missing, declared }` in its `info`.

## Undeclared is not incapable

The check **only runs when the pipeline declared capabilities**. A pipeline that says nothing accepts
any pipe:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { PipelineAbstract, defaultSchemaBuilders } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema() })
// ---cut---
class Quiet extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(model: SB<any>) {
        super(defaultSchemaBuilders(model) as any) // no `capabilities`
    }
}

new Quiet(userSchema).capabilities // undefined -- nothing is checked
```

This is deliberate. It means you can annotate pipes and pipelines independently, in either order, and
nothing that worked before starts failing. Adding `requires` to a pipe is always safe; adding
`capabilities` to a pipeline is what turns the checking on for the pipes attached to it.

## `provides`

A pipe can implement something itself, on behalf of the pipes above it:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
/** Sorts in memory, for a source that cannot sort. */
const SortHere = (p: Builders) => ({
    provides: ["sort"],
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
        const { sort, ...rest } = query
        const result = await next(rest, context)
        return sort ? { ...result, data: [...result.data].sort(/* ... */) } : result
    },
})

const users = new MemoryPipeline(userSchema)
    .pipe(SortHere) // attached first, so it is *below* everything after it
    .pipe(/* a pipe that requires "sort" -- and is satisfied */ (p: Builders) => ({ requires: ["sort"] }))
```

Because `.pipe()` prepends, a pipe's `provides` is visible to exactly the pipes attached **after** it
— which are the ones above it in the chain, and the only ones whose calls actually pass through it.
The direction works out on its own.

## What the names are

Free-form strings that the two sides agree on. Operator names are the obvious ones, and a pipeline
built on this library's query matcher declares exactly the contents of `queryOperators`,
`logicalQueryOperators` and `updateOperators`:

```ts twoslash
import { memoryCapabilities, queryOperators, updateOperators } from "@serafin/pipeline"

memoryCapabilities // what MemoryPipeline declares
queryOperators // $eq, $ne, $gt, ... -- the query vocabulary
updateOperators // $set, $inc, $push, ... -- the update vocabulary
```

`MemoryPipeline` also declares `dotted-paths`, the read options `skip` / `limit` / `sort` /
`withCount`, and `count` — because those are conventions too, and a pipe that emits `{ limit: 20 }`
depends on them just as much as one that emits `$gt`.

Nothing stops you using them for anything else: `"transactions"`, `"full-text-search"`,
`"case-insensitive-ids"`. Any convention two sides have to share is a candidate.

## Why not types

Because the value passed down genuinely is not of the schema's type. A pipe emitting
`{ age: { $gt: 18 } }` where the schema says `age` is a number is passing a *widening* of the read
query — and [`SourceQuery`](./source-query) names that widening, so a pipe can pass it without a cast.

But naming the shape says nothing about whether the implementation **interprets** it. `SourceQuery`
describes the vocabulary; `requires` and `capabilities` describe who speaks it. They are two halves
of the same problem, and you want both.

## What's next

- [SourceQuery & SourceValues](./source-query) — the type side of the same contract
- [Writing a Pipeline](./writing-a-pipeline) — declaring capabilities for a source of your own
