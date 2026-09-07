import _ from "lodash"
import { SchemaBuilder } from "@serafin/schema-builder"
import { conflictError, error, validationError } from "../error.js"
import { IdentityInterface } from "../IdentityInterface.js"
import { PipelineAbstract, PipelineAbstractOptions } from "../PipelineAbstract.js"
import { ResultsInterface } from "../ResultsInterface.js"
import { defaultSchemaBuilders } from "../SchemaBuildersInterface.js"
import { assertQueryProperties, compareForSort, logicalQueryOperators, matchQuery, queryOperators } from "./memory/matchQuery.js"
import { applyPatch, updateOperators } from "./memory/applyPatch.js"
import { parsePath, valuesAtPath } from "./memory/path.js"

/**
 * Read query properties that shape the result rather than filter it. Deliberately the same set, with
 * the same names and bounds, as a mongo source's: prototyping against memory and deploying against
 * a database should be a change of pipeline and nothing else.
 */
export const memoryReadOptionsSchemaBuilder = SchemaBuilder.emptySchema()
    .addInteger("skip", { description: "Offset of the first resource to return", minimum: 0 }, false)
    .addInteger("limit", { description: "Number of resources to return", minimum: 0 }, false)
    .addBoolean("withCount", { description: "Indicate if the result should contain the count of all resources matching the query" }, false)
    .addProperty(
        "sort",
        SchemaBuilder.emptySchema({ description: "Properties to sort on, 1 for ascending and -1 for descending" }).addAdditionalProperties(
            SchemaBuilder.enumSchema([-1, 1] as const),
        ),
        false,
    )

export const memoryReadMetaSchemaBuilder = SchemaBuilder.emptySchema().addInteger(
    "count",
    { description: "Count of all resources matching the query, present when 'withCount' was asked for", minimum: 0 },
    false,
)

const readOptionKeys = ["skip", "limit", "withCount", "sort"] as const

/**
 * What a `MemoryPipeline` understands of what a pipe hands down to it. A pipe that declares
 * `requires` is checked against this when it is attached. @see PipeCapabilitiesInterface
 */
export const memoryCapabilities: readonly string[] = [
    ...queryOperators,
    ...logicalQueryOperators,
    ...updateOperators,
    // `$push` and `$addToSet` take it, and it is what a pipe adding several elements at once emits
    "$each",
    "dotted-paths",
    ...readOptionKeys,
    "count",
]

/**
 * The schema builders a `MemoryPipeline` runs on: the defaults derived from the model, with the read
 * options added to the read query and `count` to the read meta.
 */
export function memorySchemaBuilders<M extends IdentityInterface>(model: SchemaBuilder<M>) {
    const defaults = defaultSchemaBuilders(model)
    return {
        ...defaults,
        readQuery: defaults.readQuery.mergeProperties(memoryReadOptionsSchemaBuilder),
        readMeta: defaults.readMeta.mergeProperties(memoryReadMetaSchemaBuilder),
    }
}

type MemorySchemaBuilders<M extends IdentityInterface> = ReturnType<typeof memorySchemaBuilders<M>>

export interface MemoryPipelineOptions<M extends IdentityInterface> extends PipelineAbstractOptions {
    /** Resources to start from. Copied, so the array given here is never written to. */
    initialData?: M[]
    /**
     * Copy resources in and out of the store, on by default.
     *
     * It is what keeps a caller that mutates a resource it read from corrupting the store. Turning
     * it off makes reads cheap and the store's contents shared -- sound only if everything holding a
     * resource treats it as immutable.
     */
    clone?: boolean
    /**
     * Id for a resource created without one. Defaults to a random UUID; a counter is easier to read
     * in a test.
     */
    generateId?: () => string
}

// `globalThis.crypto` rather than `node:crypto`, so nothing here is tied to a Node runtime.
const randomId = () => (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID()

/**
 * A pipeline that keeps its resources in memory, for prototyping, for tests, and for data whose
 * loss when the process exits is acceptable.
 *
 * Queries and patch values accept the mongo operators listed in `queryOperators` and
 * `updateOperators`, so the pipes that talk to a mongo source in that vocabulary work here
 * unchanged. An operator outside those lists is an error rather than a silent no-op.
 *
 * Every action mutates the store synchronously, so each one is atomic: nothing interleaves with a
 * create that is still assigning ids or a patch that is still writing.
 */
export class MemoryPipeline<M extends IdentityInterface> extends PipelineAbstract<
    M,
    MemorySchemaBuilders<M>["createValues"]["T"],
    MemorySchemaBuilders<M>["createOptions"]["T"],
    MemorySchemaBuilders<M>["readQuery"]["T"],
    MemorySchemaBuilders<M>["patchQuery"]["T"],
    MemorySchemaBuilders<M>["patchValues"]["T"],
    MemorySchemaBuilders<M>["deleteQuery"]["T"],
    MemorySchemaBuilders<M>["createMeta"]["T"],
    MemorySchemaBuilders<M>["readMeta"]["T"],
    MemorySchemaBuilders<M>["patchMeta"]["T"],
    MemorySchemaBuilders<M>["deleteMeta"]["T"],
    MemorySchemaBuilders<M>["context"]["T"],
    MemorySchemaBuilders<M>["meta"]["T"]
> {
    // A `Map` rather than an object: ids come from whoever writes to the store, and `__proto__` as
    // a key of a plain object is not a key at all.
    private store = new Map<string, M>()

    private cloneResources: boolean

    private validateResources: boolean

    private generateId: () => string

    // The model's own property names, to tell a query that filters on something no resource can
    // have from one that simply matches nothing. `defaultSchemaBuilders` only accepts a model that
    // forbids additional properties, so this is the complete set of what a resource can hold.
    private modelProperties: Set<string>

    constructor(model: SchemaBuilder<M>, options: MemoryPipelineOptions<M> = {}) {
        super(memorySchemaBuilders(model) as any, { capabilities: memoryCapabilities, ...options })
        this.modelProperties = new Set(Object.keys((model.schema as any).properties))
        this.cloneResources = options.clone ?? true
        this.validateResources = options.validationEnabled ?? true
        this.generateId = options.generateId ?? randomId
        if (options.initialData) {
            this.restore(options.initialData)
        }
    }

    /** How many resources the store holds. */
    public get size() {
        return this.store.size
    }

    /** Every resource in the store, in insertion order. */
    public snapshot(): M[] {
        return [...this.store.values()].map((resource) => this.out(resource))
    }

    /** Replace the store's contents. Each resource is validated against the model. */
    public restore(resources: M[]): void {
        const validated = resources.map((resource) => {
            this.validateModel(resource, "restore")
            return this.in(resource)
        })
        this.store.clear()
        for (const resource of validated) {
            this.store.set(resource.id, resource)
        }
    }

    public clear(): void {
        this.store.clear()
    }

    private in<T>(resource: T): T {
        return this.cloneResources ? _.cloneDeep(resource) : resource
    }

    private out<T>(resource: T): T {
        return this.cloneResources ? _.cloneDeep(resource) : resource
    }

    /**
     * A resource that leaves an action has to satisfy the model, or the next read of it fails
     * validation somewhere far from the patch that caused it.
     */
    private validateModel(resource: any, method: string) {
        if (!this.validateResources) {
            return
        }
        try {
            this.schemaBuilders.model.validate(resource)
        } catch (e) {
            throw error(
                "SerafinValidationError",
                `Validation failed in ${Object.getPrototypeOf(this).constructor.name}::${method}(resource)`,
                { method, resource },
                e,
            )
        }
    }

    /**
     * The resources matching `query`, ignoring the properties that shape rather than filter.
     *
     * A query that only selects on `id` reads the `Map` directly instead of scanning it. That is the
     * hottest shape in the library: resolving a relation over a page asks for exactly `{ id: [...] }`.
     */
    private select(query: any): M[] {
        const filter = _.omit(query, readOptionKeys)
        assertQueryProperties(
            filter,
            (property) => this.modelProperties.has(property),
            (property) =>
                `'${property}' is not a property of ${
                    (this.schemaBuilders.model.schema as any).title ?? "the model"
                }. A pipe that should have translated it is missing, or attached in the wrong order.`,
        )
        const keys = Object.keys(filter)
        if (keys.length === 1 && keys[0] === "id") {
            const ids = filter.id
            if (typeof ids === "string") {
                const resource = this.store.get(ids)
                return resource ? [resource] : []
            }
            if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
                // `Set` so a repeated id in the query doesn't return the resource twice.
                return [...new Set<string>(ids)].map((id) => this.store.get(id)).filter((resource): resource is M => !!resource)
            }
        }
        return [...this.store.values()].filter((resource) => matchQuery(filter, resource))
    }

    private sort(resources: M[], sort: { [property: string]: -1 | 1 } | undefined): M[] {
        if (!sort) {
            return resources
        }
        const criteria = Object.keys(sort).map((property) => ({ path: parsePath(property), direction: sort[property] }))
        // `Array.prototype.sort` is stable, so resources that compare equal keep the order they
        // were selected in.
        return [...resources].sort((a, b) => {
            for (const { path, direction } of criteria) {
                const order = compareForSort(valuesAtPath(a, path)[0], valuesAtPath(b, path)[0])
                if (order !== 0) {
                    return order * direction
                }
            }
            return 0
        })
    }

    protected override async _create(
        resources: MemorySchemaBuilders<M>["createValues"]["T"][],
        options: MemorySchemaBuilders<M>["createOptions"]["T"],
        context: MemorySchemaBuilders<M>["context"]["T"],
    ): Promise<ResultsInterface<M, MemorySchemaBuilders<M>["createMeta"]["T"]>> {
        // Ids are assigned and conflicts are checked for the whole batch before anything is written,
        // so a create either happens completely or leaves the store as it was.
        // `createValues` is the model with an optional id, so a resource that passed the action's own
        // validation satisfies the model once an id is on it. Only patch and restore can produce a
        // resource the entry validation never saw.
        const created = resources.map((resource) => ({ ...(resource as any), id: (resource as any).id ?? this.generateId() }) as M)
        const seen = new Set<string>()
        for (const resource of created) {
            if (this.store.has(resource.id) || seen.has(resource.id)) {
                throw conflictError(resource.id)
            }
            seen.add(resource.id)
        }
        for (const resource of created) {
            this.store.set(resource.id, this.in(resource))
        }
        return { data: created.map((resource) => this.out(resource)), meta: {} }
    }

    protected override async _read(
        query: MemorySchemaBuilders<M>["readQuery"]["T"],
        context: MemorySchemaBuilders<M>["context"]["T"],
    ): Promise<ResultsInterface<M, MemorySchemaBuilders<M>["readMeta"]["T"]>> {
        const { skip, limit, withCount, sort } = query as any
        const matched = this.sort(this.select(query), sort)
        const meta: any = {}
        if (withCount) {
            // The count is of everything matching, which is what a pager needs -- `skip` and
            // `limit` apply to the page only.
            meta.count = matched.length
        }
        const start = skip ?? 0
        const page = limit === undefined ? matched.slice(start) : matched.slice(start, start + limit)
        return { data: page.map((resource) => this.out(resource)), meta }
    }

    protected override async _patch(
        query: MemorySchemaBuilders<M>["patchQuery"]["T"],
        values: MemorySchemaBuilders<M>["patchValues"]["T"],
        context: MemorySchemaBuilders<M>["context"]["T"],
    ): Promise<ResultsInterface<M, MemorySchemaBuilders<M>["patchMeta"]["T"]>> {
        const matched = this.select(query)
        // Patch every match, then write: an update that fails validation on the third resource
        // leaves the first two alone.
        const patched = matched.map((resource) => {
            const result = applyPatch(resource, values)
            if (result.id !== resource.id) {
                throw validationError(`A patch cannot change the id of '${resource.id}'`)
            }
            this.validateModel(result, "patch")
            return result
        })
        for (const resource of patched) {
            this.store.set(resource.id, this.in(resource))
        }
        return { data: patched.map((resource) => this.out(resource)), meta: {} }
    }

    protected override async _delete(
        query: MemorySchemaBuilders<M>["deleteQuery"]["T"],
        context: MemorySchemaBuilders<M>["context"]["T"],
    ): Promise<ResultsInterface<M, MemorySchemaBuilders<M>["deleteMeta"]["T"]>> {
        const matched = this.select(query)
        for (const resource of matched) {
            this.store.delete(resource.id)
        }
        return { data: matched.map((resource) => this.out(resource)), meta: {} }
    }
}
