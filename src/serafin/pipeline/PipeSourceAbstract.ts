import { notImplementedError } from "../error/Error"
import { PipeAbstract } from './PipeAbstract';
import { Pipeline } from './Pipeline';
import { Omit, DeepPartial, SchemaBuilder } from "@serafin/schema-builder";
import { IdentityInterface } from './IdentityInterface'

export type Query<T> = {[P in keyof T]: T[P] | T[P][]};

/**
 * Base class for a source pipeline. A source pipeline is supposed to be the initial pipeline, 
 * that directly connects to the data source to make actions persistent.
 */
export class PipeSourceAbstract<
    T extends IdentityInterface,
    ReadQuery = Partial<Query<T>>,
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
    extends PipeAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper>
{
    constructor(model: SchemaBuilder<T>, {
        readQuery = model.clone().transformPropertiesToArray().toOptionals().flatType(),
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
        } = {}) {
        super();
        this.modelSchemaBuilder = model;
        this.readQuerySchemaBuilder = readQuery as any;
        this.createValuesSchemaBuilder = createValues as any;
        this.updateValuesSchemaBuilder = updateValues as any;
        this.patchQuerySchemaBuilder = patchQuery as any;
        this.patchValuesSchemaBuilder = patchValues as any;
        this.deleteQuerySchemaBuilder = deleteQuery as any;
    }

    async read(next, query?: ReadQuery, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
    }

    async create(next, resources: CreateValues[], options?: CreateOptions): Promise<{ data: T[] } & CreateWrapper> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    async update(next, id: string, values: UpdateValues, options?: UpdateOptions): Promise<{ data: T } & UpdateWrapper> {
        throw notImplementedError("update", Object.getPrototypeOf(this).constructor.name);
    }

    async patch(next, query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    async delete(next, query: DeleteQuery, options?: DeleteOptions): Promise<{ data: T[] } & DeleteWrapper> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
    }

    pipe<N, NReadQuery, NReadOptions, NReadWrapper, NCreateValues, NCreateOptions, NCreateWrapper, NUpdateValues, NUpdateOptions, NUpdateWrapper, NPatchQuery, NPatchValues, NPatchOptions, NPatchWrapper, NDeleteQuery, NDeleteOptions, NDeleteWrapper, NRelations>
        (pipe: PipeAbstract<N, NReadQuery, NReadOptions, NReadWrapper, NCreateValues, NCreateOptions, NCreateWrapper, NUpdateValues, NUpdateOptions, NUpdateWrapper, NPatchQuery, NPatchValues, NPatchOptions, NPatchWrapper, NDeleteQuery, NDeleteOptions, NDeleteWrapper>)
        // : Pipeline<T & N, ReadQuery & NReadQuery, ReadOptions & NReadOptions, ReadWrapper & NReadWrapper, CreateValues & NCreateValues, CreateOptions & NCreateOptions, CreateWrapper & NCreateWrapper, UpdateValues & NUpdateValues, UpdateOptions & NUpdateOptions, UpdateWrapper & NUpdateWrapper, PatchQuery & NPatchQuery, PatchValues & NPatchValues, PatchOptions & NPatchOptions, PatchWrapper & NPatchWrapper, DeleteQuery & NDeleteQuery, DeleteOptions & NDeleteOptions, DeleteWrapper & NDeleteWrapper, Relations>
        : any
        {
        return new Pipeline().pipe(this).pipe(pipe);
    }
}