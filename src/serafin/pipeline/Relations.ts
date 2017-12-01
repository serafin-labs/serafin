import * as _ from 'lodash'
import { PipelineAbstract } from "./Abstract"
import { validationError } from "../error/Error"
import { QueryTemplate } from './QueryTemplate';

export interface PipelineRelationInterface {
    name: string
    pipeline: PipelineAbstract
    query: ((o: any) => Promise<any>) | object | QueryTemplate
}

/**
 * Represents relations of this pipeline
 */
export class PipelineRelations {
    constructor(public relations: PipelineRelationInterface[] = []) {
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
        // Converts the query object into a templated query (so that it doesn't have to be used explicitely)
        if (typeof relation.query === 'object' && !(relation.query instanceof QueryTemplate)) {
            relation.query = new QueryTemplate(relation.query);
        }
        this.relations.push(relation);
        return this;
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
        if (typeof relation.query === 'function') {
            for (let r of resources) {
                r[relation.name] = await relation.query(r);
            }
        } else if (typeof relation.query === 'object' && relation.query instanceof QueryTemplate) {
            for (let r of resources) {
                r[relation.name] = (await relation.pipeline.read(relation.query.hydrate(r))).results;
            }
        }
    }
}