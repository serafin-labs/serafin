import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { SchemaBuilder } from "@serafin/schema-builder";

export interface PipeInterface<S extends SchemaBuildersInterface = any, M = any, CV= any, CO= any, CW= any,
    RQ= any, RO= any, RW= any, UV= any, UO= any, UW= any, PQ= any, PV= any, PO= any, PW= any, DQ= any, DO= any, DW= any> {

    schemaBuilderModel?: (s: S["model"]) => SchemaBuilder<M>
    schemaBuilderCreateValues?: (s: S["createValues"]) => SchemaBuilder<CV>
    schemaBuilderCreateOptions?: (s: S["createOptions"]) => SchemaBuilder<CO>
    schemaBuilderCreateWrapper?: (s: S["createWrapper"]) => SchemaBuilder<CW>
    schemaBuilderReadQuery?: (s: S["readQuery"]) => SchemaBuilder<RQ>
    schemaBuilderReadOptions?: (s: S["readOptions"]) => SchemaBuilder<RO>
    schemaBuilderReadWrapper?: (s: S["readWrapper"]) => SchemaBuilder<RW>
    schemaBuilderUpdateValues?: (s: S["updateValues"]) => SchemaBuilder<UV>
    schemaBuilderUpdateOptions?: (s: S["updateOptions"]) => SchemaBuilder<UO>
    schemaBuilderUpdateWrapper?: (s: S["updateWrapper"]) => SchemaBuilder<UW>
    schemaBuilderPatchQuery?: (s: S["patchQuery"]) => SchemaBuilder<PQ>
    schemaBuilderPatchValues?: (s: S["patchValues"]) => SchemaBuilder<PV>
    schemaBuilderPatchOptions?: (s: S["patchOptions"]) => SchemaBuilder<PO>
    schemaBuilderPatchWrapper?: (s: S["patchWrapper"]) => SchemaBuilder<PW>
    schemaBuilderDeleteQuery?: (s: S["deleteQuery"]) => SchemaBuilder<DQ>
    schemaBuilderDeleteOptions?: (s: S["deleteOptions"]) => SchemaBuilder<DO>
    schemaBuilderDeleteWrapper?: (s: S["deleteWrapper"]) => SchemaBuilder<DW>
}