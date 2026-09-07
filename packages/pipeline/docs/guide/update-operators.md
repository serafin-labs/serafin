# Update Operators

Patch values are read one of two ways, decided by their **shape**:

- every key an operator → an **update document**;
- otherwise → a [JSON merge patch](https://tools.ietf.org/html/rfc7396).

Mixing the two in one patch is rejected, as it is in mongodb.

Like [query operators](./query-operators), update operators are an internal vocabulary: they come
from a pipe's `next` call, not from a caller. `applyPatch` is exported and pure, so the examples
below use it directly — it is the same function `MemoryPipeline` patches with.

## Merge patch

The default, and what the derived `patchValues` schema describes. **Absent leaves alone, `null`
deletes**, and anything that is not a plain object — an array included — replaces what was there.

```ts twoslash
import { applyPatch } from "@serafin/pipeline"

const user = { id: "1", firstName: "Nico", nickname: "nico", address: { city: "Lyon", country: "FR" } }

applyPatch(user, { firstName: "Nicolas" }) // firstName changed, everything else kept
applyPatch(user, { nickname: null }) // nickname removed
applyPatch(user, { address: { city: "Paris" } }) // merged: country is still "FR"
```

That last line is the one worth remembering: a merge patch **recurses into plain objects**, so
patching a nested property does not drop its siblings. To replace an object wholesale, clear it and
set it, or use `$set`.

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const user = { id: "1", tags: ["a", "b"] }
// ---cut---
applyPatch(user, { tags: ["c"] }) // arrays replace: tags is now ["c"]
```

## Update document

Every key an operator. They are applied in a **fixed order** — `$rename`, `$unset`, `$set`, `$inc`,
`$mul`, `$min`, `$max`, `$push`, `$addToSet`, `$pull`, `$pullAll`, `$pop` — because mongodb leaves the
order between different operators unspecified, and fixing it makes an update reproducible.

### Setting and removing

| Operator | Takes | Does |
| -------- | ----- | ---- |
| `$set` | path → value | sets it, creating containers as needed |
| `$unset` | path → `""`, `1`, `true` | removes it |
| `$rename` | path → path | moves it, if it is there |

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const user = { id: "1", firstName: "Nico", nickname: "nico" }
// ---cut---
applyPatch(user, { $set: { firstName: "Nicolas", "address.city": "Paris" } })
applyPatch(user, { $unset: { nickname: "" } })
applyPatch(user, { $rename: { firstName: "givenName" } })
```

`$set` with a dotted path is how you replace a nested value without merging into it — the difference
from a merge patch.

### Numbers

| Operator | Takes | Does |
| -------- | ----- | ---- |
| `$inc` | path → number | adds it; an absent property counts as `0` |
| `$mul` | path → number | multiplies; an absent property counts as `0` |
| `$min` | path → value | sets it if the new value is smaller |
| `$max` | path → value | sets it if the new value is larger |

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const stats = { id: "1", views: 10, best: 5 }
// ---cut---
applyPatch(stats, { $inc: { views: 1 } }) // 11
applyPatch(stats, { $inc: { misses: 1 } }) // created, as 1
applyPatch(stats, { $max: { best: 9 } }) // 9
applyPatch(stats, { $max: { best: 3 } }) // still 5
```

`$inc` and `$mul` refuse a property that holds something other than a number. `$min` and `$max`
compare with the same same-type rule the query operators use, and set an absent property
unconditionally.

### Arrays

| Operator | Takes | Does |
| -------- | ----- | ---- |
| `$push` | element, or `{ $each: [...] }` | appends |
| `$addToSet` | element, or `{ $each: [...] }` | appends what is not already there |
| `$pull` | element or condition | removes what matches |
| `$pullAll` | array | removes those elements, by equality |
| `$pop` | `1` or `-1` | removes the last (`1`) or first (`-1`) element |

```ts twoslash
import { applyPatch } from "@serafin/pipeline"

const order = { id: "1", tags: ["urgent"], lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }

applyPatch(order, { $push: { tags: "paid" } }) // ["urgent", "paid"]
applyPatch(order, { $push: { tags: { $each: ["paid", "late"] } } }) // both appended
applyPatch(order, { $addToSet: { tags: "urgent" } }) // unchanged; already there
applyPatch(order, { $pop: { tags: 1 } }) // last element removed
applyPatch(order, { $pullAll: { tags: ["urgent"] } }) // that element removed
```

`$push` and `$addToSet` **create** the array when the property is absent. Any modifier other than
`$each` — `$position`, `$slice`, `$sort` — is refused rather than ignored.

`$pull` selects with the same conditions a query selects resources with, which is what makes it able
to pull from an array of objects:

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const order = { id: "1", tags: ["urgent", "paid"], lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }
// ---cut---
applyPatch(order, { $pull: { tags: "urgent" } }) // by value
applyPatch(order, { $pull: { tags: { $regex: "^ur" } } }) // by operator
applyPatch(order, { $pull: { lines: { sku: "a" } } }) // by query, on the elements
applyPatch(order, { $pull: { lines: { qty: { $gt: 4 } } } }) // conditions work too
```

## Dotted paths

Paths work as they do in queries, including through arrays by index:

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const order = { id: "1", lines: [{ sku: "a", qty: 2 }] }
// ---cut---
applyPatch(order, { $set: { "lines.0.qty": 9 } })
applyPatch(order, { $inc: { "lines.0.qty": 1 } })
```

`$set` creates missing intermediate objects, and refuses to create a property *through* a value that
cannot hold one — patching `"name.first"` where `name` is a string names the path in the error rather
than throwing a bare `TypeError`.

`$unset` on an array index leaves a `null` in place rather than shifting the elements after it, which
is what mongodb does too.

## An unknown operator is an error

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const user = { id: "1", views: 1 }
// ---cut---
applyPatch(user, { $bit: { views: 1 } })
// SerafinSchemaValidationError: '$bit' is not an update operator this pipeline understands
```

And mixing shapes:

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const user = { id: "1", firstName: "Nico", views: 1 }
// ---cut---
applyPatch(user, { $inc: { views: 1 }, firstName: "Nicolas" })
// SerafinSchemaValidationError: Patch values cannot mix update operators and properties
```

## Not implemented

Positional operators — `$`, `$[]`, `$[<identifier>]` — and the `$push` modifiers `$position`,
`$slice` and `$sort`. Use a dotted index where the position is known, or read, modify and `$set`.

## What's next

- [SourceQuery & SourceValues](./source-query) — these operators, in the type system
- [Writing a Pipeline](./writing-a-pipeline) — reusing `applyPatch` in a source of your own
