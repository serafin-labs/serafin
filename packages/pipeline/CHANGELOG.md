# @serafin/pipeline

## 1.0.0-alpha.2

### Patch Changes

- 22ccd18: The package is an ES module only, so an application never loads two copies of it. CommonJS projects `require` it on Node.js 20.19, 22.12 or later, which `engines` now declares. The declarations type-check with `moduleResolution: nodenext` and `skipLibCheck: false`.
- 22ccd18: The schemas derived from the model, and the copies of a schema in relations, leave its `$id` out, so a model with an `$id` can be the target of several relations. Relations store resources in maps without prototype, so ids such as `__proto__` or `constructor` are keys like any other.
- 22ccd18: The query of a relation can no longer change what the relation sets itself: those properties are left out of its `with<Name>` option, and win over the query. A resource whose key is `null` relates to nothing, rather than failing the read of the whole page.

## 1.0.0-alpha.1

### Major Changes

- 33c2d39: First alpha of v1.
  
  - `@serafin/schema-builder` is a peer dependency.
  - Relations are resolved in one batched read per page and returned normalized in `meta.relations`, rather than inlined in each resource. The relation option accepts a query of the target, so related reads can be narrowed and nested.
  - `MemoryPipeline`, an in-memory source with mongodb-style query and update operators.
  - A context-scoped read cache pipe.
  - Pipes declare the query they hand down with `SourceQuery` and `SourceValues`, and their capabilities are checked when they are attached.
  - Undefined properties are dropped at the entry points of a pipeline.
  - Dual ESM and CommonJS build, and a documentation site.
