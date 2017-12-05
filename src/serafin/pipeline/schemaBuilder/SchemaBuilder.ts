import * as _ from 'lodash'
import { PipelineSchemaBuilderAbstract } from "./Abstract"
import { PipelineSchemaBuilderProperties } from './Properties'
import { PipelineAbstract } from '../Abstract'
import { JSONSchema4 } from "json-schema"
import { PipelineSchemaBuilderModel } from './Model';
import { ResourceIdentityInterface } from './ResourceInterfaces';

const OPTIONS_SCHEMAS = Symbol('optionsSchemas');

/**
 * Represents the complete schema of the pipeline.
 * It's a combination of the model schema and all options schemas.
 */
export class PipelineSchemaBuilder<T extends ResourceIdentityInterface> extends PipelineSchemaBuilderAbstract {
    constructor(modelSchema: PipelineSchemaBuilderModel<T>, optionsSchemas: {
        create?: PipelineSchemaBuilderProperties
        read?: PipelineSchemaBuilderProperties
        update?: PipelineSchemaBuilderProperties
        patch?: PipelineSchemaBuilderProperties
        delete?: PipelineSchemaBuilderProperties
    }, readDataSchema: PipelineSchemaBuilderProperties, description?: string, title?: string) {
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
        if (readDataSchema) {
            schema.definitions[`readData`] = _.cloneDeep(readDataSchema.schema)
        }
        super(schema)
    }

    static mergeOptions(allOptions: {
        create?: PipelineSchemaBuilderProperties
        read?: PipelineSchemaBuilderProperties
        update?: PipelineSchemaBuilderProperties
        patch?: PipelineSchemaBuilderProperties
        delete?: PipelineSchemaBuilderProperties
    }[]) {
        return allOptions.reduce((result, val) => {
            for (let key in result) {
                if (val[key]) {
                    result[key].merge(val[key])
                }
            }
            return result
        }, { create: new PipelineSchemaBuilderProperties(), read: new PipelineSchemaBuilderProperties(), update: new PipelineSchemaBuilderProperties(), patch: new PipelineSchemaBuilderProperties(), delete: new PipelineSchemaBuilderProperties() })
    }


    static mergeProperties(allProperties: PipelineSchemaBuilderProperties[]) {
        return allProperties.reduce((result, val) => result.merge(val), new PipelineSchemaBuilderProperties())
    }
}