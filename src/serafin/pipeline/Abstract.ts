import * as util from 'util';
import * as Promise from 'bluebird';
import * as Model from './model/Resource';
export { option, description } from './Decorators'

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export abstract class PipelineAbstract<T = {}, ReadQuery = {}, ReadOptions = {}, ReadWrapper = { results: {}[] }, CreateResources = {}[], CreateOptions = {}, UpdateQuery = {}, UpdateValues = {}, UpdateOptions = {}, DeleteQuery = {}, DeleteOptions = {}> {
    /**
     * The parent pipeline. It has to be used internally by pipelines to access the next element of the pipeline.
     * Types are all 'any' because pipelines are general reusable blocks and they can't make assumption on what is the next element of the pipeline.
     */
    protected parent?: PipelineAbstract<any, any, any, any, any, any, any, any, any, any>;

    /**
     * Contains a definition this pipeline metadata
     */
    public schema: {
        title: string,
        type: 'object',
        properties: { description: string, methods: { 'type': 'object', properties: Object } },
        definitions?: any
    };

    constructor() {
        this.schema = {
            title: Object.getPrototypeOf(this).constructor.name,
            type: 'object',
            properties: {
                description: Object.getPrototypeOf(this).constructor['description'] || undefined,
                methods: { 'type': 'object', properties: {} }
            }
        };

        let thisPrototype = Object.getPrototypeOf(this);

        for (const key of PipelineAbstract.getCRUDMethods()) {
            if (typeof Object.getOwnPropertyDescriptor(thisPrototype, key) != 'undefined') {
                this.schema.properties.methods.properties[key] = { 'type': 'object', 'properties': {} };
                let paramsDescriptor = Object.getOwnPropertyDescriptor(this[key], 'params');
                if (paramsDescriptor && Array.isArray(paramsDescriptor.value)) {
                    this.schema.properties.methods.properties[key]['properties'] = Object.assign(this.schema.properties.methods.properties[key]['properties'], paramsDescriptor.value);
                }
                let descriptionDescriptor = Object.getOwnPropertyDescriptor(this[key], 'description');
                if (descriptionDescriptor) {
                    this.schema.properties.methods.properties[key]['properties']['description'] = descriptionDescriptor.value;
                }
            }
        }
    }

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    create(resources: CreateResources, options?: CreateOptions): Promise<T[]> {
        return this.parent.create(resources, options);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
        return this.parent.read(query, options);
    }

    /**
     * Update resources according to the given query and values.
     * The Query will select a subset of the data and given `values` are updated on it.
     * 
     * @param query 
     * @param values 
     * @param options 
     */
    update(query: UpdateQuery, values: UpdateValues, options?: UpdateOptions): Promise<T[]> {
        return this.parent.update(query, values, options);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]> {
        return this.parent.delete(query, options);
    }

    /**
     * Get the metadata of this pipeline
     */
    describe(): any[] {
        let recursiveSchema = (this.parent) ? this.parent.describe() : [];
        recursiveSchema.push(this.schema);
        return recursiveSchema;
    }

    public static getCRUDMethods() {
        // Object.keys(this.prototype) doesn't seem to work the same...
        return ['create', 'read', 'update', 'delete'];
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        return (util.inspect(this.describe(), false, null));
    }

    /**
     * Project the current pipeline changing the underlying resource.
     * /!\ the provided projection MUST NOT be reused somewhere else. The `parent` property can be assigned only once. 
     * 
     * @param pipeline The pipeline to link with this one
     */
    pipe<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineProjectionAbstract<T, N, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateQuery, UpdateValues, UpdateOptions, DeleteQuery, DeleteOptions, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>): PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>
    /**
     * Combine the given pipeline with this one.
     * /!\ the provided pipeline MUST NOT be reused somewhere else. The `parent` property can be assigned only once.
     * 
     * @param pipeline The pipeline to link with this one
     */
    pipe<N extends Partial<T>, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>) {
        if (pipeline.parent) {
            throw new Error("Pipeline Error: The provided pipeline is already attached to an existing parent pipeline")
        }
        pipeline.parent = this;
        // cast the pipeline and combine all interfaces
        var chainedPipeline: PipelineAbstract<T, ReadQuery & NReadQuery, ReadOptions & NReadOptions, ReadWrapper & NReadWrapper, CreateResources & NCreateResources, CreateOptions & NCreateOptions, UpdateQuery & NUpdateQuery, UpdateValues & NUpdateValues, UpdateOptions & NUpdateOptions, DeleteQuery & NDeleteQuery, DeleteOptions & NDeleteOptions> = <any>pipeline;
        return chainedPipeline;
    }
}

/**
 * Type definition of a Projection Pipeline. It has to be used when the pipeline fondamentaly changes the nature of the data it provides : T -> N
 */
export abstract class PipelineProjectionAbstract<T, N, ReadQuery = {}, ReadOptions = {}, ReadWrapper = { results: T[] }, CreateResources = {}, CreateOptions = {}, UpdateQuery = {}, UpdateValues = {}, UpdateOptions = {}, DeleteQuery = {}, DeleteOptions = {}, NReadQuery = ReadQuery, NReadOptions = ReadOptions, NReadWrapper = { results: N[] }, NCreateResources = CreateResources, NCreateOptions = CreateOptions, NUpdateQuery = UpdateQuery, NUpdateValues = UpdateValues, NUpdateOptions = UpdateOptions, NDeleteQuery = DeleteQuery, NDeleteOptions = DeleteOptions> extends PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions> {

}