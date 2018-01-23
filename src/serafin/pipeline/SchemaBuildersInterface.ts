import { SchemaBuilder } from "@serafin/schema-builder";

export interface SchemaBuildersInterface {
    schemaBuilders: {
        // Likely related to the model
        readQuery: SchemaBuilder<any>,
        createValues: SchemaBuilder<any>,
        updateValues: SchemaBuilder<any>,
        patchQuery: SchemaBuilder<any>,
        patchValues: SchemaBuilder<any>,
        deleteQuery: SchemaBuilder<any>,

        // Likely unrelated to the model
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

    modelSchemaBuilder: SchemaBuilder<any>;
}