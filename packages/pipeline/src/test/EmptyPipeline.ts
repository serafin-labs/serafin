import { PipelineAbstract } from "../PipelineAbstract"
import { IdentityInterface } from "../IdentityInterface"

export class EmptyPipeline<
    M extends IdentityInterface,
    CV = {},
    CO = {},
    CM = {},
    RQ = {},
    RO = {},
    RM = {},
    UV = {},
    UO = {},
    UM = {},
    PQ = {},
    PV = {},
    PO = {},
    PM = {},
    DQ = {},
    DO = {},
    DM = {},
    R = {},
> extends PipelineAbstract<M, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM, R> {}
