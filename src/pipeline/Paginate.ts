import { PipelineAbstract, option, description, validate } from '../serafin/pipeline/Abstract'
import * as _ from 'lodash'

@description("Provides pagination over the read results")
export class Paginate extends PipelineAbstract<{}, {}, { offset?: number, count?: number }, { count: number, results: {}[] }> {

    @validate
    @description("Reads a limited count of results")
    @option('offset', { type: "integer" }, false, 'Offset of the first resource to return')
    @option('page', { type: "integer" }, false, "Offset of the first page to read (one page represents 'count' resources)")
    @option('count', { type: "integer" }, false, "Number of resources to return")
    async read(query?: {}, options?: { offset?: number, count?: number }): Promise<{ count: number, results: {}[] }> {
        return this.parent.read(query, options).then((resources) => {
            let offset = 0;

            if (options) {
                if (options['offset']) {
                    offset = options['offset'];
                } else if (options['page'] && options['count']) {
                    offset = (resources.results.length / options['count']) * options['page'];
                }

                if (options['count']) {
                    if (offset > resources.results.length) {
                        throw new Error("Offset higher than the number of resources");
                    }

                    resources.results = resources.results.slice(offset, offset + options['count']);
                }
            }

            return Promise.resolve({ ...resources, count: resources.results.length });
        });
    }
}