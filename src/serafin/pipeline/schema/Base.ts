import * as _ from 'lodash'
import { PipelineSchemaMethodOptions } from './MethodOptions'
import { PipelineAbstract } from '../Abstract'
import { JSONSchema4 } from "json-schema"
import { PipelineSchemaAbstract } from './Abstract';
import { PipelineSchemaModel } from './Model';
import { ResourceIdentityInterface } from './ResourceInterfaces';

const OPTIONS_SCHEMAS = Symbol('optionsSchemas');

export class PipelineSchemaBase extends PipelineSchemaAbstract {
    private description;
    private title;
    private model;

    public optionsSchemas: {
        create?: PipelineSchemaMethodOptions
        read?: PipelineSchemaMethodOptions
        update?: PipelineSchemaMethodOptions
        patch?: PipelineSchemaMethodOptions
        delete?: PipelineSchemaMethodOptions
    };

    constructor(title: string) {
        let schema = {
            title: title,
            type: 'object',
            definitions: {},
        } as JSONSchema4;
        super(schema)
        this.optionsSchemas = {
            create: new PipelineSchemaMethodOptions(),
            read: new PipelineSchemaMethodOptions(),
            update: new PipelineSchemaMethodOptions(),
            patch: new PipelineSchemaMethodOptions(),
            delete: new PipelineSchemaMethodOptions()
        };
    }

    public addOption(method: string, name: string, schema: JSONSchema4, description: string, required: boolean) {
        // if (!this.optionsSchemas[method]) {
        //     this.optionsSchemas[method] = new PipelineSchemaMethodOptions();
        // }

        this.optionsSchemas[method].addOption(name, schema, description, required);
    }

    public setDescription(description: string) {
        this.schemaObject['description'] = description;
    }

    public setMethodDescription(method: string, description: string) {
        if (!this.optionsSchemas[method]) {
            this.optionsSchemas[method] = new PipelineSchemaMethodOptions();
        }

        this.optionsSchemas[method].setDescription(description);
    }

    public merge(pipelineSchemaBase: PipelineSchemaBase = null) {
        if (!pipelineSchemaBase) {
            return this;
        }

        for (let method in pipelineSchemaBase.optionsSchemas) {
            this.optionsSchemas[method] = pipelineSchemaBase.optionsSchemas[method].merge(this.optionsSchemas[method]);
        }
        return this;
    }

    public setModel<T extends ResourceIdentityInterface>(model: PipelineSchemaModel<T>) {
        this.model = model;
    }

    static addOptionToTarget<T extends PipelineAbstract>(target: { new(): T }, method: string, name: string, schema: JSONSchema4, description: string, required: boolean) {
        PipelineSchemaBase.getForTarget(target).addOption(method, name, schema, description, required)
    }

    static setDescriptionToTarget<T extends PipelineAbstract>(target: { new(): T }, description: string) {
        PipelineSchemaBase.getForTarget(target).setDescription(description);
    }

    static setMethodDescriptionToTarget<T extends PipelineAbstract>(target: { new(): T }, method: string, description: string) {
        PipelineSchemaBase.getForTarget(target).setMethodDescription(method, description);
    }

    static getForTarget<T extends PipelineAbstract>(target: { new(): T }) {
        if (!target[OPTIONS_SCHEMAS]) {
            target[OPTIONS_SCHEMAS] = new PipelineSchemaBase(target.constructor.name);
        }
        return target[OPTIONS_SCHEMAS];
    }

    get schema() {
        this.schemaObject.definitions = _.mapValues(this.optionsSchemas, (optionSchema) => ({ options: optionSchema.schema }));
        if (this.model) {
            this.schemaObject = _.merge(this.schemaObject, this.model.schemaObject);
        }

        return this.schemaObject;
    }
}