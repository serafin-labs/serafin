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
> extends SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM> {}

export type PipeCreateNext<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any> = (
    resources: CV[],
    options: CO,
) => Promise<ResultsInterface<M, CM>>

export type PipeReadNext<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any> = (query: RQ) => Promise<ResultsInterface<M, RM>>

export type PipePatchNext<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any> = (
    query: PQ,
    values: PV,
) => Promise<ResultsInterface<M, PM>>

export type PipeDeleteNext<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any> = (query: DQ) => Promise<ResultsInterface<M, DM>>

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
> {
    create?: (
        next: PipeCreateNext<M, CV, CO, CM>,
        resources: CV2[],
        options: CO2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>,
    ) => Promise<ResultsInterface<M2, CM2>>
    read?: (
        next: PipeReadNext<M, RQ, RM>,
        query: RQ2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>,
    ) => Promise<ResultsInterface<M2, RM2>>
    patch?: (
        next: PipePatchNext<M, PQ, PV, PM>,
        query: PQ2,
        values: PV2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>,
    ) => Promise<ResultsInterface<M2, PM2>>
    delete?: (
        next: PipeReadNext<M, DQ, DM>,
        query: DQ2,
        pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>,
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
> extends Partial<SchemaBuildersInterface<M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2>>,
        PipeResultActionsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2> {}

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
> = (
    p: PipePropsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>,
) => PipeResultsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2>

export type PipeClass<
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
> = {
    transform: PipeFunction<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2>
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
> =
    | PipeFunction<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2>
    | PipeClass<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2>
