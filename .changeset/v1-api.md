---
"@serafin/api": major
---

First alpha of v1.

- The REST transport is rewritten, and documents the pipelines in an OpenAPI 3.2 document built with `@serafin/open-api`. The GraphQL and HAL transports are removed.
- Errors are `{ code, name, message, errors? }`: `code` is still the HTTP status, `name` is the status in PascalCase and `errors` details the invalid values.
- Unknown query parameters are refused with a 400. The `unknownParameters: "ignore"` option keeps the former behavior during a transition, with a warning.
- The `formatError` and `logger` options.
- `express` 4 or 5, `@serafin/pipeline`, `@serafin/schema-builder` and `@serafin/open-api` are peer dependencies.
- The helpers transports share are exported: `schemaProperties`, `metaSchema`, `errorResponse`, `exposedActions`...
- Transports can refuse a pipeline with `validate`, before any of them exposes it.
- Dual ESM and CommonJS build.
