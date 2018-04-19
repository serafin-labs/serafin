import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { SchemaBuilder } from "@serafin/schema-builder";

export interface PipeInterface<S extends SchemaBuildersInterface = any, M = any, CV= any, CO= any, CM= any,
    RQ= any, RO= any, RM= any, UV= any, UO= any, UM= any, PQ= any, PV= any, PO= any, PM= any, DQ= any, DO= any, DM= any, PR= {}> {

    schemaBuilderModel?: (s: S["model"]) => SchemaBuilder<M>
    schemaBuilderCreateValues?: (s: S["createValues"]) => SchemaBuilder<CV>
    schemaBuilderCreateOptions?: (s: S["createOptions"]) => SchemaBuilder<CO>
    schemaBuilderCreateMeta?: (s: S["createMeta"]) => SchemaBuilder<CM>
    schemaBuilderReadQuery?: (s: S["readQuery"]) => SchemaBuilder<RQ>
    schemaBuilderReadOptions?: (s: S["readOptions"]) => SchemaBuilder<RO>
    schemaBuilderReadMeta?: (s: S["readMeta"]) => SchemaBuilder<RM>
    schemaBuilderReplaceValues?: (s: S["replaceValues"]) => SchemaBuilder<UV>
    schemaBuilderReplaceOptions?: (s: S["replaceOptions"]) => SchemaBuilder<UO>
    schemaBuilderReplaceMeta?: (s: S["replaceMeta"]) => SchemaBuilder<UM>
    schemaBuilderPatchQuery?: (s: S["patchQuery"]) => SchemaBuilder<PQ>
    schemaBuilderPatchValues?: (s: S["patchValues"]) => SchemaBuilder<PV>
    schemaBuilderPatchOptions?: (s: S["patchOptions"]) => SchemaBuilder<PO>
    schemaBuilderPatchMeta?: (s: S["patchMeta"]) => SchemaBuilder<PM>
    schemaBuilderDeleteQuery?: (s: S["deleteQuery"]) => SchemaBuilder<DQ>
    schemaBuilderDeleteOptions?: (s: S["deleteOptions"]) => SchemaBuilder<DO>
    schemaBuilderDeleteMeta?: (s: S["deleteMeta"]) => SchemaBuilder<DM>

    relations?: PR
}