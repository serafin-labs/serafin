import * as _ from 'lodash'
import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeAbstract, PipelineRelation } from '../serafin/pipeline'
import { PipeInterface } from '../serafin/pipeline/PipeInterface';

// @description("Provides pagination over the read results")
export class Paginate<RO, RM> extends PipeAbstract implements PipeInterface {
    schemaBuilderReadOptions = (s: SchemaBuilder<RO>) => s.addInteger("offset", { description: "Offset of the first resource to return" })
        .addInteger("page", { description: "Offset of the first page to read (one page represents 'count' resources)" })
        .addInteger("count", { description: "Number of resources to return" }).toOptionals()
    schemaBuilderReadMeta = (s: SchemaBuilder<RM>) => s.addNumber("count", { description: "Number of resources available" })

    public async read(next, query?: {}, options?: { offset?: number, page?: number, count?: number }): Promise<{ meta: { count: number } } & { data: {}[] }> {
        let resources = await next(query, options);
        let offset = 0;

        if (options) {
            if (options.offset) {
                offset = options.offset;
            } else if ("page" in options && options.count) {
                offset = options.count * options.page;
            }

            if (options.count) {
                if (offset + options.count < resources.data.length) {
                    this.pipeline.addRelation('next', () => this.pipeline, query, { ...options, ...{ offset: offset + options.count } });
                }

                if (offset - options.count >= 0) {
                    this.pipeline.addRelation('prev', () => this.pipeline, query, { ...options, ...{ offset: Math.max(offset - options.count, 0) } });
                }

                resources.data = resources.data.slice(offset, offset + options.count);
            }
        }

        return {
            ...resources, meta: { count: resources.data.length }
        };
    }

    relations: { 'next': PipelineRelation, 'previous': PipelineRelation }
}