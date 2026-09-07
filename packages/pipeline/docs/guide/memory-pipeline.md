# In-memory Pipeline

`MemoryPipeline` keeps its resources in a `Map`. It is the pipeline to prototype against, the one to
write tests on, and a reasonable place for data whose loss when the process exits is acceptable.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), age: [SB.integerSchema(), undefined] },
)

const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico", age: 40 }] })

await users.create([{ firstName: "Seb" }]) // an id is generated when none is given
await users.read({ firstName: ["Nico", "Seb"] }) // an array on a property means "any of"
await users.read({ sort: { firstName: 1 }, limit: 10, withCount: true })
await users.patch({ id: "1" }, { age: 41 })
```

It is not a stub. Queries take the mongodb operators, patches take the update operators, reads sort
and page, and every action is atomic. The point is that **the pipes you write against it keep working
when the store becomes a database** — see [Query Operators](./query-operators).

::: info Operators come from pipes, not from callers
`{ $inc: { age: 1 } }` and `{ age: { $gte: 18 } }` are the vocabulary a pipe hands down through
`next`. The public actions validate against the schemas, which describe plain values — so a caller
cannot send an operator, and does not need to know they exist.
:::

## Read options

Its read query carries `skip`, `limit`, `sort` and `withCount`; its read meta carries `count`. Under
the same names, with the same meanings, a mongodb source gives them.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema(), age: [SB.integerSchema(), undefined] })
const users = new MemoryPipeline(userSchema)
// ---cut---
const page = await users.read({
    sort: { age: -1, firstName: 1 }, // 1 ascending, -1 descending
    skip: 20,
    limit: 10,
    withCount: true,
})

page.meta.count // how many matched in total, not how many are on this page
//         ^?
```

`sort` accepts dotted paths, and sorts by type first and then by value within a type — which makes it
total rather than throwing on mixed data. It is *not* BSON order.

Moving a prototype onto a database is meant to be a change of pipeline and nothing else.

## Options

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
let counter = 0
const users = new MemoryPipeline(userSchema, {
    initialData: [{ id: "1", firstName: "Nico" }], // seeds the store; the array is copied
    generateId: () => `u${++counter}`, // easier to read than a UUID
    clone: true, // copy resources in and out (default)
    validationEnabled: true, // validate inputs and patched resources (default)
    name: "users", // shows up in validation error messages
})
```

`generateId` defaults to `crypto.randomUUID()`, reached through `globalThis` so nothing here is tied
to a Node runtime.

## Test helpers

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
users.size // how many resources it holds
users.snapshot() // every resource, in insertion order
users.restore([{ id: "1", firstName: "Nico" }]) // replace the contents; each is validated
users.clear() // empty it
```

`restore` is the fast way to put a test back to a known state — it validates each resource against
the model, so a fixture that has drifted from the schema fails at setup rather than mid-test.

## What it does with your resources

**Resources are deep copied on the way in and on the way out**, so a caller that mutates what it read
cannot corrupt the store.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
// ---cut---
const user = (await users.read({ id: "1" })).data[0]
user.firstName = "mutated" // harmless: this is a copy
;(await users.read({ id: "1" })).data[0].firstName // still "Nico"
```

`{ clone: false }` turns that off and shares them instead. It makes reads cheap, and it is sound only
where everything holding a resource treats it as immutable.

## Atomicity

Each action mutates the store **synchronously**, which makes it atomic: an action either applies to
every resource it matched, or — if one of them fails validation — to none of them.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
// ---cut---
// "1" is already taken, so the whole batch is refused -- "2" is not written either
await users.create([
    { id: "2", firstName: "Seb" },
    { id: "1", firstName: "Duplicate" },
])
// SerafinConflictError: The modifications to the entity 1 failed because of a conflict.

users.size // 1 -- the store is exactly as it was
```

A `create` checks the whole batch for id conflicts before writing any of it, so a duplicate id in the
middle of a batch leaves the store untouched. A `patch` computes every patched resource, validates
each against the model, and only then writes.

## Indexing

A read that filters on **`id` alone** is served from the `Map` rather than by a scan — which is the
shape relation resolution uses for a whole page. Every other query is a full scan.

That is the whole index story. `MemoryPipeline` is not trying to be a database; it is trying to be
correct, fast enough for a prototype, and honest about which is which.

## Errors it raises

- A query property **the model does not declare** is a `SerafinSchemaValidationError`, not an empty
  page. See [When a pipe forgets to translate](./query-operators#when-a-pipe-forgets-to-translate).
- An **operator it does not implement** is an error, not a no-op.
- A **duplicate id** on create is a `SerafinConflictError`.
- A **patch that would change an id** is refused.
- A patched resource that **no longer satisfies the model** is refused, before it is written.

## Capabilities

`MemoryPipeline` declares `memoryCapabilities`, so a pipe that needs an operator it does not
implement is refused when it is attached rather than on the request that needed it:

```ts twoslash
import { memoryCapabilities } from "@serafin/pipeline"

memoryCapabilities // every query and update operator, plus $each, dotted-paths, skip/limit/sort/withCount, count
```

See [Capabilities](./capabilities).

## What's next

- [Query Operators](./query-operators) — the query vocabulary, and where it diverges from mongodb
- [Update Operators](./update-operators) — the patch vocabulary
- [Writing a Pipeline](./writing-a-pipeline) — when memory is not enough
