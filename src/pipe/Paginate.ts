import * as _ from 'lodash'
import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeAbstract, PipelineRelation } from '../serafin/pipeline'
import { PipeInterface } from '../serafin/pipeline/PipeInterface';
import { PipelineResults } from '../serafin/pipeline/PipelineResults';

// @description("Provides pagination over the read results")
export class Paginate extends PipeAbstract implements PipeInterface {
    schemaBuilderReadOptions = <T>(s: SchemaBuilder<T>) => s.addInteger("offset", { description: "Offset of the first resource to return" })
        .addInteger("page", { description: "Offset of the first page to read (one page represents 'count' resources)" })
        .addInteger("count", { description: "Number of resources to return" }).toOptionals()
    schemaBuilderReadMeta = <T>(s: SchemaBuilder<T>) => s.addNumber("count", { description: "Number of resources available" })

    public async read(next, query?: {}, options?: { offset?: number, page?: number, count?: number }): Promise<PipelineResults<{}, { total: number }>> {
        let resources = await next(query, options);
        let offset = 0;

        if (options) {
            //     if (options.offset) {
            //         offset = options.offset;
            //     } else if ("page" in options && options.count) {
            //         offset = options.count * options.page;
            //     }

            if (options.count) {
                //         if (offset + options.count < resources.data.length) {
                //             resources = { ...resources, links: { next: { rel: 'self', query: query, options: { count: options.count, offset: offset + options.count } } } }
                //         }
                //     }

                //     if (offset - options.count >= 0) {
                //         resources = { ...resources, links: { prev: { rel: 'self', query: query, options: { count: options.count, offset: Math.max(offset - options.count, 0) } } } }
                resources.data = resources.data.slice(offset, offset + options.count);
            }
        }

        resources.meta.total = resources.data.length
        return resources;
    }
}