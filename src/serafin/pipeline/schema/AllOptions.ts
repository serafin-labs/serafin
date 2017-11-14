import * as _ from 'lodash'
import { PipelineSchemaMethodOptions } from './MethodOptions'
import { PipelineAbstract } from '../Abstract'
import { JSONSchema4 } from "json-schema"
import { PipelineSchemaAbstract } from './Abstract';

const OPTIONS_SCHEMAS = Symbol('optionsSchemas');

export class PipelineSchemaAllOptions extends PipelineSchemaAbstract {
    private description;
    private title;
    public optionsSchemas: {
        create?: PipelineSchemaMethodOptions
        read?: PipelineSchemaMethodOptions
        update?: PipelineSchemaMethodOptions
        patch?: PipelineSchemaMethodOptions
        delete?: PipelineSchemaMethodOptions
    };

    constructor(title: string) {
        let schema = {
            id: title.toLowerCase(),
            title: title,
            type: 'object',
            definitions: {},
        } as JSONSchema4;
        super(schema)
        this.optionsSchemas = {};
    }

    public addOption(method: string, name: string, schema: JSONSchema4, description: string, required: boolean) {
        if (!this.optionsSchemas[method]) {
            this.optionsSchemas[method] = new PipelineSchemaMethodOptions();
        }

        this.optionsSchemas[method].addOption(name, schema, description, required);
    }

    public setDescription(method: string, description: string) {
        if (!this.optionsSchemas[method]) {
            this.optionsSchemas[method] = new PipelineSchemaMethodOptions();
        }

        this.optionsSchemas[method].setDescription(description);
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
            return [this.optionsSchemas[method].reduce((mergedOptions: PipelineSchemaMethodOptions, currentOptions: PipelineSchemaMethodOptions) => {
                return mergedOptions.merge(currentOptions)
            }, new PipelineSchemaMethodOptions()), method]
        }).forEach((params) => {
            let [mergedOptions, method] = params
            result[method] = mergedOptions
        })
        return result;
    }

    static addOptionToTarget<T extends PipelineAbstract>(target: { new(): T }, method: string, name: string, schema: JSONSchema4, description: string, required: boolean) {
        // initialize the objet holding the options schemas metadata if it was not initialized yet
        if (!target[OPTIONS_SCHEMAS]) {
            target[OPTIONS_SCHEMAS] = new PipelineSchemaAllOptions(target.constructor.name);
        }
        target[OPTIONS_SCHEMAS].addOption(method, name, schema, description, required)
    }

    static addDescriptionToTarget<T extends PipelineAbstract>(target: { new(): T }, method: string, description: string) {
        // initialize the objet holding the options schemas metadata if it was not initialized yet
        if (!target[OPTIONS_SCHEMAS]) {
            target[OPTIONS_SCHEMAS] = new PipelineSchemaAllOptions(target.constructor.name);
        }
        target[OPTIONS_SCHEMAS].setDescription(method, description);
    }

    static getForTarget<T extends PipelineAbstract>(target: { new(): T }) {
        return target[OPTIONS_SCHEMAS] || new PipelineSchemaAllOptions(target.constructor.name);
    }

    get schema() {
        this.schemaObject.definitions = _.mapValues(this.optionsSchemas, (optionSchema) => optionSchema.schema);
        return this.schemaObject;
    }
}