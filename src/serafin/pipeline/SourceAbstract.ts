import { notImplementedError } from "../error/Error"
import { PipelineAbstract } from './Abstract';
import { ReadWrapperInterface, ResourceIdentityInterface } from './schema/ResourceInterfaces';
import { PipelineSchemaModel } from './schema/Model'

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
    constructor(modelSchema: PipelineSchemaModel<T, ReadQuery, CreateResources, UpdateValues, PatchQuery, PatchValues, DeleteQuery>) {
        super();
        this.parent = null;
        this.modelSchema = modelSchema;
        this.modelSchema.setImplementedMethods(PipelineAbstract.getCRUDMethods().filter((methodName) => !Object.getOwnPropertyDescriptor(this[methodName], METHOD_NOT_IMPLEMENTED)));
    }

    @PipelineSourceAbstract.notImplemented
    protected async _read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _create(resources: CreateResources[], options?: CreateOptions): Promise<T[]> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<T> {
        throw notImplementedError("update", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<T[]> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
    }

    private static notImplemented(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value[METHOD_NOT_IMPLEMENTED] = true;
    }
}
