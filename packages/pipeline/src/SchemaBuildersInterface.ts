import { SchemaBuilder } from "@serafin/schema-builder"
import { IdentityInterface } from "./IdentityInterface"

export interface SchemaBuildersInterface<
    M extends IdentityInterface = IdentityInterface,
    CV = any,
    CO = any,
    RQ = any,
    PQ = any,
    PV = any,
    DQ = any,
    CM = any,
    RM = any,
    PM = any,
    DM = any,
    CTX = any,
> {
    model: SchemaBuilder<M>
    createValues: SchemaBuilder<CV>
    createOptions: SchemaBuilder<CO>
    readQuery: SchemaBuilder<RQ>
    patchQuery: SchemaBuilder<PQ>
    patchValues: SchemaBuilder<PV>
    deleteQuery: SchemaBuilder<DQ>
    createMeta: SchemaBuilder<CM>
    readMeta: SchemaBuilder<RM>
    patchMeta: SchemaBuilder<PM>
    deleteMeta: SchemaBuilder<DM>
    context: SchemaBuilder<CTX>
}

export const schemaBuildersInterfaceKeys = [
    "model",
    "createValues",
    "createOptions",
    "readQuery",
    "patchQuery",
    "patchValues",
    "deleteQuery",
    "createMeta",
    "readMeta",
    "patchMeta",
    "deleteMeta",
    "context",
] as const

export function defaultSchemaBuilders<M extends IdentityInterface>(modelSchemaBuilder: SchemaBuilder<M>) {
    return {
        model: modelSchemaBuilder,
        createValues: modelSchemaBuilder.setOptionalProperties(["id"]),
        createOptions: SchemaBuilder.emptySchema(),
        readQuery: modelSchemaBuilder.transformPropertiesToArray().toOptionals(),
        patchQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
        patchValues: modelSchemaBuilder.omitProperties(["id"]).toNullable().toDeepOptionals(),
        deleteQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
        readMeta: SchemaBuilder.emptySchema(),
        createMeta: SchemaBuilder.emptySchema(),
        patchMeta: SchemaBuilder.emptySchema(),
        deleteMeta: SchemaBuilder.emptySchema(),
        context: SchemaBuilder.emptySchema(),
    }
}
