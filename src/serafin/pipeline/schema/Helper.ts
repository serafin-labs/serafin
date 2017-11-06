import { PipelineAbstract } from '../Abstract';
import * as _ from 'lodash';
import * as util from 'util';
import * as Model from '../model/Resource';
import { PipelineSchemaInterface } from "./Interface"

export class PipelineSchemaHelper {
    public schema: PipelineSchemaInterface;

    constructor(name: string, description?: string) {
        this.schema = {
            title: name,
            type: 'object',
            properties: {
                description: description || undefined,
                methods: { 'type': 'object', properties: {} }
            }
        };
    }

    private createMethod(method:string) {
        if (!this.schema.properties.methods.properties[method]) {
            this.schema.properties.methods.properties[method] = { 'type': 'object', 'properties': {} };
        }
    }

    private createMethodProperty(method:string, propertyName:string) {
        this.createMethod(method);
        if (!this.schema.properties.methods.properties[name].properties[propertyName]) {
            this.schema.properties.methods.properties[name].properties[propertyName] = { 'type': 'object', 'properties': {
            } };
        }
    }

    setMethodProperties(name: string, propertyName:string, properties: {}) {
        this.createMethodProperty(name, propertyName);
        this.schema.properties.methods.properties[name].properties[propertyName].properties = properties;
    }

    setMethodDescription(name: string, description: string) {
        this.createMethod(name);
        this.schema.properties.methods.properties[name].description = description;
    }

    setSourceDefaultMethods(model: Model.Definition, implementedMethods = []) {
        this.schema.definitions = { model: model.schema };
        this.schema.properties.methods = {
            type: 'object',
            properties: _.pick({
                'create': {
                    type: 'object',
                    properties: {
                        'resources': {
                            type: 'array',
                            items: { "$ref": "#/definitions/model" },
                            minItems: 1
                        }
                    },
                    required: ['resources']
                },
                'read': {
                    type: 'object',
                    properties: {
                        'query': { type: 'object', properties: { "anyOf": { "$ref": "#/definitions/model" } } },
                    }
                },
                'update': {
                    type: 'object',
                    properties: {
                        'query': { type: 'object', properties: { "anyOf": { "$ref": "#/definitions/model" } } },
                        'values': { type: 'object', properties: { "anyOf": { "$ref": "#/definitions/model" } }, "minProperties": 1 }
                    },
                    required: ['query', 'values']
                },
                'delete': {
                    type: 'object',
                    properties: {
                        'query': { type: 'object', properties: { "anyOf": { "$ref": "#/definitions/model" } } },
                    },
                    required: ['query']
                },
            }, implementedMethods)
        }
    }

    toString() {
        return (util.inspect(this.schema, false, null));
    }
}