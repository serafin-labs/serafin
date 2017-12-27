import { PipelineAbstract, option, description, result, Link } from '../serafin/pipeline'
import * as _ from 'lodash'

@description("Provides pagination over the read results")
export class Paginate extends PipelineAbstract<{}, {}, { offset?: number, count?: number, page?: number }, { count: number }> {

    @description("Reads a limited count of results")
    @option('offset', { type: "integer" }, false, 'Offset of the first resource to return')
    @option('page', { type: "integer" }, false, "Offset of the first page to read (one page represents 'count' resources)")
    @option('count', { type: "integer" }, false, "Number of resources to return")
    @result('count', { type: "integer" }, false, "Number of resources available")
    protected async _read(query?: {}, options?: { offset?: number, count?: number, page?: number }): Promise<{ count: number, data: {}[] }> {
        let resources = await this.parent.read(query, options);
        let offset = 0;

        if (options) {
            if (options.offset) {
                offset = options.offset;
            } else if ("page" in options && options.count) {
                offset = options.count * options.page;
            }

            if (options.count) {
                if (offset + options.count < resources.data.length) {
                    Link.assign(resources, 'next', this, query, { ...options, ...{ offset: offset + options.count } }, 'many');
                }

                if (offset - options.count >= 0) {
                    Link.assign(resources, 'prev', this, query, { ...options, ...{ offset: Math.max(offset - options.count, 0) } }, 'many');
                }

                resources.data = resources.data.slice(offset, offset + options.count);
            }
        }

        return { ...resources, count: resources.data.length };
    }
}