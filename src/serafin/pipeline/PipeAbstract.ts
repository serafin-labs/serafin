import { PipelineAbstract } from "./PipelineAbstract";
import { IdentityInterface } from "./IdentityInterface";
import { SchemaBuilderHolder } from "./SchemaBuilderHolder";

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
}
