import * as util from 'util';
import * as _ from 'lodash';
import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validationError, serafinError, notImplementedError } from "../error/Error"
import { SchemaBuilder, Omit } from "@serafin/schema-builder"
import { PipelineRelation } from './Relation';
import { IdentityInterface } from './IdentityInterface'
import { PipeAbstract } from './PipeAbstract';

export type PipelineMethods = "create" | "read" | "update" | "patch" | "delete";
export type SchemaBuilderNames = "modelSchemaBuilder" | "readQuerySchemaBuilder" | "readOptionsSchemaBuilder" | "readWrapperSchemaBuilder" | "createValuesSchemaBuilder" | "createOptionsSchemaBuilder" | "createWrapperSchemaBuilder" | "updateValuesSchemaBuilder" | "updateOptionsSchemaBuilder" | "updateWrapperSchemaBuilder" | "patchQuerySchemaBuilder" | "patchValuesSchemaBuilder" | "patchOptionsSchemaBuilder" | "patchWrapperSchemaBuilder" | "deleteQuerySchemaBuilder" | "deleteOptionsSchemaBuilder" | "deleteWrapperSchemaBuilder";

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export class Pipeline<
    T extends {} = {},
    ReadQuery = {},
    ReadOptions = {},
    ReadWrapper = {},
    CreateValues = {},
    CreateOptions = {},
    CreateWrapper = {},
    UpdateValues = {},
    UpdateOptions = {},
    UpdateWrapper = {},
    PatchQuery = {},
    PatchValues = {},
    PatchOptions = {},
    PatchWrapper = {},
    DeleteQuery = {},
    DeleteOptions = {},
    DeleteWrapper = {},
    Relations = {}
    > {
    public modelSchemaBuilder?: SchemaBuilder<T>

    public readQuerySchemaBuilder?: SchemaBuilder<ReadQuery>
    public readOptionsSchemaBuilder?: SchemaBuilder<ReadOptions>
    public readWrapperSchemaBuilder?: SchemaBuilder<ReadWrapper>

    public createValuesSchemaBuilder?: SchemaBuilder<CreateValues>
    public createOptionsSchemaBuilder?: SchemaBuilder<CreateOptions>
    public createWrapperSchemaBuilder?: SchemaBuilder<CreateWrapper>

    public updateValuesSchemaBuilder?: SchemaBuilder<UpdateValues>
    public updateOptionsSchemaBuilder?: SchemaBuilder<UpdateOptions>;
    public updateWrapperSchemaBuilder?: SchemaBuilder<UpdateWrapper>;

    public patchQuerySchemaBuilder?: SchemaBuilder<PatchQuery>
    public patchValuesSchemaBuilder?: SchemaBuilder<PatchValues>
    public patchOptionsSchemaBuilder?: SchemaBuilder<PatchOptions>
    public patchWrapperSchemaBuilder?: SchemaBuilder<PatchWrapper>

    public deleteQuerySchemaBuilder?: SchemaBuilder<DeleteQuery>
    public deleteOptionsSchemaBuilder?: SchemaBuilder<DeleteOptions>
    public deleteWrapperSchemaBuilder?: SchemaBuilder<DeleteWrapper>

    //private optionsMapping: Partial<Record<PipelineMethods, { [k: string]: string }>> = {};
    public relations: { [key: string]: PipelineRelation } = {};

    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'update', 'patch', 'delete'];
    public static schemaBuilderNames: SchemaBuilderNames[] = ["modelSchemaBuilder", "readQuerySchemaBuilder", "readOptionsSchemaBuilder", "readWrapperSchemaBuilder", "createValuesSchemaBuilder", "createOptionsSchemaBuilder", "createWrapperSchemaBuilder", "updateValuesSchemaBuilder", "updateOptionsSchemaBuilder", "updateWrapperSchemaBuilder", "patchQuerySchemaBuilder", "patchValuesSchemaBuilder", "patchOptionsSchemaBuilder", "patchWrapperSchemaBuilder", "deleteQuerySchemaBuilder", "deleteOptionsSchemaBuilder", "deleteWrapperSchemaBuilder"];

    /**
     * Add a relation to the pipeline.
     * This method modifies the pipeline and affect the templated type.
     * 
     * @param relation 
     */
    public addRelation<N extends keyof any, R extends IdentityInterface, RReadQuery, RReadOptions, RReadWrapper, K1 extends keyof RReadQuery = null, K2 extends keyof RReadOptions = null>
    (name: N, pipeline: () => Pipeline<R, RReadQuery, RReadOptions, RReadWrapper>, query: {[key in K1]: any}, options?: {[key in K2]: any})
    : Pipeline<T, ReadQuery, ReadOptions, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper, Relations & {[key in N]: PipelineRelation<T, N, R, RReadQuery, RReadOptions, RReadWrapper, K1, K2>}> {
        this.relations[name as string] = new PipelineRelation(this, name, pipeline, query, options)
        return this as any;
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
        for (let schemaBuilderName of Pipeline.schemaBuilderNames) {
            if (this[schemaBuilderName]) {
                pipelineSchema[schemaBuilderName] = this[schemaBuilderName].schema
            }
        }
        return (util.inspect(pipelineSchema, false, null));
    }

    /**
     * Combine the given pipeline with this one.
     * /!\ the provided pipeline MUST NOT be reused somewhere else. The `parent` property can be assigned only once.
     * 
     * @param pipeline The pipeline to link with this one
     */
    pipe<N, NReadQuery, NReadOptions, NReadWrapper, NCreateValues, NCreateOptions, NCreateWrapper, NUpdateValues, NUpdateOptions, NUpdateWrapper, NPatchQuery, NPatchValues, NPatchOptions, NPatchWrapper, NDeleteQuery, NDeleteOptions, NDeleteWrapper, NRelations>
        (pipe: PipeAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateValues, NCreateOptions, NCreateWrapper, NUpdateValues, NUpdateOptions, NUpdateWrapper, NPatchQuery, NPatchValues, NPatchOptions, NPatchWrapper, NDeleteQuery, NDeleteOptions, NDeleteWrapper>)
        // : Pipeline<T & N, ReadQuery & NReadQuery, ReadOptions & NReadOptions, ReadWrapper & NReadWrapper, CreateValues & NCreateValues, CreateOptions & NCreateOptions, CreateWrapper & NCreateWrapper, UpdateValues & NUpdateValues, UpdateOptions & NUpdateOptions, UpdateWrapper & NUpdateWrapper, PatchQuery & NPatchQuery, PatchValues & NPatchValues, PatchOptions & NPatchOptions, PatchWrapper & NPatchWrapper, DeleteQuery & NDeleteQuery, DeleteOptions & NDeleteOptions, DeleteWrapper & NDeleteWrapper, Relations> 
        : any
    {
        pipe.attach(this);

        for (var schemaBuilderName of Pipeline.schemaBuilderNames) {
            if (pipe[schemaBuilderName]) {
                if (!this[schemaBuilderName]) {
                    this[schemaBuilderName] = SchemaBuilder.emptySchema();
                }

                this[schemaBuilderName] = pipe[schemaBuilderName].mergeProperties(this[schemaBuilderName]);
            }
        }

        for (var method of Pipeline.CRUDMethods) {
            if (typeof pipe[method] == 'function') {


                let next = this[`_${method}`];
                this[`_${method}`] = function (...args) {
                    return (pipe[method] as (...args) => any).call(pipe, args);
                };
            }
        }

        return this;
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

    /**
     * Remap a read options to change its name. To be used in case of conflict between two pipelines.
     * 
     * @param opt 
     * @param renamedOpt 
     */
    // public remapReadOption<K extends keyof ReadOptions, K2 extends keyof any>(opt: K, renamedOpt: K2): Pipeline<T, ReadQuery, Omit<ReadOptions, K> & {[P in K2]: ReadOptions[K]}, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper> {
    //     return this.remapOptions("read", opt, renamedOpt)
    // }

    // /**
    //  * Remap the given options to change its name for the given method.
    //  * 
    //  * @param method 
    //  * @param opt 
    //  * @param renamedOpt 
    //  */
    // private remapOptions(method: PipelineMethods, opt: string, renamedOpt: string) {
    //     this.optionsMapping = this.optionsMapping || {};
    //     this.optionsMapping[method] = this.optionsMapping[method] || {};
    //     this.optionsMapping[method][renamedOpt as string] = opt as string;
    //     let schemaBuilderName = `_${method}OptionsSchemaBuilder`
    //     if (!this.hasOwnProperty(schemaBuilderName)) {
    //         this[schemaBuilderName] = this[schemaBuilderName].clone();
    //     }
    //     this[schemaBuilderName].renameProperty(opt, renamedOpt);
    //     return this as any;
    // }

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
