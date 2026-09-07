# Results & Meta

Every action answers the same shape:

```ts twoslash
import { ResultsInterface } from "@serafin/pipeline"
// ---cut---
interface Shape<M, META> {
    data: M[]
    meta: META
}
```

`data` is always an array — for `create`, what was created; for `read`, what matched; for `patch`,
what was patched; for `delete`, what was deleted. `meta` is everything about the call that is not a
resource.

```ts
{
    data: [
        { id: "1", firstName: "Nico", lastName: "Degardin" },
        { id: "2", firstName: "Seb", lastName: "De Saint-Florent" }
    ],
    meta: {
        count: 2
    }
}
```

## Why `data` is always an array

Even for `create` of one resource, and even for `patch` selecting a single `id`. It means a pipe can
be written once and work for every action — mapping over `data` needs no branch on how many resources
there might be — and it means an action that matched nothing is an empty array rather than an error.

Looking one resource up is therefore `read` plus an index:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
// ---cut---
const result = await users.read({ id: "1" })
const user = result.data[0] // undefined if there is no such user
```

## Meta

`meta` is the channel for what a pipe has to say about the call as a whole. A total count, a timing,
a request id, a deprecation notice, the relations that were asked for.

It is typed, like everything else. What an action returns is `META & RM` — the shared `meta` builder
intersected with that action's own:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
const page = await users.read({ withCount: true })
page.meta
//   ^?
```

A pipe adding to meta declares it on the matching builder and merges into what came back:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
// ---cut---
const Timed = (p: Builders) => ({
    readMeta: p.readMeta.addNumber("elapsedMs", {}, false),
    read: async (next: PipeReadNext<User, Builders["readQuery"]["T"], Builders["readMeta"]["T"]>, query: any, context: any) => {
        const started = Date.now()
        const result = await next(query, context)
        return { ...result, meta: { ...result.meta, elapsedMs: Date.now() - started } }
    },
})

const users = new MemoryPipeline(userSchema).pipe(Timed)
;(await users.read({})).meta.elapsedMs
//                          ^?
```

::: tip Merge, don't replace
`{ ...result.meta, mine: 1 }` rather than `{ mine: 1 }`. Everything below has already contributed,
including relations, and a pipe that replaces `meta` throws that away.
:::

### Which meta builder to use

- **`meta`** for anything that applies to more than one action. Declared once; the type of all four
  results picks it up. Relations use this.
- **`readMeta` / `createMeta` / `patchMeta` / `deleteMeta`** for something that only makes sense for
  that action. A total count belongs to `read`; a count of conflicts belongs to `create`.

### Reserved keys

`relations` is reserved. Relations are namespaced under it precisely so that pipes can merge freely
into the top level of `meta` without colliding with them.

## Relations in meta

Asking for a relation puts it in `meta.relations`, normalized rather than inlined into each resource:

```ts
{
    data: [
        { id: "1", addressId: "a1" },
        { id: "2", addressId: "a1" }
    ],
    meta: {
        relations: {
            address: {
                type: "one",
                data:  { a1: { id: "a1", city: "Paris" } },
                index: { "1": "a1", "2": "a1" }
            }
        }
    }
}
```

Both users point at `a1`, and `a1` appears once. [Reading Relations](./reading-relations) explains
why, and `inlineRelations` turns this back into the inlined shape when that is what a caller wants.

## What's next

- [Context](./context) — the other input channel
- [Errors](./errors) — what an action throws, and how to tell them apart
