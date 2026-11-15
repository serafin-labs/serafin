# @serafin/schema-builder

## 1.0.0-alpha.1

### Major Changes

- 33c2d39: First alpha of v1.
  
  - JSON Schema 2020-12 keywords, tuples, the OpenAPI keywords and helpers for schemas of several types.
  - `objectProperties` and the advanced transformations of properties.
  - `noneSchema` is renamed `neverSchema`, and nullable primitives accept `"null"` in either position of `type`.
  - `validateList` and `throughJsonSchema` are removed, `walkJsonSchema` replaces the latter.
  - `DeepPartial` recurses into optional, nullable and array nested objects.
  - Dual ESM and CommonJS build, and a documentation site.
