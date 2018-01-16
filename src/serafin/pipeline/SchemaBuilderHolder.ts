import { SchemaBuilder } from "@serafin/schema-builder";

export type SchemaBuilderNames = "modelSchemaBuilder" | "readQuerySchemaBuilder" | "readOptionsSchemaBuilder" | "readWrapperSchemaBuilder" | "createValuesSchemaBuilder" | "createOptionsSchemaBuilder" | "createWrapperSchemaBuilder" | "updateValuesSchemaBuilder" | "updateOptionsSchemaBuilder" | "updateWrapperSchemaBuilder" | "patchQuerySchemaBuilder" | "patchValuesSchemaBuilder" | "patchOptionsSchemaBuilder" | "patchWrapperSchemaBuilder" | "deleteQuerySchemaBuilder" | "deleteOptionsSchemaBuilder" | "deleteWrapperSchemaBuilder";

export abstract class SchemaBuilderHolder<T = {}, ReadQuery = {}, ReadOptions = {}, ReadWrapper = {}, CreateValues = {}, CreateOptions = {}, CreateWrapper = {}, UpdateValues = {}, UpdateOptions = {}, UpdateWrapper = {}, PatchQuery = {}, PatchValues = {}, PatchOptions = {}, PatchWrapper = {}, DeleteQuery = {}, DeleteOptions = {}, DeleteWrapper = {}, Relations = {}> {
    public static schemaBuilderNames: SchemaBuilderNames[] = ["modelSchemaBuilder", "readQuerySchemaBuilder", "readOptionsSchemaBuilder", "readWrapperSchemaBuilder", "createValuesSchemaBuilder", "createOptionsSchemaBuilder", "createWrapperSchemaBuilder", "updateValuesSchemaBuilder", "updateOptionsSchemaBuilder", "updateWrapperSchemaBuilder", "patchQuerySchemaBuilder", "patchValuesSchemaBuilder", "patchOptionsSchemaBuilder", "patchWrapperSchemaBuilder", "deleteQuerySchemaBuilder", "deleteOptionsSchemaBuilder", "deleteWrapperSchemaBuilder"];

    public modelSchemaBuilder?: SchemaBuilder<T>

    public readQuerySchemaBuilder?: SchemaBuilder<ReadQuery>
    public readOptionsSchemaBuilder?: SchemaBuilder<ReadOptions>
    public readWrapperSchemaBuilder?: SchemaBuilder<ReadWrapper>

    public createValuesSchemaBuilder?: SchemaBuilder<CreateValues>
    public createOptionsSchemaBuilder?: SchemaBuilder<CreateOptions>
    public createWrapperSchemaBuilder?: SchemaBuilder<CreateWrapper>

    public updateValuesSchemaBuilder?: SchemaBuilder<UpdateValues>
    public updateOptionsSchemaBuilder?: SchemaBuilder<UpdateOptions>;
    public updateWrapperSchemaBuilder?: SchemaBuilder<UpdateWrapper>;

    public patchQuerySchemaBuilder?: SchemaBuilder<PatchQuery>
    public patchValuesSchemaBuilder?: SchemaBuilder<PatchValues>
    public patchOptionsSchemaBuilder?: SchemaBuilder<PatchOptions>
    public patchWrapperSchemaBuilder?: SchemaBuilder<PatchWrapper>

    public deleteQuerySchemaBuilder?: SchemaBuilder<DeleteQuery>
    public deleteOptionsSchemaBuilder?: SchemaBuilder<DeleteOptions>
    public deleteWrapperSchemaBuilder?: SchemaBuilder<DeleteWrapper>
}