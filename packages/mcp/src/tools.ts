import type { Tool, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js"
import {
    exposedActions,
    hasId,
    HttpError,
    metaSchema,
    schemaDescription,
    schemaProperties,
    selectsSeveral,
    type ExposedPipeline,
    type Schema,
} from "@serafin/api"
import { notFoundError } from "@serafin/pipeline"

/**
 * The results of a pipeline action.
 */
export interface ToolResults {
    data: unknown[]
    meta: unknown
}

/**
 * A tool of a pipeline: its definition, and how to call the pipeline with the arguments the agent gave.
 */
export interface PipelineTool {
    tool: Tool
    /**
     * @param args the arguments of the agent
     * @param internal the internal context, merged over the context arguments
     */
    call(args: Record<string, unknown>, internal: Record<string, unknown>): Promise<ToolResults>
}

export interface PipelineToolsOptions {
    /** Whether a context property is internal: the agent cannot set it, and it is not part of the tools. */
    isInternal: (name: string) => boolean
    /** Whether to add the tools that patch or delete every resource matching a query. */
    byQuery: boolean
}

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** MCP only accepts object schemas as properties: `true` accepts anything, `false` nothing. */
const objectSchema = (schema: Schema): object => (typeof schema === "object" ? schema : schema ? {} : { not: {} })

/** Tool names may only hold letters, digits, `_`, `-` and `.`. */
const toolName = (...parts: string[]) => parts.join("_").replace(/[^A-Za-z0-9._-]/g, "_")

/**
 * The arguments of a tool: the properties of a query (or of the create options), the `values` of a create
 * or a patch, and the public properties of the context.
 */
class ToolArguments {
    readonly properties: Record<string, Schema>
    readonly required: string[]
    /** The names the context shares with the query or the values, which the agent could not tell apart. */
    readonly conflicts: string[]

    constructor(
        private readonly query: { properties: Record<string, Schema>; required: Set<string> },
        private readonly context: { properties: Record<string, Schema>; required: Set<string> },
        private readonly values?: Schema,
    ) {
        this.properties = { ...query.properties, ...(values !== undefined ? { values } : {}), ...context.properties }
        this.required = [...query.required, ...(values !== undefined ? ["values"] : []), ...context.required]
        const others = [...Object.keys(query.properties), ...(values !== undefined ? ["values"] : [])]
        this.conflicts = Object.keys(context.properties).filter((n) => others.includes(n))
    }

    /**
     * Split the arguments of the agent. Unknown or missing arguments are refused: a typo must not widen a read,
     * a patch or a delete, and a missing id must not turn into an empty query.
     */
    split(args: Record<string, unknown>): { query: Record<string, unknown>; values: unknown; context: Record<string, unknown> } {
        const query: Record<string, unknown> = {}
        const context: Record<string, unknown> = {}
        let values: unknown
        const unknown: string[] = []
        for (const [name, value] of Object.entries(args)) {
            if (name in this.query.properties) {
                query[name] = value
            } else if (name in this.context.properties) {
                context[name] = value
            } else if (name === "values" && this.values !== undefined) {
                values = value
            } else {
                unknown.push(name)
            }
        }
        const plural = (names: string[]) => (names.length > 1 ? "s" : "")
        if (unknown.length > 0) {
            throw new HttpError(400, `Unknown argument${plural(unknown)}: ${unknown.join(", ")}`)
        }
        const missing = this.required.filter((name) => args[name] === undefined)
        if (missing.length > 0) {
            throw new HttpError(400, `Missing argument${plural(missing)}: ${missing.join(", ")}`)
        }
        return { query, values, context }
    }
}

/**
 * The tools of a pipeline, depending on the actions it exposes. For a `book` pipeline exposed as `books`:
 * - `find_books` finds the books matching a query,
 * - `get_book` gets a book by its id,
 * - `create_books` creates books,
 * - `patch_book` and `delete_book` change and delete a book by its id,
 * - `patch_books` and `delete_books` change and delete every book matching a query, only with the `byQuery` option.
 */
export function pipelineTools(exposed: ExposedPipeline, { isInternal, byQuery }: PipelineToolsOptions): PipelineTool[] {
    const { pipeline, name, pluralName } = exposed
    const schemas = pipeline.schemaBuilders
    const actions = exposedActions(exposed)
    const Name = upperFirst(name)
    // tools on several resources need a distinct name when both names are the same
    const many = pluralName === name ? `many_${pluralName}` : pluralName

    const context = schemaProperties(schemas.context.schema)
    const publicContext = {
        properties: Object.fromEntries(Object.entries(context.properties).filter(([n]) => !isInternal(n))),
        required: new Set([...context.required].filter((n) => !isInternal(n))),
    }
    const modelId = schemaProperties(schemas.model.schema).properties.id
    const idSchema: Schema = { ...(typeof modelId === "object" ? modelId : { type: "string" }), description: `The id of the ${name}` }
    const byId = (query: Schema) => {
        const { properties, required } = schemaProperties(query)
        return { properties: { ...properties, id: idSchema }, required: new Set(["id", ...required]) }
    }
    const modelDescription = schemaDescription(schemas.model.schema)

    const tools: PipelineTool[] = []
    const add = (
        action: "read" | "create" | "patch" | "delete",
        tool: { name: string; title: string; description: string; annotations: ToolAnnotations },
        args: ToolArguments,
        call: (parts: ReturnType<ToolArguments["split"]>) => Promise<ToolResults>,
    ) => {
        if (args.conflicts.length > 0) {
            throw new Error(`Cannot expose '${pluralName}' as tools: ${tool.name} and the context share the arguments ${args.conflicts.join(", ")}`)
        }
        tools.push({
            tool: {
                name: tool.name,
                title: tool.title,
                description: modelDescription !== undefined ? `${tool.description}\n\n${Name}: ${modelDescription}` : tool.description,
                inputSchema: {
                    type: "object",
                    properties: Object.fromEntries(Object.entries(args.properties).map(([n, s]) => [n, objectSchema(s)])),
                    required: args.required,
                    additionalProperties: false,
                },
                outputSchema: {
                    type: "object",
                    properties: {
                        data: { type: "array", items: schemas.model.schema },
                        meta: objectSchema(metaSchema(schemas.meta, schemas[`${action}Meta`])),
                        truncated: {
                            type: "object",
                            description: "Set when results were left out to keep the response short: narrow the query to get them",
                            properties: { returned: { type: "integer" }, total: { type: "integer" } },
                            required: ["returned", "total"],
                        },
                    },
                    required: ["data", "meta"],
                },
                annotations: { title: tool.title, openWorldHint: false, ...tool.annotations },
            },
            call: async (agentArgs, internal) => {
                const parts = args.split(agentArgs)
                return call({ ...parts, context: { ...parts.context, ...internal } })
            },
        })
    }
    const notFound = (results: ToolResults, id: unknown) => {
        if (results.data.length === 0) {
            throw notFoundError(`${name}:${String(id)}`)
        }
        return results
    }
    const single = (id: unknown) => {
        if (typeof id === "object") {
            throw new HttpError(400, "The id must be a single value")
        }
        return id
    }

    if (actions.has("read")) {
        add(
            "read",
            {
                name: toolName("find", pluralName),
                title: `Find ${pluralName}`,
                description: `Find the ${pluralName} matching the query.`,
                annotations: { readOnlyHint: true },
            },
            new ToolArguments(schemaProperties(schemas.readQuery.schema), publicContext),
            ({ query, context }) => pipeline.read(query, context),
        )
        if (hasId(schemas.readQuery.schema)) {
            add(
                "read",
                { name: toolName("get", name), title: `Get a ${name}`, description: `Get a ${name} by its id.`, annotations: { readOnlyHint: true } },
                new ToolArguments(byId(schemas.readQuery.schema), publicContext),
                async ({ query, context }) => notFound(await pipeline.read({ ...query, id: single(query.id) }, context), query.id),
            )
        }
    }
    if (actions.has("create")) {
        add(
            "create",
            {
                name: toolName("create", pluralName),
                title: `Create ${pluralName}`,
                description: `Create ${pluralName}, one for each element of values.`,
                annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
            },
            new ToolArguments(schemaProperties(schemas.createOptions.schema), publicContext, {
                type: "array",
                items: schemas.createValues.schema,
                minItems: 1,
                description: `The ${pluralName} to create`,
            }),
            ({ query, values, context }) => {
                if (!Array.isArray(values)) {
                    throw new HttpError(400, `values must be a list of ${pluralName}`)
                }
                return pipeline.create(values, query, context)
            },
        )
    }
    if (actions.has("patch")) {
        const values: Schema = { ...(schemas.patchValues.schema as object), description: `The properties to change` }
        const annotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: false }
        if (hasId(schemas.patchQuery.schema)) {
            add(
                "patch",
                {
                    name: toolName("patch", name),
                    title: `Change a ${name}`,
                    description: `Change some properties of a ${name}, selected by its id.`,
                    annotations,
                },
                new ToolArguments(byId(schemas.patchQuery.schema), publicContext, values),
                async ({ query, values, context }) => notFound(await pipeline.patch({ ...query, id: single(query.id) }, values, context), query.id),
            )
        }
        if (byQuery && selectsSeveral(schemas.patchQuery.schema)) {
            add(
                "patch",
                {
                    name: toolName("patch", many),
                    title: `Change ${pluralName}`,
                    description: `Change some properties of every ${name} matching the query.`,
                    annotations,
                },
                new ToolArguments(schemaProperties(schemas.patchQuery.schema), publicContext, values),
                ({ query, values, context }) => pipeline.patch(query, values, context),
            )
        }
    }
    if (actions.has("delete")) {
        const annotations = { readOnlyHint: false, destructiveHint: true, idempotentHint: true }
        if (hasId(schemas.deleteQuery.schema)) {
            add(
                "delete",
                { name: toolName("delete", name), title: `Delete a ${name}`, description: `Delete a ${name}, selected by its id.`, annotations },
                new ToolArguments(byId(schemas.deleteQuery.schema), publicContext),
                async ({ query, context }) => notFound(await pipeline.delete({ ...query, id: single(query.id) }, context), query.id),
            )
        }
        if (byQuery && selectsSeveral(schemas.deleteQuery.schema)) {
            add(
                "delete",
                { name: toolName("delete", many), title: `Delete ${pluralName}`, description: `Delete every ${name} matching the query.`, annotations },
                new ToolArguments(schemaProperties(schemas.deleteQuery.schema), publicContext),
                ({ query, context }) => pipeline.delete(query, context),
            )
        }
    }
    return tools
}
