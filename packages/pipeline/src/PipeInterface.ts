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
    create?: (
        next: PipeCreateNext<M, CV, CO, CM>,
        resources: CV2[],
        options: CO2,
        context: CTX2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
    ) => Promise<ResultsInterface<M2, CM2>>
    read?: (
        next: PipeReadNext<M, RQ, RM>,
        query: RQ2,
        context: CTX2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
    ) => Promise<ResultsInterface<M2, RM2>>
    patch?: (
        next: PipePatchNext<M, PQ, PV, PM>,
        query: PQ2,
        values: PV2,
        context: CTX2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
    ) => Promise<ResultsInterface<M2, PM2>>
    delete?: (
        next: PipeReadNext<M, DQ, DM>,
        query: DQ2,
        context: CTX2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>,
    ) => Promise<ResultsInterface<M2, DM2>>
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
