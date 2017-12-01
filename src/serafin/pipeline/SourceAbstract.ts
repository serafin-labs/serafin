import { notImplementedError } from "../error/Error"
import { PipelineAbstract } from './Abstract';
import { ResourceIdentityInterface } from './schema/ResourceInterfaces';
import { PipelineSchemaModel } from './schema/Model'

const METHOD_NOT_IMPLEMENTED = Symbol("Not Implemented");

export type Patch<T> = {[P in keyof T]?: T[P] | T[P][]};

/**
 * Base class for a source pipeline. A source pipeline is supposed to be the initial pipeline, 
 * that directly connects to the data source to make actions persistent.
 */
export abstract class PipelineSourceAbstract<
    T extends ResourceIdentityInterface,
    ReadQuery extends Patch<ResourceIdentityInterface> = Patch<T>,
    ReadOptions = {},
    ReadWrapper = {},
    CreateResources = Partial<T>,
    CreateOptions = {},
    UpdateValues = Partial<T>,
    UpdateOptions = {},
    PatchQuery extends Patch<ResourceIdentityInterface> = Patch<T>,
    PatchValues = Partial<T>,
    PatchOptions = {},
    DeleteQuery extends Patch<ResourceIdentityInterface> = Patch<T>,
    DeleteOptions = {}>
    extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateValues, UpdateOptions, PatchQuery, PatchValues, PatchOptions, DeleteQuery, DeleteOptions>
{
    constructor(modelSchema: PipelineSchemaModel<T, ReadQuery, CreateResources, UpdateValues, PatchQuery, PatchValues, DeleteQuery>) {
        super();
        this.parent = null;
        this.modelSchema = modelSchema;
        this.modelSchema.implementedMethods = PipelineAbstract.getCRUDMethods().filter((methodName) => !Object.getOwnPropertyDescriptor(this[methodName], METHOD_NOT_IMPLEMENTED));
    }
    /**
     * Attach this pipeline to the given parent.
     */
    protected attach(pipeline: PipelineAbstract) {
        throw new Error(`Pipeline Error: A PipelineSource can't be attached to another pipeline.`)
    }

    @PipelineSourceAbstract.notImplemented
    protected async _read(query?: ReadQuery, options?: ReadOptions): Promise<{ results: T[] } & ReadWrapper> {
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
