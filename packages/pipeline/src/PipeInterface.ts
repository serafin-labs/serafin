import { PipelineAbstract } from "./PipelineAbstract.js"
import _ from "lodash"
import { IdentityInterface } from "./IdentityInterface.js"
import { SchemaBuildersInterface } from "./SchemaBuildersInterface.js"
import { ResultsInterface } from "./ResultsInterface.js"
import { PipelineInterface } from "./PipelineInterface.js"
import { SourceQuery, SourceValues } from "./SourceQuery.js"

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
    META = any,
> extends SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META> {}

export type PipeCreateNext<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any, CTX = any, META = any> = (
    resources: CV[],
    options: CO,
    context: CTX,
) => Promise<ResultsInterface<M, META & CM>>

/**
 * Calling `next` revalidates nothing, so a pipe may hand down a query the schemas do not describe:
 * a condition carrying an operator where the schema declares a value. `SourceQuery<RQ>` names that
 * widening, so a pipe doing it says so in the type instead of casting `next` to something loose --
 * which is what the pipes doing it had to resort to, and which hid their other mistakes too.
 *
 * The union keeps a plain `RQ` valid, and neither half says whether the implementation below
 * understands a given operator: that is `requires` and `capabilities`. @see PipeCapabilitiesInterface
 */
export type PipeReadNext<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any, META = any> = (
    query: RQ | SourceQuery<RQ>,
    context: CTX,
) => Promise<ResultsInterface<M, META & RM>>

export type PipePatchNext<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any, CTX = any, META = any> = (
    query: PQ | SourceQuery<PQ>,
    values: PV | SourceValues<PV>,
    context: CTX,
) => Promise<ResultsInterface<M, META & PM>>

export type PipeDeleteNext<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any, CTX = any, META = any> = (
    query: DQ | SourceQuery<DQ>,
    context: CTX,
) => Promise<ResultsInterface<M, META & DM>>

export type PipeCreateAction<
    M extends IdentityInterface = IdentityInterface,
    CV = any,
    CO = any,
    CM = any,
    CTX = any,
    META = any,
    M2 extends IdentityInterface = M,
    CV2 = CV,
    CO2 = CO,
    CM2 = CM,
    CTX2 = CTX,
    META2 = META,
    RQ = any,
    PQ = any,
    PV = any,
    DQ = any,
    RM = any,
    PM = any,
    DM = any,
> = (
    next: PipeCreateNext<M, CV, CO, CM, CTX, META>,
    resources: CV2[],
    options: CO2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => Promise<ResultsInterface<M2, META2 & CM2>>

export type PipeReadAction<
    M extends IdentityInterface = IdentityInterface,
    RQ = any,
    RM = any,
    CTX = any,
    META = any,
    M2 extends IdentityInterface = M,
    RQ2 = RQ,
    RM2 = RM,
    CTX2 = CTX,
    META2 = META,
    CV = any,
    CO = any,
    PQ = any,
    PV = any,
    DQ = any,
    CM = any,
    PM = any,
    DM = any,
> = (
    next: PipeReadNext<M, RQ, RM, CTX, META>,
    query: RQ2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => Promise<ResultsInterface<M2, META2 & RM2>>

export type PipePatchAction<
    M extends IdentityInterface = IdentityInterface,
    PQ = any,
    PV = any,
    PM = any,
    CTX = any,
    META = any,
    M2 extends IdentityInterface = M,
    PQ2 = PQ,
    PV2 = PV,
    PM2 = PM,
    CTX2 = CTX,
    META2 = META,
    CV = any,
    CO = any,
    RQ = any,
    DQ = any,
    CM = any,
    RM = any,
    DM = any,
> = (
    next: PipePatchNext<M, PQ, PV, PM, CTX, META>,
    query: PQ2,
    values: PV2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => Promise<ResultsInterface<M2, META2 & PM2>>

export type PipeDeleteAction<
    M extends IdentityInterface = IdentityInterface,
    DQ = any,
    DM = any,
    CTX = any,
    META = any,
    M2 extends IdentityInterface = M,
    DQ2 = DQ,
    DM2 = DM,
    CTX2 = CTX,
    META2 = META,
    CV = any,
    CO = any,
    RQ = any,
    PQ = any,
    PV = any,
    CM = any,
    RM = any,
    PM = any,
> = (
    next: PipeDeleteNext<M, DQ, DM, CTX, META>,
    query: DQ2,
    context: CTX2,
    pipeline: PipelineInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => Promise<ResultsInterface<M2, META2 & DM2>>

export interface PipeActionsInterface<
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
    META2 = META,
> {
    create?: PipeCreateAction<M, CV, CO, CM, CTX, META, M2, CV2, CO2, CM2, CTX2, META2, RQ, PQ, PV, DQ, RM, PM, DM>
    read?: PipeReadAction<M, RQ, RM, CTX, META, M2, RQ2, RM2, CTX2, META2, CV, CO, PQ, PV, DQ, CM, PM, DM>
    patch?: PipePatchAction<M, PQ, PV, PM, CTX, META, M2, PQ2, PV2, PM2, CTX2, META2, CV, CO, RQ, DQ, CM, RM, DM>
    delete?: PipeDeleteAction<M, DQ, DM, CTX, META, M2, DQ2, DM2, CTX2, META2, CV, CO, RQ, PQ, PV, CM, RM, PM>
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
    META = any,
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
    META2 = META,
> extends Partial<SchemaBuildersInterface<M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>>,
        PipeActionsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>,
        PipeCapabilitiesInterface {}

/**
 * What a pipe needs of what sits below it, and what it adds to it.
 *
 * Nothing revalidates a `next` call, which is how a pipe hands an operator down without declaring it
 * on its own schemas -- and why the pipe and the implementation below it agree by convention rather
 * than by type. Declaring that convention lets `pipe()` check it once, when the pipe is attached,
 * instead of leaving a mismatch to surface as a plausible page of the wrong resources.
 *
 * Both are free-form names that the two sides agree on. The operator names a pipeline understands
 * are the obvious ones, and a source built on this library's query matcher declares exactly the
 * contents of `queryOperators` and `updateOperators`.
 */
export interface PipeCapabilitiesInterface {
    /** Names this pipe hands down to whatever is below it. */
    requires?: readonly string[]
    /** Names this pipe implements itself, on behalf of the pipes attached after it. */
    provides?: readonly string[]
}

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
    META = any,
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
    META2 = META,
> = (
    p: PipePropsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>,
) => PipeResultsInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>

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
    META = any,
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
    META2 = META,
> = {
    transform: PipeFunction<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>
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
    META = any,
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
    META2 = META,
> {
    new (...params: P): PipeClassInstance<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>
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
    META = any,
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
    META2 = META,
> =
    | PipeFunction<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>
    | PipeClassInstance<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, M2, CV2, CO2, RQ2, PQ2, PV2, DQ2, CM2, RM2, PM2, DM2, CTX2, META2>
