import { defineConfig } from "vitepress"
import { transformerTwoslash } from "@shikijs/vitepress-twoslash"
import { fileURLToPath } from "node:url"

// Resolve the built declaration files of the library itself so that Twoslash
// code blocks type-check against the real `@serafin/pipeline` API.
// `npm run build:esm` must have produced `lib/esm/` before building the docs.
const libTypes = fileURLToPath(new URL("../../lib/esm/index.d.ts", import.meta.url))

// Deployed to GitHub Pages at https://serafin-labs.github.io/pipeline/
const base = "/pipeline/"

export default defineConfig({
    base,
    lang: "en-US",
    title: "Pipeline",
    description: "A TypeScript CRUD data access library where a data source and the behaviour around it compose.",
    cleanUrls: true,
    lastUpdated: true,

    head: [["link", { rel: "icon", type: "image/png", href: `${base}logo.png` }]],

    markdown: {
        codeTransformers: [
            transformerTwoslash({
                twoslashOptions: {
                    compilerOptions: {
                        // Map the package name to the locally built declarations.
                        paths: {
                            "@serafin/pipeline": [libTypes],
                        },
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
            { text: "Guide", link: "/guide/getting-started" },
            { text: "API Reference", link: "/api/" },
            {
                text: "v0.19",
                items: [
                    { text: "npm", link: "https://www.npmjs.com/package/@serafin/pipeline" },
                    { text: "Changelog", link: "https://github.com/serafin-labs/pipeline/releases" },
                ],
            },
        ],

        sidebar: {
            "/guide/": [
                {
                    text: "Introduction",
                    items: [
                        { text: "Why Pipeline?", link: "/guide/why" },
                        { text: "Getting Started", link: "/guide/getting-started" },
                    ],
                },
                {
                    text: "Essentials",
                    items: [
                        { text: "Actions & Schemas", link: "/guide/actions" },
                        { text: "Results & Meta", link: "/guide/results" },
                        { text: "Context", link: "/guide/context" },
                        { text: "Errors", link: "/guide/errors" },
                    ],
                },
                {
                    text: "Pipes",
                    items: [
                        { text: "Writing a Pipe", link: "/guide/writing-a-pipe" },
                        { text: "Order & Composition", link: "/guide/pipe-order" },
                        { text: "Caching", link: "/guide/caching" },
                    ],
                },
                {
                    text: "Relations",
                    items: [{ text: "Relations", link: "/guide/relations" }],
                },
                {
                    text: "MemoryPipeline",
                    items: [
                        { text: "In-memory Pipeline", link: "/guide/memory-pipeline" },
                        { text: "Query Operators", link: "/guide/query-operators" },
                        { text: "Update Operators", link: "/guide/update-operators" },
                    ],
                },
                {
                    text: "Implementer Contract",
                    items: [
                        { text: "SourceQuery & Capabilities", link: "/guide/source-query" },
                        { text: "Writing a Pipeline", link: "/guide/writing-a-pipeline" },
                    ],
                },
                {
                    text: "API",
                    items: [{ text: "API Reference", link: "/api/" }],
                },
            ],
            "/api/": [
                {
                    text: "API Reference",
                    items: [
                        { text: "Overview", link: "/api/" },
                        { text: "PipelineAbstract", link: "/api/pipeline-abstract" },
                        { text: "Pipe types", link: "/api/pipe" },
                        { text: "MemoryPipeline", link: "/api/memory-pipeline" },
                        { text: "Helpers & errors", link: "/api/helpers" },
                    ],
                },
            ],
        },

        search: {
            provider: "local",
        },

        socialLinks: [{ icon: "github", link: "https://github.com/serafin-labs/pipeline" }],

        editLink: {
            pattern: "https://github.com/serafin-labs/pipeline/edit/master/docs/:path",
            text: "Edit this page on GitHub",
        },

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © Serafin Labs",
        },
    },
})
