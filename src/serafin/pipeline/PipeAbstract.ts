import { PipelineAbstract } from "./PipelineAbstract";
import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { SchemaBuilder } from "@serafin/schema-builder";

const PIPELINE = Symbol("Pipeline");

export interface PipeAbstract<M = {},
    S extends SchemaBuildersInterface['schemaBuilders']= PipeAbstract<M, null>["defaultSchema"]> {
    create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any>;
    read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any>;
    update(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any>;
    patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any>;
    delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any>;
}

export abstract class PipeAbstract<M = {},
    S extends SchemaBuildersInterface['schemaBuilders']= PipeAbstract<M, null>["defaultSchema"]> implements SchemaBuildersInterface {

    constructor(public modelSchemaBuilder: SchemaBuilder<M> = null, public schemaBuilders: S = null) {
        if (modelSchemaBuilder == null) {
            this.modelSchemaBuilder = SchemaBuilder.emptySchema() as any;
        }

        if (schemaBuilders == null) {
            this.schemaBuilders = this.defaultSchema as any;
        }
    }

    private defaultSchema = {
        readQuery: this.modelSchemaBuilder.clone().transformPropertiesToArray().toOptionals(),
        readOptions: SchemaBuilder.emptySchema(),
        readWrapper: SchemaBuilder.emptySchema(),
        createValues: this.modelSchemaBuilder.clone(),
        createOptions: SchemaBuilder.emptySchema(),
        createWrapper: SchemaBuilder.emptySchema(),
        updateValues: this.modelSchemaBuilder.clone(),
        updateOptions: SchemaBuilder.emptySchema(),
        updateWrapper: SchemaBuilder.emptySchema(),
        patchQuery: this.modelSchemaBuilder.clone().transformPropertiesToArray(),
        patchValues: this.modelSchemaBuilder.clone().toDeepOptionals(),
        patchOptions: SchemaBuilder.emptySchema(),
        patchWrapper: SchemaBuilder.emptySchema(),
        deleteQuery: this.modelSchemaBuilder.transformPropertiesToArray(),
        deleteOptions: SchemaBuilder.emptySchema(),
        deleteWrapper: SchemaBuilder.emptySchema()
    }

    get pipeline(): PipelineAbstract {
        if (!this[PIPELINE]) {
            throw Error("No associated pipeline");
        }

        return this[PIPELINE];
    }
}
