import * as _ from 'lodash'
import { PipelineAbstract } from "../Abstract"

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
export class PipelineSchemaRelations {
    constructor (public relations: PipelineRelationInterface[] = []) {
    }

    clone(): PipelineSchemaRelations {
        return new PipelineSchemaRelations(this.relations.map(r => _.clone(r)))
    }

    addRelation(relation: PipelineRelationInterface) {
        this.relations.push(relation);
        return this
    }
}