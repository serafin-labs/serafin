import { SchemaBuilder } from "@serafin/schema-builder"
import { IdentityInterface } from "./IdentityInterface"

export interface SchemaBuildersInterface<M, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM> {
    model: SchemaBuilder<M>
    createValues: SchemaBuilder<CV>
    createOptions: SchemaBuilder<CO>
    createMeta: SchemaBuilder<CM>
    readQuery: SchemaBuilder<RQ>
    readOptions: SchemaBuilder<RO>
    readMeta: SchemaBuilder<RM>
    replaceValues: SchemaBuilder<UV>
    replaceOptions: SchemaBuilder<UO>
    replaceMeta: SchemaBuilder<UM>
    patchQuery: SchemaBuilder<PQ>
    patchValues: SchemaBuilder<PV>
    patchOptions: SchemaBuilder<PO>
    patchMeta: SchemaBuilder<PM>
    deleteQuery: SchemaBuilder<DQ>
    deleteOptions: SchemaBuilder<DO>
    deleteMeta: SchemaBuilder<DM>
}

export function defaultSchemaBuilders<M extends IdentityInterface>(modelSchemaBuilder: SchemaBuilder<M>) {
    return {
        model: modelSchemaBuilder,
        createValues: modelSchemaBuilder.setOptionalProperties(["id"]),
        createOptions: SchemaBuilder.emptySchema(),
        createMeta: SchemaBuilder.emptySchema(),
        readQuery: modelSchemaBuilder.transformPropertiesToArray().toOptionals(),
        readOptions: SchemaBuilder.emptySchema(),
        readMeta: SchemaBuilder.emptySchema(),
        replaceValues: modelSchemaBuilder.omitProperties(["id"]),
        replaceOptions: SchemaBuilder.emptySchema(),
        replaceMeta: SchemaBuilder.emptySchema(),
        patchQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
        patchValues: modelSchemaBuilder.omitProperties(["id"]).toNullable().toDeepOptionals(),
        patchOptions: SchemaBuilder.emptySchema(),
        patchMeta: SchemaBuilder.emptySchema(),
        deleteQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
        deleteOptions: SchemaBuilder.emptySchema(),
        deleteMeta: SchemaBuilder.emptySchema(),
    }
}
