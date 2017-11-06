import * as util from 'util';
import * as Promise from 'bluebird';
import * as Model from './model/Resource';
import * as jsonSchemaMergeAllOf from 'json-schema-merge-allof'
import { PipelineSchemaInterface } from './schema/Interface';
import { PipelineSchemaAllOfInterface } from './schema/AllOfInterface';
import { PipelineSchemaPropertiesInterface } from './schema/PropertiesInterface';
import { PipelineSchemaHelper } from './schema/Helper'
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
    protected schemaHelper: PipelineSchemaHelper;

    constructor() {
        this.initSchemaHelper();
    }

    protected initSchemaHelper() {
        this.schemaHelper = new PipelineSchemaHelper(Object.getPrototypeOf(this).constructor.name, Object.getPrototypeOf(this).constructor['description'] || undefined)
        let thisPrototype = Object.getPrototypeOf(this);

        for (const key of PipelineAbstract.getCRUDMethods()) {
            if (typeof Object.getOwnPropertyDescriptor(thisPrototype, key) != 'undefined') {
                let paramsDescriptor = Object.getOwnPropertyDescriptor(this[key], 'properties');
                if (paramsDescriptor && typeof(paramsDescriptor.value == 'object')) {
                //    this.schemaHelper.setMethodProperties(key, paramsDescriptor.value);
                }
               
                let descriptionDescriptor = Object.getOwnPropertyDescriptor(this[key], 'description');
                if (descriptionDescriptor) {
                    this.schemaHelper.setMethodDescription(key, descriptionDescriptor.value);
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
    schemasArray(): PipelineSchemaInterface[] {
        let schemas = (this.parent) ? this.parent.schemasArray() : [];
        schemas.push(this.schemaHelper.schema);
        return schemas;
    }

    schema(): PipelineSchemaAllOfInterface {
        return this.schemasArray().reduce(
            (acc: PipelineSchemaAllOfInterface, 
            val: PipelineSchemaInterface) => { acc.properties.allOf.push(val.properties); return acc; }, 
            { type: 'object', properties: {allOf: [] }});
    }

    fullSchema(): Object {
        console.log("allOfSchema", util.inspect(this.schema(), false, null));



let myscheme =                                                                                                                                                                       
 { type: 'object',                                                                                                                                         
  properties:                                                                                                                                                         
   { allOf:                                                                                                                                                           
      [                                                                                                                                                     
           { type: 'object',                                                                                                                                          
             properties:                                                                                                                                              
              { create:                                                                                                                                               
                 { type: 'object',                                                                                                                                    
                   properties:                                                                                                                                        
                    { resources:                                                                                                                                      
                       { type: 'array',                                                                                                                               
                         items: { '$ref': '#/definitions/model' },                                                                                                    
                         minItems: 1 } },                                                                                                                             
                   required: [ 'resources' ] },                                                                                                                       
                read:                                                                                                                                                 
                 { type: 'object',                                                                                                                                    
                   properties:                                                                                                                                        
                    { query:                                                                                                                                          
                       { type: 'object',                                                                                                                              
                         properties: { anyOf: { '$ref': '#/definitions/model' } } }  },                                                                              
                update:                                                                                                                                               
                 { type: 'object',                                                                                                                                    
                   properties:                                                                                                                                        
                    { query:                                                                                                                                          
                       { type: 'object',                                                                                                                              
                         properties: { anyOf: { '$ref': '#/definitions/model' } } },                                                                                  
                      values:                                                                                                                                         
                       { type: 'object',                                                                                                                              
                         properties: { anyOf: { '$ref': '#/definitions/model' } },                                                                                    
                         minProperties: 1 } },                                                                                                                        
                   required: [ 'query', 'values' ] },                                                                                                                 
                delete:                                                                                                                                               
                 { type: 'object',                                                                                                                                    
                   properties:                                                                                                                                        
                    { query:                                                                                                                                          
                       { type: 'object',                                                                                                                              
                         properties: { anyOf: { '$ref': '#/definitions/model' } } } },                                                                                
                   required: [ 'query' ] } } } },                                                                                                                     
        {  type: 'object',                                                                                                                                          
             properties:                                                                                                                                              
              { create:                                                                                                                                               
                 { type: 'object',                                                                                                                                    
                   properties: {},                                                                                                                                    
                   description: 'Sets the creation time' },                                                                                                           
                read:                                                                                                                                                 
                 { type: 'object',                                                                                                                                    
                   properties: {},                                                                                                                                    
                   description: 'Returns the creation and update time of each resource, and the latest creation and update time overall' },                           
                update:                                                                                                                                               
                 { type: 'object',                                                                                                                                    
                   properties: {},                                                                                                                                    
                   description: 'Sets the update time' } }  },                                                                                                       
        {  type: 'object',                                                                                                                                          
             properties:                                                                                                                                              
              { read:                                                                                                                                                 
                 { type: 'object',                                                                                                                                    
                   properties: {},                                                                                                                                    
                   description: 'Reads a limited count of results'  } } } ] } }                                                                                      
                                                                                                                                                                      

;



        return jsonSchemaMergeAllOf(this.schema());
    }

    public static getCRUDMethods() {
        return ['create', 'read', 'update', 'delete'];
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        return (util.inspect(this.fullSchema(), false, null));
    }

    /**
     * Combine the given pipeline with this one. The resulting object structure is a simple linked list.
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

    /**
     * Project the current pipeline changing the underlying data structure.
     * /!\ the provided projection MUST NOT be reused somewhere else. The `parent` property can be assigned only once. 
     * 
     * @param pipeline The pipeline to link with this one
     */
    projection<N extends Partial<T>, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>(pipeline: PipelineProjectionAbstract<T, N, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateQuery, UpdateValues, UpdateOptions, DeleteQuery, DeleteOptions, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions>): PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions> {
        if (pipeline.parent) {
            throw new Error("Pipeline Error: The provided pipeline is already attached to an existing parent pipeline")
        }
        pipeline.parent = this;
        return pipeline;
    }
}

/**
 * Type definition of a Projection Pipeline. It has to be used when the pipeline fondamentaly changes the nature of the data it provides : T -> N
 */
export abstract class PipelineProjectionAbstract<T, N, ReadQuery = {}, ReadOptions = {}, ReadWrapper = { results: T[] }, CreateResources = {}, CreateOptions = {}, UpdateQuery = {}, UpdateValues = {}, UpdateOptions = {}, DeleteQuery = {}, DeleteOptions = {}, NReadQuery = ReadQuery, NReadOptions = ReadOptions, NReadWrapper = { results: N[] }, NCreateResources = CreateResources, NCreateOptions = CreateOptions, NUpdateQuery = UpdateQuery, NUpdateValues = UpdateValues, NUpdateOptions = UpdateOptions, NDeleteQuery = DeleteQuery, NDeleteOptions = DeleteOptions> extends PipelineAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateResources, NCreateOptions, NUpdateQuery, NUpdateValues, NUpdateOptions, NDeleteQuery, NDeleteOptions> {

}