// Pre-publish smoke test: verifies the published package can be consumed through its
// `exports` map in BOTH module systems. It self-references the package by name so it
// goes through the exact conditional resolution (`require` -> CJS, `import` -> ESM) that
// real consumers hit, then serves a pipeline through both transports and calls them over HTTP.
//
// Run against the built `lib/` output (after `npm run build`), not the source.
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const PKG = "@serafin/api"
const require = createRequire(import.meta.url)

/**
 * Expose a pipeline through the REST and GraphQL transports and call both, exercising the
 * express, lodash, verror, jsonpointer, graphql and graphql-type-json interop of the build.
 */
async function assertUsable(label, mod, { express, PipelineAbstract, defaultSchemaBuilders, SchemaBuilder }) {
    for (const name of ["Api", "RestTransport", "GraphQLTransport"]) {
        assert.equal(typeof mod[name], "function", `${label}: ${name} export is missing`)
    }

    class StaticPipeline extends PipelineAbstract {
        async _read(query) {
            return { data: [{ id: "1", name: "one", meta: { tags: ["a"] } }].filter((r) => !query.id || r.id === query.id), meta: {} }
        }
    }
    const model = SchemaBuilder.emptySchema().addString("id").addString("name").addProperty("meta", SchemaBuilder.emptySchema().addArray("tags", SchemaBuilder.stringSchema()))
    const pipeline = new StaticPipeline(defaultSchemaBuilders(model))

    const app = express()
    const api = new mod.Api(app, "/api", { openapi: "3.0.0", info: { title: "smoke", version: "1" }, paths: {} })
    api.configure(new mod.RestTransport()).configure(new mod.GraphQLTransport()).use(pipeline, "item")

    const server = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s))
    })
    try {
        const base = `http://127.0.0.1:${server.address().port}/api`

        const spec = await (await fetch(`${base}/api.json`)).json()
        assert.ok(spec.paths["/items"]?.get, `${label}: open api spec is missing the read endpoint`)
        assert.ok(spec.components.schemas.ItemModel, `${label}: open api spec is missing the model schema`)

        const rest = await fetch(`${base}/items/1`, { headers: { Accept: "application/json" } })
        assert.equal(rest.status, 200, `${label}: REST read failed`)
        assert.equal((await rest.json()).data[0].name, "one", `${label}: REST read returned unexpected data`)

        const gql = await fetch(`${base}/graphql`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query: `{ items(query: { id: "1" }) { data { id name meta { tags } } } }` }),
        })
        const gqlBody = await gql.json()
        assert.equal(gqlBody.errors, undefined, `${label}: GraphQL query failed: ${JSON.stringify(gqlBody.errors)}`)
        assert.deepEqual(gqlBody.data.items.data, [{ id: "1", name: "one", meta: { tags: ["a"] } }], `${label}: GraphQL returned unexpected data`)
    } finally {
        await new Promise((resolve) => server.close(resolve))
    }
}

// CJS condition
const cjsPath = require.resolve(PKG)
assert.match(cjsPath, /[/\\]lib[/\\]cjs[/\\]/, `require() resolved to unexpected path: ${cjsPath}`)
await assertUsable("cjs (require)", require(PKG), {
    express: require("express"),
    ...require("@serafin/pipeline"),
    ...require("@serafin/schema-builder"),
})
console.log(`✓ cjs  require("${PKG}") -> ${cjsPath}`)

// ESM condition
const esmMod = await import(PKG)
const esmPath = fileURLToPath(import.meta.resolve(PKG))
assert.match(esmPath, /[/\\]lib[/\\]esm[/\\]/, `import() resolved to unexpected path: ${esmPath}`)
await assertUsable("esm (import)", esmMod, {
    express: (await import("express")).default,
    ...(await import("@serafin/pipeline")),
    ...(await import("@serafin/schema-builder")),
})
console.log(`✓ esm  import("${PKG}")  -> ${esmPath}`)

console.log("\nBoth builds import and serve requests correctly.")
