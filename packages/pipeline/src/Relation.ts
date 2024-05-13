import * as _ from "lodash"
import { PipelineAbstract } from "./PipelineAbstract"
import { QueryTemplate } from "./QueryTemplate"
import { IdentityInterface } from "./IdentityInterface"
import { ReadOnlyPipelineInterface } from "./PipelineInterface"
import { RelationType } from "./RelationType"

/**
 * Represents a Relation for the given pipeline
 */
export class Relation<M extends IdentityInterface, NameKey extends string, R extends IdentityInterface, ReadQuery, ReadMeta, Type extends RelationType> {
    constructor(
        private holdingPipeline: ReadOnlyPipelineInterface<M>,
        public name: NameKey,
        public pipeline: ReadOnlyPipelineInterface<R, ReadQuery, ReadMeta>,
        public query: Partial<ReadQuery>,
        public type: Type,
    ) {}

    async fetch(resource: M, query?: Partial<ReadQuery>, context?: any) {
        return this.pipeline.read({ ...(QueryTemplate.hydrate(this.query, resource) as any), ...(query || {}) }, context)
    }

    async assignToResource(resource: M, query?: Partial<ReadQuery>, context?: any) {
        let result = await this.fetch(resource, query, context)
        if (this.type === "one") {
            ;(resource as Record<string, unknown>)[this.name as string] = result.data[0]
        } else {
            ;(resource as Record<string, unknown>)[this.name as string] = result.data
        }
        return resource as M & { [k in NameKey]: Type extends RelationType.many ? R[] : Type extends RelationType.one ? R : R | R[] }
    }

    async assignToResources(resources: M[], query?: Partial<ReadQuery>, context?: any) {
        return Promise.all(resources.map((resource) => this.assignToResource(resource, query, context)))
    }
}
