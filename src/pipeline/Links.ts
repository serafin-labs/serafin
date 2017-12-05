import { PipelineAbstract, option, description, result, PipelineRelationInterface, PipelineRelations } from '../serafin/pipeline'
import * as _ from 'lodash'

@description("Fetch relations")
export class Links<T> extends PipelineAbstract<T, {}, { link?: string[] }, {}> {
    @description("Fetch relations into the resulting objects")
    @option('link', { type: "array", items: { type: "string" } }, false, 'An array of string corresponding to the relations to fetch')
    protected async _read(query?: {}, options?: { link?: string[] }): Promise<{ data: T[] }> {
        let resources = await this.parent.read(query, options);
        let relations = this.relations;
        if (options && options.link) {
            await Promise.all(_.map(relations.list, (rel) =>
                options.link.indexOf(rel.name) !== -1 && this.relationsSchema.fetch(rel.name, resources.data)
            ));
        }
        return resources;
    }
}