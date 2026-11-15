# @serafin/schema-builder

## 1.0.0-alpha.2

### Patch Changes

- 22ccd18: The package is an ES module only, so an application never loads two copies of it. CommonJS projects `require` it on Node.js 20.19, 22.12 or later, which `engines` now declares. The declarations type-check with `moduleResolution: nodenext` and `skipLibCheck: false`.
- 22ccd18: `dependentRequired` and `dependentSchemas` follow the properties that are picked, omitted or renamed, and `toOptionals` and `toDeepOptionals` drop `dependentRequired`. `toNullable` turns a `const` into an enum of its value and `null`.
- 22ccd18: `toTypescript` writes property names as string literals and titles as valid identifiers, "Book list" giving `bookListSchema`, so the code it generates always compiles and runs nothing else. It keeps the setters of an enum, such as `setId`.

## 1.0.0-alpha.1

### Major Changes

- 33c2d39: First alpha of v1.
  
  - JSON Schema 2020-12 keywords, tuples, the OpenAPI keywords and helpers for schemas of several types.
  - `objectProperties` and the advanced transformations of properties.
  - `noneSchema` is renamed `neverSchema`, and nullable primitives accept `"null"` in either position of `type`.
  - `validateList` and `throughJsonSchema` are removed, `walkJsonSchema` replaces the latter.
  - `DeepPartial` recurses into optional, nullable and array nested objects.
  - Dual ESM and CommonJS build, and a documentation site.
