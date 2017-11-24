import * as _ from 'lodash'
import { PipelineSchemaProperties } from './Properties'
import { PipelineAbstract } from '../Abstract'
import { JSONSchema4 } from "json-schema"
import { PipelineSchemaAbstract } from './Abstract';
import { PipelineSchemaModel } from './Model';
import { ResourceIdentityInterface } from './ResourceInterfaces';

const OPTIONS_SCHEMAS = Symbol('optionsSchemas');

/**
 * Represents the complete schema of the pipeline.
 * It's a combination of the model schema and all options schemas.
 */
export class PipelineSchema<T extends ResourceIdentityInterface> extends PipelineSchemaAbstract {
    constructor(modelSchema: PipelineSchemaModel<T>, optionsSchemas: {
        create?: PipelineSchemaProperties
        read?: PipelineSchemaProperties
        update?: PipelineSchemaProperties
        patch?: PipelineSchemaProperties
        delete?: PipelineSchemaProperties
    }, readResultsSchema: PipelineSchemaProperties, description?: string, title?: string) {
        let schema
        if (!modelSchema) {
            schema = {
                type: "object"
            }
        } else {
            schema = _.cloneDeep(modelSchema.schema);
        }
        if (title) {
            schema.title = title
        }
        if (description) {
            schema.description = description
        }
        schema.definitions = schema.definitions || {}
        for (let method in optionsSchemas) {
            // clone the options schema to avoid side effects
            let optionsSchema = _.cloneDeep(optionsSchemas[method].schema);
            // seal additional properties on this options schema
            optionsSchema.additionalProperties = true;
            // add it to the pipeline schema
            schema.definitions[`${method}Options`] = optionsSchema
        }
        // add it to the pipeline schema
        if (readResultsSchema) {
            schema.definitions[`readResults`] = _.cloneDeep(readResultsSchema.schema)
        }
        super(schema)
    }

    static mergeOptions(allOptions: {
        create?: PipelineSchemaProperties
        read?: PipelineSchemaProperties
        update?: PipelineSchemaProperties
        patch?: PipelineSchemaProperties
        delete?: PipelineSchemaProperties
    }[]) {
        return allOptions.reduce((result, val) => {
            for (let key in result) {
                if (val[key]) {
                    result[key].merge(val[key])
                }
            }
            return result
        }, { create: new PipelineSchemaProperties(), read: new PipelineSchemaProperties(), update: new PipelineSchemaProperties(), patch: new PipelineSchemaProperties(), delete: new PipelineSchemaProperties()})
    }


    static mergeProperties(allProperties: PipelineSchemaProperties[]) {
        return allProperties.reduce((result, val) => result.merge(val), new PipelineSchemaProperties())
    }
}