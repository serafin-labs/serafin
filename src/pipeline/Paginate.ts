import { PipelineAbstract, option, description, result } from '../serafin/pipeline'
import * as _ from 'lodash'
import { SchemaBuilder } from '@serafin/schema-builder';

@description("Provides pagination over the read results")
export class Paginate extends PipelineAbstract<{}, {}, { offset?: number, count?: number, page?: number }, { count: number }> {

    @description("Reads a limited count of results")
    @option('offset', { type: "integer", description: 'Offset of the first resource to return' }, false)
    @option('page', { type: "integer", description: "Offset of the first page to read (one page represents 'count' resources)" }, false)
    @option('count', { type: "integer", description: "Number of resources to return" }, false)
    @result('count', { type: "integer", description: "Number of resources available" }, false)
    protected async _read(query?: {}, options?: { offset?: number, count?: number, page?: number }) {
        let resources = await this.parent.read(query, options);
        let offset = 0;

        if (options) {
            if (options.offset) {
                offset = options.offset;
            } else if ("page" in options && options.count) {
                offset = (resources.data.length / options.count) * options.page;
            }

            if (options.count) {
                resources.data = resources.data.slice(offset, offset + options.count);
            }
        }

        return { ...resources, count: resources.data.length };
    }
}