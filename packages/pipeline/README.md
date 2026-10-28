<p align="center"><img src="./docs/public/logo.png" width="300"/></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@serafin/pipeline"><img src="https://img.shields.io/npm/v/@serafin/pipeline.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@serafin/pipeline.svg" alt="license"></a>
</p>

Serafin Pipeline is a TypeScript CRUD data access library with a functional approach. A **pipeline**
gives access to data through four actions — `create`, `read`, `patch`, `delete` — and **pipes** wrap
behaviour around it: permissions, timestamps, soft deletes, caching, parameter translation.

A pipe **carries schema changes, not just behaviour**: one that adds a query parameter changes the
pipeline's JSON Schema and TypeScript type together, so the interface of your data access layer is
_derived_ from the pieces it is built of.

## Installation

```sh
npm i @serafin/pipeline @serafin/schema-builder
```

## A quick example

```typescript
import { SchemaBuilder } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"

const userSchema = SchemaBuilder.objectSchema(
    { title: "User" },
    {
        id: SchemaBuilder.stringSchema(),
        firstName: SchemaBuilder.stringSchema(),
        lastName: SchemaBuilder.stringSchema(),
        age: [SchemaBuilder.integerSchema(), undefined], // optional
    },
)

const users = new MemoryPipeline(userSchema)

// `id` is optional on create -- the pipeline hands one out
await users.create([{ firstName: "Nico", lastName: "Degardin" }])

// an array on a property means "any of these values"
const result = await users.read({ lastName: ["Degardin"] })

result.data // the users that matched
result.meta // everything else: counts, relations, whatever a pipe added
```

Every schema an action uses is derived from that one model, and available as a JSON Schema at runtime:

```typescript
users.schemaBuilders.readQuery.schema // feed it to OpenAPI, to an MCP tool definition, to a form
```

Wrap behaviour around it with `.pipe()`, which returns a new pipeline. `Cache` is one of the pipes
the library ships; [writing your own](https://serafin-labs.github.io/pipeline/guide/writing-a-pipe) is
a function of a few lines:

```typescript
import { Cache, openCacheScope } from "@serafin/pipeline"

const cachedUsers = users.pipe(Cache())

// within one cache scope -- typically one request -- each distinct read hits the store once
await cachedUsers.read({ lastName: "Degardin" }, openCacheScope({}))
```

And link pipelines to each other with relations, resolved per request:

```typescript
const addresses = new MemoryPipeline(
    SchemaBuilder.objectSchema(
        { title: "Address" },
        { id: SchemaBuilder.stringSchema(), userId: SchemaBuilder.stringSchema(), city: SchemaBuilder.stringSchema() },
    ),
)

const usersWithAddresses = users.addRelationWithMany("addresses", addresses, { userId: ":id" })

const withAddresses = await usersWithAddresses.read({ withAddresses: true })
withAddresses.meta.relations?.addresses // every address once, plus an index from user id to address ids
```

## Documentation

📚 **Full documentation, with interactive type-aware examples, is available at [serafin-labs.github.io/pipeline](https://serafin-labs.github.io/pipeline/).**

## What's next?

`pipeline` is a component of the **Serafin** framework, alongside
[`schema-builder`](https://github.com/serafin-labs/schema-builder). Learn more at
[github.com/serafin-labs/serafin](https://github.com/serafin-labs/serafin).

## License

[MIT](./LICENSE)
