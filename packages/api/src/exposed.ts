import { PipelineAbstract } from "@serafin/pipeline"
import { allowsArray, schemaProperties, type Schema } from "./schemas.js"
import type { ExposedPipeline, PipelineAction } from "./TransportInterface.js"

/**
 * The actions to expose: the ones asked for, or every action the pipeline implements.
 */
export function exposedActions({ pipeline, actions }: ExposedPipeline): Set<PipelineAction> {
    if (actions) {
        return new Set(actions)
    }
    const base = PipelineAbstract.prototype as unknown as Record<string, unknown>
    const implemented = (action: PipelineAction) => (pipeline as unknown as Record<string, unknown>)[`_${action}`] !== base[`_${action}`]
    return new Set((["create", "read", "patch", "delete"] as const).filter(implemented))
}

/**
 * Whether a query can select a resource by its id.
 */
export function hasId(schema: Schema): boolean {
    return "id" in schemaProperties(schema).properties
}

/**
 * Whether a patch or delete query can select several resources: either it does not require an id, or its id accepts a list.
 */
export function selectsSeveral(schema: Schema): boolean {
    const { properties, required } = schemaProperties(schema)
    return !required.has("id") || allowsArray(properties.id)
}
