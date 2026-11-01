# Order & Composition

`.pipe()` **prepends**. The first pipe attached ends up closest to the implementation; the last one
attached runs first.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const order: string[] = []
const Trace = (name: string) => (p: Builders) => ({
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
        order.push(`${name} in`)
        const result = await next(query, context)
        order.push(`${name} out`)
        return result
    },
})

const users = new MemoryPipeline(userSchema).pipe(Trace("A")).pipe(Trace("B")).pipe(Trace("C"))
await users.read({})

order // [ "C in", "B in", "A in", "A out", "B out", "C out" ]
```

```
    read()        <- validated against C's schemas
      |
      C           <- attached last, runs first
      B
      A           <- attached first, runs last
      |
    _read()       <- the implementation
```

That is the order in which **schemas** compose. `B` receives the builders as `A` left them, so it can
build on what `A` added, and `C` receives them as `B` left them. The public query is validated against
`C`'s schemas, the most derived, so `C` must see it first and translate it down from there.

## Choosing an order

- **A pipe that translates a parameter sits above whatever consumes the translation.**
- **A pipe that constrains sits above what it constrains.** A permission check attached last sees the
  query as the caller wrote it, which is what it should decide on.
- **A pipe that observes sits where the thing it observes is true.** Timing the whole chain means
  attaching last; timing the store alone means attaching first.
- **`Cache()` is attached first**, immediately above the implementation — see
  [Caching](./caching#attach-it-first).

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
const SoftDelete = (p: Builders) => ({
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => next({ ...query, deletedAt: null }, context),
})
const OnlyMine = (p: { context: Builders["context"] }) => {
    const context = p.context.addString("_userId")
    return {
        context,
        read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, ctx: typeof context.T) => next({ ...query, ownerId: ctx._userId }, ctx),
    }
}
// ---cut---
const users = new MemoryPipeline(userSchema)
    .pipe(Cache()) // innermost: sees the final query, nearest the store
    .pipe(SoftDelete) // hides deleted users from everything above
    .pipe(OnlyMine) // outermost: sees the caller's own query
```

## Relations are pipes too

`addRelationWithOne` and `addRelationWithMany` are implemented with `.pipe()` and take a place in the
chain like anything else. A relation added after a pipe is outside it: its option is stripped before
the inner pipes see the query, and it is resolved after they return. Add a relation **after** a pipe
that filters resources out, and only the survivors have it resolved.

## Each `.pipe()` is a new pipeline

`.pipe()` never mutates. The clone gets its own `relations`, `schemaBuilders` and pipe chain;
everything else, **including the data source**, is shared:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
const AdminView = (p: Builders) => ({ readMeta: p.readMeta.addBoolean("admin", {}, false) })
// ---cut---
const base = new MemoryPipeline(userSchema)
const forAdmins = base.pipe(AdminView)

await base.create([{ id: "1", firstName: "Nico" }])
;(await forAdmins.read({})).data.length // 1 -- the same store
```

Two views of one store with different rules: build the base once, derive a pipeline per audience.
