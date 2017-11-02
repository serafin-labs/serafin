import * as Promise from 'bluebird';
import { PipelineSchemaHelper } from './schema/Helper';
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
        this.schemaHelper.setSourceDefaultMethods(model, PipelineAbstract.getCRUDMethods().filter((methodName) => !Object.getOwnPropertyDescriptor(this[methodName], METHOD_NOT_IMPLEMENTED)));
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
    update(query: Model.ResourcePartial<T>, values: UpdateValues, options?: UpdateOptions): Promise<Model.ResourceIdentified<T>[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    delete(query: Model.ResourcePartial<T>, options?: DeleteOptions): Promise<Model.ResourceIdentified<T>[]> {
        throw new Error("Not implemented");
    }

    private static notImplemented(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value[METHOD_NOT_IMPLEMENTED] = true;
    }
}
