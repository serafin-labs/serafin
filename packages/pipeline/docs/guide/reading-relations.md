# Reading Relations

Declaring a relation adds a `with<Name>` option to all four actions. **Relations are only resolved
when asked for:**

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema(), country: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema)
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })
// ---cut---
await users.read({}) // no address is fetched
await users.read({ withAddress: true }) // address is fetched
```

The option also takes a **query for the target**, which narrows the related read:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const citySchema = SB.objectSchema({ title: "City" }, { id: SB.stringSchema(), name: SB.stringSchema() })
const cities = new MemoryPipeline(citySchema)
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), cityId: SB.stringSchema(), country: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema).addRelationWithOne("city", cities, { id: ":cityId" })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })
// ---cut---
await users.read({ withAddress: { country: "FR" } })

// and it can carry the target's own `with<Name>` options, to nest a level deeper
await users.read({ withAddress: { country: "FR", withCity: true } })
```

Nesting is bounded by `maximumRelationDepth` (10).

## Where the result goes

Related resources come back **normalized, in `meta.relations`** — not inlined into each resource:

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

`data` holds each related resource **once**, keyed by its own id. `index` maps a holding resource's id
to the related id — an array of ids for a *many* relation.

Three reasons it is shaped this way:

- **A shared target is carried once.** Both users live at `a1`, and `a1` appears once. Inlined, a
  page of a hundred users at one address carries that address a hundred times.
- **Cyclic graphs are representable at all.** Inlining a user's company, whose employees include that
  user, does not terminate.
- **It merges into a client-side cache.** `data` is already keyed by id, which is the shape a
  normalized store wants.

And it is typed:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema)
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })
// ---cut---
const result = await users.read({ withAddress: true })

const relation = result.meta.relations?.address
//    ^?
```

## Getting the inlined shape back

`inlineRelations` joins it back together, with each related resource hanging off the resource that
points at it:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, inlineRelations } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema, { initialData: [{ id: "a1", city: "Paris" }] })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", addressId: "a1" }] }).addRelationWithOne(
    "address",
    addresses,
    { id: ":addressId" },
)
// ---cut---
const result = inlineRelations(await users.read({ withAddress: true }))

result.data[0].address?.city // "Paris"
//             ^?
```

It is a **pure function over the result** — no reads, no I/O — so it can be applied at the edge, where
a client wants the convenient shape, and skipped on hot paths. `meta` is returned untouched, which
makes applying it twice harmless.

## One read for a whole page

Resolving a relation over a page of resources does **not** issue a read per resource.

Resources whose hydrated query comes out identical are grouped and read once. Beyond that, a whole
page resolves in a **single read** when the relation is keyed on one templated field that the target
declares on its model *and* accepts as an array on its read query:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema)
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })
// ---cut---
// 100 users at 40 distinct addresses -> one read: `{ id: [ ...40 ids ] }`
await users.read({ limit: 100, withAddress: true })
```

That is exactly why a read query built by `defaultSchemaBuilders` accepts an array on every property,
and why an array means *any of these*. A target whose read query does not accept an array for the
keyed field falls back to one read per distinct target — still de-duplicated, just not batched.

::: tip Combine it with a cache scope
Batching removes the duplicate reads within one relation. A [cache scope](./caching) removes them
across relations and pipes, for the whole request.
:::

## Reaching a relation directly

`pipeline.relations` holds each `Relation`, for the times you have one resource rather than a page:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema, { initialData: [{ id: "a1", city: "Paris" }] })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", addressId: "a1" }] }).addRelationWithOne(
    "address",
    addresses,
    { id: ":addressId" },
)
const user = (await users.read({ id: "1" })).data[0]
// ---cut---
// read the relation for one resource
const result = await users.relations.address.fetch(user)

// or get a copy of the resource carrying it inline
const withAddress = await users.relations.address.assignToResource(user)
withAddress.address.city
```

## What's next

- [Results & Meta](./results) — the rest of what comes back
- [Caching](./caching) — deduplicating reads across a whole request
