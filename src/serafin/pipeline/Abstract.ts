import * as util from 'util';
import * as _ from 'lodash';
import { final } from './decorator/Final'
import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validationError, serafinError, } from "../error/Error"
import { SchemaBuilder, Omit } from "@serafin/schema-builder"
import { PipelineRelation } from './Relation';
import { IdentityInterface } from './IdentityInterface'

const schemaBuilderCache = Symbol("SchemaBuilderCache");

export type PipelineMethods = "create" | "read" | "update" | "patch" | "delete";
export type SchemaBuilderNames = "modelSchemaBuilder" | "readQuerySchemaBuilder" | "readOptionsSchemaBuilder" | "readWrapperSchemaBuilder" | "createValuesSchemaBuilder" | "createOptionsSchemaBuilder" | "createWrapperSchemaBuilder" | "updateValuesSchemaBuilder" | "updateOptionsSchemaBuilder" | "updateWrapperSchemaBuilder" | "patchQuerySchemaBuilder" | "patchValuesSchemaBuilder" | "patchOptionsSchemaBuilder" | "patchWrapperSchemaBuilder" | "deleteQuerySchemaBuilder" | "deleteOptionsSchemaBuilder" | "deleteWrapperSchemaBuilder";
export type InternalSchemaBuilderNames = "_modelSchemaBuilder" | "_readQuerySchemaBuilder" | "_readOptionsSchemaBuilder" | "_readWrapperSchemaBuilder" | "_createValuesSchemaBuilder" | "_createOptionsSchemaBuilder" | "_createWrapperSchemaBuilder" | "_updateValuesSchemaBuilder" | "_updateOptionsSchemaBuilder" | "_updateWrapperSchemaBuilder" | "_patchQuerySchemaBuilder" | "_patchValuesSchemaBuilder" | "_patchOptionsSchemaBuilder" | "_patchWrapperSchemaBuilder" | "_deleteQuerySchemaBuilder" | "_deleteOptionsSchemaBuilder" | "_deleteWrapperSchemaBuilder";

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export abstract class PipelineAbstract<
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
    /**
     * The parent pipeline. It has to be used internally by pipelines to access the next element of the pipeline.
     * Types are all 'any' because pipelines are reusable and they can't make assumption on what is the next element of the pipeline.
     */
    protected parent?: PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>;

    public get modelSchemaBuilder(): SchemaBuilder<T> { return this.nearestSchemaBuilder("_modelSchemaBuilder") }
    protected _modelSchemaBuilder?: SchemaBuilder<T>

    public get readQuerySchemaBuilder(): SchemaBuilder<ReadQuery> { return this.nearestSchemaBuilder("_readQuerySchemaBuilder") }
    protected _readQuerySchemaBuilder?: SchemaBuilder<ReadQuery>
    public get readOptionsSchemaBuilder(): SchemaBuilder<ReadOptions> { return this.mergeSchemaBuilders("_readOptionsSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _readOptionsSchemaBuilder?: SchemaBuilder<ReadOptions>
    public get readWrapperSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_readWrapperSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _readWrapperSchemaBuilder?: SchemaBuilder<ReadWrapper>

    public get createValuesSchemaBuilder(): SchemaBuilder<CreateValues> { return this.nearestSchemaBuilder("_createValuesSchemaBuilder") }
    protected _createValuesSchemaBuilder?: SchemaBuilder<CreateValues>
    public get createOptionsSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_createOptionsSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _createOptionsSchemaBuilder?: SchemaBuilder<CreateOptions>
    public get createWrapperSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_createWrapperSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _createWrapperSchemaBuilder?: SchemaBuilder<CreateWrapper>

    public get updateValuesSchemaBuilder(): SchemaBuilder<CreateValues> { return this.nearestSchemaBuilder("_updateValuesSchemaBuilder") }
    protected _updateValuesSchemaBuilder?: SchemaBuilder<UpdateValues>
    public get updateOptionsSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_updateOptionsSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _updateOptionsSchemaBuilder?: SchemaBuilder<UpdateOptions>
    public get updateWrapperSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_updateWrapperSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _updateWrapperSchemaBuilder?: SchemaBuilder<UpdateWrapper>

    public get patchQuerySchemaBuilder(): SchemaBuilder<CreateValues> { return this.nearestSchemaBuilder("_patchQuerySchemaBuilder") }
    protected _patchQuerySchemaBuilder?: SchemaBuilder<PatchQuery>
    public get patchValuesSchemaBuilder(): SchemaBuilder<CreateValues> { return this.nearestSchemaBuilder("_patchValuesSchemaBuilder") }
    protected _patchValuesSchemaBuilder?: SchemaBuilder<PatchValues>
    public get patchOptionsSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_patchOptionsSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _patchOptionsSchemaBuilder?: SchemaBuilder<PatchOptions>
    public get patchWrapperSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_patchWrapperSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _patchWrapperSchemaBuilder?: SchemaBuilder<PatchWrapper>

    public get deleteQuerySchemaBuilder(): SchemaBuilder<CreateValues> { return this.nearestSchemaBuilder("_deleteQuerySchemaBuilder") }
    protected _deleteQuerySchemaBuilder?: SchemaBuilder<DeleteQuery>
    public get deleteOptionsSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_deleteOptionsSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _deleteOptionsSchemaBuilder?: SchemaBuilder<DeleteOptions>
    public get deleteWrapperSchemaBuilder(): SchemaBuilder<ReadWrapper> { return this.mergeSchemaBuilders("_deleteWrapperSchemaBuilder") || this.defaultSchemaBuilder() }
    protected _deleteWrapperSchemaBuilder?: SchemaBuilder<DeleteWrapper>

    private optionsMapping: Partial<Record<PipelineMethods, { [k: string]: string }>> = {};

    /**
     * list of relations for this pipeline
     */
    public get relations(): Relations {
        if (!this._relationsSchema) {
            let existingRelations = this.parent ? this.parent.relations : null;
            this._relationsSchema = existingRelations ? _.clone(existingRelations) : {} as any
        }
        return this._relationsSchema
    }
    protected _relationsSchema: Relations = null;
    /**
     * Add a relation to the pipeline.
     * This method modifies the pipeline and affect the templated type.
     * 
     * @param relation 
     */
    public addRelation<N extends keyof any, R extends IdentityInterface, RReadQuery, RReadOptions, RReadWrapper, K1 extends keyof RReadQuery = null, K2 extends keyof RReadOptions = null>(relation: {
        name: N
        pipeline: () => PipelineAbstract<R, RReadQuery, RReadOptions, RReadWrapper>
        query: {[key in K1]: any}
        options?: {[key in K2]: any}
    }): PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper, Relations & {[key in N]: PipelineRelation<T, N, R, RReadQuery, RReadOptions, RReadWrapper, K1, K2>}> {
        if (typeof relation.pipeline !== "function") {
            let pipeline = relation.pipeline
            relation.pipeline = () => pipeline
        }
        this.relations[relation.name as string] = new PipelineRelation(relation as any, this)
        return this as any;
    }

    /**
     * Flag indicating if this pipeline has been attached to a source
     */
    protected get isAttachedToSource() {
        if (!this._isAttachedToSource) {
            this._isAttachedToSource = this.parent ? this.parent.isAttachedToSource : false
        }
        return this._isAttachedToSource
    }
    private _isAttachedToSource: boolean


    /**
     * Attach this pipeline to the given parent.
     */
    protected attach(pipeline: PipelineAbstract) {
        if (this.parent) {
            this.parent.attach(pipeline)
        } else {
            this.parent = pipeline
        }
    }

    /**
     * Get the nearest schema builder for the given property name
     * 
     * @param propertyName 
     */
    protected nearestSchemaBuilder(propertyName: InternalSchemaBuilderNames): SchemaBuilder<any> {
        if (this[schemaBuilderCache]) {
            if (propertyName in this[schemaBuilderCache]) {
                return this[schemaBuilderCache][propertyName]
            }
        } else {
            this[schemaBuilderCache] = {}
        }
        if (!this.isAttachedToSource) {
            return null
        }
        let schemaBuilder = this[propertyName] as SchemaBuilder<any>
        return schemaBuilder ? schemaBuilder : (this.parent ? this.parent.nearestSchemaBuilder(propertyName) : null)
    }

    /**
     * Merge schema builders recurcively for the given property name
     * 
     * @param propertyName 
     */
    protected mergeSchemaBuilders(propertyName: InternalSchemaBuilderNames): SchemaBuilder<any> {
        if (this[schemaBuilderCache]) {
            if (propertyName in this[schemaBuilderCache]) {
                return this[schemaBuilderCache][propertyName]
            }
        } else {
            this[schemaBuilderCache] = {}
        }
        if (!this.isAttachedToSource) {
            return null
        }
        let parentSchemaBuilder = this.parent ? this.parent.mergeSchemaBuilders(propertyName) : null
        let schemaBuilder = this[propertyName] as SchemaBuilder<any>
        return schemaBuilder ? (parentSchemaBuilder ? schemaBuilder.mergeProperties<any>(parentSchemaBuilder) : schemaBuilder) : parentSchemaBuilder
    }

    /**
     * Create the default schema builder in case nothing is defined
     */
    protected defaultSchemaBuilder(): SchemaBuilder<any> {
        return SchemaBuilder.emptySchema()
    }

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    @final async create(resources: CreateValues[], options?: CreateOptions) {
        this.handleValidate('create', () => {
            if (this._createValuesSchemaBuilder) { this._createValuesSchemaBuilder.validateList(resources) }
            if (this._createOptionsSchemaBuilder) { this._createOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._create(resources, this.prepareOptionsMapping(options, "create"));
    }

    protected async _create(resources: CreateValues[], options?: CreateOptions): Promise<{ data: T[] } & CreateWrapper> {
        return this.parent.create(resources, options);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    @final async read(query?: ReadQuery, options?: ReadOptions) {
        this.handleValidate('read', () => {
            if (this._readQuerySchemaBuilder) { this._readQuerySchemaBuilder.validate(query || {} as any) }
            if (this._readOptionsSchemaBuilder) { this._readOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._read(query, this.prepareOptionsMapping(options, "read"));
    }

    protected async _read(query?: ReadQuery, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper> {
        return this.parent.read(query, options);
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
    @final async update(id: string, values: UpdateValues, options?: UpdateOptions) {
        this.handleValidate('update', () => {
            if (this._updateValuesSchemaBuilder) { this._updateValuesSchemaBuilder.validate(values) }
            if (this._updateOptionsSchemaBuilder) { this._updateOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._update(id, values, options);
    }

    protected async _update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<{ data: T } & UpdateWrapper> {
        return this.parent.update(id, values, this.prepareOptionsMapping(options, "update"));
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
    @final async patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper> {
        this.handleValidate('patch', () => {
            if (this._patchQuerySchemaBuilder) { this._patchQuerySchemaBuilder.validate(query) }
            if (this._patchValuesSchemaBuilder) { this._patchValuesSchemaBuilder.validate(values) }
            if (this._patchOptionsSchemaBuilder) { this._patchOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._patch(query, values, this.prepareOptionsMapping(options, "patch"));
    }

    protected async _patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper> {
        return this.parent.patch(query, values, options);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    @final async delete(query: DeleteQuery, options?: DeleteOptions) {
        this.handleValidate('delete', () => {
            if (this._deleteQuerySchemaBuilder) { this._deleteQuerySchemaBuilder.validate(query) }
            if (this._deleteOptionsSchemaBuilder) { this._deleteOptionsSchemaBuilder.validate(options || {} as any) }
        });
        return this._delete(query, this.prepareOptionsMapping(options, "delete"));
    }

    protected async _delete(query: DeleteQuery, options?: DeleteOptions): Promise<{ data: T[] } & DeleteWrapper> {
        return this.parent.delete(query, options);
    }

    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'update', 'patch', 'delete'];

    public static schemaBuilderNames: SchemaBuilderNames[] = ["modelSchemaBuilder", "readQuerySchemaBuilder", "readOptionsSchemaBuilder", "readWrapperSchemaBuilder", "createValuesSchemaBuilder", "createOptionsSchemaBuilder", "createWrapperSchemaBuilder", "updateValuesSchemaBuilder", "updateOptionsSchemaBuilder", "updateWrapperSchemaBuilder", "patchQuerySchemaBuilder", "patchValuesSchemaBuilder", "patchOptionsSchemaBuilder", "patchWrapperSchemaBuilder", "deleteQuerySchemaBuilder", "deleteOptionsSchemaBuilder", "deleteWrapperSchemaBuilder"];

    private static internalSchemaBuilderNames: InternalSchemaBuilderNames[] = ["_modelSchemaBuilder", "_readQuerySchemaBuilder", "_readOptionsSchemaBuilder", "_readWrapperSchemaBuilder", "_createValuesSchemaBuilder", "_createOptionsSchemaBuilder", "_createWrapperSchemaBuilder", "_updateValuesSchemaBuilder", "_updateOptionsSchemaBuilder", "_updateWrapperSchemaBuilder", "_patchQuerySchemaBuilder", "_patchValuesSchemaBuilder", "_patchOptionsSchemaBuilder", "_patchWrapperSchemaBuilder", "_deleteQuerySchemaBuilder", "_deleteOptionsSchemaBuilder", "_deleteWrapperSchemaBuilder"];

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        let recursiveSchemas = (target: PipelineAbstract) => {
            if (!target) {
                return []
            }
            let pipelineSchema: any = {}
            for (let schemaBuilderName of PipelineAbstract.internalSchemaBuilderNames) {
                if (this[schemaBuilderName]) {
                    pipelineSchema[schemaBuilderName] = this[schemaBuilderName].schema
                }
            }
            return [pipelineSchema, ...recursiveSchemas(target.parent)];
        }
        return (util.inspect(recursiveSchemas(this), false, null));
    }

    /**
     * Combine the given pipeline with this one.
     * /!\ the provided pipeline MUST NOT be reused somewhere else. The `parent` property can be assigned only once.
     * 
     * @param pipeline The pipeline to link with this one
     */
    pipe<N, NReadQuery, NReadOptions, NReadWrapper, NCreateValues, NCreateOptions, NCreateWrapper, NUpdateValues, NUpdateOptions, NUpdateWrapper, NPatchQuery, NPatchValues, NPatchOptions, NPatchWrapper, NDeleteQuery, NDeleteOptions, NDeleteWrapper, NRelations>(pipeline: PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateValues, NCreateOptions, NCreateWrapper, NUpdateValues, NUpdateOptions, NUpdateWrapper, NPatchQuery, NPatchValues, NPatchOptions, NPatchWrapper, NDeleteQuery, NDeleteOptions, NDeleteWrapper, NRelations>) {
        // attach the pipeline to this one
        pipeline.attach(this);

        // cast the pipeline and combine all interfaces
        var chainedPipeline: PipelineAbstract<T & N, ReadQuery & NReadQuery, ReadOptions & NReadOptions, ReadWrapper & NReadWrapper, CreateValues & NCreateValues, CreateOptions & NCreateOptions, CreateWrapper & NCreateWrapper, UpdateValues & NUpdateValues, UpdateOptions & NUpdateOptions, UpdateWrapper & NUpdateWrapper, PatchQuery & NPatchQuery, PatchValues & NPatchValues, PatchOptions & NPatchOptions, PatchWrapper & NPatchWrapper, DeleteQuery & NDeleteQuery, DeleteOptions & NDeleteOptions, DeleteWrapper & NDeleteWrapper, Relations & NRelations> = <any>pipeline;
        return chainedPipeline;
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
    public remapReadOption<K extends keyof ReadOptions, K2 extends keyof any>(opt: K, renamedOpt: K2): PipelineAbstract<T, ReadQuery, Omit<ReadOptions, K> & {[P in K2]: ReadOptions[K]}, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper> {
        return this.remapOptions("read", opt, renamedOpt)
    }

    /**
     * Remap the given options to change its name for the given method.
     * 
     * @param method 
     * @param opt 
     * @param renamedOpt 
     */
    private remapOptions(method: PipelineMethods, opt: string, renamedOpt: string) {
        this.optionsMapping = this.optionsMapping || {};
        this.optionsMapping[method] = this.optionsMapping[method] || {};
        this.optionsMapping[method][renamedOpt as string] = opt as string;
        let schemaBuilderName = `_${method}OptionsSchemaBuilder`
        if (!this.hasOwnProperty(schemaBuilderName)) {
            this[schemaBuilderName] = this[schemaBuilderName].clone();
        }
        this[schemaBuilderName].renameProperty(opt, renamedOpt);
        return this as any;
    }

    /**
     * Map the input options object according to the configured mapping
     */
    private prepareOptionsMapping(options, method: PipelineMethods) {
        if (typeof options === 'object' && this.optionsMapping) {
            for (let key in this.optionsMapping[method]) {
                if (options[key]) {
                    options[this.optionsMapping[key]] = options[key];
                    delete (options[key]);
                }
            }
        }
        return options;
    }
}
