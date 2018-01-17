import * as util from 'util';
import * as _ from 'lodash';
import * as Ajv from 'ajv'
import * as VError from 'verror';

import { validationError, serafinError, notImplementedError } from "../error/Error"
import { SchemaBuilder, Omit, DeepPartial } from "@serafin/schema-builder"
import { PipelineRelation } from './Relation';
import { IdentityInterface } from './IdentityInterface'
import { PipeAbstract } from './PipeAbstract';
import { SchemaBuilderHolder } from './SchemaBuilderHolder';

export type Query<T> = {[P in keyof T]: T[P] | T[P][]};
export type PipelineMethods = "create" | "read" | "update" | "patch" | "delete";

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export abstract class PipelineAbstract<
    T extends IdentityInterface = IdentityInterface, ReadQuery = Partial<Query<T>>, ReadOptions = {}, ReadWrapper = {},
    CreateValues = Omit<T, "id">, CreateOptions = {}, CreateWrapper = {},
    UpdateValues = Omit<T, "id">, UpdateOptions = {}, UpdateWrapper = {},
    PatchQuery = Query<Pick<T, "id">>, PatchValues = DeepPartial<Omit<T, "id">>, PatchOptions = {}, PatchWrapper = {},
    DeleteQuery = Query<Pick<T, "id">>, DeleteOptions = {}, DeleteWrapper = {}, Relations = {}>

    extends SchemaBuilderHolder<T, ReadQuery, ReadOptions, ReadWrapper,
    CreateValues, CreateOptions, CreateWrapper,
    UpdateValues, UpdateOptions, UpdateWrapper,
    PatchQuery, PatchValues, PatchOptions, PatchWrapper,
    DeleteQuery, DeleteOptions, DeleteWrapper> {

    //private optionsMapping: Partial<Record<PipelineMethods, { [k: string]: string }>> = {};
    public relations: { [key: string]: PipelineRelation } = {};

    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'update', 'patch', 'delete'];

    constructor(model: SchemaBuilder<T>, {
        readQuery = model.clone().transformPropertiesToArray().toOptionals(),
        createValues = model.clone().omitProperties(["id"]),
        updateValues = model.clone().omitProperties(["id"]),
        patchQuery = model.clone().pickProperties(["id"]).transformPropertiesToArray(),
        patchValues = model.clone().omitProperties(["id"]).toDeepOptionals(),
        deleteQuery = model.clone().pickProperties(["id"]).transformPropertiesToArray()
    }: {
            readQuery?: SchemaBuilder<ReadQuery>,
            createValues?: SchemaBuilder<CreateValues>,
            updateValues?: SchemaBuilder<UpdateValues>,
            patchQuery?: SchemaBuilder<PatchQuery>,
            patchValues?: SchemaBuilder<PatchValues>,
            deleteQuery?: SchemaBuilder<DeleteQuery>
        } = {}) {

        super();
        this.modelSchemaBuilder = model;
        this.readQuerySchemaBuilder = readQuery as any;
        this.createValuesSchemaBuilder = createValues as any;
        this.updateValuesSchemaBuilder = updateValues as any;
        this.patchQuerySchemaBuilder = patchQuery as any;
        this.patchValuesSchemaBuilder = patchValues as any;
        this.deleteQuerySchemaBuilder = deleteQuery as any;
    }

    /**
     * Add a relation to the pipeline.
     * This method modifies the pipeline and affect the templated type.
     * 
     * @param relation 
     */
    public addRelation<N extends keyof any, R extends IdentityInterface, RReadQuery, RReadOptions, RReadWrapper,
        K1 extends keyof RReadQuery = null, K2 extends keyof RReadOptions = null>

        (name: N, pipeline: () => PipelineAbstract<R, RReadQuery, RReadOptions, RReadWrapper>,
        query: {[key in K1]: any}, options?: {[key in K2]: any}) {

        this.relations[name as string] = new PipelineRelation(this as any, name, pipeline, query, options)
        return this as PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper,
            CreateValues, CreateOptions, CreateWrapper,
            UpdateValues, UpdateOptions, UpdateWrapper,
            PatchQuery, PatchValues, PatchOptions, PatchWrapper,
            DeleteQuery, DeleteOptions, DeleteWrapper,
            Relations & {[key in N]: PipelineRelation<T, N, R, RReadQuery, RReadOptions, RReadWrapper, K1, K2>}>;
    }

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    async create(resources: CreateValues[], options?: CreateOptions): Promise<{ data: T[] } & CreateWrapper> {
        this.handleValidate('create', () => {
            if (this.createValuesSchemaBuilder) { this.createValuesSchemaBuilder.validateList(resources) }
            if (this.createOptionsSchemaBuilder) { this.createOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._create(resources, this.prepareOptionsMapping(options, "create"));
    }

    private _create(resources, options): Promise<{ data: T[] } & CreateWrapper> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    async read(query?: ReadQuery, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper> {
        this.handleValidate('read', () => {
            if (this.readQuerySchemaBuilder) { this.readQuerySchemaBuilder.validate(query || {} as any) }
            if (this.readOptionsSchemaBuilder) { this.readOptionsSchemaBuilder.validate(options || {} as any) }
        });

        return this._read(query, this.prepareOptionsMapping(options, "read"));
    }

    private _read(query, options): Promise<{ data: T[] } & ReadWrapper> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Update replace an existing resource with the given values.
     * Because it replaces the resource, only one can be updated at a time.
     * If you need to update many resources in a single query, please use patch instead
     * 
     * @param id 
     * @param values 
     * @param options 
     */
    async update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<{ data: T } & UpdateWrapper> {
        this.handleValidate('update', () => {
            if (this.updateValuesSchemaBuilder) { this.updateValuesSchemaBuilder.validate(values) }
            if (this.updateOptionsSchemaBuilder) { this.updateOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._update(id, values, options);
    }

    private _update(id, values, options): Promise<{ data: T } & UpdateWrapper> {
        throw notImplementedError("update", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Patch resources according to the given query and values.
     * The Query will select a subset of the underlying data source and given `values` are updated on it.
     * This method follow the JSON merge patch standard. @see https://tools.ietf.org/html/rfc7396
     * 
     * @param query 
     * @param values 
     * @param options 
     */
    async patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper> {
        this.handleValidate('patch', () => {
            if (this.patchQuerySchemaBuilder) { this.patchQuerySchemaBuilder.validate(query) }
            if (this.patchValuesSchemaBuilder) { this.patchValuesSchemaBuilder.validate(values) }
            if (this.patchOptionsSchemaBuilder) { this.patchOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._patch(query, values, this.prepareOptionsMapping(options, "patch"));
    }

    private _patch(query, values, options): Promise<{ data: T[] } & PatchWrapper> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    async delete(query: DeleteQuery, options?: DeleteOptions): Promise<{ data: T[] } & DeleteWrapper> {
        this.handleValidate('delete', () => {
            if (this.deleteQuerySchemaBuilder) { this.deleteQuerySchemaBuilder.validate(query) }
            if (this.deleteOptionsSchemaBuilder) { this.deleteOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._delete(query, this.prepareOptionsMapping(options, "delete"));
    }

    private _delete(query, options): Promise<{ data: T[] } & DeleteWrapper> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        let pipelineSchema: any = {}
        for (let schemaBuilderName of PipelineAbstract.schemaBuilderNames) {
            if (this[schemaBuilderName]) {
                pipelineSchema[schemaBuilderName] = this[schemaBuilderName].schema
            }
        }
        return (util.inspect(pipelineSchema, false, null));
    }

    /**
     * Add a pipe to the pipeline
     * 
     * @param pipe The pipe to add
     */
    pipe<P, PReadQuery, PReadOptions, PReadWrapper,
        PCreateValues, PCreateOptions, PCreateWrapper,
        PUpdateValues, PUpdateOptions, PUpdateWrapper,
        PPatchQuery, PPatchValues, PPatchOptions, PPatchWrapper,
        PDeleteQuery, PDeleteOptions, PDeleteWrapper>

        (pipe: PipeAbstract<P, PReadQuery, PReadOptions, PReadWrapper,
            PCreateValues, PCreateOptions, PCreateWrapper,
            PUpdateValues, PUpdateOptions, PUpdateWrapper,
            PPatchQuery, PPatchValues, PPatchOptions, PPatchWrapper,
            PDeleteQuery, PDeleteOptions, PDeleteWrapper>) {

        // Pipe attached to this pipeline
        pipe.attach(this as any);

        // Methods chaining
        for (var method of PipelineAbstract.CRUDMethods) {
            if (typeof pipe[method] == 'function') {
                let next = this[`_${method}`];
                this[`_${method}`] = function (next, ...args) {
                    return (pipe[method] as (...args) => any).call(pipe, args);
                };
            }
        }

        // Schema properties merging (has to be done out of a loop to gather the typings)
        let modelSchemaBuilder = this.modelSchemaBuilder.overwriteProperties(pipe.modelSchemaBuilder);
        this.modelSchemaBuilder = modelSchemaBuilder as any;

        let readQuerySchemaBuilder = this.readQuerySchemaBuilder.overwriteProperties(pipe.readQuerySchemaBuilder);
        this.readQuerySchemaBuilder = readQuerySchemaBuilder as any;

        let readOptionsSchemaBuilder = this.readOptionsSchemaBuilder.overwriteProperties(pipe.readOptionsSchemaBuilder);
        this.readOptionsSchemaBuilder = readOptionsSchemaBuilder as any;

        let readWrapperSchemaBuilder = this.readWrapperSchemaBuilder.overwriteProperties(pipe.readWrapperSchemaBuilder);
        this.readWrapperSchemaBuilder = readWrapperSchemaBuilder as any;

        let createValuesSchemaBuilder = this.createValuesSchemaBuilder.overwriteProperties(pipe.createValuesSchemaBuilder);
        this.createValuesSchemaBuilder = createValuesSchemaBuilder as any;

        let createOptionsSchemaBuilder = this.createOptionsSchemaBuilder.overwriteProperties(pipe.createOptionsSchemaBuilder);
        this.createOptionsSchemaBuilder = createOptionsSchemaBuilder as any;

        let createWrapperSchemaBuilder = this.createWrapperSchemaBuilder.overwriteProperties(pipe.createWrapperSchemaBuilder);
        this.createWrapperSchemaBuilder = createWrapperSchemaBuilder as any;

        let updateValuesSchemaBuilder = this.updateValuesSchemaBuilder.overwriteProperties(pipe.updateValuesSchemaBuilder);
        this.updateValuesSchemaBuilder = updateValuesSchemaBuilder as any;

        let updateOptionsSchemaBuilder = this.updateOptionsSchemaBuilder.overwriteProperties(pipe.updateOptionsSchemaBuilder);
        this.updateOptionsSchemaBuilder = updateOptionsSchemaBuilder as any;

        let updateWrapperSchemaBuilder = this.updateWrapperSchemaBuilder.overwriteProperties(pipe.updateWrapperSchemaBuilder);
        this.updateWrapperSchemaBuilder = updateWrapperSchemaBuilder as any;

        let patchQuerySchemaBuilder = this.patchQuerySchemaBuilder.overwriteProperties(pipe.patchQuerySchemaBuilder);
        this.patchQuerySchemaBuilder = patchQuerySchemaBuilder as any;

        let patchValuesSchemaBuilder = this.patchValuesSchemaBuilder.overwriteProperties(pipe.patchValuesSchemaBuilder);
        this.patchValuesSchemaBuilder = patchValuesSchemaBuilder as any;

        let patchOptionsSchemaBuilder = this.patchOptionsSchemaBuilder.overwriteProperties(pipe.patchOptionsSchemaBuilder);
        this.patchOptionsSchemaBuilder = patchOptionsSchemaBuilder as any;

        let patchWrapperSchemaBuilder = this.patchWrapperSchemaBuilder.overwriteProperties(pipe.patchWrapperSchemaBuilder);
        this.patchWrapperSchemaBuilder = patchWrapperSchemaBuilder as any;

        let deleteQuerySchemaBuilder = this.deleteQuerySchemaBuilder.overwriteProperties(pipe.deleteQuerySchemaBuilder);
        this.deleteQuerySchemaBuilder = deleteQuerySchemaBuilder as any;

        let deleteOptionsSchemaBuilder = this.deleteOptionsSchemaBuilder.overwriteProperties(pipe.deleteOptionsSchemaBuilder);
        this.deleteOptionsSchemaBuilder = deleteOptionsSchemaBuilder as any;

        let deleteWrapperSchemaBuilder = this.deleteWrapperSchemaBuilder.overwriteProperties(pipe.deleteWrapperSchemaBuilder);
        this.deleteWrapperSchemaBuilder = deleteWrapperSchemaBuilder as any;

        type newT = (typeof modelSchemaBuilder.T) & IdentityInterface;
        // type newReadQuery = (typeof readQuerySchemaBuilder.T);
        // type newReadOptions = (typeof readOptionsSchemaBuilder.T);
        // type newReadWrapper = (typeof readWrapperSchemaBuilder.T);
        // type newCreateValues = (typeof createValuesSchemaBuilder.T);
        // type newCreateOptions = (typeof createOptionsSchemaBuilder.T);
        // type newCreateWrapper = (typeof createWrapperSchemaBuilder.T);
        // type newUpdateValues = (typeof updateValuesSchemaBuilder.T);
        // type newUpdateOptions = (typeof updateOptionsSchemaBuilder.T);
        // type newUpdateWrapper = (typeof updateWrapperSchemaBuilder.T);
        // type newPatchQuery = (typeof patchQuerySchemaBuilder.T);
        // type newPatchValues = (typeof patchValuesSchemaBuilder.T);
        // type newPatchOptions = (typeof patchOptionsSchemaBuilder.T);
        // type newPatchWrapper = (typeof patchWrapperSchemaBuilder.T);
        // type newDeleteQuery = (typeof deleteQuerySchemaBuilder.T);
        // type newDeleteOptions = (typeof deleteOptionsSchemaBuilder.T);
        // type newDeleteWrapper = (typeof deleteWrapperSchemaBuilder.T);

        return this as any as PipelineAbstract<{[P in keyof newT]: newT[P]},
            typeof readQuerySchemaBuilder.T, typeof readOptionsSchemaBuilder.T, typeof readWrapperSchemaBuilder.T,
            typeof createValuesSchemaBuilder.T, typeof createOptionsSchemaBuilder.T, typeof createWrapperSchemaBuilder.T,
            typeof updateValuesSchemaBuilder.T, typeof updateOptionsSchemaBuilder.T, typeof updateWrapperSchemaBuilder.T,
            typeof patchQuerySchemaBuilder.T, typeof patchValuesSchemaBuilder.T, typeof patchOptionsSchemaBuilder.T, typeof patchWrapperSchemaBuilder.T,
            typeof deleteQuerySchemaBuilder.T, typeof deleteOptionsSchemaBuilder.T, typeof deleteWrapperSchemaBuilder.T>;
    }

    private handleValidate(method: string, validate: () => void) {
        try {
            validate();
        } catch (error) {
            throw serafinError('SerafinValidationError',
                `Validation failed in ${Object.getPrototypeOf(this).constructor.name}::${method}`,
                { constructor: Object.getPrototypeOf(this).constructor.name, method: method },
                error);
        }
    }

    //     /**
    //      * Remap a read options to change its name. To be used in case of conflict between two pipelines.
    //      * 
    //      * @param opt 
    //      * @param renamedOpt 
    //      */
    //     // public remapReadOption<K extends keyof ReadOptions, K2 extends keyof any>(opt: K, renamedOpt: K2): Pipeline<T, ReadQuery, Omit<ReadOptions, K> & {[P in K2]: ReadOptions[K]}, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper> {
    //     //     return this.remapOptions("read", opt, renamedOpt)
    //     // }

    //     // /**
    //     //  * Remap the given options to change its name for the given method.
    //     //  * 
    //     //  * @param method 
    //     //  * @param opt 
    //     //  * @param renamedOpt 
    //     //  */
    //     // private remapOptions(method: PipelineMethods, opt: string, renamedOpt: string) {
    //     //     this.optionsMapping = this.optionsMapping || {};
    //     //     this.optionsMapping[method] = this.optionsMapping[method] || {};
    //     //     this.optionsMapping[method][renamedOpt as string] = opt as string;
    //     //     let schemaBuilderName = `_${method}OptionsSchemaBuilder`
    //     //     if (!this.hasOwnProperty(schemaBuilderName)) {
    //     //         this[schemaBuilderName] = this[schemaBuilderName].clone();
    //     //     }
    //     //     this[schemaBuilderName].renameProperty(opt, renamedOpt);
    //     //     return this as any;
    //     // }

    // /**
    //  * Map the input options object according to the configured mapping
    //  */
    private prepareOptionsMapping(options, method: PipelineMethods) {
        // if (typeof options === 'object' && this.optionsMapping) {
        //     for (let key in this.optionsMapping[method]) {
        //         if (options[key]) {
        //             options[this.optionsMapping[key]] = options[key];
        //             delete (options[key]);
        //         }
        //     }
        // }
        return options;
    }
}