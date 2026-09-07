# Order & Composition

`.pipe()` **prepends**. The first pipe you attach ends up closest to the implementation; the last one
you attach runs first.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
const order: string[] = []
const Trace = (name: string) => (p: Builders) => ({
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
        order.push(`${name} in`)
        const result = await next(query, context)
        order.push(`${name} out`)
        return result
    },
})
// ---cut---
const users = new MemoryPipeline(userSchema).pipe(Trace("A")).pipe(Trace("B")).pipe(Trace("C"))

await users.read({})

order // [ "C in", "B in", "A in", "A out", "B out", "C out" ]
```

Drawn out, `.pipe(A).pipe(B).pipe(C)` builds this:

```
    read()                       <- validated against C's schemas
      |
      C                          <- attached last, runs first
      |
      B
      |
      A                          <- attached first, runs last
      |
    _read()                      <- the implementation
```

## Why that way round

Because that is the order in which the **schemas** have to compose. `B` receives the schema builders
as `A` left them, so `B` can build on what `A` added; `C` receives them as `B` left them. Reading
`.pipe(A).pipe(B).pipe(C)` left to right, each pipe sees everything before it.

The runtime order falls out of that. The public query is validated against `C`'s schemas — the
outermost, most-derived ones — so `C` must be the first to see it, and it translates down toward the
implementation from there.

## Choosing an order

**A pipe that translates a parameter must sit above whatever consumes the translation.** A pipe
turning `minAge` into `{ $gt: ... }` has to be attached *after* nothing in particular, but anything
that expects to see `minAge` must be attached after it.

**A pipe that constrains must sit above what it constrains.** A permission check attached last sees
the query as the caller wrote it, which is usually what you want to make a decision about.

**A pipe that observes should sit where the thing it observes is true.** Timing the whole chain means
attaching last; timing the store alone means attaching first.

```ts twoslash
// @noErrors
const users = new MemoryPipeline(userSchema)
    .pipe(Cache())          // 1st attached -> innermost: sees the final query, nearest the store
    .pipe(SoftDelete())     // hides deleted rows from everything above
    .pipe(Timestamps())     // stamps writes
    .pipe(OnlyVisibleTo())  // last attached -> outermost: sees the caller's own query
```

`Cache()` is the clearest case. It goes **first**, so it sits immediately above the implementation:
it then sees the query after defaults have been applied and relation options stripped, so two calls
written differently still land on one entry — and every pipe above it still runs on a cache hit, so
permissions are still checked and meta still stamped. See [Caching](./caching).

## Relations are pipes too

`addRelationWithOne` and `addRelationWithMany` are implemented with `.pipe()`, so they take a place
in the chain like anything else. A relation added after a pipe is outside it: the relation option is
stripped from the query before the inner pipes see it, and the relation is resolved after they have
returned.

That matters when a pipe filters resources out. Add the relation **after** such a pipe and only the
surviving resources have their relation resolved, which is normally what you want.

## Each `.pipe()` is a new pipeline

`.pipe()` never mutates. It clones, and the clone gets its own `relations`, `schemaBuilders` and
`pipes` — everything else, **including the data source**, is shared.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
const AdminOnly = (p: Builders) => ({ readMeta: p.readMeta.addBoolean("admin", {}, false) })
// ---cut---
const base = new MemoryPipeline(userSchema)
const forAdmins = base.pipe(AdminOnly)

await base.create([{ id: "1", firstName: "Nico" }])
;(await forAdmins.read({})).data.length // 1 -- the same store
```

Two views of one store, with different rules. That is the intended way to expose a resource
differently to different callers: build the base once, and derive a pipeline per audience.

## What's next

- [Capabilities](./capabilities) — a check that runs at `.pipe()` time
- [Caching](./caching) — the pipe whose position matters most
