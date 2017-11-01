import { PipelineAbstract, option, description } from '../serafin/pipeline/Abstract'
import * as Promise from 'bluebird'

@description("Provides pagination over the read results")
export class Paginate<T,
    ReadQuery = {},
    ReadOptions = { offset?: number, count?: number },
    ReadWrapper = { count: number, results: {}[] }>
    extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper> {

    @description("Reads a limited count of results")
    @option('offset', { type: "integer" }, false)
    @option('count', { type: "integer" }, false)
    @option('page', { type: "integer" }, false)
    read(query?: ReadQuery): Promise<ReadWrapper> {
        return this.parent.read(query).then((resources) => {
            let count = resources.results.length;
            return Promise.resolve({ ...resources, count: count });
        });
    }
}