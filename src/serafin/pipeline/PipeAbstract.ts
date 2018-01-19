import { PipelineAbstract } from "./PipelineAbstract";
import { IdentityInterface } from "./IdentityInterface";
import { SchemaBuilderHolder } from "./SchemaBuilderHolder";
import { SchemaBuilder } from "@serafin/schema-builder";

const PIPELINE = Symbol("Pipeline");

export interface PipeAbstract<T = {}, ReadOptions = {}, ReadWrapper ={},
    CreateOptions = {}, CreateWrapper = {},
    UpdateOptions = {}, UpdateWrapper = {},
    PatchOptions = {}, PatchWrapper = {},
    DeleteOptions = {}, DeleteWrapper = {}> {

    create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any>;
    read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any>;
    update(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any>;
    patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any>;
    delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any>;
}

export abstract class PipeAbstract<T, ReadOptions, ReadWrapper,
    CreateOptions, CreateWrapper,
    UpdateOptions, UpdateWrapper,
    PatchOptions, PatchWrapper,
    DeleteOptions, DeleteWrapper>

    extends SchemaBuilderHolder<T, ReadOptions, ReadWrapper,
    CreateOptions, CreateWrapper,
    UpdateOptions, UpdateWrapper,
    PatchOptions, PatchWrapper,
    DeleteOptions, DeleteWrapper> {

    get pipeline(): PipelineAbstract {
        if (!this[PIPELINE]) {
            throw Error("No associated pipeline");
        }

        return this[PIPELINE];
    }
}
