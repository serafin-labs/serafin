import * as _ from "lodash";
import * as util from "util";
import { SchemaBuilder, Overwrite, DeepPartialArray, DeepPartial, DeepPartialObject } from "@serafin/schema-builder";
import { notImplementedError, serafinError } from "../error/Error";
import { final } from "./FinalDecorator";
import { IdentityInterface } from "./IdentityInterface";
import { PIPELINE, PipeAbstract } from "./PipeAbstract";
import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { PipeInterface } from "./PipeInterface";
import { PipelineRelation } from "./Relation";

export type Wrapper<T, U> = { data: T[] } & { meta: U }
export type PipelineMethods = "create" | "read" | "replace" | "patch" | "delete";

export abstract class PipelineAbstract<M extends IdentityInterface, S extends SchemaBuildersInterface = ReturnType<PipelineAbstract<M, null>["defaultSchema"]>,
    R extends { [key: string]: PipelineRelation } = { 'self': PipelineRelation<M, 'self', M> }> {
    public relations: R = {} as any;
    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'replace', 'patch', 'delete'];

    constructor(public modelSchemaBuilder: SchemaBuilder<M>, public schemaBuilders: S = null) {
        if (schemaBuilders == null) {
            this.schemaBuilders = this.defaultSchema(modelSchemaBuilder) as any;
        }

        for (let method of PipelineAbstract.CRUDMethods) {
            let thisMethod = this[`_${method}`];
            this[`_${method}`] = (...args) => {
                return (thisMethod.call(this, ...args));
            };
        }

        this.addRelation('self', () => this as any, { id: ':id' } as any);
    }

    /**
     * For 'schemaBuilder' property redefinition in an extended class. Callable through 'super.getSchemaBuilders()'.
     */
    protected getSchemaBuilders(): S {
        return this.schemaBuilders;
    }

    alterSchemaBuilders<newS extends SchemaBuildersInterface>(func: (sch: this["schemaBuilders"]) => newS) {
        this.schemaBuilders = Object.assign(this.schemaBuilders, func(this.schemaBuilders)) as any;
        return this as any as PipelineAbstract<newS["model"]["T"], Overwrite<this["schemaBuilders"], newS>, R>;
    }

    protected defaultSchema(modelSchemaBuilder: SchemaBuilder<M>) {
        return {
            model: modelSchemaBuilder,
            createValues: modelSchemaBuilder.clone().setOptionalProperties(["id"]),
            createOptions: SchemaBuilder.emptySchema(),
            createMeta: SchemaBuilder.emptySchema(),
            readQuery: modelSchemaBuilder.clone().transformPropertiesToArray().toOptionals(),
            readOptions: SchemaBuilder.emptySchema(),
            readMeta: SchemaBuilder.emptySchema(),
            replaceValues: modelSchemaBuilder.clone().omitProperties(["id"]),
            replaceOptions: SchemaBuilder.emptySchema(),
            replaceMeta: SchemaBuilder.emptySchema(),
            patchQuery: modelSchemaBuilder.clone().pickProperties(["id"]).transformPropertiesToArray(),
            patchValues: modelSchemaBuilder.clone().omitProperties(["id"]).toDeepOptionals(),
            patchOptions: SchemaBuilder.emptySchema(),
            patchMeta: SchemaBuilder.emptySchema(),
            deleteQuery: modelSchemaBuilder.clone().pickProperties(["id"]).transformPropertiesToArray(),
            deleteOptions: SchemaBuilder.emptySchema(),
            deleteMeta: SchemaBuilder.emptySchema(),
        }
    }

    pipe<MODEL extends IdentityInterface = this["schemaBuilders"]["model"]["T"],
        CV = this["schemaBuilders"]["createValues"]["T"],
        CO = this["schemaBuilders"]["createOptions"]["T"],
        CM = this["schemaBuilders"]["createMeta"]["T"],
        RQ = this["schemaBuilders"]["readQuery"]["T"],
        RO = this["schemaBuilders"]["readOptions"]["T"],
        RM = this["schemaBuilders"]["readMeta"]["T"],
        UV = this["schemaBuilders"]["replaceValues"]["T"],
        UO = this["schemaBuilders"]["replaceOptions"]["T"],
        UM = this["schemaBuilders"]["replaceMeta"]["T"],
        PQ = this["schemaBuilders"]["patchQuery"]["T"],
        PV = this["schemaBuilders"]["patchValues"]["T"],
        PO = this["schemaBuilders"]["patchOptions"]["T"],
        PM = this["schemaBuilders"]["patchMeta"]["T"],
        DQ = this["schemaBuilders"]["deleteQuery"]["T"],
        DO = this["schemaBuilders"]["deleteOptions"]["T"],
        DM = this["schemaBuilders"]["deleteMeta"]["T"],
        PR = {}>
        (pipe: PipeInterface<this["schemaBuilders"], MODEL, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM, PR>) {

        // Pipeline association
        if (pipe[PIPELINE]) {
            throw Error("Pipe already associated to a pipeline");
        }
        pipe[PIPELINE] = this;

        // SchemaBuilders modification
        _.forEach(this.schemaBuilders, (value, key) => {
            let schemaBuilderResolver = pipe["schemaBuilder" + _.upperFirst(key)];

            if (typeof schemaBuilderResolver == 'function') {
                this.schemaBuilders[key] = schemaBuilderResolver(this.schemaBuilders[key]);
            }
        });

        // Methods chaining
        for (let method of PipelineAbstract.CRUDMethods) {
            if (typeof pipe[method] == 'function') {
                let next = this[`_${method}`];
                this[`_${method}`] = (...args) => {
                    return (pipe[method].call(pipe, next, ...args));
                };
            }
        }

        return this as any as PipelineAbstract<MODEL, SchemaBuildersInterface<MODEL, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM>, R & PR>;
    }


    /**
     * Add a relation to the pipeline.
     * This method modifies the pipeline and affect the templated type.
     * 
     * @param relation 
     */
    public addRelation<NameKey extends keyof any, RelationModel extends IdentityInterface, RelationReadQuery, RelationReadOptions, RelationReadMeta,
        QueryKeys extends keyof RelationReadQuery = null, OptionsKeys extends keyof RelationReadOptions = null>
        (name: NameKey, pipeline: () => PipelineAbstract<RelationModel, SchemaBuildersInterface<RelationModel, {}, {}, {}, RelationReadQuery, RelationReadOptions, RelationReadMeta>>,
        query: { [key in QueryKeys]: any }, options?: { [key in OptionsKeys]: any }) {

        this.relations[name as string] = new PipelineRelation(this as any, name, pipeline, query, options)
        return this as any as PipelineAbstract<M, S, R & { [key in NameKey]: PipelineRelation<M, NameKey, RelationModel, RelationReadQuery, RelationReadOptions, RelationReadMeta, QueryKeys, OptionsKeys> }>;
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        return (util.inspect(_.mapValues(this.schemaBuilders, (schema: SchemaBuilder<any>) => schema.schema), false, null));
    }

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    @final async create(resources: this["schemaBuilders"]["createValues"]["T"][], options?: this["schemaBuilders"]["createOptions"]["T"])
        : Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["createMeta"]["T"]>> {
        this.handleValidate('create', () => {
            this.schemaBuilders.createValues.validateList(resources);
            this.schemaBuilders.createOptions.validate(options || {} as any);
        });
        return this._create(resources, this.prepareOptionsMapping(options, "create"));
    }

    protected _create(resources, options): Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["createMeta"]["T"]>> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    @final async read(query?: this["schemaBuilders"]["readQuery"]["T"], options?: this["schemaBuilders"]["readOptions"]["T"])
        : Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["readMeta"]["T"]>> {

        this.handleValidate('read', () => {
            this.schemaBuilders.readQuery.validate(query || {});
            this.schemaBuilders.readOptions.validate(options || {});
        });

        return this._read(query, this.prepareOptionsMapping(options, "read"));
    }

    protected _read(query, options): Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["readMeta"]["T"]>> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Replace replaces an existing resource with the given values.
     * Because it replaces the resource, only one can be replaced at a time.
     * If you need to replace many resources in a single query, please use patch instead
     * 
     * @param id 
     * @param values 
     * @param options 
     */
    @final async replace(id: string, values: this["schemaBuilders"]["replaceValues"]["T"], options?: this["schemaBuilders"]["replaceOptions"]["T"])
        : Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["replaceMeta"]["T"]>> {
        this.handleValidate('replace', () => {
            this.schemaBuilders.replaceValues.validate(values || {});
            this.schemaBuilders.replaceOptions.validate(options || {});
        });

        return this._replace(id, values, options);
    }

    protected _replace(id, values, options): Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["replaceMeta"]["T"]>> {
        throw notImplementedError("replace", Object.getPrototypeOf(this).constructor.name);
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
        options?: this["schemaBuilders"]["patchOptions"]["T"]): Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["patchMeta"]["T"]>> {
        this.handleValidate('patch', () => {
            this.schemaBuilders.patchQuery.validate(query);
            this.schemaBuilders.patchValues.validate(values || {});
            this.schemaBuilders.patchOptions.validate(options || {});
        });
        return this._patch(query, values, this.prepareOptionsMapping(options, "patch"));
    }

    protected _patch(query, values, options): Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["patchMeta"]["T"]>> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    @final async delete(query: this["schemaBuilders"]["deleteQuery"]["T"], options?: this["schemaBuilders"]["deleteOptions"]["T"])
        : Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["deleteMeta"]["T"]>> {
        this.handleValidate('delete', () => {
            this.schemaBuilders.deleteQuery.validate(query);
            this.schemaBuilders.deleteOptions.validate(options || {});
        });
        return this._delete(query, this.prepareOptionsMapping(options, "delete"));
    }

    protected _delete(query, options): Promise<Wrapper<this["schemaBuilders"]["model"]["T"], this["schemaBuilders"]["deleteMeta"]["T"]>> {
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
