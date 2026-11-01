<p align="center"><img src="./docs/public/logo.png" width="200"/></p>

# Serafin

TypeScript libraries to build self-descriptive APIs: describe your data once, as a schema, and get its type, a data access layer around it, REST endpoints on top, and their OpenAPI documentation.

📚 **Documentation: [serafin-labs.github.io/serafin](https://serafin-labs.github.io/serafin/)**

| Package                                                |                                                                                                                           |                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`@serafin/schema-builder`](./packages/schema-builder) | [![npm](https://img.shields.io/npm/v/@serafin/schema-builder.svg)](https://www.npmjs.com/package/@serafin/schema-builder) | Build a JSON Schema and its TypeScript type at the same time             |
| [`@serafin/pipeline`](./packages/pipeline)             | [![npm](https://img.shields.io/npm/v/@serafin/pipeline.svg)](https://www.npmjs.com/package/@serafin/pipeline)             | CRUD data access where a data source and the behaviour around it compose |
| [`@serafin/open-api`](./packages/open-api)             | [![npm](https://img.shields.io/npm/v/@serafin/open-api.svg)](https://www.npmjs.com/package/@serafin/open-api)             | OpenAPI 3.2 types, and an immutable builder to change documents safely   |
| [`@serafin/api`](./packages/api)                       | [![npm](https://img.shields.io/npm/v/@serafin/api.svg)](https://www.npmjs.com/package/@serafin/api)                       | Expose pipelines as REST endpoints, documented with OpenAPI              |

## Development

The repository is a [pnpm](https://pnpm.io) workspace. With Node.js 22 or later:

```sh
corepack enable
pnpm install
pnpm build
```

| Command              |                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm build`         | Build every package, ESM and CommonJS, in dependency order                               |
| `pnpm typecheck`     | Type-check the sources and the tests                                                     |
| `pnpm test`          | Run the tests                                                                            |
| `pnpm coverage`      | Run the tests against the build, with a coverage gate                                    |
| `pnpm check:exports` | Import both builds of every package and type-check a consumer against their declarations |
| `pnpm check`         | All of the above, and the formatting                                                     |
| `pnpm format`        | Format the repository with Prettier                                                      |
| `pnpm docs:dev`      | Serve the documentation                                                                  |

Run a command in a single package with `pnpm --filter @serafin/pipeline test`, or `pnpm dev` from the package folder to build and test it in watch mode.

Packages that depend on each other use `workspace:^`. Libraries shared with the application, such as `@serafin/schema-builder` for `@serafin/pipeline`, are peer dependencies, so the application and the libraries use the same instances.

## Releasing

Each package is versioned on its own with [Changesets](https://github.com/changesets/changesets). Add a changeset with every change to a published package:

```sh
pnpm changeset
```

On `master`, the release workflow opens a "Version packages" pull request with the pending changesets. Merging it publishes the new versions to npm, with provenance.

## License

[MIT](./LICENSE)
