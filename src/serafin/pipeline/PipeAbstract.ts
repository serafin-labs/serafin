import { PipelineAbstract } from "./PipelineAbstract";
import { IdentityInterface } from "./IdentityInterface";
import { SchemaBuilderHolder } from "./SchemaBuilderHolder";
import { SchemaBuilder } from "@serafin/schema-builder";

export interface PipeAbstract<T = {}, ReadQuery = {}, ReadOptions = {}, ReadWrapper ={},
    CreateValues = {}, CreateOptions = {}, CreateWrapper = {},
    UpdateValues = {}, UpdateOptions = {}, UpdateWrapper = {},
    PatchQuery = {}, PatchValues = {}, PatchOptions = {}, PatchWrapper = {},
    DeleteQuery = {}, DeleteOptions = {}, DeleteWrapper = {}> {

    create(next, resources: any[], options?: any): Promise<any>;
    read(next, query?: any, options?: any): Promise<any>;
    update(next, id: string, values: any, options?: any): Promise<any>;
    patch(next, query: any, values: any, options?: any): Promise<any>;
    delete(next, query: any, options?: any): Promise<any>;
}

export abstract class PipeAbstract<T, ReadQuery, ReadOptions, ReadWrapper,
    CreateValues, CreateOptions, CreateWrapper,
    UpdateValues, UpdateOptions, UpdateWrapper,
    PatchQuery, PatchValues, PatchOptions, PatchWrapper,
    DeleteQuery, DeleteOptions, DeleteWrapper>

    extends SchemaBuilderHolder<T, ReadQuery, ReadOptions, ReadWrapper,
    CreateValues, CreateOptions, CreateWrapper,
    UpdateValues, UpdateOptions, UpdateWrapper,
    PatchQuery, PatchValues, PatchOptions, PatchWrapper,
    DeleteQuery, DeleteOptions, DeleteWrapper> {

    protected pipeline;

    attach(pipeline: PipelineAbstract): void {
        this.pipeline = pipeline;
    }

    constructor({
        model = SchemaBuilder.emptySchema(),
        readQuery = model.clone().transformPropertiesToArray().toOptionals(),
        createValues = model.clone(),
        updateValues = model.clone(),
        patchQuery = model.clone().transformPropertiesToArray(),
        patchValues = model.clone().toDeepOptionals(),
        deleteQuery = model.clone().transformPropertiesToArray()
    }: {
            model?: SchemaBuilder<T>,
            readQuery?: SchemaBuilder<ReadQuery>,
            createValues?: SchemaBuilder<CreateValues>,
            updateValues?: SchemaBuilder<UpdateValues>,
            patchQuery?: SchemaBuilder<PatchQuery>,
            patchValues?: SchemaBuilder<PatchValues>,
            deleteQuery?: SchemaBuilder<DeleteQuery>
        } = {}) {

        super();

        this.modelSchemaBuilder = model as any;
        this.readQuerySchemaBuilder = readQuery as any;
        this.createValuesSchemaBuilder = createValues as any;
        this.updateValuesSchemaBuilder = updateValues as any;
        this.patchQuerySchemaBuilder = patchQuery as any;
        this.patchValuesSchemaBuilder = patchValues as any;
        this.deleteQuerySchemaBuilder = deleteQuery as any;
    }
}
