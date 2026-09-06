import { IdentityInterface } from "./IdentityInterface.js"
import { ResultsInterface } from "./ResultsInterface.js"
import { SchemaBuildersInterface } from "./SchemaBuildersInterface.js"

/**
 * List of action methods used by a pipeline
 */
export const pipelineMethods = ["create", "read", "patch", "delete"] as const

/**
 * Pipeline action keys
 */
export type PipelineMethods = (typeof pipelineMethods)[number]

/**
 * Read function interface of a pipeline
 */
export type PipelineReadFunction<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any, META = any> = (
    query: RQ,
    context?: CTX,
) => Promise<ResultsInterface<M, META & RM>>

/**
 * Create function interface of a pipeline
 */
export type PipelineCreateFunction<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any, CTX = any, META = any> = (
    resources: CV[],
    options?: CO,
    context?: CTX,
) => Promise<ResultsInterface<M, META & CM>>

/**
 * Patch function interface of a pipeline
 */
export type PipelinePatchFunction<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any, CTX = any, META = any> = (
    query: PQ,
    values: PV,
    context?: CTX,
) => Promise<ResultsInterface<M, META & PM>>

/**
 * Delete function interface of a pipeline
 */
export type PipelineDeleteFunction<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any, CTX = any, META = any> = (
    query: DQ,
    context?: CTX,
) => Promise<ResultsInterface<M, META & DM>>

/**
 * Interface of the important properties of a pipeline
 */
export interface PipelineInterface<
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
    schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META>
    create: PipelineCreateFunction<M, CV, CO, CM, CTX, META>
    read: PipelineReadFunction<M, RQ, RM, CTX, META>
    patch: PipelinePatchFunction<M, PQ, PV, PM, CTX, META>
    delete: PipelineDeleteFunction<M, DQ, DM, CTX, META>
}

/**
 * Interface of the important properties of a pipeline for read only
 */
export interface ReadOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any, META = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, RQ, any, any, any, any, RM, any, any, CTX, META>
    read: PipelineReadFunction<M, RQ, RM, CTX, META>
}

/**
 * Interface of the important properties of a pipeline for create only
 */
export interface CreateOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any, CTX = any, META = any> {
    schemaBuilders: SchemaBuildersInterface<M, CV, CO, any, any, any, any, CM, any, any, any, CTX, META>
    create: PipelineCreateFunction<M, CV, CO, CM, CTX, META>
}

/**
 * Interface of the important properties of a pipeline for patch only
 */
export interface PatchOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any, CTX = any, META = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, any, PQ, PV, any, any, any, PM, any, CTX, META>
    patch: PipelinePatchFunction<M, PQ, PV, PM, CTX, META>
}

/**
 * Interface of the important properties of a pipeline
 */
export interface DeleteOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any, CTX = any, META = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, any, any, any, DQ, any, any, any, DM, CTX, META>
    delete: PipelineDeleteFunction<M, DQ, DM, CTX, META>
}
