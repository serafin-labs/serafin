import * as _ from 'lodash'
import { Pipeline } from "./Pipeline"
import { validationError } from "../error/Error"
import { QueryTemplate } from './QueryTemplate';
import { Merge } from '@serafin/schema-builder';
import { Omit } from "@serafin/schema-builder"
import { IdentityInterface } from './IdentityInterface';

/**
 * Represents a Relation for the given pipeline
 */
export class PipelineRelation<T extends {} = any, N extends keyof any = any, R = any, ReadQuery = any, ReadOptions = any, ReadWrapper = any, K1 extends keyof ReadQuery = null, K2 extends keyof ReadOptions = null> {
    type?: 'one' | 'many';

    constructor(private holdingPipeline: Pipeline<T>, public name: N, public pipeline: () => Pipeline<R, ReadQuery, ReadOptions, ReadWrapper>, public query: {[key in K1]: any}, public options?: {[key in K2]: any}) {
        this.type = 'many';
        if (query['id']) {
            let queryValue = query['id'];
            if (!Array.isArray(queryValue) && (
                typeof queryValue !== 'string' ||
                queryValue.charAt(0) != ':' ||
                holdingPipeline.modelSchemaBuilder.schema.properties[queryValue.substring(1)].type !== 'array'
            )) {
                this.type = 'one';
            }
        }
    }

    async fetch(resource: T, query?: Omit<ReadQuery, K1>, options?: Omit<ReadOptions, K2>) {
        let pipeline = this.pipeline()
        let mergedQuery = query || QueryTemplate.hydrate(this.query, resource) as any
        if (query) {
            _.assign(mergedQuery, QueryTemplate.hydrate(this.query, resource));
        }
        let mergedOptions = options || this.options as any
        if (options && this.options) {
            _.assign(mergedOptions, this.options)
        }
        return pipeline.read(mergedQuery, mergedOptions);
    }

    async assignToResource(resource: T, query?: Omit<ReadQuery, K1>, options?: Omit<ReadOptions, K2>) {
        let result = await this.fetch(resource, query, options)
        if (this.type === "one") {
            resource[this.name as string] = result.data[0]
        } else {
            resource[this.name as string] = result.data
        }
        return resource as T & {[k in N]: R[] | R}
    }

    async assignToResources(resources: T[], query?: Omit<ReadQuery, K1>, options?: Omit<ReadOptions, K2>) {
        return Promise.all(resources.map(resource => this.assignToResource(resource, query, options)))
    }
}