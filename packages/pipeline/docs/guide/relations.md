# Relations

A relation is a one-directional link from one pipeline to another, resolved when a caller asks for it.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema(), country: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const orderSchema = SB.objectSchema({ title: "Order" }, { id: SB.stringSchema(), userId: SB.stringSchema() })

const addresses = new MemoryPipeline(addressSchema)
const orders = new MemoryPipeline(orderSchema)

const users = new MemoryPipeline(userSchema)
    .addRelationWithOne("address", addresses, { id: ":addressId" }) // the user carries the key
    .addRelationWithMany("orders", orders, { userId: ":id" }) // the orders carry the key

users.relations.address.type // "one"
```

The arguments are the relation's **name**, the **target pipeline**, and a **query template**: a partial
read query of the target in which a value starting with `:` is replaced by that field of the holding
resource. Literal values may sit alongside — `{ userId: ":id", status: "paid" }` — and a literal that
starts with `:` is escaped as `\:`. An absent field is an error (`Resource field addressId not found`);
`false`, `0`, `""` and `null` are legitimate keys.

**One** promises at most one related resource; **many**, any number. They read the same way and differ
in their types and in the shape of the result.

Declaring a relation:

- adds a **`with<Name>` option** to all four actions — `withAddress`, `withOrders`;
- adds the relation to the shared **`meta` schema**, under `relations`;
- registers it on **`pipeline.relations`**;
- returns a **new pipeline**: relations are implemented with `.pipe()`, so their
  [position in the chain](./pipe-order#relations-are-pipes-too) matters.

The target only has to be readable (`ReadOnlyPipelineInterface`), so it can sit over a different store.
A relation is a query, evaluated when asked.

## Reading them

**A relation is only resolved when asked for.** The option is `true`, or a read query of the target
that narrows the related read:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema(), country: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema)
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })
// ---cut---
await users.read({}) // no address is fetched
await users.read({ withAddress: true }) // every user's address
await users.read({ withAddress: { country: "FR" } }) // only the French ones

const result = await users.read({ withAddress: true })
result.meta.relations?.address
//                     ^?
```

## The result

Related resources come back **normalized, in `meta.relations`**, not inlined into each resource:

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
                data: { a1: { id: "a1", city: "Paris" } },
                index: { "1": "a1", "2": "a1" }
            }
        }
    }
}
```

`data` holds each related resource **once**, keyed by its id; `index` maps each holding resource to
the related id, or to an array of ids for a *many* relation. An address shared by a hundred users is
carried once, in the shape a normalized client-side store wants.

`inlineRelations` joins it back, each related resource hanging off the resource pointing at it:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, inlineRelations } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema, { initialData: [{ id: "a1", city: "Paris" }] })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", addressId: "a1" }] }).addRelationWithOne("address", addresses, {
    id: ":addressId",
})
// ---cut---
const result = inlineRelations(await users.read({ withAddress: true }))

result.data[0].address?.city // "Paris"
//             ^?
```

It is a **pure function** over the result — no reads — so it can be applied at the edge and skipped on
hot paths. `meta` is returned untouched, which makes applying it twice harmless.

## Nesting a level deeper

A relation option that is a read query of the target can carry the target's own `with<Name>`
options. The nested relations come back **inside the relation that reached them**, under its own
`relations`, normalized the same way:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, inlineRelations } from "@serafin/pipeline"
// ---cut---
const citySchema = SB.objectSchema({ title: "City" }, { id: SB.stringSchema(), name: SB.stringSchema() })
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), cityId: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })

const cities = new MemoryPipeline(citySchema, { initialData: [{ id: "paris", name: "Paris" }] })
const addresses = new MemoryPipeline(addressSchema, { initialData: [{ id: "a1", cityId: "paris" }] }).addRelationWithOne("city", cities, { id: ":cityId" })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", addressId: "a1" }] }).addRelationWithOne("address", addresses, { id: ":addressId" })

const result = await users.read({ withAddress: { withCity: true } })
result.meta.relations?.address?.relations?.city?.index // { a1: "paris" }

inlineRelations(result).data[0].address?.city?.name // "Paris"
```

```ts
meta: {
    relations: {
        address: {
            type: "one",
            data: { a1: { id: "a1", cityId: "paris" } },
            index: { "1": "a1" },
            relations: {
                city: {
                    type: "one",
                    data: { paris: { id: "paris", name: "Paris" } },
                    index: { a1: "paris" } // keyed by address, not by user
                }
            }
        }
    }
}
```

Each level's `index` is keyed by the resources of the level above it, and two levels may use the same
relation name for different targets, so levels nest rather than merge. `inlineRelations` joins every
level back.

## One read for a whole page

Resolving a relation over a page does **not** read once per resource. Resources whose hydrated query
is identical are grouped, and a whole page resolves in a **single read** when the relation is keyed
on one templated field that the target declares on its model and accepts as an array — 100 users at
40 addresses is one `{ id: [...40 ids] }` read. That is why a derived read query accepts an array on
every property. Otherwise there is one read per distinct key, and a [cache scope](./caching) removes
the duplicates left across relations and pipes.

## No cycles

Pipelines are immutable, so a relation targets the pipeline **as it was when the relation was
declared**, and its `with<Name>` option accepts that pipeline's read query as it stood then. Two
pipelines cannot point at each other:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
// ---cut---
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), companyId: SB.stringSchema() })
const companySchema = SB.objectSchema({ title: "Company" }, { id: SB.stringSchema(), name: SB.stringSchema() })

const usersBase = new MemoryPipeline(userSchema)
const companies = new MemoryPipeline(companySchema).addRelationWithMany("employees", usersBase, { companyId: ":id" })
const users = usersBase.addRelationWithOne("company", companies, { id: ":companyId" })
```

`users` reaches `companies`, whose `employees` relation reaches `usersBase` — which has no `company`
relation. So `{ withCompany: { withEmployees: true } }` is a valid query, and
`{ withCompany: { withEmployees: { withCompany: true } } }` fails validation. Nesting is also bounded
at run time by `maximumRelationDepth` (10).

## Reaching a relation directly

`pipeline.relations` holds each `Relation`, for when you have one resource rather than a page:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema, { initialData: [{ id: "a1", city: "Paris" }] })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", addressId: "a1" }] }).addRelationWithOne("address", addresses, {
    id: ":addressId",
})
const user = (await users.read({ id: "1" })).data[0]
// ---cut---
const related = await users.relations.address.fetch(user) // the relation, for one resource
const withAddress = await users.relations.address.assignToResource(user) // a copy carrying it inline
withAddress.address.city
```
