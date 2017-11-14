import * as _ from 'lodash'
import { PipelineSchemaOptions } from './Options'
import { PipelineAbstract } from '../Abstract'
import { JSONSchema4 } from "json-schema"

const OPTIONS_SCHEMAS = Symbol('optionsSchemas');

export class PipelineSchemaAllOptions {
    optionsSchemas: {
        create?: PipelineSchemaOptions
        read?: PipelineSchemaOptions
        update?: PipelineSchemaOptions
        patch?: PipelineSchemaOptions
        delete?: PipelineSchemaOptions
    } = {};

    public addOption(method: string, name: string, schema: JSONSchema4, description: string, required: boolean) {
        if (!this.optionsSchemas[method]) {
            this.optionsSchemas[method] = new PipelineSchemaOptions();
        }

        this.optionsSchemas[method].addOption(name, schema, description, required);
    }

    public merge(allOptionsSchema: PipelineSchemaAllOptions = null) {
        if (!allOptionsSchema) {
            return this;
        }

        for (let method in allOptionsSchema.optionsSchemas) {
            this.optionsSchemas[method] = allOptionsSchema.optionsSchemas[method].merge(this.optionsSchemas[method]);
        }
        return this;
    }

    public flatten() {
        let result = {} as {
            create?: PipelineSchemaAllOptions
            read?: PipelineSchemaAllOptions
            update?: PipelineSchemaAllOptions
            patch?: PipelineSchemaAllOptions
            delete?: PipelineSchemaAllOptions
        }

        PipelineAbstract.getCRUDMethods().map(method => {
            return [this.optionsSchemas[method].reduce((mergedOptions: PipelineSchemaOptions, currentOptions: PipelineSchemaOptions) => {
                return mergedOptions.merge(currentOptions)
            }, new PipelineSchemaOptions()), method]
        }).forEach((params) => {
            let [mergedOptions, method] = params
            result[method] = mergedOptions
        })
        return result;
    }

    static addOptionToTarget(target: PipelineAbstract, method: string, name: string, schema: JSONSchema4, description: string, required: boolean) {
        // initialize the objet holding the options schemas metadata if it was not initialized yet
        if (!target[OPTIONS_SCHEMAS]) {
            target[OPTIONS_SCHEMAS] = new PipelineSchemaAllOptions();
        }
        target[OPTIONS_SCHEMAS].addOption(method, name, schema, description, required)
    }

    static getForTarget(target: Object) {
        return target[OPTIONS_SCHEMAS] || new PipelineSchemaAllOptions();
    }

    get schema() {
        return _.mapValues(this.optionsSchemas, (optionSchema) => optionSchema.schema);
    }
}