import type { PipelineInterface } from "@serafin/pipeline"
import type { Api } from "./Api.js"

/**
 * The actions a pipeline can expose.
 */
export type PipelineAction = "create" | "read" | "patch" | "delete"

/**
 * Any pipeline. A structural type rather than `PipelineAbstract`, whose methods make a typed pipeline
 * incompatible with `PipelineAbstract<any>`.
 */
export type AnyPipeline = PipelineInterface<any>

/**
 * A pipeline exposed on an Api, with the names it is exposed under.
 */
export interface ExposedPipeline {
    pipeline: AnyPipeline
    /** Singular name of the resource, e.g. `book`. */
    name: string
    /** Plural name of the resource, e.g. `books`. It is also the path of the resource. */
    pluralName: string
    /** The actions to expose. Defaults to every action the pipeline implements. */
    actions?: PipelineAction[]
}

/**
 * A way to expose pipelines to the outside, such as REST endpoints.
 */
export interface TransportInterface {
    /**
     * Called once, when the transport is added to the Api.
     */
    init(api: Api): void

    /**
     * Called for every pipeline exposed on the Api, including the ones exposed before the transport was added.
     */
    use(exposed: ExposedPipeline): void
}
