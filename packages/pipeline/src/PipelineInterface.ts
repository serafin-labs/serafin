import { IdentityInterface } from "./IdentityInterface"
import { ResultsInterface } from "./ResultsInterface"
import { SchemaBuildersInterface } from "./SchemaBuildersInterface"

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
export type PipelineReadFunction<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any> = (
    query: RQ,
    context?: CTX,
) => Promise<ResultsInterface<M, RM>>

/**
 * Create function interface of a pipeline
 */
export type PipelineCreateFunction<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any, CTX = any> = (
    resources: CV[],
    options?: CO,
    context?: CTX,
) => Promise<ResultsInterface<M, CM>>

/**
 * Patch function interface of a pipeline
 */
export type PipelinePatchFunction<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any, CTX = any> = (
    query: PQ,
    values: PV,
    context?: CTX,
) => Promise<ResultsInterface<M, PM>>

/**
 * Delete function interface of a pipeline
 */
export type PipelineDeleteFunction<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any, CTX = any> = (
    query: DQ,
    context?: CTX,
) => Promise<ResultsInterface<M, DM>>

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
> {
    schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>
    create: PipelineCreateFunction<M, CV, CO, CM, CTX>
    read: PipelineReadFunction<M, RQ, RM, CTX>
    patch: PipelinePatchFunction<M, PQ, PV, PM, CTX>
    delete: PipelineDeleteFunction<M, DQ, DM, CTX>
}

/**
 * Interface of the important properties of a pipeline for read only
 */
export interface ReadOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, RQ, any, any, any, any, RM, any, any, CTX>
    read: PipelineReadFunction<M, RQ, RM, CTX>
}

/**
 * Interface of the important properties of a pipeline for create only
 */
export interface CreateOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, CV = any, CO = any, CM = any, CTX = any> {
    schemaBuilders: SchemaBuildersInterface<M, CV, CO, any, any, any, any, CM, any, any, any, CTX>
    create: PipelineCreateFunction<M, CV, CO, CM, CTX>
}

/**
 * Interface of the important properties of a pipeline for patch only
 */
export interface PatchOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, PQ = any, PV = any, PM = any, CTX = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, any, PQ, PV, any, any, any, PM, any, CTX>
    patch: PipelinePatchFunction<M, PQ, PV, PM, CTX>
}

/**
 * Interface of the important properties of a pipeline
 */
export interface DeleteOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, DQ = any, DM = any, CTX = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, any, any, any, DQ, any, any, any, DM, CTX>
    delete: PipelineDeleteFunction<M, DQ, DM, CTX>
}
