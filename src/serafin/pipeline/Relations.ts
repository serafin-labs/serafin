import * as _ from 'lodash'
import { PipelineAbstract } from "./Abstract"
import { validationError } from "../error/Error"
import { QueryTemplate } from './QueryTemplate';

export interface PipelineRelationInterface {
    name: string
    pipeline: PipelineAbstract | (() => PipelineAbstract)
    query: ((o: any) => Promise<any>) | object | QueryTemplate
    type?: 'one' | 'many'
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
    addRelation(relation: PipelineRelationInterface, pipeline?: PipelineAbstract) {
        // Converts the query object into a templated query (so that it doesn't have to be used explicitely)
        if (typeof relation.query === 'object' && !(relation.query instanceof QueryTemplate)) {
            relation.query = new QueryTemplate(relation.query);
        }

        // If a local non-array value references a foreign field that is unique (here we handle only the id), then the relation references a single item
        // In any other case, many items can be referenced 
        if (pipeline) {
            relation.type = 'many';
            if (relation.query instanceof QueryTemplate && relation.query.queryTemplate['id']) {
                let queryValue = relation.query.queryTemplate['id'];
                if (!Array.isArray(queryValue) && (
                    typeof queryValue !== 'string' ||
                    queryValue.charAt(0) != ':' ||
                    pipeline.schema.schema.properties[queryValue.substring(1)].type !== 'array'
                )) {
                    relation.type = 'one';
                }
            }
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
        if (typeof relation.pipeline === "function") {
            relation.pipeline = relation.pipeline()
        }
        if (!relation) {
            throw validationError(`Relation ${relationName} does not exist.`)
        }
        if (typeof relation.query === 'function') {
            for (let r of resources) {
                r[relation.name] = await relation.query(r);
            }
        } else if (typeof relation.query === 'object' && relation.query instanceof QueryTemplate) {
            for (let r of resources) {
                r[relation.name] = (await (relation.pipeline as PipelineAbstract).read(relation.query.hydrate(r))).results;
            }
        }
    }

    /**
     * Fetch the relation of the given resource and return the result directly
     * @param relation
     * @param resource
     */
    async fetchRelationForResource(relation: PipelineRelationInterface, resource: any): Promise<any> {
        if (typeof relation.pipeline === "function") {
            relation.pipeline = relation.pipeline()
        }
        if (typeof relation.query === 'object' && relation.query instanceof QueryTemplate) {
            return (await (relation.pipeline as PipelineAbstract).read(relation.query.hydrate(resource))).results;
        }
    }
}