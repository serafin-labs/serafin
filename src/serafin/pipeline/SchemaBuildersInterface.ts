import { SchemaBuilder } from "@serafin/schema-builder";
import { IdentityInterface } from "./IdentityInterface";

export interface SchemaBuildersInterface<M extends IdentityInterface = { id: string }, CV = {}, CO = {}, CW = {}, RQ = {}, RO = {}, RW = {},
    UV = {}, UO = {}, UW = {}, PQ = {}, PV = {}, PO = {}, PW = {}, DQ = {}, DO = {}, DW = {}> {
    model?: SchemaBuilder<M>,
    createValues?: SchemaBuilder<CV>,
    createOptions?: SchemaBuilder<CO>,
    createWrapper?: SchemaBuilder<CW>,
    readQuery?: SchemaBuilder<RQ>,
    readOptions?: SchemaBuilder<RO>,
    readWrapper?: SchemaBuilder<RW>,
    replaceValues?: SchemaBuilder<UV>,
    replaceOptions?: SchemaBuilder<UO>,
    replaceWrapper?: SchemaBuilder<UW>,
    patchQuery?: SchemaBuilder<PQ>,
    patchValues?: SchemaBuilder<PV>,
    patchOptions?: SchemaBuilder<PO>,
    patchWrapper?: SchemaBuilder<PW>,
    deleteQuery?: SchemaBuilder<DQ>,
    deleteOptions?: SchemaBuilder<DO>,
    deleteWrapper?: SchemaBuilder<DW>
}