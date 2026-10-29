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
 * Read query options that page a result. A batched read pages the whole batch at once, so a related
 * read carrying one of them is made per resource instead.
 */
const pagingOptions = ["limit", "skip"]

const asList = (value: any): any[] => (Array.isArray(value) ? value : [value])

/**
 * What a relation contributes to `meta.relations`.
 *
 * `data` holds each related resource once, keyed by its own id, so a target shared by many
 * resources is carried once instead of once per resource. `index` maps a holding resource's id to
 * the related id (or ids, for a many relation) -- which is what makes a many relation joinable at
 * all, since its key lives on the target rather than on the resource.
 *
 * `relations` holds what the related read resolved in turn, when the relation option carried the
 * target's own `with<Name>` options. It nests rather than merging into the top level: each level's
 * `index` is keyed by the ids of that level's holding resources, and two levels may well use the same
 * relation name for different targets.
 */
export interface RelationMeta<R extends IdentityInterface, Type extends RelationType, Relations = {}> {
    type: Type
    data: Record<string, R>
    index: Record<string, Type extends RelationType.many ? string[] : string>
    relations?: Relations
}

/**
 * The relations a pipeline's meta declares, which a relation to it can carry one level down.
 */
export type NestedRelations<META> = META extends { relations?: infer REL } ? REL : {}

type AnyRelations = Record<string, RelationMeta<any, any, any>>

/**
 * Merge nested relations into an accumulator. Groups read separately can return the same nested
 * resources, so a relation already present is merged into rather than replaced. Copies are made, so
 * a read result shared through a cache is never mutated.
 */
function mergeRelations(into: AnyRelations, from: AnyRelations) {
    for (const name of Object.keys(from)) {
        const source = from[name]
        const target = (into[name] ??= { type: source.type, data: {}, index: {} })
        Object.assign(target.data, source.data)
        Object.assign(target.index, source.index)
        if (source.relations) {
            target.relations = mergeRelations(target.relations ?? {}, source.relations)
        }
    }
    return into
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
     * with one read instead of one per resource. A resource missing a templated field has nothing to
     * relate to, and is left out of the index rather than failing the whole page.
     */
    async resolve(resources: M[], query?: Partial<ReadQuery>, context?: any): Promise<RelationMeta<R, Type, AnyRelations>> {
        const meta: RelationMeta<R, Type, AnyRelations> = { type: this.type, data: {}, index: {} }

        // Group by hydrated query, so resources pointing at the same target are read once.
        const groups = new Map<string, { query: any; resources: M[] }>()
        for (const resource of resources.filter((resource) => QueryTemplate.canHydrate(this.query, resource))) {
            const resourceQuery = this.queryFor(resource, query)
            const key = stableKey(resourceQuery)
            const group = groups.get(key)
            if (group) {
                group.resources.push(resource)
            } else {
                groups.set(key, { query: resourceQuery, resources: [resource] })
            }
        }
        if (groups.size === 0) {
            return meta
        }

        const batchField = groups.size > 1 ? this.batchField(query) : undefined
        if (batchField !== undefined) {
            const batches = [...groups.values()]
            // A key that is itself a list -- a resource holding several ids -- asks for each of them.
            const wanted = new Map<string, any>()
            for (const group of batches) {
                for (const value of asList(group.query[batchField])) {
                    wanted.set(stableKey(value), value)
                }
            }
            const result = await this.pipeline.read({ ...batches[0].query, [batchField]: [...wanted.values()] } as any, this.nestedContext(context))
            // Index the single result set by the field the relation is keyed on, under each of its
            // values when the target holds a list there. Positions rather than entries, so a group
            // reached through several keys gets each entry once, in the order the target returned.
            const related = new Map<string, number[]>()
            result.data.forEach((entry, position) => {
                for (const value of asList((entry as any)[batchField])) {
                    const key = stableKey(value)
                    const bucket = related.get(key)
                    if (bucket) {
                        bucket.push(position)
                    } else {
                        related.set(key, [position])
                    }
                }
            })
            for (const group of batches) {
                const positions = new Set(asList(group.query[batchField]).flatMap((value) => related.get(stableKey(value)) ?? []))
                this.record(
                    meta,
                    group.resources,
                    [...positions].sort((a, b) => a - b).map((position) => result.data[position]),
                )
            }
            this.recordNested(meta, result.meta)
        } else {
            const nested = this.nestedContext(context)
            await Promise.all(
                [...groups.values()].map(async (group) => {
                    const result = await this.pipeline.read(group.query, nested)
                    this.record(meta, group.resources, result.data)
                    this.recordNested(meta, result.meta)
                }),
            )
        }

        return meta
    }

    /**
     * Add one group's related resources to the store, and point each holding resource at them.
     */
    private record(meta: RelationMeta<R, Type, unknown>, resources: M[], related: R[]) {
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
     * Carry the relations a related read resolved in turn, when its query nested `with<Name>` options.
     */
    private recordNested(meta: RelationMeta<R, Type, AnyRelations>, readMeta: ReadMeta) {
        const relations = (readMeta as any).relations
        if (relations) {
            meta.relations = mergeRelations(meta.relations ?? {}, relations)
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

    /**
     * The target's read query for one resource. A scalar key aimed at a field the target holds as a
     * list is sent as a list of one: a derived read query takes an array there, meaning "any of".
     */
    private queryFor(resource: M, query?: Partial<ReadQuery>) {
        const hydrated: any = QueryTemplate.hydrate(this.query, resource)
        const model = (this.pipeline.schemaBuilders.model.schema as any)?.properties
        for (const field of Object.keys(QueryTemplate.getTemplatedParts(this.query))) {
            if (!Array.isArray(hydrated[field]) && acceptsArray(model?.[field])) {
                hydrated[field] = [hydrated[field]]
            }
        }
        return { ...hydrated, ...(query || {}) }
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
     *
     * A related read that pages its result can't be shared either: its `limit` and `skip` would apply
     * to the page as a whole rather than to each resource's share of it.
     */
    private batchField(query?: Partial<ReadQuery>): string | undefined {
        const options: any = { ...QueryTemplate.getNonTemplatedParts(this.query), ...(query || {}) }
        if (pagingOptions.some((option) => options[option] !== undefined)) {
            return undefined
        }
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
