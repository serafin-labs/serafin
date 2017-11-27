import { PipelineAbstract, option, description, result, PipelineRelationInterface, PipelineSchemaRelations } from '../serafin/pipeline'
import * as _ from 'lodash'

@description("Defines a related entity and a way to fetch it")
export class Relation<T> extends PipelineAbstract<T, {}, { link?: string[] }, { }> {

    constructor(protected relation: PipelineRelationInterface, protected fetchEnabled = true) {
        super()
    }

    protected attach(pipeline: PipelineAbstract) {
        super.attach(pipeline)
        let existingRelations = pipeline.relations;
        existingRelations = existingRelations ? existingRelations.clone() : new PipelineSchemaRelations();
        existingRelations.addRelation(this.relation)
    } 

    @description("Fetch relations for resulting objects")
    @option('link', { type: "array", items: { type: "string" } }, false, 'An array of string that represents relations to fetch')
    protected async _read(query?: {}, options?: { link?: string[]  }): Promise<{ results: T[] }> {
        let resources = await this.parent.read(query, options);
        if (this.fetchEnabled && options && options.link && options.link.indexOf(this.relation.name) !== -1) {
            if (this.relation.query) {
                for (let r of resources.results) {
                    r[this.relation.name] = await this.relation.query(r);
                }
            } else if ((this.relation.type === "oneToOne" || this.relation.type === "manyToOne") && this.relation.localKey) {
                for (let r of resources.results) {
                    if (r[this.relation.localKey]) {
                        let relatedResources = await this.relation.pipeline.read({
                            id: r[this.relation.localKey]
                        });
                        r[this.relation.name] = relatedResources.results.length > 0 ? relatedResources.results[0] : null
                    }
                }
            } else if (this.relation.type === "oneToOne" && this.relation.foreignKey) {
                for (let r of resources.results) {
                    let relatedResources = await this.relation.pipeline.read({
                        [this.relation.foreignKey]: r.id
                    });
                    r[this.relation.name] = relatedResources.results.length > 0 ? relatedResources.results[0] : null
                }
            } else if ((this.relation.type === "oneToMany" || this.relation.type === "manyToMany") && this.relation.localKey) {
                // relation type not implemented yet, we need a more advanced way to query : { id : {$in: [...] } }
            } else if (this.relation.type === "oneToMany" && this.relation.foreignKey) {
                for (let r of resources.results) {
                    let relatedResources = await this.relation.pipeline.read({
                        [this.relation.foreignKey]: r.id
                    });
                    r[this.relation.name] = relatedResources.results
                }
            } else if ((this.relation.type === "manyToOne" || this.relation.type === "manyToMany") && this.relation.foreignKey) {
                // relation type not implemented yet, we need a more advanced way to query : { ids : {$elemMatch: ... } }
            }
        }
        return resources
    }
}