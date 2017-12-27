import { PipelineAbstract, option, description, result, PipelineRelationInterface, PipelineRelations } from '../serafin/pipeline'
import * as _ from 'lodash'

@description("Fetch relations")
export class Links<T> extends PipelineAbstract<T, {}, { link?: string[] }, {}> {
    @description("Fetch relations into the resulting objects")
    @option('link', { type: "array", items: { type: "string" } }, false, 'An array of string corresponding to the relations to fetch')
    protected async _read(query?: {}, options?: { link?: string[] }): Promise<{ data: T[] }> {
        let resources = await this.parent.read(query, options);
        let relations = this.relations;
        this.relations.fetchLinks(resources.data);
        if (options && options.link) {
            await Promise.all(relations.list.map(async (rel) => {
                if (options.link.indexOf(rel.name) !== -1) {
                    return (await Promise.all(resources.data.map(async (r) => {
                        if (r.links && r.links[rel.name]) {
                            return r[rel.name] = (await r.links[rel.name].read()).data;
                        }
                    })));
                }
            }));
        }
        return resources;
    }
}