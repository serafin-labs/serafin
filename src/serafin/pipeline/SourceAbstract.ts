import * as Promise from 'bluebird';
import { PipelineAbstract } from './Abstract';
import { SchemaInterface } from './model/SchemaInterface';
import { ReadWrapperInterface, ResourceIdentityInterface } from './model/Resource';

export { option, description } from './Decorators'

const METHOD_NOT_IMPLEMENTED = Symbol("Not Implemented");

/**
 * Base class for a source pipeline. A source pipeline is supposed to be the initial pipeline, 
 * that directly connects to the data source to make actions persistent.
 */
export abstract class PipelineSourceAbstract<
    T extends ResourceIdentityInterface,
    ReadQuery extends Partial<ResourceIdentityInterface> = Partial<T>,
    ReadOptions = {},
    ReadWrapper extends ReadWrapperInterface<T> = ReadWrapperInterface<T>,
    CreateResources = Partial<T>,
    CreateOptions = {},
    UpdateValues = Partial<T>,
    UpdateOptions = {},
    PatchQuery extends Partial<ResourceIdentityInterface> = Partial<T>,
    PatchValues = Partial<T>,
    PatchOptions = {},
    DeleteQuery extends Partial<ResourceIdentityInterface> = Partial<T>,
    DeleteOptions = {}>
    extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateValues, UpdateOptions, PatchQuery, PatchValues, PatchOptions, DeleteQuery, DeleteOptions>
{
    constructor(schema: SchemaInterface) {
        super();
        this.parent = null;

        this.schema['definitions'] = { model: schema };
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
    read(query: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    create(resources: CreateResources[], options?: CreateOptions): Promise<T[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<T> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<T[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]> {
        throw new Error("Not implemented");
    }

    private static notImplemented(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value[METHOD_NOT_IMPLEMENTED] = true;
    }
}
