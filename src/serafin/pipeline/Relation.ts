import * as _ from 'lodash'
import { PipelineAbstract } from "./Abstract"
import { validationError } from "../error/Error"
import { QueryTemplate } from './QueryTemplate';
import { Merge } from '@serafin/schema-builder';
import { PipelineSourceInMemory } from '../../pipeline/source/InMemory';
import { petSchemaBuilder } from "../../example/petstore/model/Pet"
import { Paginate } from '../../pipeline/Paginate';
import { Omit } from "@serafin/schema-builder"
import { IdentityInterface } from './IdentityInterface';

/**
 * Represents a Relation for the given pipeline
 */
export class PipelineRelation<T extends {} = any, N extends keyof any = any, R = any, ReadQuery = any, ReadOptions = any, ReadWrapper = any, K1 extends keyof ReadQuery = null, K2 extends keyof ReadOptions = null> {
    type?: 'one' | 'many'

    constructor(public relation: {
        name: N
        pipeline: () => PipelineAbstract<R, ReadQuery, ReadOptions, ReadWrapper>
        query: {[key in K1]: any}
        options?: {[key in K2]: any}
    }, holdingPipeline: PipelineAbstract<T>) {
        this.type = 'many';
        if (relation.query['id']) {
            let queryValue = relation.query['id'];
            if (!Array.isArray(queryValue) && (
                typeof queryValue !== 'string' ||
                queryValue.charAt(0) != ':' ||
                holdingPipeline.modelSchemaBuilder.schema.properties[queryValue.substring(1)].type !== 'array'
            )) {
                this.type = 'one';
            }
        }
    }

    get name() {
        return this.relation.name
    }

    get pipeline() {
        return this.relation.pipeline
    }

    get query() {
        return this.relation.pipeline
    }

    get options() {
        return this.relation.options
    }

    async fetch(resource: T, query?: Omit<ReadQuery, K1>, options?: Omit<ReadOptions, K2>) {
        let pipeline = this.relation.pipeline()
        let mergedQuery = query || QueryTemplate.hydrate(this.relation.query, resource) as any
        if (query) {
            _.assign(mergedQuery, QueryTemplate.hydrate(this.relation.query, resource));
        }
        let mergedOptions = options || this.relation.options as any
        if (options && this.relation.options) {
            _.assign(mergedOptions, this.relation.options)
        }
        return pipeline.read(mergedQuery, mergedOptions);
    }

    async assignToResource(resource: T, query?: Omit<ReadQuery, K1>, options?: Omit<ReadOptions, K2>) {
        let result = await this.fetch(resource, query, options)
        if (this.type === "one") {
            resource[this.relation.name as string] = result.data[0]
        } else {
            resource[this.relation.name as string] = result.data
        }
        return resource as T & {[k in N]: R[] | R}
    }

    async assignToResources(resources: T[], query?: Omit<ReadQuery, K1>, options?: Omit<ReadOptions, K2>) {
        return Promise.all(resources.map(resource => this.assignToResource(resource, query, options)))
    }
}