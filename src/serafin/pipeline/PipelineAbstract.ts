import * as _ from "lodash";
import * as util from "util";
import { SchemaBuilder, DeepPartial, Resolve } from "@serafin/schema-builder";
import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { IdentityInterface } from "./IdentityInterface";
import { PipeAbstract } from "./PipeAbstract";
import { PipelineRelation } from "./Relation";
import { notImplementedError, serafinError } from "../error/Error";
import { final } from "./Decorator/Final";

const PIPELINE = Symbol("Pipeline");
export type PipelineMethods = "create" | "read" | "update" | "patch" | "delete";
export type SchemaBuilderNames = "modelSchemaBuilder" | "readQuerySchemaBuilder" | "readOptionsSchemaBuilder" | "readWrapperSchemaBuilder" | "createValuesSchemaBuilder" | "createOptionsSchemaBuilder" | "createWrapperSchemaBuilder" | "updateValuesSchemaBuilder" | "updateOptionsSchemaBuilder" | "updateWrapperSchemaBuilder" | "patchQuerySchemaBuilder" | "patchValuesSchemaBuilder" | "patchOptionsSchemaBuilder" | "patchWrapperSchemaBuilder" | "deleteQuerySchemaBuilder" | "deleteOptionsSchemaBuilder" | "deleteWrapperSchemaBuilder";

export abstract class PipelineAbstract<M extends IdentityInterface,
    S extends SchemaBuildersInterface['schemaBuilders']= PipelineAbstract<M, null>["defaultSchemaType"]> implements SchemaBuildersInterface {

    public relations: { [key: string]: PipelineRelation } = {};
    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'update', 'patch', 'delete'];
    public static schemaBuilderNames: SchemaBuilderNames[] = ["modelSchemaBuilder", "readQuerySchemaBuilder", "readOptionsSchemaBuilder", "readWrapperSchemaBuilder", "createValuesSchemaBuilder", "createOptionsSchemaBuilder", "createWrapperSchemaBuilder", "updateValuesSchemaBuilder", "updateOptionsSchemaBuilder", "updateWrapperSchemaBuilder", "patchQuerySchemaBuilder", "patchValuesSchemaBuilder", "patchOptionsSchemaBuilder", "patchWrapperSchemaBuilder", "deleteQuerySchemaBuilder", "deleteOptionsSchemaBuilder", "deleteWrapperSchemaBuilder"];

    constructor(public modelSchemaBuilder: SchemaBuilder<M>, public schemaBuilders: S = null) {
        if (schemaBuilders == null) {
            this.schemaBuilders = this.defaultSchema as any;
        }

        for (let method of PipelineAbstract.CRUDMethods) {
            let thisMethod = this[`_${method}`];
            this[`_${method}`] = (...args) => {
                return (thisMethod.call(this, ...args));
            };
        }
    }

    private defaultSchemaType = (false as true) && this.defaultSchema(this.modelSchemaBuilder);
    private defaultSchema(modelSchemaBuilder: SchemaBuilder<M>) {
        return {
            readQuery: modelSchemaBuilder.clone().transformPropertiesToArray().toOptionals(),
            createValues: modelSchemaBuilder.clone().omitProperties(["id"]),
            updateValues: modelSchemaBuilder.clone().omitProperties(["id"]),
            patchQuery: modelSchemaBuilder.clone().pickProperties(["id"]).transformPropertiesToArray(),
            patchValues: modelSchemaBuilder.clone().omitProperties(["id"]).toDeepOptionals(),
            deleteQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
            readOptions: SchemaBuilder.emptySchema(),
            readWrapper: SchemaBuilder.emptySchema(),
            createOptions: SchemaBuilder.emptySchema(),
            createWrapper: SchemaBuilder.emptySchema(),
            updateOptions: SchemaBuilder.emptySchema(),
            updateWrapper: SchemaBuilder.emptySchema(),
            patchOptions: SchemaBuilder.emptySchema(),
            patchWrapper: SchemaBuilder.emptySchema(),
            deleteOptions: SchemaBuilder.emptySchema(),
            deleteWrapper: SchemaBuilder.emptySchema(),
        }
    }

    /**
     * Add a relation to the pipeline.
     * This method modifies the pipeline and affect the templated type.
     * 
     * @param relation 
     */
    // public addRelation<N extends keyof any, R extends IdentityInterface, RReadQuery, RReadOptions, RReadWrapper,
    //     K1 extends keyof RReadQuery = null, K2 extends keyof RReadOptions = null>

    //     (name: N, pipeline: () => PipelineAbstract<R, RReadQuery, RReadOptions, RReadWrapper>,
    //     query: {[key in K1]: any }, options?: {[key in K2]: any }) {

    //     this.relations[name as string] = new PipelineRelation(this as any, name, pipeline, query, options)
    //     return this as PipelineAbstract<T, ReadOptions, ReadWrapper,
    //         CreateOptions, CreateWrapper,
    //         UpdateOptions, UpdateWrapper,
    //         PatchOptions, PatchWrapper,
    //         DeleteOptions, DeleteWrapper,
    //         Relations & {[key in N]: PipelineRelation<T, N, R, RReadQuery, RReadOptions, RReadWrapper, K1, K2>}>;
    // }

    alterSchemaBuilders<newS extends Partial<SchemaBuildersInterface["schemaBuilders"]>>(func: (model: SchemaBuilder<M>, sch: this["schemaBuilders"]) => newS) {
        let schemaBuilders = this.schemaBuilders =
            Object.assign(this.schemaBuilders as this["schemaBuilders"], func(this.modelSchemaBuilder, this.schemaBuilders as this["schemaBuilders"]));
        return this as any as PipelineAbstract<M, typeof schemaBuilders>;
    }

    extend<newS extends Partial<SchemaBuildersInterface["schemaBuilders"]>>(func: (model: SchemaBuilder<M>, sch: this["schemaBuilders"]) => newS) {
        return Object.assign(this.schemaBuilders, func(this.modelSchemaBuilder, this.schemaBuilders));
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        let pipelineSchema = Object.assign({ "modelSchemaBuilder": this.modelSchemaBuilder.schema }, _.mapKeys(
            _.mapValues(this.schemaBuilders, (schemaBuilder: SchemaBuilder<any>) => schemaBuilder.schema)
            , (value, key) => (key + "SchemaBuilder")));
        return (util.inspect(pipelineSchema, false, null));
    }

    /**
     * Add a pipe to the pipeline
     * 
     * @param pipe The pipe to add
     */
    pipe<P, PS extends SchemaBuildersInterface["schemaBuilders"]>(pipe: PipeAbstract<P, PS>) {
        // Pipe already attached to this pipeline
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

        let schemaBuilders = {
            readQuery: this.schemaBuilders.readQuery.intersectProperties(pipe.schemaBuilders.readQuery),
            createValues: this.schemaBuilders.createValues.intersectProperties(pipe.schemaBuilders.createValues),
            updateValues: this.schemaBuilders.updateValues.intersectProperties(pipe.schemaBuilders.updateValues),
            patchQuery: this.schemaBuilders.patchQuery.intersectProperties(pipe.schemaBuilders.patchQuery),
            patchValues: this.schemaBuilders.patchValues.intersectProperties(pipe.schemaBuilders.patchValues),
            deleteQuery: this.schemaBuilders.deleteQuery.intersectProperties(pipe.schemaBuilders.deleteQuery),
            readOptions: this.schemaBuilders.readOptions.intersectProperties(pipe.schemaBuilders.readOptions),
            readWrapper: this.schemaBuilders.readWrapper.intersectProperties(pipe.schemaBuilders.readWrapper),
            createOptions: this.schemaBuilders.createOptions.intersectProperties(pipe.schemaBuilders.createOptions),
            createWrapper: this.schemaBuilders.createWrapper.intersectProperties(pipe.schemaBuilders.createWrapper),
            updateOptions: this.schemaBuilders.updateOptions.intersectProperties(pipe.schemaBuilders.updateOptions),
            updateWrapper: this.schemaBuilders.updateWrapper.intersectProperties(pipe.schemaBuilders.updateWrapper),
            patchOptions: this.schemaBuilders.patchOptions.intersectProperties(pipe.schemaBuilders.patchOptions),
            patchWrapper: this.schemaBuilders.patchWrapper.intersectProperties(pipe.schemaBuilders.patchWrapper),
            deleteOptions: this.schemaBuilders.deleteOptions.intersectProperties(pipe.schemaBuilders.deleteOptions),
            deleteWrapper: this.schemaBuilders.deleteWrapper.intersectProperties(pipe.schemaBuilders.deleteWrapper)
        }

        this.schemaBuilders = schemaBuilders as any;

        return this as any as PipelineAbstract<Resolve<typeof modelSchemaBuilder.T>, typeof schemaBuilders>;
    }


    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    @final async create(resources: this["schemaBuilders"]["createValues"]["T"][], options?: this["schemaBuilders"]["createOptions"]["T"])
        : Promise<{ data: M[] } & this["schemaBuilders"]["createWrapper"]["T"]> {
        this.handleValidate('create', () => {
            this.schemaBuilders.createValues.validateList(resources);
            this.schemaBuilders.createOptions.validate(options || {} as any);
        });
        return this._create(resources, this.prepareOptionsMapping(options, "create"));
    }

    protected _create(resources, options): Promise<{ data: M[] } & this["schemaBuilders"]["createWrapper"]["T"]> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    @final async read(query?: this["schemaBuilders"]["readQuery"]["T"], options?: this["schemaBuilders"]["readOptions"]["T"])
        : Promise<{ data: M[] } & this["schemaBuilders"]["readWrapper"]["T"]> {

        this.handleValidate('create', () => {
            this.schemaBuilders.readQuery.validateList(query || {});
            this.schemaBuilders.readOptions.validate(options || {});
        });

        return this._read(query, this.prepareOptionsMapping(options, "read"));
    }

    protected _read(query, options): Promise<{ data: M[] } & this["schemaBuilders"]["readWrapper"]["T"]> {
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
    @final async update(id: string, values: this["schemaBuilders"]["updateValues"]["T"], options?: this["schemaBuilders"]["updateOptions"]["T"])
        : Promise<{ data: M } & this["schemaBuilders"]["updateWrapper"]["T"]> {
        this.handleValidate('update', () => {
            this.schemaBuilders.updateValues.validate(values || {});
            this.schemaBuilders.updateOptions.validate(options || {});
        });

        return this._update(id, values, options);
    }

    protected _update(id, values, options): Promise<{ data: M } & this["schemaBuilders"]["updateWrapper"]["T"]> {
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
    @final async patch(query: this["schemaBuilders"]["patchQuery"]["T"], values: this["schemaBuilders"]["patchValues"]["T"],
        options?: this["schemaBuilders"]["patchOptions"]["T"]): Promise<{ data: M[] } & this["schemaBuilders"]["patchWrapper"]["T"]> {
        this.handleValidate('patch', () => {
            this.schemaBuilders.patchQuery.validate(query);
            this.schemaBuilders.patchValues.validate(values || {});
            this.schemaBuilders.patchOptions.validate(options || {});
        });
        return this._patch(query, values, this.prepareOptionsMapping(options, "patch"));
    }

    protected _patch(query, values, options): Promise<{ data: M[] } & this["schemaBuilders"]["patchWrapper"]["T"]> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    @final async delete(query: this["schemaBuilders"]["deleteQuery"]["T"], options?: this["schemaBuilders"]["deleteOptions"]["T"])
        : Promise<{ data: M[] } & this["schemaBuilders"]["deleteWrapper"]["T"]> {
        this.handleValidate('delete', () => {
            this.schemaBuilders.deleteQuery.validate(query);
            this.schemaBuilders.deleteOptions.validate(options || {});
        });
        return this._delete(query, this.prepareOptionsMapping(options, "delete"));
    }

    protected _delete(query, options): Promise<{ data: M[] } & this["schemaBuilders"]["deleteWrapper"]["T"]> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
    }

    private handleValidate(method: string, validate: () => void) {
        try {
            validate();
        } catch (error) {
            throw serafinError('SerafinValidationError', `Validation failed in ${Object.getPrototypeOf(this).constructor.name}::${method}`,
                { constructor: Object.getPrototypeOf(this).constructor.name, method: method }, error);
        }
    }

    /**
     * Remap a read options to change its name. To be used in case of conflict between two pipelines.
     * 
     * @param opt 
     * @param renamedOpt 
     */
    // public remapReadOption<K extends keyof ReadOptions, K2 extends keyof any>(opt: K, renamedOpt: K2): Pipeline<T, ReadQuery, Omit<ReadOptions, K> & {[P in K2]: ReadOptions[K]}, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper> {
    //     return this.remapOptions("read", opt, renamedOpt)
    // }

    /**
     * Remap the given options to change its name for the given method.
     * 
     * @param method 
     * @param opt 
     * @param renamedOpt 
     */
    private remapOptions(method: PipelineMethods, opt: string, renamedOpt: string) {
        // this.optionsMapping = this.optionsMapping || {};
        // this.optionsMapping[method] = this.optionsMapping[method] || {};
        // this.optionsMapping[method][renamedOpt as string] = opt as string;
        // let schemaBuilderName = `_${method}OptionsSchemaBuilder`
        // if (!this.hasOwnProperty(schemaBuilderName)) {
        //     this[schemaBuilderName] = this[schemaBuilderName].clone();
        // }
        // this[schemaBuilderName].renameProperty(opt, renamedOpt);
        // return this as any;
    }

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
