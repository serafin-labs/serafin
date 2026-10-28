# Query Operators

`MemoryPipeline` understands mongodb-style query operators: **the vocabulary a pipe written against a
mongodb source already emits**, so such a pipe works here unchanged.

Operators reach the store from **inside a pipe**, through `next`; a caller cannot send one, since the
public schemas describe plain values. [SourceQuery & Capabilities](./source-query) explains that
contract. The examples below call `matchQuery`, the exported pure function `MemoryPipeline` filters
with.

## On a value

| Operator | Takes | Matches when |
| -------- | ----- | ------------ |
| `$eq`, `$ne` | a value | equal (on an array property: contained in it), or not |
| `$gt` `$gte` `$lt` `$lte` | a value | ordered that way against it, **same type only** |
| `$in`, `$nin` | an array | equal to any entry, or to none |
| `$exists` | a boolean | the property is present, or absent |
| `$type` | a type name | the value is a `"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`, `"date"`, `"regex"` or `"null"` |
| `$regex`, `$options` | a string or `RegExp`, flags | the value matches it |
| `$mod` | `[divisor, remainder]` | the remainder is that |
| `$not` | operators or a `RegExp` | they do not match |

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const nico = { id: "1", firstName: "Nico", age: 40 }

matchQuery({ age: { $gt: 30, $lte: 40 } }, nico) // true
matchQuery({ age: { $in: [40, 41] } }, nico) // true
matchQuery({ deletedAt: { $exists: false } }, nico) // true
matchQuery({ deletedAt: null }, nico) // true -- null matches an absent property too
matchQuery({ age: { $type: "number" } }, nico) // true
matchQuery({ firstName: { $regex: "^ni", $options: "i" } }, nico) // true
matchQuery({ firstName: /^Ni/ }, nico) // true -- a bare RegExp works too
matchQuery({ age: { $mod: [2, 0] } }, nico) // true
matchQuery({ age: { $not: { $gt: 65 } } }, nico) // true
```

Comparisons answer *no match* across types rather than inventing an order, so `{ age: { $gt: 5 } }`
never matches an age stored as a string — mongodb, with BSON ordering, would. `$type` takes
JavaScript type names, since nothing here stores BSON.

## On an array

| Operator | Takes | Matches when |
| -------- | ----- | ------------ |
| `$size` | a number | the array has exactly that many elements |
| `$all` | an array | every entry is present |
| `$elemMatch` | a query or operators | **one element** satisfies all of it |

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const order = { id: "1", tags: ["urgent", "paid"], lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }

matchQuery({ tags: { $size: 2 } }, order) // true
matchQuery({ tags: { $all: ["urgent", "paid"] } }, order) // true
matchQuery({ tags: "urgent" }, order) // true -- a scalar is contained in the array

matchQuery({ lines: { $elemMatch: { sku: "a", qty: { $gt: 4 } } } }, order) // false -- no single line
matchQuery({ "lines.sku": "a", "lines.qty": { $gt: 4 } }, order) // true -- different lines
```

As in mongodb, a condition on an array applies to each element, so conditions may be met by
*different* elements; `$elemMatch` requires one element to meet all of them.

## Logical and dotted paths

`$and`, `$or` and `$nor` sit at the **top level** of a query, each with at least one clause; plain
properties alongside them are ANDed. A dotted path reaches inside a property, and through an array it
applies to **each element**:

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const order = { id: "1", status: "paid", address: { city: "Paris" }, lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }

matchQuery({ status: "paid", $or: [{ "address.city": "Lyon" }, { "lines.qty": { $gt: 4 } }] }, order) // true
matchQuery({ "lines.0.sku": "a" }, order) // true -- the first line specifically
```

Only the first segment names a model property. A segment named `__proto__`, `constructor` or
`prototype` is rejected.

## An unknown operator is an error

```ts twoslash
import { matchQuery } from "@serafin/pipeline"
const nico = { id: "1", age: 40 }
// ---cut---
matchQuery({ age: { $between: [18, 65] } }, nico)
// SerafinSchemaValidationError: Invalid parameters: '$between' is not an operator this pipeline understands
```

Not a no-op: **an operator a source silently drops returns a plausible page of the wrong resources**.
Mixing operators and plain properties in one condition is rejected for the same reason —
`{ $gt: 1, name: "a" }` reads as a comparison to some implementations and a subdocument to others.

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
// SerafinSchemaValidationError: Invalid parameters: 'minAge' is not a property of User.
// A pipe that should have translated it is missing, or attached in the wrong order.
```

`minAge` is a public parameter some pipe should have translated; untranslated, it would match nothing
and look like a legitimate empty page. The check runs once per action, so an empty store rejects the
query too.

## Where it differs from mongodb, on purpose

**An array on a property means "any of"**, which is what relation resolution sends. Mongodb reads it
as equality with that exact array; ask for that here with `{ $eq: [...] }`.

```ts twoslash
import { matchQuery } from "@serafin/pipeline"

const order = { id: "1", tags: ["urgent", "paid"] }

matchQuery({ tags: ["urgent"] }, order) // true -- any of
matchQuery({ tags: { $eq: ["urgent"] } }, order) // false -- equals exactly
matchQuery({ tags: { $eq: ["urgent", "paid"] } }, order) // true
```

**Comparisons are same-type only**, and **`sort` orders by type first, then by value**, rather than in
BSON order. Ties keep the order they were selected in.

**Not implemented at all:** positional update operators (`$`, `$[]`), `$where`, aggregation,
collation, and indexes other than the one on `id`.
