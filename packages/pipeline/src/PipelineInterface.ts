import { IdentityInterface } from "./IdentityInterface"
import { ResultsInterface } from "./ResultsInterface"
import { SchemaBuildersInterface } from "./SchemaBuildersInterface"

export const pipelineMethods = ["create", "read", "patch", "delete"] as const

export type PipelineMethods = (typeof pipelineMethods)[number]

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

    create(resources: CV[], options?: CO, context?: CTX): Promise<ResultsInterface<M, CM>>

    read: (query: RQ, context?: CTX) => Promise<ResultsInterface<M, RM>>

    patch: (query: PQ, values: PV, context?: CTX) => Promise<ResultsInterface<M, PM>>

    delete: (query: DQ, context?: CTX) => Promise<ResultsInterface<M, DM>>
}

export interface ReadOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any, CTX = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, RQ, any, any, any, any, RM, any, any, CTX>

    read: (query: RQ, context?: CTX) => Promise<ResultsInterface<M, RM>>
}
