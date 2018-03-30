import * as _ from 'lodash'
import { PipelineAbstract } from "./PipelineAbstract"
import { validationError } from "../error/Error"
import { QueryTemplate } from './QueryTemplate';
import { Merge } from '@serafin/schema-builder';
import { Omit } from "@serafin/schema-builder"
import { IdentityInterface } from './IdentityInterface';
import { SchemaBuildersInterface } from './SchemaBuildersInterface';

/**
 * Represents a Relation for the given pipeline
 */
export class PipelineRelation<M extends IdentityInterface = any, NameKey extends keyof any = any, R extends IdentityInterface = any, ReadQuery = any, ReadOptions = any, ReadMeta = any, QueryKeys extends keyof ReadQuery = null, OptionsKeys extends keyof ReadOptions = null> {
    type?: 'one' | 'many';

    constructor(private holdingPipeline: PipelineAbstract<M>,
        public name: NameKey, public pipeline: () => PipelineAbstract<R, SchemaBuildersInterface<R, {}, {}, {}, ReadQuery, ReadOptions, ReadMeta>>,
        public query: { [key in QueryKeys]: any }, public options?: { [key in OptionsKeys]: any }) {
        this.type = 'many';
        if (query['id']) {
            // The only case for which we can assume the relation is a type "one" relation is
            // when the query refers to "id", is not an array nor a templated value (string beginning by :),
            // or is a templated value that doesn't reference an array
            let queryValue = query['id'];
            if (!Array.isArray(queryValue) && (
                typeof queryValue !== 'string' ||
                queryValue.charAt(0) != ':' ||
                (holdingPipeline.modelSchemaBuilder.schema.properties[queryValue.substring(1)] &&
                    holdingPipeline.modelSchemaBuilder.schema.properties[queryValue.substring(1)].type !== 'array')
            )) {
                this.type = 'one';
            }
        }
    }

    async fetch(resource: M, query?: Omit<ReadQuery, QueryKeys>, options?: Omit<ReadOptions, OptionsKeys>) {
        return this.pipeline()
            .read({ ...QueryTemplate.hydrate(this.query, resource) as any, ...query || {} }
                , { ...this.options as any || {}, ...options || {} });
    }

    async assignToResource(resource: M, query?: Omit<ReadQuery, QueryKeys>, options?: Omit<ReadOptions, OptionsKeys>) {
        let result = await this.fetch(resource, query, options)
        if (this.type === "one") {
            resource[this.name as string] = result.data[0]
        } else {
            resource[this.name as string] = result.data
        }
        return resource as M & { [k in NameKey]: R[] | R }
    }

    async assignToResources(resources: M[], query?: Omit<ReadQuery, QueryKeys>, options?: Omit<ReadOptions, OptionsKeys>) {
        return Promise.all(resources.map(resource => this.assignToResource(resource, query, options)))
    }
}