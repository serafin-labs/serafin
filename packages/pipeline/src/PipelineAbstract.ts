import * as _ from "lodash"
import * as util from "util"
import { SchemaBuilder } from "@serafin/schema-builder"
import { notImplementedError, error } from "./error"
import { IdentityInterface } from "./IdentityInterface"
import { SchemaBuildersInterface, schemaBuildersInterfaceKeys } from "./SchemaBuildersInterface"
import { Pipe, PipeCreateNext, PipeResultActionsInterface } from "./PipeInterface"
import { Relation } from "./Relation"
import { ResultsInterface } from "./ResultsInterface"
import { PipelineInterface, PipelineMethods, ReadOnlyPipelineInterface, pipelineMethods } from "./PipelineInterface"
import { RelationType } from "./RelationType"

export interface PipelineAbstractOptions {
    validationEnabled?: boolean
}
export const defaultPipelineAbstractOptions: PipelineAbstractOptions = { validationEnabled: true }

export abstract class PipelineAbstract<
    M extends IdentityInterface = IdentityInterface,
    CV = any,
    CO = any,
    RQ = any,
    PQ = any,
    PV = any,
    DQ = any,
    CM = any,
    RM = any,
    PM = any,
    DM = any,
    R extends Record<string, Relation<IdentityInterface, string, IdentityInterface, any, any, RelationType>> = {},
> implements PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>
{
    public relations: R = {} as R

    private pipes: PipeResultActionsInterface[] = []

    private options: PipelineAbstractOptions

    constructor(public schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>, options?: PipelineAbstractOptions) {
        this.options = { ...defaultPipelineAbstractOptions, ...options }
    }

    public get modelSchemaBuilder() {
        return this.schemaBuilders.model as SchemaBuilder<M>
    }

    public pipe<M2 extends IdentityInterface = M, CV2 = CV, CO2 = CO, RQ2 = RQ, PQ2 = PQ, PV2 = PV, DQ2 = DQ, CM2 = CM, RM2 = RM, PM2 = PM, DM2 = DM>(
        pipe: Pipe<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2>,
    ) {
        // run the pipe
        const result = (typeof pipe === "function" ? pipe : pipe.transform)({
            ...this.schemaBuilders,
        })
        // combine schema modifications with the current schemas
        const newPipeline = this.clone() as any as PipelineAbstract<M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, R>
        const modifiedSchemas = _.pick(result, schemaBuildersInterfaceKeys)
        if (Object.keys(modifiedSchemas).length > 0) {
            newPipeline.schemaBuilders = {
                ...this.schemaBuilders,
                ...modifiedSchemas,
            } as any
        }
        // add pipe methods modifications to the pipeline if it implements at least one of the CRUD methods
        const modifiedMethods = _.pick(result, pipelineMethods)
        if (Object.keys(modifiedMethods).length > 0) {
            newPipeline.pipes = [
                _.mapValues(
                    modifiedMethods,
                    (value: any, key) =>
                        (...props) =>
                            value(...props, this), // the current pipeline is provided as the last argument
                ),
                ...this.pipes,
            ]
        }

        return newPipeline
    }

    /**
     * Build a recursive function that will call all the pipes for a CRUD method
     */
    private pipeChain(method: PipelineMethods) {
        const callChain = async (i: number, ...args) => {
            while (i < this.pipes.length && !(method in this.pipes[i])) {
                ++i
            }
            if (i >= this.pipes.length) {
                return (this[`_${method}`] as (...args) => any)(...args)
            } else {
                return (this.pipes[i++] as any)[method]((...args) => callChain(i, ...args), ...args)
            }
        }
        return async (...args) => callChain(0, ...args)
    }

    /**
     * Add a many relation to the pipeline.
     * A query parameter is added to the all actions to conditionally fetch the related entities.
     */
    public addRelationWithMany<NameKey extends string, RelationModel extends IdentityInterface, ReadQuery, ReadMeta>(
        name: NameKey,
        pipeline: ReadOnlyPipelineInterface<RelationModel, ReadQuery, ReadMeta>,
        query: Partial<ReadQuery>,
    ) {
        const relationSchema = SchemaBuilder.arraySchema(pipeline.schemaBuilders.model)
        const relationOption = `with${_.upperFirst(name)}` as `with${Capitalize<NameKey>}`
        const relationOptionSchema = SchemaBuilder.booleanSchema({ description: `If set to 'true', the result will include the property '${name}'` })
        const relation: Relation<M, NameKey, RelationModel, ReadQuery, ReadMeta, RelationType.many> = new Relation(
            this,
            name,
            pipeline,
            query,
            RelationType.many,
        )
        const newPipeline = (
            this as any as PipelineAbstract<
                M,
                CV,
                CO,
                RQ,
                PQ,
                PV,
                DQ,
                CM,
                RM,
                PM,
                DM,
                R & { [key in NameKey]: Relation<M, NameKey, RelationModel, ReadQuery, ReadMeta, RelationType.many> }
            >
        ).pipe((p) => {
            const model = p.model.addProperty(name, relationSchema, false)
            const readQuery = p.readQuery.addProperty(relationOption, relationOptionSchema, false)
            const createOptions = p.createOptions.addProperty(relationOption, relationOptionSchema, false)
            const patchQuery = p.patchQuery.addProperty(relationOption, relationOptionSchema, false)
            const deleteQuery = p.deleteQuery.addProperty(relationOption, relationOptionSchema, false)
            return {
                model,
                readQuery,
                createOptions,
                patchQuery,
                deleteQuery,
                create: async (next, resources, options) => {
                    const result = await next(resources, options)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
                read: async (next, query: typeof readQuery.T) => {
                    const result = await next(query)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
                patch: async (next, query, values) => {
                    const result = await next(query, values)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
                delete: async (next, query) => {
                    const result = await next(query)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
            }
        })
        newPipeline.relations[name] = relation as any
        return newPipeline
    }

    /**
     * Add a one relation to the pipeline.
     * A query parameter is added to the all actions to conditionally fetch the related entity.
     */
    public addRelationWithOne<NameKey extends string, RelationModel extends IdentityInterface, ReadQuery, ReadMeta>(
        name: NameKey,
        pipeline: ReadOnlyPipelineInterface<RelationModel, ReadQuery, ReadMeta>,
        query: Partial<ReadQuery>,
    ) {
        const relationSchema = pipeline.schemaBuilders.model
        const relationOption = `with${_.upperFirst(name)}` as `with${Capitalize<NameKey>}`
        const relationOptionSchema = SchemaBuilder.booleanSchema({ description: `If set to 'true', the result will include the property '${name}'` })
        const relation: Relation<M, NameKey, RelationModel, ReadQuery, ReadMeta, RelationType.one> = new Relation(this, name, pipeline, query, RelationType.one)
        const newPipeline = (
            this as any as PipelineAbstract<
                M,
                CV,
                CO,
                RQ,
                PQ,
                PV,
                DQ,
                CM,
                RM,
                PM,
                DM,
                R & { [key in NameKey]: Relation<M, NameKey, RelationModel, ReadQuery, ReadMeta, RelationType.one> }
            >
        ).pipe((p) => {
            const model = p.model.addProperty(name, relationSchema, false)
            const readQuery = p.readQuery.addProperty(relationOption, relationOptionSchema, false)
            const createOptions = p.createOptions.addProperty(relationOption, relationOptionSchema, false)
            const patchQuery = p.patchQuery.addProperty(relationOption, relationOptionSchema, false)
            const deleteQuery = p.deleteQuery.addProperty(relationOption, relationOptionSchema, false)
            return {
                model,
                readQuery,
                createOptions,
                patchQuery,
                deleteQuery,
                create: async (next, resources, options) => {
                    const result = await next(resources, options)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
                read: async (next, query: typeof readQuery.T) => {
                    const result = await next(query)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
                patch: async (next, query, values) => {
                    const result = await next(query, values)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
                delete: async (next, query) => {
                    const result = await next(query)
                    return { ...result, data: await relation.assignToResources(result.data) }
                },
            }
        })
        newPipeline.relations[name] = relation as any
        return newPipeline
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        return util.inspect(
            _.mapValues(this.schemaBuilders, (schema: SchemaBuilder<any>) => schema.schema),
            false,
            null,
        )
    }

    /**
     * Create new resources based on `resources` input array.
     *
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipes
     */
    async create(resources: CV[], options?: CO): Promise<ResultsInterface<M, CM>> {
        resources = _.cloneDeep(resources)
        options = _.cloneDeep(options ?? ({} as CO))
        this.handleValidate("create", () => {
            this.schemaBuilders.createValues.validateList(resources)
            this.schemaBuilders.createOptions.validate(options)
        })
        return this.pipeChain("create")(resources, options)
    }

    protected _create(resources: CV[], options: CO): Promise<ResultsInterface<M, CM>> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name)
    }

    /**
     * Read resources from the underlying source according to the given `query`.
     *
     * @param query The query filter to be used for fetching the data
     */
    async read(query: RQ): Promise<ResultsInterface<M, RM>> {
        query = _.cloneDeep(query)
        this.handleValidate("read", () => {
            this.schemaBuilders.readQuery.validate(query)
        })
        return this.pipeChain("read")(query)
    }

    protected _read(query: RQ): Promise<ResultsInterface<M, RM>> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name)
    }

    /**
     * Patch resources according to the given query and values.
     * The Query will select a subset of the underlying data source and given `values` are updated on it.
     * This method follows the JSON merge patch standard. @see https://tools.ietf.org/html/rfc7396
     *
     * @param query
     * @param values
     */
    async patch(query: PQ, values: PV): Promise<ResultsInterface<M, PM>> {
        query = _.cloneDeep(query)
        values = _.cloneDeep(values)
        this.handleValidate("patch", () => {
            this.schemaBuilders.patchQuery.validate(query)
            this.schemaBuilders.patchValues.validate(values)
        })
        return this.pipeChain("patch")(query, values)
    }

    protected _patch(query: PQ, values: PV): Promise<ResultsInterface<M, PM>> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name)
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     */
    async delete(query: DQ): Promise<ResultsInterface<M, DM>> {
        query = _.cloneDeep(query)
        this.handleValidate("delete", () => {
            this.schemaBuilders.deleteQuery.validate(query)
        })
        return this.pipeChain("delete")(query)
    }

    protected _delete(query: DQ): Promise<ResultsInterface<M, DM>> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name)
    }

    private handleValidate(method: string, validate: () => void) {
        if (!this.options.validationEnabled) {
            return
        }
        try {
            validate()
        } catch (e) {
            throw error(
                "SerafinValidationError",
                `Validation failed in ${Object.getPrototypeOf(this).constructor.name}::${method}`,
                { constructor: Object.getPrototypeOf(this).constructor.name, method: method },
                e,
            )
        }
    }

    clone(): this {
        let clonedPipeline = _.cloneDeepWith(this, (value: any, key: number | string | undefined) => {
            if (key === "relations" || key === "schemaBuilders" || key === "pipes") {
                // shallow clone
                return _.clone(value)
            }
        })
        return clonedPipeline
    }
}
