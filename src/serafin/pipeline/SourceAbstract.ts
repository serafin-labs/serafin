import { notImplementedError } from "../error/Error"
import { PipelineAbstract } from './Abstract';
import { Omit, DeepPartial, SchemaBuilder } from "@serafin/schema-builder";

const METHOD_NOT_IMPLEMENTED = Symbol("Not Implemented");

export type Query<T> = {[P in keyof T]: T[P] | T[P][]};

export interface IdentityInterface { id: string }

/**
 * Base class for a source pipeline. A source pipeline is supposed to be the initial pipeline, 
 * that directly connects to the data source to make actions persistent.
 */
export class PipelineSourceAbstract<
    T extends IdentityInterface,
    ReadQuery = Partial<Query<Omit<T, "id">>>,
    ReadOptions = {},
    ReadWrapper = {},
    CreateValues = Omit<T, "id">,
    CreateOptions = {},
    CreateWrapper = {},
    UpdateValues = Omit<T, "id">,
    UpdateOptions = {},
    UpdateWrapper = {},
    PatchQuery = Query<Pick<T, "id">>,
    PatchValues = DeepPartial<Omit<T, "id">>,
    PatchOptions = {},
    PatchWrapper = {},
    DeleteQuery = Query<Pick<T, "id">>,
    DeleteOptions = {},
    DeleteWrapper = {}
    >
    extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper>
{
    constructor(model: SchemaBuilder<T>, {
        readQuery = model.clone().omitProperties(["id"]).transformPropertiesToArray().toOptionals().flatType(),
        createValues = model.clone().omitProperties(["id"]).flatType(),
        updateValues = model.clone().omitProperties(["id"]).flatType(),
        patchQuery = model.clone().pickProperties(["id"]).transformPropertiesToArray().flatType(),
        patchValues = model.clone().omitProperties(["id"]).toDeepOptionals().flatType(),
        deleteQuery = model.clone().pickProperties(["id"]).transformPropertiesToArray().flatType()
}: {
            readQuery?: SchemaBuilder<ReadQuery>,
            createValues?: SchemaBuilder<CreateValues>,
            updateValues?: SchemaBuilder<UpdateValues>,
            patchQuery?: SchemaBuilder<PatchQuery>,
            patchValues?: SchemaBuilder<PatchValues>,
            deleteQuery?: SchemaBuilder<DeleteQuery>
        }) {
        super();
        this.parent = null;
        this._modelSchemaBuilder = model;
        this._readQuerySchemaBuilder = readQuery as any;
        this._createValuesSchemaBuilder = createValues as any;
        this._updateValuesSchemaBuilder = updateValues as any;
        this._patchQuerySchemaBuilder = patchQuery as any;
        this._patchValuesSchemaBuilder = patchValues as any;
        this._deleteQuerySchemaBuilder = deleteQuery as any;
    }
    /**
     * Attach this pipeline to the given parent.
     */
    protected attach(pipeline: PipelineAbstract) {
        throw new Error(`Pipeline Error: A PipelineSource can't be attached to another pipeline.`)
    }

    @PipelineSourceAbstract.notImplemented
    protected async _read(query?: ReadQuery, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _create(resources: CreateValues[], options?: CreateOptions): Promise<{ data: T[] } & CreateWrapper> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _update(id: string, values: UpdateValues, options?: UpdateOptions): Promise<{ data: T } & UpdateWrapper> {
        throw notImplementedError("update", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _patch(query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    @PipelineSourceAbstract.notImplemented
    protected async _delete(query: DeleteQuery, options?: DeleteOptions): Promise<{ data: T[] } & DeleteWrapper> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
    }

    private static notImplemented(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        descriptor.value[METHOD_NOT_IMPLEMENTED] = true;
    }

    protected get isAttachedToSource() { return true }
}