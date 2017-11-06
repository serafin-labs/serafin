import { PipelineAbstract, option, description } from '../serafin/pipeline/Abstract'
import { ReadWrapperInterface } from '../serafin/pipeline/model/Resource'
import * as Promise from 'bluebird'

@description("Provides pagination over the read results")
export class Paginate extends PipelineAbstract<{}, {}, { offset?: number, count?: number }, { count: number, results: {}[] }> {

    @description("Reads a limited count of results")
    @option('offset', { type: "integer" }, false)
    @option('count', { type: "integer" }, false)
    @option('page', { type: "integer" }, false)
    read(query?: {}, options?: { offset?: number, count?: number }): Promise<{ count: number, results: {}[] }> {
        return this.parent.read(query, options).then((resources) => {
            let offset = 0;
            
            if (options) {
                if (options['offset']) {
                    offset = options['offset'];
                } else if (options['page'] && options['count']) {
                    offset = (resources.length / options['count']) * options['page'];
                }
                
                if (options['count']) {
                    if (offset > resources.length) {
                        throw new Error("Offset higher than the number of resources");
                    }

                    resources = resources.slice(offset, offset + options['count']);
                }
            }
            
            return Promise.resolve({ ...resources, count: resources.length });
        });
    }
}