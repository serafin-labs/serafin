# Update Operators

Patch values are read one of two ways, decided by their **shape**: every key an operator makes an
**update document**; otherwise they are a [JSON merge patch](https://tools.ietf.org/html/rfc7396).
Mixing the two is rejected, as in mongodb.

Update documents come from a pipe's `next` call, never from a caller — see
[SourceQuery & Capabilities](./source-query). The examples call `applyPatch`, the exported pure
function `MemoryPipeline` patches with.

## Merge patch

The default, and what the derived `patchValues` schema describes. **Absent leaves alone, `null`
deletes**, plain objects are merged recursively, and anything else — an array included — replaces
what was there.

```ts twoslash
import { applyPatch } from "@serafin/pipeline"

const user = { id: "1", firstName: "Nico", nickname: "nico", tags: ["a"], address: { city: "Lyon", country: "FR" } }

applyPatch(user, { firstName: "Nicolas" }) // firstName changed, everything else kept
applyPatch(user, { nickname: null }) // nickname removed
applyPatch(user, { address: { city: "Paris" } }) // merged: country is still "FR"
applyPatch(user, { tags: ["c"] }) // arrays replace
```

To replace a nested object wholesale rather than merge into it, use `$set`.

## Update document

Operators are applied in a **fixed order** — `$rename`, `$unset`, `$set`, `$inc`, `$mul`, `$min`,
`$max`, `$push`, `$addToSet`, `$pull`, `$pullAll`, `$pop` — since mongodb leaves the order between
operators unspecified, and fixing it makes an update reproducible.

| Operator | Takes | Does |
| -------- | ----- | ---- |
| `$set` | path → value | sets it, creating intermediate objects |
| `$unset` | path → `""`, `1`, `true` | removes it; on an array index, leaves `null` in place |
| `$rename` | path → path | moves it, if it is there |
| `$inc`, `$mul` | path → number | adds or multiplies; an absent property counts as `0`; a non-number is refused |
| `$min`, `$max` | path → value | sets it if smaller, or larger, by the same-type rule queries use; an absent property is set |
| `$push` | element, or `{ $each: [...] }` | appends, creating the array if absent |
| `$addToSet` | element, or `{ $each: [...] }` | appends what is not already there |
| `$pull` | element or condition | removes what matches |
| `$pullAll` | array | removes those elements, by equality |
| `$pop` | `1` or `-1` | removes the last or first element |

```ts twoslash
import { applyPatch } from "@serafin/pipeline"

const order = { id: "1", views: 10, tags: ["urgent"], lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }

applyPatch(order, { $set: { "address.city": "Paris", "lines.0.qty": 9 } })
applyPatch(order, { $unset: { views: "" } })
applyPatch(order, { $inc: { views: 1, misses: 1 } }) // views 11, misses created as 1
applyPatch(order, { $max: { views: 3 } }) // still 10
applyPatch(order, { $push: { tags: { $each: ["paid", "late"] } } })
applyPatch(order, { $addToSet: { tags: "urgent" } }) // unchanged; already there
applyPatch(order, { $pull: { lines: { qty: { $gt: 4 } } } }) // conditions select elements, as queries select resources
```

Paths work as in queries, including through arrays by index. `$set` refuses to create a property
*through* a value that cannot hold one, naming the path rather than throwing a bare `TypeError`.

## Errors

An unknown operator, a `$push` modifier other than `$each`, and a mix of shapes are refused rather
than ignored:

```ts twoslash
import { applyPatch } from "@serafin/pipeline"
const user = { id: "1", firstName: "Nico", views: 1 }
// ---cut---
applyPatch(user, { $bit: { views: 1 } })
// SerafinSchemaValidationError: Invalid parameters: '$bit' is not an update operator this pipeline understands

applyPatch(user, { $inc: { views: 1 }, firstName: "Nicolas" })
// SerafinSchemaValidationError: Invalid parameters: Patch values cannot mix update operators and properties: '$inc', 'firstName'
```

**Not implemented:** positional operators — `$`, `$[]`, `$[<identifier>]` — and the `$push` modifiers
`$position`, `$slice` and `$sort`. Use a dotted index where the position is known, or read, modify
and `$set`.
