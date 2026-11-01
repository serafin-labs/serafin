import { DeepPartial, Nullable, SchemaBuilder } from "@serafin/schema-builder"
import { IdentityInterface } from "./IdentityInterface.js"

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
    META = any,
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
    /**
     * Meta shared by every action. The meta an action returns is `META & CM | RM | PM | DM`,
     * so anything cross-cutting -- relations, timings, request identifiers -- is declared once.
     */
    meta: SchemaBuilder<META>
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
    "meta",
] as const

/**
 * The type of `patchValues`, named rather than inferred.
 *
 * `omitProperties().toNullable().toDeepOptionals()` infers a stack of homomorphic mapped types that
 * TypeScript cannot emit into a `.d.ts`: the declaration it writes references a type parameter of an
 * `infer` it did not carry over, so the published declarations do not compile for consumers. Naming
 * the result keeps the emit to this alias.
 */
export type DefaultPatchValues<M extends IdentityInterface> = DeepPartial<Nullable<Omit<M, "id">>>

export function defaultSchemaBuilders<M extends IdentityInterface>(modelSchemaBuilder: SchemaBuilder<M>) {
    const patchValues: SchemaBuilder<DefaultPatchValues<M>> = modelSchemaBuilder.omitProperties(["id"]).toNullable().toDeepOptionals()
    return {
        model: modelSchemaBuilder,
        createValues: modelSchemaBuilder.setOptionalProperties(["id"]),
        createOptions: SchemaBuilder.emptySchema(),
        readQuery: modelSchemaBuilder.transformPropertiesToArray().toOptionals(),
        patchQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
        patchValues,
        deleteQuery: modelSchemaBuilder.pickProperties(["id"]).transformPropertiesToArray(),
        readMeta: SchemaBuilder.emptySchema(),
        createMeta: SchemaBuilder.emptySchema(),
        patchMeta: SchemaBuilder.emptySchema(),
        deleteMeta: SchemaBuilder.emptySchema(),
        context: SchemaBuilder.emptySchema(),
        meta: SchemaBuilder.emptySchema(),
    }
}
