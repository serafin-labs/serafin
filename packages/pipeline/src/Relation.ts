import _ from "lodash"
import { validationError } from "./error.js"
import { QueryTemplate } from "./QueryTemplate.js"
import { IdentityInterface } from "./IdentityInterface.js"
import { ReadOnlyPipelineInterface } from "./PipelineInterface.js"
import { RelationType } from "./RelationType.js"
import { stableKey } from "./stableKey.js"

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
 * What a relation contributes to `meta.relations`.
 *
 * `data` holds each related resource once, keyed by its own id, so a target shared by many
 * resources is carried once instead of once per resource. `index` maps a holding resource's id to
 * the related id (or ids, for a many relation) -- which is what makes a many relation joinable at
 * all, since its key lives on the target rather than on the resource.
 */
export interface RelationMeta<R extends IdentityInterface, Type extends RelationType> {
    type: Type
    data: Record<string, R>
    index: Record<string, Type extends RelationType.many ? string[] : string>
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

    /**
     * Fetch the relation for a single resource and return a copy carrying it inline.
     * Pipelines put relations in `meta` instead; this stays for callers that hold a `Relation`.
     */
    async assignToResource(resource: M, query?: Partial<ReadQuery>, context?: any) {
        const result = await this.fetch(resource, query, context)
        return this.assign(resource, result.data)
    }

    /**
     * Resolve the relation for a page of resources and return what it contributes to `meta`.
     *
     * Resources whose hydrated query is identical share a single read. When the relation is keyed on
     * a single templated field and the target accepts an array for it, the whole page is resolved
     * with one read instead of one per resource.
     */
    async resolve(resources: M[], query?: Partial<ReadQuery>, context?: any): Promise<RelationMeta<R, Type>> {
        const meta: RelationMeta<R, Type> = { type: this.type, data: {}, index: {} }
        if (resources.length === 0) {
            return meta
        }

        // Group by hydrated query, so resources pointing at the same target are read once.
        const groups = new Map<string, { query: any; resources: M[] }>()
        for (const resource of resources) {
            const resourceQuery = this.queryFor(resource, query)
            const key = stableKey(resourceQuery)
            const group = groups.get(key)
            if (group) {
                group.resources.push(resource)
            } else {
                groups.set(key, { query: resourceQuery, resources: [resource] })
            }
        }

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
                const key = stableKey((entry as any)[batchField])
                const bucket = related.get(key)
                if (bucket) {
                    bucket.push(entry)
                } else {
                    related.set(key, [entry])
                }
            }
            for (const group of batches) {
                this.record(meta, group.resources, related.get(stableKey(group.query[batchField])) ?? [])
            }
        } else {
            const nested = this.nestedContext(context)
            await Promise.all(
                [...groups.values()].map(async (group) => {
                    const result = await this.pipeline.read(group.query, nested)
                    this.record(meta, group.resources, result.data)
                }),
            )
        }

        return meta
    }

    /**
     * Add one group's related resources to the store, and point each holding resource at them.
     */
    private record(meta: RelationMeta<R, Type>, resources: M[], related: R[]) {
        for (const entry of related) {
            meta.data[entry.id] = entry
        }
        for (const resource of resources) {
            if (this.type === RelationType.many) {
                ;(meta.index as Record<string, string[]>)[resource.id] = related.map((entry) => entry.id)
            } else if (related.length > 0) {
                ;(meta.index as Record<string, string>)[resource.id] = related[0].id
            }
        }
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
