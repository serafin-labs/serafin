import * as _ from 'lodash'
import { PipelineSchemaMethodOptions } from './MethodOptions'
import { PipelineAbstract } from '../Abstract'
import { JSONSchema4 } from "json-schema"
import { PipelineSchemaAbstract } from './Abstract';
import { PipelineSchemaModel } from './Model';
import { ResourceIdentityInterface } from './ResourceInterfaces';

const OPTIONS_SCHEMAS = Symbol('optionsSchemas');

/**
 * Represents the complete schema of the pipeline
 */
export class PipelineSchema<T extends ResourceIdentityInterface> extends PipelineSchemaAbstract {
    constructor(modelSchema: PipelineSchemaModel<T>, optionsSchemas: {
        create?: PipelineSchemaMethodOptions
        read?: PipelineSchemaMethodOptions
        update?: PipelineSchemaMethodOptions
        patch?: PipelineSchemaMethodOptions
        delete?: PipelineSchemaMethodOptions
    }, description?: string, title?: string) {
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
            schema.definitions[`${method}Options`] = _.cloneDeep(optionsSchemas[method].schemaObject)
        }
        super(schema)
    }

    static mergeOptions(allOptions: {
        create?: PipelineSchemaMethodOptions
        read?: PipelineSchemaMethodOptions
        update?: PipelineSchemaMethodOptions
        patch?: PipelineSchemaMethodOptions
        delete?: PipelineSchemaMethodOptions
    }[]) {
        return allOptions.reduce((result, val) => {
            for (let key in result) {
                if (val[key]) {
                    result[key].merge(val[key])
                }
            }
            return result
        }, { create: new PipelineSchemaMethodOptions(), read: new PipelineSchemaMethodOptions(), update: new PipelineSchemaMethodOptions(), patch: new PipelineSchemaMethodOptions(), delete: new PipelineSchemaMethodOptions()})
    }
}