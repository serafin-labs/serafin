# Query Operators

`MemoryPipeline` understands mongodb-style query operators. That is not decoration: **it is the
vocabulary a pipe written against a mongodb source already emits**, so such a pipe works here
unchanged, and a prototype built on memory moves to a database as a change of pipeline.

## They are an internal vocabulary

Operators do **not** go through the public actions. `readQuery` says `age` is an integer, so a caller
passing a condition is rejected before any pipe runs:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: [SB.integerSchema(), undefined] })
const users = new MemoryPipeline(userSchema)
// ---cut---
await users.read({ age: { $gte: 18 } } as any)
// SerafinValidationError: Validation failed in MemoryPipeline::read(query):
// data/age must be integer, data/age must be array
```

Operators reach the source from **inside a pipe**, through `next`, which is never revalidated:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: [SB.integerSchema(), undefined] })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const MinAge = (p: Builders) => {
    const readQuery = p.readQuery.addNumber("minAge", { minimum: 0 }, false)
    return {
        requires: ["$gte"],
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { minAge, ...rest } = query
            return next(minAge === undefined ? rest : { ...rest, age: { $gte: minAge } }, context)
        },
    }
}

const users = new MemoryPipeline(userSchema).pipe(MinAge)

await users.read({ minAge: 18 }) // public parameter in, operator down
```

That is the whole design: the public schema stays a clean description of what callers may ask for,
and the operator vocabulary is how a pipe says what it means to whatever implements the store. See
[SourceQuery & SourceValues](./source-query) for the types, and [Capabilities](./capabilities) for
declaring which operators a source honours.

::: tip Trying operators out
`matchQuery` is exported and pure, so the examples below use it directly — it is the same function
`MemoryPipeline` filters with. `new MemoryPipeline(schema, { validationEnabled: false })` is the other
way to send operators straight in.
:::

## Comparison

| Operator | Takes | Matches when |
| -------- | ----- | ------------ |
| `$eq` | a value | equal — or, on an array property, contained in it |
| `$ne` | a value | not `$eq` |
| `$gt` `$gte` `$lt` `$lte` | a value | ordered that way against it |
| `$in` | an array | equal to any entry |
| `$nin` | an array | not `$in` |

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const nico = { id: "1", firstName: "Nico", age: 40 }

matchQuery({ age: { $gt: 30, $lte: 40 } }, nico) // true
matchQuery({ age: { $in: [40, 41] } }, nico) // true
matchQuery({ firstName: { $ne: "Seb" } }, nico) // true

// `null` matches an absent property as well as an explicit null -- so this finds
// resources that were never soft-deleted, whether the property is missing or null
matchQuery({ deletedAt: null }, nico) // true
```

::: warning Comparisons are same-type only
`$gt` and friends answer *no match* across types rather than inventing an order, so
`{ age: { $gt: 5 } }` never matches an age someone stored as a string. Mongodb, with BSON type
ordering, would.
:::

## Existence and type

| Operator | Takes | Matches when |
| -------- | ----- | ------------ |
| `$exists` | a boolean | the property is present (`true`) or absent (`false`) |
| `$type` | a type name | the value is of that type |

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", firstName: "Nico", age: 40 }
// ---cut---
matchQuery({ deletedAt: { $exists: false } }, nico) // true
matchQuery({ age: { $type: "number" } }, nico) // true
```

`$type` takes **JavaScript** type names, not BSON type numbers — nothing here stores BSON:
`"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`, `"date"`, `"regex"`, `"null"`.

## Strings

| Operator | Takes | Matches when |
| -------- | ----- | ------------ |
| `$regex` | a string or `RegExp` | the value matches it |
| `$options` | flags | qualifies `$regex` — invalid on its own |

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", firstName: "Nico", age: 40 }
// ---cut---
matchQuery({ firstName: { $regex: "^ni", $options: "i" } }, nico) // true
matchQuery({ firstName: { $regex: /^Ni/ } }, nico) // true
matchQuery({ firstName: /^Ni/ }, nico) // a bare RegExp works too
```

## Numbers

`$mod` takes `[divisor, remainder]`:

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", age: 40 }
// ---cut---
matchQuery({ age: { $mod: [2, 0] } }, nico) // true -- an even age
```

## Arrays

| Operator | Takes | Matches when |
| -------- | ----- | ------------ |
| `$size` | a number | the array has exactly that many elements |
| `$all` | an array | every entry is present |
| `$elemMatch` | a query or operators | **one element** satisfies all of it |

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const order = {
    id: "1",
    tags: ["urgent", "paid"],
    lines: [
        { sku: "a", qty: 2 },
        { sku: "b", qty: 5 },
    ],
}

matchQuery({ tags: { $size: 2 } }, order) // true
matchQuery({ tags: { $all: ["urgent", "paid"] } }, order) // true
matchQuery({ tags: "urgent" }, order) // true -- a scalar is contained in the array

// one line with sku "b" AND qty over 4
matchQuery({ lines: { $elemMatch: { sku: "b", qty: { $gt: 4 } } } }, order) // true
matchQuery({ lines: { $elemMatch: { sku: "a", qty: { $gt: 4 } } } }, order) // false

// without $elemMatch, the two conditions may be met by *different* elements
matchQuery({ "lines.sku": "a", "lines.qty": { $gt: 4 } }, order) // true
```

::: info Why `$elemMatch` exists
A condition applies to a property **and**, when the property is an array, to each of its elements — so
conditions in the same operator document may be satisfied by *different* elements. That is mongodb's
behaviour, and it is reproduced here. `$elemMatch` is how you require one element to satisfy all of
them.
:::

## Logical

`$and`, `$or` and `$nor`, at the **top level** of a query, each taking at least one clause:

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", firstName: "Nico", age: 40 }
// ---cut---
matchQuery({ $or: [{ age: { $lt: 18 } }, { age: { $gt: 30 } }] }, nico) // true
matchQuery({ $nor: [{ firstName: "Seb" }] }, nico) // true

// plain properties alongside them are ANDed
matchQuery({ firstName: "Nico", $or: [{ age: { $gt: 30 } }, { age: null }] }, nico) // true
```

`$not` is the per-property negation, taking operators or a regular expression:

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", firstName: "Nico", age: 40 }
// ---cut---
matchQuery({ age: { $not: { $gt: 65 } } }, nico) // true
matchQuery({ firstName: { $not: /^Se/ } }, nico) // true
```

## Dotted paths

A property path can be dotted, and a path through an array applies to **each of its elements**:

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const order = { id: "1", address: { city: "Paris" }, lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }

matchQuery({ "address.city": "Paris" }, order) // true
matchQuery({ "lines.qty": { $gt: 4 } }, order) // true -- any line
matchQuery({ "lines.0.sku": "a" }, order) // true -- the first line specifically
```

Only the **first segment** names a model property; the rest is inside whatever it holds. A path
segment named `__proto__`, `constructor` or `prototype` is rejected.

## An unknown operator is an error

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", age: 40 }
// ---cut---
matchQuery({ age: { $between: [18, 65] } }, nico)
// SerafinSchemaValidationError: '$between' is not an operator this pipeline understands
```

Not a no-op. **A query operator a source silently drops returns a plausible page of the wrong
resources**, which is far worse than a failure. Mixing operators and plain properties in one
condition is rejected for the same reason: `{ $gt: 1, name: "a" }` reads as a comparison to some
implementations and as a subdocument to others.

## When a pipe forgets to translate

A query property **the model does not declare** is an error too:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: [SB.integerSchema(), undefined] })
// validation off, so the query reaches the store the way a pipe's `next` call would
const users = new MemoryPipeline(userSchema, { validationEnabled: false })
// ---cut---
await users.read({ minAge: 18 } as any)
// SerafinSchemaValidationError: 'minAge' is not a property of User.
// A pipe that should have translated it is missing, or attached in the wrong order.
```

This is the failure the check exists for. `minAge` is a *public* parameter — a pipe was supposed to
turn it into `{ age: { $gte: 18 } }`. If that pipe is missing, or attached in the wrong order, the
parameter reaches the implementation untranslated, matches no resource, and the request comes back
looking like a legitimate empty page.

It is checked once per action rather than per resource, so an empty store rejects a bad query too.
The query `$elemMatch` carries is left alone — it applies to the elements of an array, not to the
model.

## Where it differs from mongodb, on purpose

**An array on a property means "any of".** `{ id: ["1", "2"] }` matches either id, which is what
`transformPropertiesToArray` builds the read query for and what relation resolution sends. Mongodb
reads the same query as equality with that exact array; ask for that here with `{ $eq: [...] }`.

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const order = { id: "1", tags: ["urgent", "paid"] }

matchQuery({ tags: ["urgent"] }, order) // true -- any of
matchQuery({ tags: { $eq: ["urgent"] } }, order) // false -- equals exactly
matchQuery({ tags: { $eq: ["urgent", "paid"] } }, order) // true
```

**Comparisons are same-type only**, as above.

**`sort` orders by type first, then by value.** Not BSON order. Sorting a property that holds one type
is well defined; a mixed one is grouped by type, stably. Ties keep the order they were selected in.

**Not implemented at all:** positional update operators (`$`, `$[]`), `$where`, aggregation,
collation, and indexes other than the one on `id`.

## What's next

- [Update Operators](./update-operators) — the same story for patches
- [SourceQuery & SourceValues](./source-query) — these operators, in the type system
