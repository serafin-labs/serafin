# Helpers & errors

The pieces `MemoryPipeline` is built from, exported so a [source of your own](/guide/writing-a-pipeline#reusable-parts)
can reuse them, plus the error constructors. Their behaviour is described in
[Query Operators](/guide/query-operators) and [Update Operators](/guide/update-operators).

## Matching

| Export | Does |
| ------ | ---- |
| `matchQuery(query, resource): boolean` | does `resource` match `query`? An empty, `undefined` or `null` query matches everything. Throws on an unknown operator, a top-level operator other than `$and` / `$or` / `$nor`, and a condition mixing operators with properties |
| `matchValue(condition, value): boolean` | one value against one property condition — what `$pull` selects elements with |
| `assertQueryProperties(query, isKnown, describe)` | throws if the query filters on a property `isKnown` rejects. Checks the first segment of a dotted path, and leaves the query inside `$elemMatch` alone |
| `queryOperators`, `logicalQueryOperators` | the query vocabulary, as tuples |
| `compareValues(a, b): number \| undefined` | compares two values of the same type — numbers, strings, booleans, `Date`s — or answers `undefined` |
| `compareForSort(a, b): number` | the total order `sort` uses: by type, then by value; not BSON order |

## Patching

| Export | Does |
| ------ | ---- |
| `applyPatch(resource, values): T` | a patched **copy**, from an update document or a merge patch, decided by shape |
| `isUpdateDocument(values): boolean` | true when every key is an operator; throws when operators and properties are mixed |
| `updateOperators` | the update vocabulary, in the order it is applied |

## Paths

```ts twoslash
import { parsePath, valuesAtPath, getAtPath, hasAtPath } from "@serafin/pipeline"

const order = { id: "1", lines: [{ sku: "a", qty: 2 }, { sku: "b", qty: 5 }] }

valuesAtPath(order, parsePath("lines.qty")) // [2, 5] -- a path through an array reaches every element
getAtPath(order, parsePath("lines.0.qty")) // 2
hasAtPath(order, parsePath("lines.0.sku")) // true
```

`parsePath` rejects an empty segment and the segments `__proto__`, `constructor` and `prototype`.
`setAtPath` creates missing intermediate objects and names the path when it cannot; `unsetAtPath` on
an array index leaves a `null` in place.

## `stableKey(value): string`

A stable string for any JSON value: object keys are sorted, and the type is part of the key, so
`{ b: 1, a: 2 }` and `{ a: 2, b: 1 }` collide while `1` and `"1"` do not. Used to recognise a query
already seen, in relation grouping and the read cache.

## Relations

| Export | Does |
| ------ | ---- |
| `inlineRelations(result)` | joins `meta.relations` back into each resource; pure — see [Relations](/guide/relations#the-result) |
| `QueryTemplate.hydrate(query, resource)` | replaces each `:field` with that field of the resource; an absent field throws |
| `QueryTemplate.getTemplatedParts(query)`, `getNonTemplatedParts(query)` | the `:field` entries, or the literal ones |
| `QueryTemplate.escape(value)` | turns a leading `\:` into `:` |

## Errors

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

`validationError` prefixes its message with `Invalid parameters: `. All are
[`VError`](https://github.com/TritonDataCenter/node-verror)s: `VError.info(e)` gets the payload,
`VError.cause(e)` the wrapped error. See [Errors](/guide/errors).
