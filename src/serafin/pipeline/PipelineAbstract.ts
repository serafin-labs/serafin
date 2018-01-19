import * as _ from 'lodash';
import * as Ajv from 'ajv'
import * as VError from 'verror';

import { validationError, serafinError, notImplementedError } from "../error/Error"
import { SchemaBuilder, Omit, DeepPartial } from "@serafin/schema-builder"
import { PipelineRelation } from './Relation';
import { IdentityInterface } from './IdentityInterface'
import { PipeAbstract } from './PipeAbstract';
import { SchemaBuilderHolder } from './SchemaBuilderHolder';
import { final } from './Decorator/Final';

export type Query<T> = {[P in keyof T]: T[P] | T[P][]};
export type PipelineMethods = "create" | "read" | "update" | "patch" | "delete";
export type Resolve<T> = {[P in keyof T]: T[P]}

const PIPELINE = Symbol("Pipeline");
// const schmemaBuilder = function <M, S>(model: M, schemaBuilder: S):SchemaBuilder<M> {return schemaBuilder};

export type ReadQuery<T extends IdentityInterface> = PipelineAbstract<T>["readQuerySchemaBuilder"]["T"];
export type CreateValues<T extends IdentityInterface> = PipelineAbstract<T>["createValuesSchemaBuilder"]["T"];
export type UpdateValues<T extends IdentityInterface> = PipelineAbstract<T>["updateValuesSchemaBuilder"]["T"];
export type PatchQuery<T extends IdentityInterface> = PipelineAbstract<T>["patchQuerySchemaBuilder"]["T"];
export type PatchValues<T extends IdentityInterface> = PipelineAbstract<T>["patchValuesSchemaBuilder"]["T"];
export type DeleteQuery<T extends IdentityInterface> = PipelineAbstract<T>["deleteQuerySchemaBuilder"]["T"];

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export abstract class PipelineAbstract<
    T extends IdentityInterface = IdentityInterface, ReadOptions = {}, ReadWrapper = {},
    CreateOptions = {}, CreateWrapper = {},
    UpdateOptions = {}, UpdateWrapper = {},
    PatchOptions = {}, PatchWrapper = {},
    DeleteOptions = {}, DeleteWrapper = {}, Relations = {}>

    extends SchemaBuilderHolder<T, ReadOptions, ReadWrapper,
    CreateOptions, CreateWrapper,
    UpdateOptions, UpdateWrapper,
    PatchOptions, PatchWrapper,
    DeleteOptions, DeleteWrapper> {

    //private optionsMapping: Partial<Record<PipelineMethods, { [k: string]: string }>> = {};
    public relations: { [key: string]: PipelineRelation } = {};

    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'update', 'patch', 'delete'];

    constructor(model: SchemaBuilder<T>) {

        super();
        this.modelSchemaBuilder = model;

        // Workaround for the 'this' context of the pipeline methods when chaining pipes
        for (let method of PipelineAbstract.CRUDMethods) {
            let thisMethod = this[`_${method}`];
            this[`_${method}`] = (...args) => {
                return (thisMethod.call(this, ...args));
            };
        }
    }

    get readQuerySchemaBuilder() {
        return this.modelSchemaBuilder.clone().transformPropertiesToArray().toOptionals();

    }

    get createValuesSchemaBuilder() {
        return this.modelSchemaBuilder.clone().omitProperties(["id"]);
    }

    get updateValuesSchemaBuilder() {
        return this.modelSchemaBuilder.clone().omitProperties(["id"]);
    }

    get patchQuerySchemaBuilder() {
        return this.modelSchemaBuilder.clone().pickProperties(["id"]).transformPropertiesToArray();
    }

    get patchValuesSchemaBuilder() {
        return this.modelSchemaBuilder.clone().omitProperties(["id"]).toDeepOptionals();
    }

    get deleteQuerySchemaBuilder() {
        return this.modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray();
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
        query: {[key in K1]: any }, options?: {[key in K2]: any }) {

        this.relations[name as string] = new PipelineRelation(this as any, name, pipeline, query, options)
        return this as PipelineAbstract<T, ReadOptions, ReadWrapper,
            CreateOptions, CreateWrapper,
            UpdateOptions, UpdateWrapper,
            PatchOptions, PatchWrapper,
            DeleteOptions, DeleteWrapper,
            Relations & {[key in N]: PipelineRelation<T, N, R, RReadQuery, RReadOptions, RReadWrapper, K1, K2>}>;
    }

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    @final async create(resources: CreateValues<T>[], options?: CreateOptions): Promise<{ data: T[] } & CreateWrapper> {
        this.handleValidate('create', () => {
            if (this.createValuesSchemaBuilder) { this.createValuesSchemaBuilder.validateList(resources) }
            if (this.createOptionsSchemaBuilder) { this.createOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._create(resources, this.prepareOptionsMapping(options, "create"));
    }

    protected _create(resources, options): Promise<{ data: T[] } & CreateWrapper> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    @final async read(query?: ReadQuery<T>, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper> {
        this.handleValidate('read', () => {
            if (this.readQuerySchemaBuilder) { this.readQuerySchemaBuilder.validate(query || {} as any) }
            if (this.readOptionsSchemaBuilder) { this.readOptionsSchemaBuilder.validate(options || {} as any) }
        });

        return this._read(query, this.prepareOptionsMapping(options, "read"));
    }

    protected _read(query, options): Promise<{ data: T[] } & ReadWrapper> {
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
    @final async update(id: string, values: UpdateValues<T>, options?: UpdateOptions): Promise<{ data: T } & UpdateWrapper> {
        this.handleValidate('update', () => {
            if (this.updateValuesSchemaBuilder) { this.updateValuesSchemaBuilder.validate(values) }
            if (this.updateOptionsSchemaBuilder) { this.updateOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._update(id, values, options);
    }

    protected _update(id, values, options): Promise<{ data: T } & UpdateWrapper> {
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
    @final async patch(query: PatchQuery<T>, values: PatchValues<T>, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper> {
        this.handleValidate('patch', () => {
            if (this.patchQuerySchemaBuilder) { this.patchQuerySchemaBuilder.validate(query) }
            if (this.patchValuesSchemaBuilder) { this.patchValuesSchemaBuilder.validate(values) }
            if (this.patchOptionsSchemaBuilder) { this.patchOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._patch(query, values, this.prepareOptionsMapping(options, "patch"));
    }

    protected _patch(query, values, options): Promise<{ data: T[] } & PatchWrapper> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    @final async delete(query: DeleteQuery<T>, options?: DeleteOptions): Promise<{ data: T[] } & DeleteWrapper> {
        this.handleValidate('delete', () => {
            if (this.deleteQuerySchemaBuilder) { this.deleteQuerySchemaBuilder.validate(query) }
            if (this.deleteOptionsSchemaBuilder) { this.deleteOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._delete(query, this.prepareOptionsMapping(options, "delete"));
    }

    protected _delete(query, options): Promise<{ data: T[] } & DeleteWrapper> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
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

        (pipe: PipeAbstract<P, PReadOptions, PReadWrapper,
            PCreateOptions, PCreateWrapper,
            PUpdateOptions, PUpdateWrapper,
            PPatchOptions, PPatchWrapper,
            PDeleteOptions, PDeleteWrapper>) {

        // Pipe attached to this pipeline
        if (pipe[PIPELINE]) {
            throw Error("Pipe already associated to a pipeline");
        }

        pipe[PIPELINE] = this;

        // Methods chaining
        for (let method of PipelineAbstract.CRUDMethods) {
            if (typeof pipe[method] == 'function') {
                let next = this[`_${method}`];
                this[`_${method}`] = (...args) => {
                    return (pipe[method].call(pipe, next, ...args));
                };
            }
        }

        // Schema properties merging (has to be done out of a loop to gather the typings)
        let modelSchemaBuilder = this.modelSchemaBuilder.intersectProperties(pipe.modelSchemaBuilder);
        this.modelSchemaBuilder = modelSchemaBuilder as any;

        // let readQuerySchemaBuilder = this.readQuerySchemaBuilder.intersectProperties(pipe.readQuerySchemaBuilder);
        // this.readQuerySchemaBuilder = readQuerySchemaBuilder as any;

        let readOptionsSchemaBuilder = this.readOptionsSchemaBuilder.intersectProperties(pipe.readOptionsSchemaBuilder);
        this.readOptionsSchemaBuilder = readOptionsSchemaBuilder as any;

        let readWrapperSchemaBuilder = this.readWrapperSchemaBuilder.intersectProperties(pipe.readWrapperSchemaBuilder);
        this.readWrapperSchemaBuilder = readWrapperSchemaBuilder as any;

        // let createValuesSchemaBuilder = this.createValuesSchemaBuilder.intersectProperties(pipe.createValuesSchemaBuilder);
        // this.createValuesSchemaBuilder = createValuesSchemaBuilder as any;

        let createOptionsSchemaBuilder = this.createOptionsSchemaBuilder.intersectProperties(pipe.createOptionsSchemaBuilder);
        this.createOptionsSchemaBuilder = createOptionsSchemaBuilder as any;

        let createWrapperSchemaBuilder = this.createWrapperSchemaBuilder.intersectProperties(pipe.createWrapperSchemaBuilder);
        this.createWrapperSchemaBuilder = createWrapperSchemaBuilder as any;

        // let updateValuesSchemaBuilder = this.updateValuesSchemaBuilder.intersectProperties(pipe.updateValuesSchemaBuilder);
        // this.updateValuesSchemaBuilder = updateValuesSchemaBuilder as any;

        let updateOptionsSchemaBuilder = this.updateOptionsSchemaBuilder.intersectProperties(pipe.updateOptionsSchemaBuilder);
        this.updateOptionsSchemaBuilder = updateOptionsSchemaBuilder as any;

        let updateWrapperSchemaBuilder = this.updateWrapperSchemaBuilder.intersectProperties(pipe.updateWrapperSchemaBuilder);
        this.updateWrapperSchemaBuilder = updateWrapperSchemaBuilder as any;

        // let patchQuerySchemaBuilder = this.patchQuerySchemaBuilder.intersectProperties(pipe.patchQuerySchemaBuilder);
        // this.patchQuerySchemaBuilder = patchQuerySchemaBuilder as any;

        // let patchValuesSchemaBuilder = this.patchValuesSchemaBuilder.intersectProperties(pipe.patchValuesSchemaBuilder);
        // this.patchValuesSchemaBuilder = patchValuesSchemaBuilder as any;

        let patchOptionsSchemaBuilder = this.patchOptionsSchemaBuilder.intersectProperties(pipe.patchOptionsSchemaBuilder);
        this.patchOptionsSchemaBuilder = patchOptionsSchemaBuilder as any;

        let patchWrapperSchemaBuilder = this.patchWrapperSchemaBuilder.intersectProperties(pipe.patchWrapperSchemaBuilder);
        this.patchWrapperSchemaBuilder = patchWrapperSchemaBuilder as any;

        // let deleteQuerySchemaBuilder = this.deleteQuerySchemaBuilder.intersectProperties(pipe.deleteQuerySchemaBuilder);
        // this.deleteQuerySchemaBuilder = deleteQuerySchemaBuilder as any;

        let deleteOptionsSchemaBuilder = this.deleteOptionsSchemaBuilder.intersectProperties(pipe.deleteOptionsSchemaBuilder);
        this.deleteOptionsSchemaBuilder = deleteOptionsSchemaBuilder as any;

        let deleteWrapperSchemaBuilder = this.deleteWrapperSchemaBuilder.intersectProperties(pipe.deleteWrapperSchemaBuilder);
        this.deleteWrapperSchemaBuilder = deleteWrapperSchemaBuilder as any;

        return this as any as PipelineAbstract<Resolve<typeof modelSchemaBuilder.T>,
            Resolve<typeof readOptionsSchemaBuilder.T>, Resolve<typeof readWrapperSchemaBuilder.T>,
            Resolve<typeof createOptionsSchemaBuilder.T>, Resolve<typeof createWrapperSchemaBuilder.T>,
            Resolve<typeof updateOptionsSchemaBuilder.T>, Resolve<typeof updateWrapperSchemaBuilder.T>,
            Resolve<typeof patchOptionsSchemaBuilder.T>, Resolve<typeof patchWrapperSchemaBuilder.T>,
            Resolve<typeof deleteOptionsSchemaBuilder.T>, Resolve<typeof deleteWrapperSchemaBuilder.T>>;
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