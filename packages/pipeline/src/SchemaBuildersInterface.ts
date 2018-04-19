import { SchemaBuilder } from "@serafin/schema-builder";
import { IdentityInterface } from "./IdentityInterface";

export interface SchemaBuildersInterface<M extends IdentityInterface = { id: string }, CV = {}, CO = {}, CM = {}, RQ = {}, RO = {}, RM = {},
    UV = {}, UO = {}, UM = {}, PQ = {}, PV = {}, PO = {}, PM = {}, DQ = {}, DO = {}, DM = {}> {
    model?: SchemaBuilder<M>,
    createValues?: SchemaBuilder<CV>,
    createOptions?: SchemaBuilder<CO>,
    createMeta?: SchemaBuilder<CM>,
    readQuery?: SchemaBuilder<RQ>,
    readOptions?: SchemaBuilder<RO>,
    readMeta?: SchemaBuilder<RM>,
    replaceValues?: SchemaBuilder<UV>,
    replaceOptions?: SchemaBuilder<UO>,
    replaceMeta?: SchemaBuilder<UM>,
    patchQuery?: SchemaBuilder<PQ>,
    patchValues?: SchemaBuilder<PV>,
    patchOptions?: SchemaBuilder<PO>,
    patchMeta?: SchemaBuilder<PM>,
    deleteQuery?: SchemaBuilder<DQ>,
    deleteOptions?: SchemaBuilder<DO>,
    deleteMeta?: SchemaBuilder<DM>
}