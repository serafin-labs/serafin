import { PipelineAbstract, option, description, result } from '../serafin/pipeline'
import * as _ from 'lodash'
import { IdentityInterface } from '../serafin/pipeline/IdentityInterface';
import { PipelineRelation } from '../serafin/pipeline/Relation';

@description("Declare and fetch a relation")
export class Links<N extends keyof any, R extends IdentityInterface, RReadQuery, RReadOptions, RReadWrapper, K1 extends keyof RReadQuery = null, K2 extends keyof RReadOptions = null> extends PipelineAbstract<{[k in N]: R[] | R}, {}, { link?: string[] }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {[key in N]: PipelineRelation<{}, N, R, RReadQuery, RReadOptions, RReadWrapper, K1, K2>}> {
    constructor(private relation: {
        name: N
        pipeline: () => PipelineAbstract<R, RReadQuery, RReadOptions, RReadWrapper>
        query: {[key in K1]: any}
        options?: {[key in K2]: any}
    }) {
        super();
        this.addRelation(relation);

    }

    @description("Fetch a relation into the resulting objects")
    @option('link', { type: "array", items: { type: "string", description: 'An array of string corresponding to the relations to fetch' } }, false)
    protected async _read(query?: {}, options?: { link?: string[] }) {
        let resources = await this.parent.read(query, options);
        if (options && options.link && options.link.indexOf(this.relation.name as string) !== -1) {
            await this.relations[this.relation.name].assignToResources(resources.data)
        }
        return resources;
    }
}