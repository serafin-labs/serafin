# Errors

Errors are [`VError`](https://github.com/TritonDataCenter/node-verror)s with a `name` you can switch
on and an `info` payload carrying the details. Every constructor is exported, so a pipe raising a
domain error raises the same kind of error the library does.

```ts twoslash
import { notFoundError, NotFoundErrorName } from "@serafin/pipeline"
import VError from "verror"

try {
    throw notFoundError("u1")
} catch (e) {
    if ((e as Error).name === NotFoundErrorName) {
        VError.info(e as Error) // { }, plus whatever was passed
    }
}
```

## The names

| Name                            | Constructor              | Raised when                                            |
| ------------------------------- | ------------------------ | ------------------------------------------------------ |
| `SerafinNotFoundError`          | `notFoundError(id)`      | a resource that had to exist does not                  |
| `SerafinSchemaValidationError`  | `validationError(msg)`   | an input is not what it must be                        |
| `SerafinConflictError`          | `conflictError(id)`      | a write collides — a duplicate id, a lost update       |
| `SerafinNotImplementedError`    | `notImplementedError()`  | an action the pipeline does not implement is called    |
| `SerafinUnauthorizedError`      | `unauthorizedError()`    | the caller is not identified                           |
| `SerafinForbiddenError`         | `forbiddenError()`       | the caller is identified and still not allowed         |
| `SerafinMovedPermanentlyError`  | `movedPermanentlyError()`| the resource lives somewhere else now                  |
| `SerafinValidationError`        | —                        | wraps a validation failure with the pipeline and action |
| `SerafinCapabilityError`        | —                        | `pipe()` refused a pipe. See [Capabilities](./capabilities) |

The set maps onto HTTP status codes on purpose: a transport in front of a pipeline can turn a name
into a status without knowing anything about the pipeline that raised it.

## Building your own

`error(name, message, info?, cause?)` is the constructor the others are built on:

```ts twoslash
import { error } from "@serafin/pipeline"

throw error("MyAppQuotaError", "The account is over its quota", { limit: 100, used: 143 })
```

Give it a name a transport can dispatch on, and put the machine-readable parts in `info` rather than
in the message.

## Validation failures

Input validation wraps the underlying ajv error in a `SerafinValidationError` that names where it
happened:

```
Validation failed in MemoryPipeline::read(query): data must NOT have additional properties
```

The `info` carries `constructor`, `method`, `schema` and `data`, and the ajv error itself is the
`cause` — so `VError.cause(e)` gets you the exact instance path that failed.

The action, the argument name and the pipeline are all in the message because a pipeline is a chain:
knowing that *some* query was invalid is not enough to find it.

## Turning validation off

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
// ---cut---
const users = new MemoryPipeline(userSchema, { validationEnabled: false })
```

For a pipeline that only ever receives inputs already validated upstream, and where the cost is
measurable. Bear in mind what it buys you: with validation on, a pipe never has to defend itself
against a malformed query, so turning it off moves that burden into every pipe.

## What a pipe should throw

- A **caller mistake** that the schemas cannot express — mutually exclusive parameters, a bad
  combination — is `validationError`.
- A **permission** decision is `unauthorizedError` when the caller is unknown and `forbiddenError`
  when they are known and still refused. The distinction is what a transport needs to choose between
  401 and 403.
- A **write conflict** is `conflictError`, with the id.
- Anything else is a plain `Error`. Not every failure needs a name.

## What's next

- [Writing a Pipe](./writing-a-pipe) — where most of these get thrown
- [Capabilities](./capabilities) — the error `pipe()` raises before any request happens
