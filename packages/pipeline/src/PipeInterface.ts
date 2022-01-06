import { SchemaBuilder } from "@serafin/schema-builder"
import { IdentityInterface } from "./IdentityInterface"
import { PipeAbstract } from "./PipeAbstract"

export interface PipeInterface<
    M extends IdentityInterface = any,
    CV = any,
    CO = any,
    CM = any,
    RQ = any,
    RO = any,
    RM = any,
    UV = any,
    UO = any,
    UM = any,
    PQ = any,
    PV = any,
    PO = any,
    PM = any,
    DQ = any,
    DO = any,
    DM = any,
    M2 extends IdentityInterface = any,
    CV2 = any,
    CO2 = any,
    CM2 = any,
    RQ2 = any,
    RO2 = any,
    RM2 = any,
    UV2 = any,
    UO2 = any,
    UM2 = any,
    PQ2 = any,
    PV2 = any,
    PO2 = any,
    PM2 = any,
    DQ2 = any,
    DO2 = any,
    DM2 = any,
> extends PipeAbstract {
    schemaBuilderModel?: (s: SchemaBuilder<M>) => SchemaBuilder<M2>
    schemaBuilderCreateValues?: (s: SchemaBuilder<CV>) => SchemaBuilder<CV2>
    schemaBuilderCreateOptions?: (s: SchemaBuilder<CO>) => SchemaBuilder<CO2>
    schemaBuilderCreateMeta?: (s: SchemaBuilder<CM>) => SchemaBuilder<CM2>
    schemaBuilderReadQuery?: (s: SchemaBuilder<RQ>) => SchemaBuilder<RQ2>
    schemaBuilderReadOptions?: (s: SchemaBuilder<RO>) => SchemaBuilder<RO2>
    schemaBuilderReadMeta?: (s: SchemaBuilder<RM>) => SchemaBuilder<RM2>
    schemaBuilderReplaceValues?: (s: SchemaBuilder<UV>) => SchemaBuilder<UV2>
    schemaBuilderReplaceOptions?: (s: SchemaBuilder<UO>) => SchemaBuilder<UO2>
    schemaBuilderReplaceMeta?: (s: SchemaBuilder<UM>) => SchemaBuilder<UM2>
    schemaBuilderPatchQuery?: (s: SchemaBuilder<PQ>) => SchemaBuilder<PQ2>
    schemaBuilderPatchValues?: (s: SchemaBuilder<PV>) => SchemaBuilder<PV2>
    schemaBuilderPatchOptions?: (s: SchemaBuilder<PO>) => SchemaBuilder<PO2>
    schemaBuilderPatchMeta?: (s: SchemaBuilder<PM>) => SchemaBuilder<PM2>
    schemaBuilderDeleteQuery?: (s: SchemaBuilder<DQ>) => SchemaBuilder<DQ2>
    schemaBuilderDeleteOptions?: (s: SchemaBuilder<DO>) => SchemaBuilder<DO2>
    schemaBuilderDeleteMeta?: (s: SchemaBuilder<DM>) => SchemaBuilder<DM2>
}
