import * as _ from "lodash"
import { PipelineAbstract } from "./PipelineAbstract"
import { QueryTemplate } from "./QueryTemplate"
import { IdentityInterface } from "./IdentityInterface"
import { JSONSchema } from "@serafin/schema-builder/lib/JsonSchema"
import { PipelineInterface } from "./PipelineInterface"

/**
 * Represents a Relation for the given pipeline
 */
export class Relation<M extends IdentityInterface, NameKey extends string, R extends IdentityInterface, ReadQuery, ReadMeta> {
    type?: "one" | "many"

    constructor(
        holdingPipeline: PipelineAbstract<M>,
        public name: NameKey,
        public pipeline: () => PipelineInterface<R, any, any, ReadQuery, any, any, any, any, ReadMeta>,
        public query: Partial<ReadQuery>,
    ) {
        this.type = "many"
        if (query["id"]) {
            // The only case for which we can assume the relation is a type "one" relation is
            // when the query refers to "id", is not an array nor a templated value (string beginning by :),
            // or is a templated value that doesn't reference an array
            let queryValue = query["id"]
            if (
                !Array.isArray(queryValue) &&
                (typeof queryValue !== "string" ||
                    queryValue.charAt(0) != ":" ||
                    (holdingPipeline.modelSchemaBuilder.schema.properties[queryValue.substring(1)] &&
                        (holdingPipeline.modelSchemaBuilder.schema.properties[queryValue.substring(1)] as JSONSchema).type !== "array"))
            ) {
                this.type = "one"
            }
        }
    }

    async fetch(resource: M, query?: Partial<ReadQuery>) {
        return this.pipeline().read({ ...(QueryTemplate.hydrate(this.query, resource) as any), ...(query || {}) })
    }

    async assignToResource(resource: M, query?: Partial<ReadQuery>) {
        let result = await this.fetch(resource, query)
        if (this.type === "one") {
            resource[this.name as string] = result.data[0]
        } else {
            resource[this.name as string] = result.data
        }
        return resource as M & { [k in NameKey]: R[] | R }
    }

    async assignToResources(resources: M[], query?: Partial<ReadQuery>) {
        return Promise.all(resources.map((resource) => this.assignToResource(resource, query)))
    }
}
