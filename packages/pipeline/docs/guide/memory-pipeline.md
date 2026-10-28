# In-memory Pipeline

`MemoryPipeline` keeps its resources in a `Map`: the pipeline to prototype and test against.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), age: [SB.integerSchema(), undefined] },
)

let counter = 0
const users = new MemoryPipeline(userSchema, {
    initialData: [{ id: "1", firstName: "Nico", age: 40 }], // seeds the store; the array is copied
    generateId: () => `u${++counter}`, // default: crypto.randomUUID()
})

await users.create([{ firstName: "Seb" }])
const page = await users.read({
    sort: { age: -1, firstName: 1 }, // 1 ascending, -1 descending
    skip: 0,
    limit: 10,
    withCount: true,
})
page.meta.count // how many matched in total, not how many are on this page
//         ^?
```

It understands mongodb-style [query](./query-operators) and [update](./update-operators) operators,
sorts and pages, and every action is atomic. Its read options use mongodb's names, so **the pipes you
write against it keep working when the store becomes a database**. `sort` accepts dotted paths and
orders by type, then by value — not BSON order. Options are listed in the
[API reference](/api/memory-pipeline).

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

A fixture that has drifted from the schema fails at `restore` rather than mid-test.

## Copies

**Resources are deep-copied on the way in and out**, so a caller mutating what it read cannot corrupt
the store. `{ clone: false }` shares them instead: reads get cheap, and it is sound only where
everything holding a resource treats it as immutable.

## Atomicity

Each action mutates the store **synchronously**, so it applies to every resource it matched or — if
one fails — to none. A `create` checks the whole batch for id conflicts before writing any of it; a
`patch` computes and validates every patched resource before writing.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
// ---cut---
await users.create([
    { id: "2", firstName: "Seb" },
    { id: "1", firstName: "Duplicate" },
])
// SerafinConflictError: The modifications to the entity 1 failed because of a conflict.

users.size // 1 -- "2" was not written either
```

## Indexing

A read filtering on **`id` alone** is served from the `Map` — the shape relation resolution uses for a
whole page. Every other query is a full scan.

## Refusals

A query property **the model does not declare**, an **operator it does not implement**, a **patch
that would change an id** and a patched resource that **no longer satisfies the model** are errors,
never silently ignored — see [the error table](/api/memory-pipeline#errors).

It declares `memoryCapabilities`, so a pipe requiring an operator it does not implement is refused
when attached — see [Capabilities](./source-query#capabilities).
