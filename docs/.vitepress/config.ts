import { defineConfig, type DefaultTheme } from "vitepress"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import { fileURLToPath } from "node:url"

// Twoslash code blocks type-check against the built declarations of the packages:
// `pnpm build` must have produced their `lib/esm/` before building the docs.
const packages = ["schema-builder", "pipeline", "open-api", "api"]
const declarations = Object.fromEntries(
    packages.map((name) => [`@serafin/${name}`, [fileURLToPath(new URL(`../../packages/${name}/lib/esm/index.d.ts`, import.meta.url))]]),
)

// Deployed to GitHub Pages at https://serafin-labs.github.io/serafin/
const base = "/serafin/"
const repository = "https://github.com/serafin-labs/serafin"

const schemaBuilderGuide: DefaultTheme.SidebarItem[] = [
    {
        text: "Introduction",
        items: [
            { text: "Why Schema Builder?", link: "/schema-builder/guide/why" },
            { text: "Schema Builder vs Zod", link: "/schema-builder/guide/comparison" },
            { text: "Getting Started", link: "/schema-builder/guide/getting-started" },
        ],
    },
    {
        text: "Building Schemas",
        items: [
            { text: "Primitive Schemas", link: "/schema-builder/guide/primitives" },
            { text: "Object Schemas", link: "/schema-builder/guide/objects" },
            { text: "Arrays & Tuples", link: "/schema-builder/guide/arrays" },
            { text: "Enums, Consts & Unions", link: "/schema-builder/guide/enums-unions" },
        ],
    },
    {
        text: "Transforming Schemas",
        items: [
            { text: "Picking & Omitting", link: "/schema-builder/guide/pick-omit" },
            { text: "Optionals & Nullables", link: "/schema-builder/guide/optionals" },
            { text: "Merging & Overwriting", link: "/schema-builder/guide/merging" },
            { text: "Composing with objectProperties", link: "/schema-builder/guide/object-properties" },
            { text: "Transforming Properties", link: "/schema-builder/guide/transforming" },
        ],
    },
    {
        text: "Combining Schemas",
        items: [
            { text: "allOf / anyOf / oneOf / not", link: "/schema-builder/guide/combinators" },
            { text: "Conditionals & Dependencies", link: "/schema-builder/guide/conditionals" },
        ],
    },
    {
        text: "Using Schemas",
        items: [
            { text: "Validation", link: "/schema-builder/guide/validation" },
            { text: "From a literal JSON Schema", link: "/schema-builder/guide/from-json-schema" },
            { text: "Generating SchemaBuilder code", link: "/schema-builder/guide/generating-code" },
        ],
    },
    {
        text: "Examples",
        items: [{ text: "MCP connectors", link: "/schema-builder/guide/mcp" }],
    },
    {
        text: "API Reference",
        collapsed: true,
        items: [
            { text: "Overview", link: "/schema-builder/api/" },
            { text: "Factory methods", link: "/schema-builder/api/factories" },
            { text: "Instance methods", link: "/schema-builder/api/instance-methods" },
        ],
    },
]

const pipelineGuide: DefaultTheme.SidebarItem[] = [
    {
        text: "Introduction",
        items: [
            { text: "Why Pipeline?", link: "/pipeline/guide/why" },
            { text: "Getting Started", link: "/pipeline/guide/getting-started" },
        ],
    },
    {
        text: "Essentials",
        items: [
            { text: "Actions & Schemas", link: "/pipeline/guide/actions" },
            { text: "Results & Meta", link: "/pipeline/guide/results" },
            { text: "Context", link: "/pipeline/guide/context" },
            { text: "Errors", link: "/pipeline/guide/errors" },
        ],
    },
    {
        text: "Pipes",
        items: [
            { text: "Writing a Pipe", link: "/pipeline/guide/writing-a-pipe" },
            { text: "Order & Composition", link: "/pipeline/guide/pipe-order" },
            { text: "Caching", link: "/pipeline/guide/caching" },
        ],
    },
    {
        text: "Relations",
        items: [{ text: "Relations", link: "/pipeline/guide/relations" }],
    },
    {
        text: "MemoryPipeline",
        items: [
            { text: "In-memory Pipeline", link: "/pipeline/guide/memory-pipeline" },
            { text: "Query Operators", link: "/pipeline/guide/query-operators" },
            { text: "Update Operators", link: "/pipeline/guide/update-operators" },
        ],
    },
    {
        text: "Implementer Contract",
        items: [
            { text: "SourceQuery & Capabilities", link: "/pipeline/guide/source-query" },
            { text: "Writing a Pipeline", link: "/pipeline/guide/writing-a-pipeline" },
        ],
    },
    {
        text: "API Reference",
        collapsed: true,
        items: [
            { text: "Overview", link: "/pipeline/api/" },
            { text: "PipelineAbstract", link: "/pipeline/api/pipeline-abstract" },
            { text: "Pipe types", link: "/pipeline/api/pipe" },
            { text: "MemoryPipeline", link: "/pipeline/api/memory-pipeline" },
            { text: "Helpers & errors", link: "/pipeline/api/helpers" },
        ],
    },
]

export default defineConfig({
    base,
    lang: "en-US",
    title: "Serafin",
    description: "TypeScript libraries to build self-descriptive APIs: schemas, pipelines, OpenAPI documents and REST endpoints.",
    cleanUrls: true,
    lastUpdated: true,

    head: [["link", { rel: "icon", type: "image/png", href: `${base}logo.png` }]],

    markdown: {
        codeTransformers: [
            transformerTwoslash({
                twoslashOptions: {
                    compilerOptions: {
                        // Map the package names to the locally built declarations.
                        paths: declarations,
                        strict: true,
                        target: 99, // ESNext
                        module: 199, // NodeNext
                        moduleResolution: 99, // Bundler
                    },
                },
            }),
        ],
        languages: ["typescript", "javascript", "json", "bash"],
    },

    themeConfig: {
        logo: "/logo.png",

        nav: [
            { text: "Schema Builder", link: "/schema-builder/guide/getting-started", activeMatch: "^/schema-builder/" },
            { text: "Pipeline", link: "/pipeline/guide/getting-started", activeMatch: "^/pipeline/" },
            { text: "OpenAPI", link: "/open-api/", activeMatch: "^/open-api/" },
            { text: "API", link: "/api/", activeMatch: "^/api/" },
            {
                text: "npm",
                items: packages.map((name) => ({ text: `@serafin/${name}`, link: `https://www.npmjs.com/package/@serafin/${name}` })),
            },
        ],

        sidebar: {
            "/schema-builder/": schemaBuilderGuide,
            "/pipeline/": pipelineGuide,
        },

        search: {
            provider: "local",
        },

        socialLinks: [{ icon: "github", link: repository }],

        editLink: {
            pattern: `${repository}/edit/master/docs/:path`,
            text: "Edit this page on GitHub",
        },

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © Serafin Labs",
        },
    },
})
