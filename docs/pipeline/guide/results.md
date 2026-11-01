# Results & Meta

Every action answers a `ResultsInterface`: `data`, an array of resources, and `meta`, everything else
about the call.

```ts
{
    data: [
        { id: "1", firstName: "Nico" },
        { id: "2", firstName: "Seb" }
    ],
    meta: { count: 2 }
}
```

`data` is an array for every action — what was created, matched, patched or deleted — even for one
resource. A pipe can map over it without branching on how many there are, and an action that matched
nothing returns an empty array rather than an error. Looking one resource up is `read` plus an index:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
// ---cut---
const user = (await users.read({ id: "1" })).data[0] // undefined if there is no such user
```

## Meta

`meta` is where a pipe says something about the call as a whole: a total count, a timing, a request
id, the relations that were asked for. It is typed as `META & RM`, the shared `meta` builder
intersected with the action's own:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const Timed = (p: Builders) => ({
    readMeta: p.readMeta.addNumber("elapsedMs", {}, false),
    read: async (next: PipeReadNext<User, ReadQuery, Builders["readMeta"]["T"]>, query: ReadQuery, context: any) => {
        const started = Date.now()
        const result = await next(query, context)
        return { ...result, meta: { ...result.meta, elapsedMs: Date.now() - started } }
    },
})

const users = new MemoryPipeline(userSchema).pipe(Timed)
const page = await users.read({ withCount: true })
page.meta
//   ^?
```

A pipe adding to meta declares it on a builder and **merges** into what came back: everything below
has already contributed, relations included, and replacing `meta` throws that away.

- **`meta`** is for anything that applies to more than one action: declared once, every action's
  result type picks it up. Relations use it.
- **`readMeta`**, **`createMeta`**, **`patchMeta`**, **`deleteMeta`** are for what only makes sense
  for that action — a total count belongs to `read`.

**`relations` is a reserved key.** Relations are namespaced under it so pipes can merge freely into
the top level of `meta`. What they put there is described in [Relations](./relations#the-result).
