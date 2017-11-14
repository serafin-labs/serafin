
import { PipelineAbstract } from './Abstract';
import { ReadWrapperInterface, ResourceIdentityInterface } from './schema/Resource';
import { PipelineSchemaModel } from './schema/Model'

export { option } from './decorator/option'
export { description } from './decorator/description'
export { validate } from './decorator/validate'

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
    protected _pipelineSchema: PipelineSchemaModel<T>
    /**
     * The model schema of this pipeline. It is passed to the constructor.
     */
    public get modelSchema(): PipelineSchemaModel<T> {
        return this._pipelineSchema
    }

    constructor(schema: PipelineSchemaModel<T>) {
        super();
        this.parent = null;
        this._pipelineSchema = schema
        schema.setImplementedMethods(PipelineAbstract.getCRUDMethods().filter((methodName) => !Object.getOwnPropertyDescriptor(this[methodName], METHOD_NOT_IMPLEMENTED)));
    }

    @PipelineSourceAbstract.notImplemented
    async read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    async create(resources: CreateResources[], options?: CreateOptions): Promise<T[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    async update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<T> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    async patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<T[]> {
        throw new Error("Not implemented");
    }

    @PipelineSourceAbstract.notImplemented
    async delete(query: DeleteQuery, options?: DeleteOptions): Promise<T[]> {
        throw new Error("Not implemented");
    }

    private static notImplemented(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value[METHOD_NOT_IMPLEMENTED] = true;
    }
}
