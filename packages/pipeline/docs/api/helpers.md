# Helpers & errors

The pieces `MemoryPipeline` is built from, exported so a source of your own can reuse them, plus the
error constructors.

## Matching

```ts twoslash
import { matchQuery, matchValue, assertQueryProperties } from "@serafin/pipeline"

const order = { id: "1", tags: ["urgent"], lines: [{ sku: "a", qty: 2 }] }

matchQuery({ "lines.qty": { $gt: 1 } }, order) // true
matchValue({ $regex: "^ur" }, "urgent") // true -- one value, one condition
```

### `matchQuery(query, resource): boolean`

Does `resource` match `query`? The query is a map of property paths to conditions, plus `$and` /
`$or` / `$nor` at the top level. An empty query matches everything; `undefined` and `null` match
everything too.

Throws on an unknown operator, on an operator at the top level that is not one of the three logical
ones, and on a condition mixing operators with plain properties.

### `matchValue(condition, value): boolean`

One value against one property condition. This is what `$pull` selects array elements with.

### `assertQueryProperties(query, isKnown, describe)`

Throws if the query filters on a property `isKnown` rejects, with the message `describe` produces.
Only the first segment of a dotted path is checked, and the query `$elemMatch` carries is left alone
— it applies to array elements, not to the model.

The failure it catches is a pipe that should have translated a query property and didn't. Walk it
once per action rather than per resource, so an empty store rejects a bad query too.

### `queryOperators`, `logicalQueryOperators`

```ts twoslash
import { queryOperators, logicalQueryOperators } from "@serafin/pipeline"

queryOperators
//   ^?
logicalQueryOperators
//   ^?
```

## Comparing

### `compareValues(a, b): number | undefined`

Compares two values **of the same type**, or answers `undefined` when they are not comparable.
Numbers, strings, booleans and `Date`s. This is what makes `{ age: { $gt: 5 } }` never match an age
stored as a string.

### `compareForSort(a, b): number`

The total order `sort` uses: by type first, then by value within a type, ties left in place. It is
*not* BSON order.

## Patching

```ts twoslash
import { applyPatch, isUpdateDocument, updateOperators } from "@serafin/pipeline"

const user = { id: "1", firstName: "Nico", views: 1 }

applyPatch(user, { firstName: "Nicolas" }) // merge patch
applyPatch(user, { $inc: { views: 1 } }) // update document
isUpdateDocument({ $inc: { views: 1 } }) // true
```

### `applyPatch(resource, values): T`

A patched **copy** of `resource`. `values` is an update document or a
[JSON merge patch](https://tools.ietf.org/html/rfc7396), decided by its shape.

### `isUpdateDocument(values): boolean`

True when every key of `values` is an operator. Throws when they are mixed with plain properties.

### `updateOperators`

The update vocabulary, in the order it is applied — mongodb leaves the order between different
operators unspecified, and fixing it makes an update reproducible.

```ts twoslash
import { updateOperators } from "@serafin/pipeline"

updateOperators
//   ^?
```

## Paths

```ts twoslash
import { parsePath, valuesAtPath, getAtPath, hasAtPath, setAtPath, unsetAtPath } from "@serafin/pipeline"

const order = { id: "1", lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }
const path = parsePath("lines.qty")

valuesAtPath(order, path) // [2, 5] -- a path through an array reaches every element
getAtPath(order, parsePath("lines.0.qty")) // 2
hasAtPath(order, parsePath("lines.0.sku")) // true
```

`parsePath` rejects an empty segment and the segments `__proto__`, `constructor` and `prototype`.

`setAtPath` creates missing intermediate objects, and refuses to create a property *through* a value
that cannot hold one — naming the path in the error rather than throwing a bare `TypeError`.

`unsetAtPath` on an array index leaves a `null` in place rather than shifting the elements after it.

## `stableKey(value): string`

A stable string for any JSON value, so two structurally equal values collapse onto the same key.
Object keys are sorted, so property order never matters, and the type is part of the key, so `1` and
`"1"` stay distinct.

```ts twoslash
import { stableKey } from "@serafin/pipeline"

stableKey({ b: 1, a: 2 }) === stableKey({ a: 2, b: 1 }) // true
stableKey(1) === stableKey("1") // false
```

Used wherever a query has to be recognised as one already seen: relation grouping, and the read
cache.

## `inlineRelations(result)`

Joins a normalized result back into the shape relations used to have, with each related resource
hanging off the resource that points at it. A **pure function** over the result — no reads — so it
can be applied at the edge and skipped on hot paths. `meta` is returned untouched, which makes
applying it twice harmless.

See [Reading Relations](/guide/reading-relations#getting-the-inlined-shape-back).

## `QueryTemplate`

Hydrates a relation's query template against a resource. Rarely called directly — relations use it.

| Method | Does |
| ------ | ---- |
| `hydrate(query, resource)` | replaces each `:field` with that field of the resource |
| `getTemplatedParts(query)` | just the `:field` entries |
| `getNonTemplatedParts(query)` | just the literal ones |
| `escape(value)` | turns a leading `\:` into `:` |

An absent field is an error. `false`, `0`, `""` and `null` are legitimate keys and pass through.

## Errors

```ts twoslash
import { error, validationError, notFoundError, conflictError, forbiddenError } from "@serafin/pipeline"

throw error("MyAppQuotaError", "The account is over its quota", { limit: 100, used: 143 })
```

| Constructor | Name |
| ----------- | ---- |
| `error(name, message, info?, cause?)` | whatever you pass |
| `notFoundError(id, info?, cause?)` | `NotFoundErrorName` — `SerafinNotFoundError` |
| `validationError(message, info?, cause?)` | `ValidationErrorName` — `SerafinSchemaValidationError` |
| `conflictError(id, info?, cause?)` | `ConflictErrorName` — `SerafinConflictError` |
| `notImplementedError(method, sourceName, info?, cause?)` | `NotImplementedErrorName` |
| `unauthorizedError(reason, info?, cause?)` | `UnauthorizedErrorName` |
| `forbiddenError(reason, info?, cause?)` | `ForbiddenErrorName` |
| `movedPermanentlyError(newResource, info?, cause?)` | `MovedPermanentlyErrorName` |

They are [`VError`](https://github.com/TritonDataCenter/node-verror)s: `VError.info(e)` gets the
payload, `VError.cause(e)` the wrapped error. See [Errors](/guide/errors).
