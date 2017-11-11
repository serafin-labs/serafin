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
            description: description || undefined,
            definitions: {
                methods: {}
            }
        };
    }

    setMethodSchema(method: string, schema: {}) {
        this.schema.definitions.methods[method] = schema;
    }

    setSourceDefaultMethods(model, implementedMethods = []) {
        this.schema.definitions.model = model;
        this.schema.definitions.methods = _.pick({
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
                    'id': { type: 'string' },
                    'values': { type: 'object', properties: { "anyOf": { "$ref": "#/definitions/model" } }, "minProperties": 1 }
                },
                required: ['query', 'values']
            },
            'patch': {
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
        }, implementedMethods);
    }

    merge(schema1: PipelineSchemaInterface, schema2: PipelineSchemaInterface): PipelineSchemaInterface {
        let methods = {};
        let merge = (title, description) => {
            return (obj, key) => {
                if (!methods[key]) {
                    methods[key] = { allOf: [] };
                }

                if (obj['allOf']) {
                    obj['allOf'].forEach(allOfObj => {
                        methods[key].allOf.push(allOfObj)
                    });
                } else {
                    obj.pipelineDescription = description;
                    obj.title = title + " - " + key;
                    methods[key].allOf.push(obj);
                }
            };
        };

        _.each(schema1.definitions.methods, merge(schema1.title, schema1.description));
        _.each(schema2.definitions.methods, merge(schema2.title, schema2.description));

        let obj = { ...schema1, ...schema2 };
        obj.definitions.methods = methods
        delete (obj.title);
        delete (obj.description);
        return obj;
    }

    toString() {
        return (util.inspect(this.schema, false, null));
    }
}