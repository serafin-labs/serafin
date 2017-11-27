import * as _ from 'lodash'
import { PipelineAbstract } from "./Abstract"
import { validationError } from "../error/Error"

export interface PipelineRelationInterface {
    type: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany"
    name: string
    pipeline: PipelineAbstract
    localKey?: string
    foreignKey?: string
    query?: (o: any) => Promise<any>
}

/**
 * Represents relations of this pipeline
 */
export class PipelineRelations {
    constructor (public relations: PipelineRelationInterface[] = []) {
    }

    clone(): PipelineRelations {
        return new PipelineRelations(this.relations.map(r => _.clone(r)))
    }

    /**
     * Add the relation 
     * 
     * @param relation 
     */
    addRelation(relation: PipelineRelationInterface) {
        if (!relation.query && ((relation.type === "oneToMany" && !relation.foreignKey) || relation.type === "manyToMany" || (relation.type === "manyToOne" && !relation.localKey))) {
            throw new Error(`The relation ${relation.name} (${relation.type}) is not covered by default implementations. You have to provide a query fonction.`)
        }
        this.relations.push(relation);
        return this
    }

    /**
     * Fetch relation data on the given entities.
     * /!\ this function modify 'resources'
     * 
     * @param relationName 
     * @param resources 
     */
    async fetch(relationName: string, resources: any[]) {
        let relation = _.find(this.relations, r => r.name === relationName);
        if (!relation) {
            throw validationError(`Relation ${relationName} does not exist.`)
        }
        if (relation.query) {
            for (let r of resources) {
                r[relation.name] = await relation.query(r);
            }
        } else if ((relation.type === "oneToOne" || relation.type === "manyToOne") && relation.localKey) {
            for (let r of resources) {
                if (r[relation.localKey]) {
                    let relatedResources = await relation.pipeline.read({
                        id: r[relation.localKey]
                    });
                    r[relation.name] = relatedResources.results.length > 0 ? relatedResources.results[0] : null
                }
            }
        } else if (relation.type === "oneToOne" && relation.foreignKey) {
            for (let r of resources) {
                let relatedResources = await relation.pipeline.read({
                    [relation.foreignKey]: r.id
                });
                r[relation.name] = relatedResources.results.length > 0 ? relatedResources.results[0] : null
            }
        } else if (relation.type === "oneToMany" && relation.foreignKey) {
            for (let r of resources) {
                let relatedResources = await relation.pipeline.read({
                    [relation.foreignKey]: r.id
                });
                r[relation.name] = relatedResources.results
            }
        }
    }
}