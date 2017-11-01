import * as Promise from 'bluebird';
import { PipelineAbstract } from './Abstract';
import * as Model from './model/Resource';

export { option, description } from './Decorators'

const METHOD_NOT_IMPLEMENTED = Symbol("Not Implemented");

/**
 * Base class for a source pipeline. A source pipeline is supposed to be the initial pipeline, 
 * that directly connects to the data source to make actions persistent.
 */
export abstract class PipelineSourceAbstract<T,
    ReadQuery = Model.ResourcePartial<T>,
    ReadOptions = {},
    ReadWrapper = { results: Model.ResourceIdentified<T>[] },
    CreateResources = Model.Resource<T>[],
    CreateOptions = {},
    UpdateQuery = Model.ResourcePartial<T>,
    UpdateValues = Model.ResourcePartial<T>,
    UpdateOptions = {},
    DeleteQuery = Model.ResourcePartial<T>,
    DeleteOptions = {}>
    extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateQuery, UpdateValues, UpdateOptions, DeleteQuery, DeleteOptions>
{
    constructor(model: Model.Definition & { Resource: { new(): T } }) {
        super();
        this.parent = null;

        this.schema['definitions'] = { model: model.schema };
        this.schema['properties'] = {
            description: null,
            methods: { type: 'object', properties: {} }
        };

        for (const key of PipelineAbstract.getCRUDMethods()) {
            if (Object.getOwnPropertyDescriptor(this[key], METHOD_NOT_IMPLEMENTED)) {
                delete (this.schema.properties['methods']['properties'][key]);
            } else if (key == 'create') {
                this.schema.properties['methods']['properties'][key] = {
                    'properties': { 'resource': { "$ref": "#/definitions/model" } }, 'required': ['resource']
                };
            } else if (key == 'read' || key == 'delete') {
                this.schema.properties['methods']['properties'][key] = {
                    'properties': {
                        'query': { "anyOf": { "$ref": "#/definitions/model" } }
                    }
                };
            } else if (key == 'update') {
                this.schema.properties['methods']['properties'][key] = {
                    'properties': {
                        'query': { "anyOf": { "$ref": "#/definitions/model" } },
                        'values': { "anyOf": { "$ref": "#/definitions/model/properties" } }
                    }
                };
            }
        }
    }

    @PipelineSourceAbstract.notImplemented
    read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    create(resources: CreateResources, options?: CreateOptions): Promise<Model.ResourceIdentified<T>[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    update(query: Model.ResourcePartial<T>, values: UpdateValues, options?: {}): Promise<Model.ResourceIdentified<T>[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    delete(query: Model.ResourcePartial<T>, options?: {}): Promise<Model.ResourceIdentified<T>[]> {
        throw new Error("Not implemented");
    }

    private static notImplemented(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value[METHOD_NOT_IMPLEMENTED] = true;
    }
}
