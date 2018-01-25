import { PipelineAbstract } from "./PipelineAbstract";
import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { SchemaBuilder } from "@serafin/schema-builder";

const PIPELINE = Symbol("Pipeline");

export interface PipeAbstract<M = {},
    S extends SchemaBuildersInterface['schemaBuilders']= PipeAbstract<M, null>["defaultSchemaType"]> {
    create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any>;
    read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any>;
    update(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any>;
    patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any>;
    delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any>;
}


export abstract class PipeAbstract<M = {},
    S extends SchemaBuildersInterface['schemaBuilders']= PipeAbstract<M, null>["defaultSchemaType"]> implements SchemaBuildersInterface {

    constructor(public modelSchemaBuilder: SchemaBuilder<M> = null, public schemaBuilders: S = null) {
        if (modelSchemaBuilder == null) {
            this.modelSchemaBuilder = SchemaBuilder.emptySchema() as any;
        }

        if (schemaBuilders == null) {
            this.schemaBuilders = this.defaultSchema(this.modelSchemaBuilder) as any;
        }
    }

    extend<newS extends Partial<SchemaBuildersInterface["schemaBuilders"]>>(func: (model: SchemaBuilder<M>, sch: this["schemaBuilders"]) => newS) {
        return Object.assign(this.schemaBuilders, func(this.modelSchemaBuilder, this.schemaBuilders));
    }

    private defaultSchemaType = (false as true) && this.defaultSchema(this.modelSchemaBuilder);
    private defaultSchema(modelSchemaBuilder: SchemaBuilder<M>) {
        return {
            readQuery: modelSchemaBuilder.clone().transformPropertiesToArray().toOptionals(),
            readOptions: SchemaBuilder.emptySchema(),
            readWrapper: SchemaBuilder.emptySchema(),
            createValues: modelSchemaBuilder.clone(),
            createOptions: SchemaBuilder.emptySchema(),
            createWrapper: SchemaBuilder.emptySchema(),
            updateValues: modelSchemaBuilder.clone(),
            updateOptions: SchemaBuilder.emptySchema(),
            updateWrapper: SchemaBuilder.emptySchema(),
            patchQuery: modelSchemaBuilder.clone().transformPropertiesToArray(),
            patchValues: modelSchemaBuilder.clone().toDeepOptionals(),
            patchOptions: SchemaBuilder.emptySchema(),
            patchWrapper: SchemaBuilder.emptySchema(),
            deleteQuery: modelSchemaBuilder.transformPropertiesToArray(),
            deleteOptions: SchemaBuilder.emptySchema(),
            deleteWrapper: SchemaBuilder.emptySchema()
        }
    }

    get pipeline(): PipelineAbstract<any, any> {
        if (!this[PIPELINE]) {
            throw Error("No associated pipeline");
        }

        return this[PIPELINE];
    }
}
