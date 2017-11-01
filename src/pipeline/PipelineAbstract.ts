import * as util from 'util';
import * as Promise from 'bluebird';

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 */
export abstract class PipelineAbstract<T = {}, ReadQuery = {}, ReadOptions = {}, ReadWrapper = { results: T[] }, CreateQuery = {}, CreateOptions = {}, UpdateQuery = {}, UpdateOptions = {}, DeleteQuery = {}, DeleteOptions = {}> {
    /**
     * The parent pipeline. It has to be used internally by pipelines to access the next element of the pipeline.
     * Types are all 'any' because pipelines are general reusable blocks and they can't make assumption on what is the next element of the pipeline.
     */
    protected parent?: PipelineAbstract<any, any, any, any, any, any, any, any, any, any>;

    /**
     * Contains a definition this pipeline metadata
     */
    protected definition: {
        title: string,
        description: string,
        methods: string[],
        definitions?: any
    };

    /**
     * Create new resources based on `resources` input array.
     * 
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    abstract create(resources: Partial<T>[], options?: CreateOptions): Promise<T[]>

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     * 
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    abstract read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper>

    /**
     * Update resources according to the given query and values.
     * The Query will select a subset of the data and given `values` are updated on it.
     * 
     * @param query 
     * @param values 
     * @param options 
     */
    abstract update(query: UpdateQuery, values: Partial<T>, options?: UpdateOptions): Promise<T[]>

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    abstract delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]>

    constructor() {
        // TODO: get the definition from annotations
    }

    /**
     * Get the metadata of this pipeline
     */
    describe(): any[] {
        let definition = (this.parent) ? this.parent.describe() : [];
        return definition;
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        return (util.inspect(this.describe(), false, null));
    }

    /**
     * Combine the given pipeline with this one. The resulting object structure is a simple linked list.
     * /!\ the provided pipeline MUST NOT be reused somewhere else. The `parent` property can be assigned only once.
     * 
     * @param pipeline The pipeline to link with this one
     */
    pipe<N extends Partial<T>, NReadQuery, NReadOptions, NReadWrapper, NCreateQuery, NCreateOptions, NUpdateQuery, NUpdateOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateQuery, NCreateOptions, NUpdateQuery, NUpdateOptions, NDeleteQuery, NDeleteOptions>) {
        if (pipeline.parent) {
            throw new Error("Pipeline Error: The provided pipeline is already attached to an existing parent pipeline")
        }
        pipeline.parent = this;
        // cast the pipeline and combine all interfaces
        var chainedPipeline: PipelineAbstract<T, ReadQuery & NReadQuery, ReadOptions & NReadOptions, ReadWrapper & NReadWrapper, CreateQuery & NCreateQuery, CreateOptions & NCreateOptions, UpdateQuery & NUpdateQuery, UpdateOptions & NUpdateOptions, DeleteQuery & NDeleteQuery, DeleteOptions & NDeleteOptions> = <any>pipeline;
        return chainedPipeline;
    }

    /**
     * Project the current pipeline changing the underlying data structure.
     * /!\ the provided projection MUST NOT be reused somewhere else. The `parent` property can be assigned only once. 
     * 
     * @param pipeline The pipeline to link with this one
     */
    project<N extends Partial<T>, NReadQuery, NReadOptions, NReadWrapper, NCreateQuery, NCreateOptions, NUpdateQuery, NUpdateOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineProjectionAbstract<T, N, ReadQuery, ReadOptions, ReadWrapper, CreateQuery, CreateOptions, UpdateQuery, UpdateOptions, DeleteQuery, DeleteOptions, NReadQuery, NReadOptions, NReadWrapper, NCreateQuery, NCreateOptions, NUpdateQuery, NUpdateOptions, NDeleteQuery, NDeleteOptions>): PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateQuery, NCreateOptions, NUpdateQuery, NUpdateOptions, NDeleteQuery, NDeleteOptions> {
        if (pipeline.parent) {
            throw new Error("Pipeline Error: The provided pipeline is already attached to an existing parent pipeline")
        }
        pipeline.parent = this;
        return pipeline
    }

}

/**
 * Type definition of a Projection Pipeline. It has to be used when the pipeline fondamentaly changes the nature of the data it provides : T -> N
 */
export abstract class PipelineProjectionAbstract<T, N, ReadQuery = {}, ReadOptions = {}, ReadWrapper = { results: T[] }, CreateQuery = {}, CreateOptions = {}, UpdateQuery = {}, UpdateOptions = {}, DeleteQuery = {}, DeleteOptions = {}, NReadQuery = ReadQuery, NReadOptions = ReadOptions, NReadWrapper = { results: N[] }, NCreateQuery = CreateQuery, NCreateOptions = CreateOptions, NUpdateQuery = UpdateQuery, NUpdateOptions = UpdateOptions, NDeleteQuery = DeleteQuery, NDeleteOptions = DeleteOptions> extends PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateQuery, NCreateOptions, NUpdateQuery, NUpdateOptions, NDeleteQuery, NDeleteOptions> {

}

/**
 * Base class for a source pipeline. A source pipeline is supposed to be the first of the list. The one that directly connects to the data source to make actions persistent.
 */
export abstract class PipelineSourceAbstract<T, ReadQuery = Partial<T>, ReadOptions = {}, ReadWrapper = { results: T[] }, CreateQuery = Partial<T>, CreateOptions = {}, UpdateQuery = Partial<T>, UpdateOptions = {}, DeleteQuery = Partial<T>, DeleteOptions = {}> extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateQuery, CreateOptions, UpdateQuery, UpdateOptions, DeleteQuery, DeleteOptions> {

}