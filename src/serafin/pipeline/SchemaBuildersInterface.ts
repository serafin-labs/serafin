import { SchemaBuilder, Overwrite, Resolve } from "@serafin/schema-builder";

export class SchemaBuildersInterface {
    schemaBuilders: {
        model: SchemaBuilder<any>,
        readQuery: SchemaBuilder<any>,
        createValues: SchemaBuilder<any>,
        updateValues: SchemaBuilder<any>,
        patchQuery: SchemaBuilder<any>,
        patchValues: SchemaBuilder<any>,
        deleteQuery: SchemaBuilder<any>,
        readOptions: SchemaBuilder<any>,
        readWrapper: SchemaBuilder<any>,
        createOptions: SchemaBuilder<any>,
        createWrapper: SchemaBuilder<any>,
        updateOptions: SchemaBuilder<any>,
        updateWrapper: SchemaBuilder<any>,
        patchOptions: SchemaBuilder<any>,
        patchWrapper: SchemaBuilder<any>,
        deleteOptions: SchemaBuilder<any>,
        deleteWrapper: SchemaBuilder<any>
    }
}



type MergedSchema<T, U> = Resolve<Pick<T, ({
    [P in keyof T]: P;
} & {
        [P in keyof U]: never;
    } & {
        [x: string]: never;
    })[keyof T]>
    &
    Pick<U, ({
        [P in keyof U]: P;
    } & {
            [x: string]: never;
        })[keyof U]>>


let truc = { a: 1, b: 2, c: 3, d: 4 };
let truc2: { b: string, d: number } = { b: "hop", d: 4 };
type test = MergedSchema<typeof truc, typeof truc2>;

let truc3: {[P in keyof Partial<typeof truc>]: any  } = { b: "hop", d: 4 };
type test2 = MergedSchema<typeof truc, typeof truc2>;
let truc4 = Object.assign(truc, truc2);

export type PartialSchemaBuilders = {[P in keyof Partial<SchemaBuildersInterface["schemaBuilders"]>]: SchemaBuilder<any>  }

export class SchemaBuildersInterfaceMerger<S extends SchemaBuildersInterface["schemaBuilders"]> {
    constructor(public schema: S) { }
    mergeSchema<R extends PartialSchemaBuilders>(callback: (schema: this["schema"]) => R) {
        let callbackType = (false as true) && callback(this.schema);
        let mergedSchema = Object.assign(this.schema, callback(this.schema));
        return mergedSchema as MergedSchema<this["schema"], typeof callbackType>;
    }

    static merge<T extends SchemaBuildersInterface["schemaBuilders"], R extends PartialSchemaBuilders>
        (schema: T, callback: (schema: T) => R) {
        let merger = new SchemaBuildersInterfaceMerger(schema);
        return merger.mergeSchema(callback);
    }
}

