import _ from "lodash"
import { validationError } from "./error.js"
import { QueryTemplate } from "./QueryTemplate.js"
import { IdentityInterface } from "./IdentityInterface.js"
import { ReadOnlyPipelineInterface } from "./PipelineInterface.js"
import { RelationType } from "./RelationType.js"

/**
 * A stable string for any query value, so equal queries collapse onto the same key.
 */
function keyOf(value: any): string {
    if (value === null || typeof value !== "object") {
        return `${typeof value}:${String(value)}`
    }
    if (Array.isArray(value)) {
        return `[${value.map(keyOf).join(",")}]`
    }
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${keyOf(value[key])}`)
        .join(",")}}`
}

/**
 * Whether a JSON schema admits an array, directly or through one of its combination keywords.
 * `transformPropertiesToArray` produces `{ oneOf: [{ type: "string" }, { type: "array", ... }] }`.
 */
function acceptsArray(schema: any): boolean {
    if (!schema || typeof schema !== "object") {
        return false
    }
    if (schema.type === "array" || (Array.isArray(schema.type) && schema.type.indexOf("array") !== -1)) {
        return true
    }
    return ["oneOf", "anyOf", "allOf"].some((keyword) => Array.isArray(schema[keyword]) && schema[keyword].some(acceptsArray))
}

/**
 * How deep a chain of nested relations may go. A caller has to spell out each level of nesting, so
 * this only bites when the read query comes from somewhere untrusted.
 */
export const maximumRelationDepth = 10

/**
 * Carried on the context so nested reads can see how deep they already are. A symbol keeps it out of
 * `Object.keys`, so it stays invisible to schema validation and to concrete pipeline implementations.
 */
const relationDepth = Symbol.for("@serafin/pipeline.relationDepth")

/**
 * Represents a Relation for the given pipeline
 */
export class Relation<M extends IdentityInterface, NameKey extends string, R extends IdentityInterface, ReadQuery, ReadMeta, Type extends RelationType> {
    constructor(
        private holdingPipeline: ReadOnlyPipelineInterface<M>,
        public name: NameKey,
        public pipeline: ReadOnlyPipelineInterface<R, ReadQuery, ReadMeta>,
        public query: Partial<ReadQuery>,
        public type: Type,
    ) {}

    async fetch(resource: M, query?: Partial<ReadQuery>, context?: any) {
        return this.pipeline.read(this.queryFor(resource, query), this.nestedContext(context))
    }

    async assignToResource(resource: M, query?: Partial<ReadQuery>, context?: any) {
        const result = await this.fetch(resource, query, context)
        return this.assign(resource, result.data)
    }

    /**
     * Resolve the relation for a page of resources.
     *
     * Resources whose hydrated query is identical share a single read. When the relation is keyed on
     * a single templated field and the target accepts an array for it, the whole page is resolved
     * with one read instead of one per resource.
     *
     * Returns new resources; the ones passed in are left untouched.
     */
    async assignToResources(resources: M[], query?: Partial<ReadQuery>, context?: any) {
        if (resources.length === 0) {
            return []
        }

        // Group by hydrated query, so resources pointing at the same target are read once.
        const groups = new Map<string, { query: any; resources: M[] }>()
        for (const resource of resources) {
            const resourceQuery = this.queryFor(resource, query)
            const key = keyOf(resourceQuery)
            const group = groups.get(key)
            if (group) {
                group.resources.push(resource)
            } else {
                groups.set(key, { query: resourceQuery, resources: [resource] })
            }
        }

        const assigned = new Map<M, any>()
        const batchField = groups.size > 1 ? this.batchField() : undefined
        if (batchField !== undefined) {
            const batches = [...groups.values()]
            const result = await this.pipeline.read(
                { ...batches[0].query, [batchField]: batches.map((group) => group.query[batchField]) } as any,
                this.nestedContext(context),
            )
            // Index the single result set by the field the relation is keyed on.
            const related = new Map<string, R[]>()
            for (const entry of result.data) {
                const key = keyOf((entry as any)[batchField])
                const bucket = related.get(key)
                if (bucket) {
                    bucket.push(entry)
                } else {
                    related.set(key, [entry])
                }
            }
            for (const group of batches) {
                const data = related.get(keyOf(group.query[batchField])) ?? []
                for (const resource of group.resources) {
                    assigned.set(resource, this.assign(resource, data))
                }
            }
        } else {
            const nested = this.nestedContext(context)
            await Promise.all(
                [...groups.values()].map(async (group) => {
                    const result = await this.pipeline.read(group.query, nested)
                    for (const resource of group.resources) {
                        assigned.set(resource, this.assign(resource, result.data))
                    }
                }),
            )
        }

        return resources.map((resource) => assigned.get(resource))
    }

    /**
     * The context to read the related pipeline with, one level deeper than the current one.
     */
    private nestedContext(context?: any) {
        const depth = (context?.[relationDepth] ?? 0) + 1
        if (depth > maximumRelationDepth) {
            throw validationError(`relation '${this.name}' is nested deeper than the maximum of ${maximumRelationDepth}`, { relation: this.name, depth })
        }
        return { ...(context ?? {}), [relationDepth]: depth }
    }

    private queryFor(resource: M, query?: Partial<ReadQuery>) {
        return { ...(QueryTemplate.hydrate(this.query, resource) as any), ...(query || {}) }
    }

    private assign(resource: M, data: R[]) {
        return {
            ...resource,
            [this.name]: this.type === RelationType.one ? data[0] : [...data],
        } as M & { [k in NameKey]: Type extends RelationType.many ? R[] : Type extends RelationType.one ? R : R | R[] }
    }

    /**
     * The field a whole page can be read on in one call, or `undefined` when it has to be read
     * resource by resource. Batching needs a single templated field that the target declares on its
     * model -- so the results can be grouped back by it -- and accepts as an array on its read query.
     */
    private batchField(): string | undefined {
        const templated = Object.keys(QueryTemplate.getTemplatedParts(this.query))
        if (templated.length !== 1) {
            return undefined
        }
        const field = templated[0]
        const model = (this.pipeline.schemaBuilders.model.schema as any)?.properties
        const readQuery = (this.pipeline.schemaBuilders.readQuery.schema as any)?.properties
        return model?.[field] && acceptsArray(readQuery?.[field]) ? field : undefined
    }
}
