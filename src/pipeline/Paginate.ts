import { PipelineAbstract, option, description } from '../serafin/pipeline/Abstract'
import { ReadWrapperInterface } from '../serafin/pipeline/model/Resource'
import * as Promise from 'bluebird'

@description("Provides pagination over the read results")
export class Paginate extends PipelineAbstract<{}, {}, { offset?: number, count?: number }, { count: number, results: {}[] }> {

    @description("Reads a limited count of results")
    @option('offset', { type: "integer" }, false)
    @option('count', { type: "integer" }, false)
    @option('page', { type: "integer" }, false)
    read(query: {}): Promise<{ count: number, results: {}[] }> {
        return this.parent.read(query).then((resources) => {
            let count = resources.results.length;
            return Promise.resolve({ ...resources, count: count });
        });
    }
}