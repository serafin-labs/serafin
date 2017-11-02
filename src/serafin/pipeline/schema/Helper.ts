import * as _ from "lodash"
import * as util from "util"
import * as Model from "../model/Resource"
import { SchemaInterface } from "./Interface"

export class PipelineSchemaHelper {
    public schema: SchemaInterface;

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

    private createMethod(name) {
        if (!this.schema.properties.methods.properties[name]) {
            this.schema.properties.methods.properties[name] = { 'type': 'object', 'properties': {} };
        }
    }

    setMethodProperties(name: string, properties: {}) {
        this.createMethod(name);
        this.schema.properties.methods.properties[name].properties = properties;
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
                        'query': { "anyOf": { "$ref": "#/definitions/model" } }
                    }
                },
                'update': {
                    type: 'object',
                    properties: {
                        'query': { "anyOf": { "$ref": "#/definitions/model" } },
                        'values': { "anyOf": { "$ref": "#/definitions/model/properties" }, "minProperties": 1 }
                    },
                    required: ['query', 'values']
                },
                'delete': {
                    type: 'object',
                    properties: {
                        'query': { "anyOf": { "$ref": "#/definitions/model" } }
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