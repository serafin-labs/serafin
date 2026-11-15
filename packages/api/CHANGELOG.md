# @serafin/api

## 1.0.0-alpha.2

### Patch Changes

- 22ccd18: The package is an ES module only, so an application never loads two copies of it. CommonJS projects `require` it on Node.js 20.19, 22.12 or later, which `engines` now declares. The declarations type-check with `moduleResolution: nodenext` and `skipLibCheck: false`.
- 22ccd18: The express peer dependency starts at 4.21.2, which fixes the path-to-regexp ReDoS of earlier versions of express 4 (CVE-2024-52798).
- 22ccd18: A query string with more than 1000 parameters is refused with a 400, rather than its last parameters being left out.
- 22ccd18: `PATCH` and `DELETE` on the collection need the new `byQuery` option, as in `McpTransport`: without it, a request without query string would change or delete every resource.

## 1.0.0-alpha.1

### Major Changes

- 33c2d39: First alpha of v1.
  
  - The REST transport is rewritten, and documents the pipelines in an OpenAPI 3.2 document built with `@serafin/open-api`. The GraphQL and HAL transports are removed.
  - Errors are `{ code, name, message, errors? }`: `code` is still the HTTP status, `name` is the status in PascalCase and `errors` details the invalid values.
  - Unknown query parameters are refused with a 400. The `unknownParameters: "ignore"` option keeps the former behavior during a transition, with a warning.
  - The `formatError` and `logger` options.
  - `express` 4 or 5, `@serafin/pipeline`, `@serafin/schema-builder` and `@serafin/open-api` are peer dependencies.
  - The helpers transports share are exported: `schemaProperties`, `metaSchema`, `errorResponse`, `exposedActions`...
  - Transports can refuse a pipeline with `validate`, before any of them exposes it.
  - Dual ESM and CommonJS build.
