import { PipelineAbstract, option, description, result, PipelineRelationInterface, PipelineRelations } from '../serafin/pipeline'
import * as _ from 'lodash'

@description("Defines a related entity and a way to fetch it")
export class Relation<T> extends PipelineAbstract<T, {}, { link?: string[] }, { }> {

    constructor(protected relation: PipelineRelationInterface, protected fetchEnabled = true) {
        super()
    }

    protected attach(pipeline: PipelineAbstract) {
        super.attach(pipeline)
        let existingRelations = pipeline.relations;
        existingRelations = existingRelations ? existingRelations.clone() : new PipelineRelations();
        existingRelations.addRelation(this.relation);
        this.relationsSchema = existingRelations;
    } 

    @description("Fetch relations for resulting objects")
    @option('link', { type: "array", items: { type: "string" } }, false, 'An array of string that represents relations to fetch')
    protected async _read(query?: {}, options?: { link?: string[]  }): Promise<{ results: T[] }> {
        let resources = await this.parent.read(query, options);
        if (this.fetchEnabled && options && options.link && options.link.indexOf(this.relation.name) !== -1) {
            await this.relationsSchema.fetch(this.relation.name, resources.results);
        }
        return resources 
    }
}