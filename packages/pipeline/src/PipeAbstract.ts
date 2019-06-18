import { PipelineAbstract } from "./PipelineAbstract";
import * as _ from "lodash";
import { SchemaBuilder } from "@serafin/schema-builder";

export const PIPELINE = Symbol("Pipeline");

export interface PipeAbstract {
    create(next: (resources: any[], options?: any) => Promise<any>, resources: any[], options?: any): Promise<any>;
    read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any>;
    replace(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any>;
    patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any>;
    delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any>;

    schemaBuilderModel?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderCreateValues?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderCreateOptions?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderCreateMeta?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderReadQuery?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderReadOptions?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderReadMeta?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderReplaceValues?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderReplaceOptions?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderReplaceMeta?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderPatchQuery?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderPatchValues?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderPatchOptions?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderPatchMeta?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderDeleteQuery?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderDeleteOptions?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
    schemaBuilderDeleteMeta?: (s: SchemaBuilder<any>) => SchemaBuilder<any>
}

export abstract class PipeAbstract {
    get pipeline(): PipelineAbstract<any> {
        if (!this[PIPELINE]) {
            throw Error("No associated pipeline");
        }

        return this[PIPELINE];
    }

    public clone() {
        const clonedPipe = _.clone(this);
        clonedPipe[PIPELINE] = undefined
        return clonedPipe
    }
}
