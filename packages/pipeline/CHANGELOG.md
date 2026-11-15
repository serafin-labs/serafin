# @serafin/pipeline

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
