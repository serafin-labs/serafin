# Declaring Relations

A relation is a one-directional link from one pipeline to another, resolved at runtime when a caller
asks for it.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), addressId: SB.stringSchema() },
)

const addresses = new MemoryPipeline(addressSchema)
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })
```

Three arguments: the **name** the relation is known by, the **target pipeline**, and a **query** to
read it with.

## The query template

The query is a partial read query of the target, in which a value starting with `:` is replaced at
runtime by that field of the holding resource.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema(), country: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema)
// ---cut---
const users = new MemoryPipeline(userSchema)
    // `:addressId` -> the user's own addressId
    .addRelationWithOne("address", addresses, { id: ":addressId" })
    // literal values are fine alongside templated ones
    .addRelationWithMany("frenchAddresses", addresses, { id: ":addressId", country: "FR" })
```

A literal value that really does start with `:` is escaped as `\:`.

An absent field is an error — `Resource field addressId not found`. `false`, `0`, `""` and `null` are
legitimate keys and are passed through as they are.

## One and many

`addRelationWithOne` and `addRelationWithMany` differ in what they promise, not in how they read.

**One** means at most one related resource, keyed on the holding resource. `{ id: ":addressId" }` —
the user carries the key.

**Many** means any number, keyed on the target. `{ userId: ":id" }` — the addresses carry the key.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const orderSchema = SB.objectSchema({ title: "Order" }, { id: SB.stringSchema(), userId: SB.stringSchema(), total: SB.numberSchema() })
const orders = new MemoryPipeline(orderSchema)
// ---cut---
const users = new MemoryPipeline(userSchema).addRelationWithMany("orders", orders, { userId: ":id" })
```

The difference shows up in the types and in the shape of the result: a *one* relation indexes to a
single id, a *many* relation to an array of them.

## What declaring one does

`addRelationWithOne` and `addRelationWithMany` are implemented with `.pipe()`, so a relation is a
pipe. Declaring it:

- adds a **`with<Name>` option** to all four actions — `withAddress`, `withOrders`;
- adds the relation to the **`meta` schema**, under `relations`;
- registers it on **`pipeline.relations`**, so it can be reached programmatically;
- returns a **new pipeline**, like any other `.pipe()`.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const addressSchema = SB.objectSchema({ title: "Address" }, { id: SB.stringSchema(), city: SB.stringSchema() })
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), addressId: SB.stringSchema() })
const addresses = new MemoryPipeline(addressSchema)
// ---cut---
const users = new MemoryPipeline(userSchema).addRelationWithOne("address", addresses, { id: ":addressId" })

users.relations.address.type // "one"
users.relations.address.pipeline // the addresses pipeline
```

Because it is a pipe, its **position matters**. A relation declared after a pipe that filters
resources out only resolves for the survivors — see [Order & Composition](./pipe-order).

## Any pipeline will do

The target only has to be readable. `ReadOnlyPipelineInterface` is what a relation asks for, so a
relation can point at a pipeline that has no `create`, or at one over an entirely different store —
a `MemoryPipeline` relating to a database-backed pipeline, or to an HTTP-backed one.

There is nothing bidirectional and nothing to keep in step: a relation is a query, evaluated when
asked.

## Cycles are fine

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

Nothing is resolved until asked for, so a cycle costs nothing to declare. Nesting is bounded by
`maximumRelationDepth`, which is 10 — a caller has to spell out each level, so it only bites when the
read query comes from somewhere untrusted.

## What's next

- [Reading Relations](./reading-relations) — asking for one, and what comes back
