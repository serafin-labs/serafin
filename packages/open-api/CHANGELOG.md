# @serafin/open-api

## 3.2.0-alpha.2

### Patch Changes

- 22ccd18: The package is an ES module only, so an application never loads two copies of it. CommonJS projects `require` it on Node.js 20.19, 22.12 or later, which `engines` now declares. The declarations type-check with `moduleResolution: nodenext` and `skipLibCheck: false`.

## 3.2.0-alpha.1

### Minor Changes

- 33c2d39: First alpha of 3.2, whose version follows the OpenAPI specification.
  
  - The types describe OpenAPI 3.2, rather than 3.0.
  - `OpenApiBuilder`, an immutable builder that keeps the document consistent: references, operation ids, templated paths, tags and security schemes.
  - `validateOpenApi` and `builder.validate()`, against the official OpenAPI 3.2 schema and the rules it cannot express.
  - Dual ESM and CommonJS build.
