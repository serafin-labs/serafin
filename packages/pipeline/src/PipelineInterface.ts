import { IdentityInterface } from "./IdentityInterface"
import { ResultsInterface } from "./ResultsInterface"
import { SchemaBuildersInterface } from "./SchemaBuildersInterface"

export const pipelineMethods = ["create", "read", "patch", "delete"] as const

export type PipelineMethods = typeof pipelineMethods[number]

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
> {
    schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM>

    create(resources: CV[], options?: CO): Promise<ResultsInterface<M, CM>>

    read: (query: RQ) => Promise<ResultsInterface<M, RM>>

    patch: (query: PQ, values: PV) => Promise<ResultsInterface<M, PM>>

    delete: (query: DQ) => Promise<ResultsInterface<M, DM>>
}

export interface ReadOnlyPipelineInterface<M extends IdentityInterface = IdentityInterface, RQ = any, RM = any> {
    schemaBuilders: SchemaBuildersInterface<M, any, any, RQ, any, any, any, any, RM, any, any>

    read: (query: RQ) => Promise<ResultsInterface<M, RM>>
}
