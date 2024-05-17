import { PipelineAbstract } from "./PipelineAbstract"
import * as _ from "lodash"
import { IdentityInterface } from "./IdentityInterface"
import { SchemaBuildersInterface } from "./SchemaBuildersInterface"
import { ResultsInterface } from "./ResultsInterface"
import { PipelineInterface } from "./PipelineInterface"

export interface PipePropsInterface<
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
> extends SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX> {}

export type PipeCreateNext<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any, CTX = any> = (
    resources: CV[],
    options: CO,
    context: CTX,
) => Promise<ResultsInterface<M, CM>>

export type PipeReadNext<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any> = (
    query: RQ,
    context: CTX,
) => Promise<ResultsInterface<M, RM>>

export type PipePatchNext<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any, CTX = any> = (
    query: PQ,
    values: PV,
    context: CTX,
) => Promise<ResultsInterface<M, PM>>

export type PipeDeleteNext<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any, CTX = any> = (
    query: DQ,
    context: CTX,
) => Promise<ResultsInterface<M, DM>>

export type PipeResultCreateAction<
    M extends IdentityInterface = IdentityInterface,
    CV = any,
    CO = any,
    CM = any,
    CTX = any,
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    CM2 = CM,
    CTX2 = CTX,
    RQ = any,
    PQ = any,
    PV = any,
    DQ = any,
    RM = any,
    PM = any,
    DM = any,
> = (
    next: PipeCreateNext<M, CV, CO, CM>,
    resources: CV2[],
    options: CO2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
) => Promise<ResultsInterface<M2, CM2>>

export type PipeResultReadAction<
    M extends IdentityInterface = IdentityInterface,
    RQ = any,
    RM = any,
    CTX = any,
    M2 extends IdentityInterface = M,
    RQ2 = RQ,
    RM2 = RM,
    CTX2 = CTX,
    CV = any,
    CO = any,
    PQ = any,
    PV = any,
    DQ = any,
    CM = any,
    PM = any,
    DM = any,
> = (
    next: PipeReadNext<M, RQ, RM>,
    query: RQ2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
) => Promise<ResultsInterface<M2, RM2>>

export type PipeResultPatchAction<
    M extends IdentityInterface = IdentityInterface,
    PV = any,
    PQ = any,
    PM = any,
    CTX = any,
    M2 extends IdentityInterface = M,
    PQ2 = PQ,
    PV2 = PV,
    PM2 = PM,
    CTX2 = CTX,
    CV = any,
    CO = any,
    RQ = any,
    DQ = any,
    CM = any,
    RM = any,
    DM = any,
> = (
    next: PipePatchNext<M, PQ, PV, PM>,
    query: PQ2,
    values: PV2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
) => Promise<ResultsInterface<M2, PM2>>

export type PipeResultDeleteAction<
    M extends IdentityInterface = IdentityInterface,
    DQ = any,
    DM = any,
    CTX = any,
    M2 extends IdentityInterface = M,
    DQ2 = DQ,
    DM2 = DM,
    CTX2 = CTX,
    CV = any,
    CO = any,
    RQ = any,
    PQ = any,
    PV = any,
    CM = any,
    RM = any,
    PM = any,
> = (
    next: PipeReadNext<M, DQ, DM>,
    query: DQ2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
) => Promise<ResultsInterface<M2, DM2>>

export interface PipeResultActionsInterface<
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
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    RQ2 = RQ,
    PQ2 = PQ,
    PV2 = PV,
    DQ2 = DQ,
    CM2 = CM,
    RM2 = RM,
    PM2 = PM,
    DM2 = DM,
    CTX2 = CTX,
> {
    create?: PipeResultCreateAction<M, CV, CO, CM, CTX, M2, CV2, CO2, CM2, CTX2, RQ, PQ, PV, DQ, RM, PM, DM>
    read?: PipeResultReadAction<M, RQ, RM, CTX, M2, RQ2, RM2, CTX2, CV, CO, PQ, PV, DQ, CM, PM, DM>
    patch?: PipeResultPatchAction<M, PV, PQ, PM, CTX, M2, PQ2, PV2, PM2, CTX2, CV, CO, RQ, DQ, CM, RM, DM>
    delete?: PipeResultDeleteAction<M, DQ, DM, CTX, M2, DQ2, DM2, CTX2, CV, CO, RQ, PQ, PV, CM, RM, PM>
}

export interface PipeResultsInterface<
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
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    RQ2 = RQ,
    PQ2 = PQ,
    PV2 = PV,
    DQ2 = DQ,
    CM2 = CM,
    RM2 = RM,
    PM2 = PM,
    DM2 = DM,
    CTX2 = CTX,
> extends Partial<SchemaBuildersInterface<M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2>>,
        PipeResultActionsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2> {}

export type PipeFunction<
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
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    RQ2 = RQ,
    PQ2 = PQ,
    PV2 = PV,
    DQ2 = DQ,
    CM2 = CM,
    RM2 = RM,
    PM2 = PM,
    DM2 = DM,
    CTX2 = any,
> = (
    p: PipePropsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
) => PipeResultsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2>

export type PipeClassInstance<
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
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    RQ2 = RQ,
    PQ2 = PQ,
    PV2 = PV,
    DQ2 = DQ,
    CM2 = CM,
    RM2 = RM,
    PM2 = PM,
    DM2 = DM,
    CTX2 = CTX,
> = {
    transform: PipeFunction<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2>
}

export interface PipeClass<
    P extends any[],
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
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    RQ2 = RQ,
    PQ2 = PQ,
    PV2 = PV,
    DQ2 = DQ,
    CM2 = CM,
    RM2 = RM,
    PM2 = PM,
    DM2 = DM,
    CTX2 = CTX,
> {
    new (...params: P): PipeClassInstance<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2>
}

export type Pipe<
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
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    RQ2 = RQ,
    PQ2 = PQ,
    PV2 = PV,
    DQ2 = DQ,
    CM2 = CM,
    RM2 = RM,
    PM2 = PM,
    DM2 = DM,
    CTX2 = CTX,
> =
    | PipeFunction<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2>
    | PipeClassInstance<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2>
