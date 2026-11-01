# Errors

Errors are [`VError`](https://github.com/TritonDataCenter/node-verror)s with a `name` to switch on and
an `info` payload carrying details. Every constructor is exported, so a pipe raises the same kind of
error the library does.

```ts twoslash
import { error, notFoundError, NotFoundErrorName } from "@serafin/pipeline"
import VError from "verror"

try {
    throw notFoundError("u1")
} catch (e) {
    if ((e as Error).name === NotFoundErrorName) {
        VError.info(e as Error) // the `info` payload, if one was passed
    }
}

// a domain error of your own: a name to dispatch on, machine-readable parts in `info`
throw error("MyAppQuotaError", "The account is over its quota", { limit: 100, used: 143 })
```

| Name                           | Constructor               | Raised when                                              |
| ------------------------------ | ------------------------- | -------------------------------------------------------- |
| `SerafinNotFoundError`         | `notFoundError`           | a resource that had to exist does not                    |
| `SerafinSchemaValidationError` | `validationError`         | an input is not what it must be                          |
| `SerafinConflictError`         | `conflictError`           | a write collides — a duplicate id, a lost update         |
| `SerafinNotImplementedError`   | `notImplementedError`     | an action the pipeline does not implement is called      |
| `SerafinUnauthorizedError`     | `unauthorizedError`       | the caller is not identified                             |
| `SerafinForbiddenError`        | `forbiddenError`          | the caller is identified and still not allowed           |
| `SerafinMovedPermanentlyError` | `movedPermanentlyError`   | the resource lives somewhere else now                    |
| `SerafinValidationError`       | —                         | wraps a validation failure with the pipeline and action  |
| `SerafinCapabilityError`       | —                         | `pipe()` refused a pipe — see [Capabilities](./source-query#capabilities) |

The set maps onto HTTP status codes on purpose, so a transport can turn a name into a status without
knowing which pipeline raised it. Signatures are in the [API reference](/api/helpers#errors).

## Validation failures

Input validation wraps the ajv error in a `SerafinValidationError` that names where it happened —
a pipeline is a chain, so knowing that *some* query was invalid is not enough:

```
Validation failed in MemoryPipeline::read(query): Invalid parameters: data must NOT have additional properties
```

`info` carries `constructor`, `method`, `schema` and `data`, and `VError.cause(e)` is the ajv error,
with the exact instance path that failed.

`{ validationEnabled: false }` in a pipeline's options turns validation off, for inputs already
validated upstream. It moves the burden of defending against a malformed query into every pipe.

## What a pipe should throw

- A **caller mistake** the schemas cannot express — mutually exclusive parameters — is `validationError`.
- A **permission** refusal is `unauthorizedError` when the caller is unknown and `forbiddenError` when
  they are known: what a transport needs to choose between 401 and 403.
- A **write conflict** is `conflictError`, with the id.
- Anything else is a plain `Error`.
