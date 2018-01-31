import { PipelineAbstract } from "./PipelineAbstract";
import { SchemaBuildersInterface, PartialSchemaBuilders, SchemaBuildersInterfaceMerger } from "./SchemaBuildersInterface";
import { SchemaBuilder } from "@serafin/schema-builder";
import { final } from "./Decorator/Final";

const PIPELINE = Symbol("Pipeline");

export interface PipeAbstract {
    create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any>;
    read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any>;
    update(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any>;
    patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any>;
    delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any>;
}

export abstract class PipeAbstract {
    @final resolveSchemaBuilders<S extends SchemaBuildersInterface['schemaBuilders']>(s: S) {
        return SchemaBuildersInterfaceMerger.merge(s, this.schemaBuildersResolver);
    }

    get schemaBuilders() {
        return this.schemaBuildersResolver as this["schemaBuildersResolver"];
    }

    // schemaBuildersResolver: <newS extends PartialSchemaBuilders>(s: SchemaBuildersInterface['schemaBuilders']) => newS

    schemaBuildersResolver: (s: SchemaBuildersInterface['schemaBuilders']) => PartialSchemaBuilders

    get pipeline(): PipelineAbstract<any, any> {
        if (!this[PIPELINE]) {
            throw Error("No associated pipeline");
        }

        return this[PIPELINE];
    }
}
