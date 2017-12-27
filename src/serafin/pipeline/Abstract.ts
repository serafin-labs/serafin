import * as util from 'util';
import * as _ from 'lodash';
import * as uuid from 'uuid/v1';
import { ResourceIdentityInterface } from './schemaBuilder/ResourceInterfaces';
import { PipelineSchemaBuilderModel } from './schemaBuilder/Model'
import { PipelineRelations, PipelineRelationInterface } from './Relations'
import { PipelineSchemaBuilder } from './schemaBuilder/SchemaBuilder'
import { PipelineSchemaBuilderProperties } from './schemaBuilder/Properties'
import { getOptionsSchemas, getDataSchema } from './decorator/decoratorSymbols'
import { final } from './decorator/Final'
import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validationError, serafinError, } from "../error/Error"
import { metaSchema } from "../openApi"
import { PipelineDo } from './Do';
import { QueryTemplate } from './QueryTemplate';

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export abstract class PipelineAbstract<
    T = {},
    ReadQuery = {},
    ReadOptions = {},
    ReadWrapper = {},
    CreateResources = {},
    CreateOptions = {},
    UpdateValues = {},
    UpdateOptions = {},
    PatchQuery = {},
    PatchValues = {},
    PatchOptions = {},
    DeleteQuery = {},
    DeleteOptions = {}> {

    protected modelSchemaBuilder: PipelineSchemaBuilderModel<ResourceIdentityInterface> = null;
    protected pipelineRelations: PipelineRelations = null;
    protected optionsSchema: {} = null;
    private validationFunctions = null;
    private optionsMapping = {};
    private pipelineUuid = null;

    constructor() {
        this.optionsSchema = _.cloneDeep(getOptionsSchemas(this));
        this.pipelineUuid = uuid();
    }

    get uuid() {
        return this.pipelineUuid;
    }

    /**
     * Attach this pipeline to the given parent.
     */
    protected attach(pipeline: PipelineAbstract) {
        if (this.parent) {
            this.parent.attach(pipeline)
        } else {
            this.parent = pipeline
        }

        let existingRelations = pipeline.relations;
        this.pipelineRelations = existingRelations ? existingRelations.clone(this) : new PipelineRelations(this);
        this.pipelineUuid = pipeline.uuid;
    }

    /**
     * Find the nearest modelSchema definition
     */
    protected findModelSchema() {
        return this.modelSchemaBuilder || (this.parent ? this.parent.findModelSchema() : null)
    }

    /**
     * Find the nearest relationsSchema definition
     */
    protected findPipelineRelations() {
        return this.pipelineRelations || (this.parent ? this.parent.findPipelineRelations() : null)
    }

    /**
     * gather all options used by this pipeline and its parents
     */
    protected findAllOptions() {
        return [this.optionsSchema, ...((this.parent) ? this.parent.findAllOptions() : [])];
    }


    /**
     * The schema that represents the capabilities of this pipeline
     */
    get schemaBuilder() {
        // gather all results used by this pipeline and its parents
        let findAllData = (target: PipelineAbstract) => target ? [getDataSchema(target), ...findAllData(target.parent)] : []

        // create and return the global schema representing the capabilities of this pipeline
        return new PipelineSchemaBuilder(this.findModelSchema(), PipelineSchemaBuilder.mergeOptions(this.findAllOptions()), PipelineSchemaBuilder.mergeProperties(findAllData(this)))
    }

    /**
     * The schema that represents the capabilities of the current pipeline
     */
    get currentSchemaBuilder() {
        // create and return the schema representing the current pipeline
        return new PipelineSchemaBuilder(this.modelSchemaBuilder, this.optionsSchema, getDataSchema(this));
    }

    /**
     * Get a list of relations for this pipeline
     */
    get relations(): PipelineRelations {
        return this.findPipelineRelations();
    }

    public addRelation(name: string, pipeline: PipelineAbstract | (() => PipelineAbstract), query: object | QueryTemplate): this {
        this.relations.add(name, pipeline, query);
        return this;
    }

    /**
     * The parent pipeline. It has to be used internally by pipelines to access the next element of the pipeline.
     * Types are all 'any' because pipelines are general reusable blocks and they can't make assumption on what is the next element of the pipeline.
     */
    protected parent?: PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any>;

    private prepareOptionsMapping(options) {
        if (typeof options == 'object') {
            for (let key in this.optionsMapping) {
                if (options[key]) {
                    options[this.optionsMapping[key]] = options[key];
                    delete (options[key]);
                }
            }
        }

        return options;
    }

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    @final async create(resources: CreateResources[], options?: CreateOptions): Promise<T[]> {
        this.validate('create', resources, options);
        return this._create(resources, this.prepareOptionsMapping(options));
    }

    protected async _create(resources: CreateResources[], options?: CreateOptions): Promise<T[]> {
        return this.parent.create(resources, options);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    @final async read(query?: ReadQuery, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper> {
        this.validate('read', query, options);
        return this._read(query, this.prepareOptionsMapping(options));
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
    @final async update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<T> {
        this.validate('update', id, values, options);
        return this._update(id, values, options);
    }

    protected async _update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<T> {
        return this.parent.update(id, values, this.prepareOptionsMapping(options));
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
    @final async patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<T[]> {
        this.validate('patch', query, values, options);
        return this._patch(query, values, this.prepareOptionsMapping(options));
    }

    protected async _patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<T[]> {
        return this.parent.patch(query, values, options);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    @final async delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]> {
        this.validate('delete', query, options);
        return this._delete(query, this.prepareOptionsMapping(options));
    }

    protected async _delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]> {
        return this.parent.delete(query, options);
    }

    public static getCRUDMethods() {
        return ['create', 'read', 'update', 'patch', 'delete'];
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        let recursiveSchemas = (target: PipelineAbstract) => target ? [(new PipelineSchemaBuilder(target.modelSchemaBuilder, target.optionsSchema, getDataSchema(target), Object.getPrototypeOf(target).constructor.description, Object.getPrototypeOf(target).constructor.name)).schema, ...recursiveSchemas(target.parent)] : [];
        return (util.inspect(recursiveSchemas(this), false, null));
    }

    /**
     * Combine the given pipeline with this one.
     * /!\ the provided pipeline MUST NOT be reused somewhere else. The `parent` property can be assigned only once.
     * 
     * @param pipeline The pipeline to link with this one
     */
    pipe<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateValues, NUpdateOptions, NPatchQuery, NPatchValues, NPatchOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateValues, NUpdateOptions, NPatchQuery, NPatchValues, NPatchOptions, NDeleteQuery, NDeleteOptions>) {
        // attach the pipeline to this one
        pipeline.attach(this);

        // cast the pipeline and combine all interfaces
        var chainedPipeline: PipelineAbstract<T & N, ReadQuery & NReadQuery, ReadOptions & NReadOptions, ReadWrapper & NReadWrapper, CreateResources & NCreateResources, CreateOptions & NCreateOptions, UpdateValues & NUpdateValues, UpdateOptions & NUpdateOptions, PatchQuery & NPatchQuery, PatchValues & NPatchValues, PatchOptions & NPatchOptions, DeleteQuery & NDeleteQuery, DeleteOptions & NDeleteOptions> = <any>pipeline;
        return chainedPipeline;
    }

    do(resources: T[] = null): PipelineDo<T, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateValues, UpdateOptions, PatchQuery, PatchValues, PatchOptions, DeleteQuery, DeleteOptions> {
        return new PipelineDo(this, resources);
    }

    /**
     * Project the current pipeline changing the underlying resource.
     * /!\ the provided projection MUST NOT be reused somewhere else. The `parent` property can be assigned only once. 
     * 
     * @param pipeline The pipeline to link with this one
     */
    project<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateValues, NUpdateOptions, NPatchQuery, NPatchValues, NPatchOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineProjectionAbstract<T, N, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateValues, UpdateOptions, PatchQuery, PatchValues, PatchOptions, DeleteQuery, DeleteOptions, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateValues, NUpdateOptions, NPatchQuery, NPatchValues, NPatchOptions, NDeleteQuery, NDeleteOptions>): PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateValues, NUpdateOptions, NPatchQuery, NPatchValues, NPatchOptions, NDeleteQuery, NDeleteOptions> {
        // attach the pipeline to this one
        pipeline.attach(this);
        return <any>pipeline;
    }

    private compileValidationFunctions() {
        let ajv = new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: metaSchema });
        let currentSchemaBuilder = this.currentSchemaBuilder.schema;
        ajv.addSchema(currentSchemaBuilder, "schema");

        this.validationFunctions = {};

        // Create
        let validateCreateResources = currentSchemaBuilder.definitions.createValues ? ajv.compile({
            type: 'array',
            items: { "$ref": "schema#/definitions/createValues" },
            minItems: 1
        }) : () => true;
        let validateCreateOptions = currentSchemaBuilder.definitions.createOptions ? ajv.compile({ "$ref": "schema#/definitions/createOptions" }) : () => true;
        this.validationFunctions['create'] = (params: any[]) => {
            let [resources, options] = params;
            if (!validateCreateResources(resources) || !validateCreateOptions(options || {})) {
                throw validationError(ajv.errorsText(validateCreateResources.errors || validateCreateOptions.errors))
            }
        }

        // Read
        let validateReadQuery = currentSchemaBuilder.definitions.readQuery ? ajv.compile({ "$ref": "schema#/definitions/readQuery" }) : () => true;
        let validateReadOptions = currentSchemaBuilder.definitions.readOptions ? ajv.compile({ "$ref": "schema#/definitions/readOptions" }) : () => true;
        this.validationFunctions['read'] = (params: any[]) => {
            let [query, options] = params;
            if (!validateReadQuery(query || {}) || !validateReadOptions(options || {})) {
                throw validationError(ajv.errorsText(validateReadQuery.errors || validateReadOptions.errors))
            }
        }

        // Update
        let validateUpdateValues = currentSchemaBuilder.definitions.updateValues ? ajv.compile({ "$ref": 'schema#/definitions/updateValues' }) : () => true;
        let validateUpdateOptions = currentSchemaBuilder.definitions.updateOptions ? ajv.compile({ "$ref": 'schema#/definitions/updateOptions' }) : () => true;
        this.validationFunctions['update'] = (params: any[]) => {
            let [id, values, options] = params;
            if (!validateUpdateValues(values) || !validateUpdateOptions(options || {})) {
                throw validationError(ajv.errorsText(validateUpdateValues.errors || validateUpdateOptions.errors))
            }
        }

        // Patch
        let validatePatchQuery = currentSchemaBuilder.definitions.patchQuery ? ajv.compile({ "$ref": 'schema#/definitions/patchQuery' }) : () => true;
        let validatePatchValues = currentSchemaBuilder.definitions.patchValues ? ajv.compile({ "$ref": 'schema#/definitions/patchValues' }) : () => true;
        let validatePatchOptions = currentSchemaBuilder.definitions.patchOptions ? ajv.compile({ "$ref": 'schema#/definitions/patchOptions' }) : () => true;
        this.validationFunctions['patch'] = (params: any[]) => {
            let [query, values, options] = params;
            if (!validatePatchQuery(query) || !validatePatchValues(values) || !validatePatchOptions(options || {})) {
                throw validationError(ajv.errorsText(validatePatchQuery.errors || validatePatchValues.errors || validatePatchOptions.errors))
            }
        }

        // Delete
        let validateDeleteQuery = currentSchemaBuilder.definitions.deleteQuery ? ajv.compile({ "$ref": 'schema#/definitions/deleteQuery' }) : () => true;
        let validateDeleteOptions = currentSchemaBuilder.definitions.deleteOptions ? ajv.compile({ "$ref": 'schema#/definitions/deleteOptions' }) : () => true;
        this.validationFunctions['delete'] = (params: any[]) => {
            let [query, options] = params;
            if (!validateDeleteQuery(query || {}) || !validateDeleteOptions(options || {})) {
                throw validationError(ajv.errorsText(validateDeleteQuery.errors || validateDeleteOptions.errors))
            }
        }
    }

    private validate(method: string, ...params) {
        if (!this.validationFunctions) {
            this.compileValidationFunctions();
        }
        let validate = this.validationFunctions[method];

        try {
            validate(params);
        } catch (error) {
            throw serafinError('SerafinValidationError',
                `Validation failed in ${Object.getPrototypeOf(this).constructor.name}::${method}`,
                { constructor: Object.getPrototypeOf(this).constructor.name, method: method },
                error);
        }
    }

    public remapOptions<MAP extends { [key: string]: string }>(mapping: MAP): PipelineAbstract<T, ReadQuery, ReadOptions & {[OPT in keyof MAP]?: any}, ReadWrapper, CreateResources, CreateOptions & {[OPT in keyof MAP]?: any}, UpdateValues, UpdateOptions & {[OPT in keyof MAP]?: any}, PatchQuery, PatchValues, PatchOptions & {[OPT in keyof MAP]?: any}, DeleteQuery, DeleteOptions & {[OPT in keyof MAP]?: any}> {
        this.optionsMapping = mapping;
        for (let key in this.optionsMapping) {
            for (let method in this.optionsSchema) {
                this.optionsSchema[method].renameProperty(this.optionsMapping[key], key);
            }
        }
        this.validationFunctions = null;
        return this;
    }
}

/**
 * Type definition of a Projection Pipeline. It has to be used when the pipeline fondamentaly changes the nature of the data it provides : T -> N
 */
export abstract class PipelineProjectionAbstract<T, N, ReadQuery = {}, ReadOptions = {}, ReadWrapper = {}, CreateResources = {}, CreateOptions = {}, UpdateValues = {}, UpdateOptions = {}, PatchQuery = {}, PatchValues = {}, PatchOptions = {}, DeleteQuery = {}, DeleteOptions = {}, NReadQuery = ReadQuery, NReadOptions = ReadOptions, NReadWrapper = ReadWrapper, NCreateResources = CreateResources, NCreateOptions = CreateOptions, NUpdateValues = UpdateValues, NUpdateOptions = UpdateOptions, NPatchQuery = PatchQuery, NPatchValues = PatchValues, NPatchOptions = PatchOptions, NDeleteQuery = DeleteQuery, NDeleteOptions = DeleteOptions> extends PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateValues, NUpdateOptions, NPatchQuery, NPatchValues, NPatchOptions, NDeleteQuery, NDeleteOptions> {

}
