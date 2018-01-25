import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeAbstract, option, description, result } from '../serafin/pipeline'
import * as _ from 'lodash'

@description("Provides pagination over the read results")
export class Paginate extends PipeAbstract {
    schemaBuilders = this.extend((m) => ({
        readOptions: SchemaBuilder.emptySchema()
            .addInteger("offset", { description: "Offset of the first resource to return" })
            .addInteger("page", { description: "Offset of the first page to read (one page represents 'count' resources)" })
            .addInteger("count", { description: "Number of resources to return" }),
        readWrapper: SchemaBuilder.emptySchema().addNumber("count", { description: "Number of resources available" })
    }));

    public async read(next, query?: {}, options?: this["schemaBuilders"]["readOptions"]["T"]): Promise<this["schemaBuilders"]["readWrapper"]["T"] & { data: {}[] }> {
        let resources = await next(query, options);
        let offset = 0;

        if (options) {
            if (options.offset) {
                offset = options.offset;
            } else if ("page" in options && options.count) {
                offset = options.count * options.page;
            }

            if (options.count) {
                // if (offset + options.count < resources.data.length) {
                //     Link.assign(resources, 'next', this, query, { ...options, ...{ offset: offset + options.count } }, 'many');
                // }

                // if (offset - options.count >= 0) {
                //     Link.assign(resources, 'prev', this, query, { ...options, ...{ offset: Math.max(offset - options.count, 0) } }, 'many');
                // }

                resources.data = resources.data.slice(offset, offset + options.count);
            }
        }

        return { ...resources, count: resources.data.length };
    }
}