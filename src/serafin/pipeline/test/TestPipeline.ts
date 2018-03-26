import { PipelineAbstract, PipeAbstract, PipelineRelation, description } from ".."
import { SchemaBuilder } from "@serafin/schema-builder";
import { IdentityInterface } from "../IdentityInterface";

// @description("test pipeline description")
export class TestPipeline<T extends IdentityInterface> extends PipelineAbstract<T> {
    protected _create(resources: any[], options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'create' }] });
    }

    protected _read(query?: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'read' }] });
    }

    protected _replace(id: string, values: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'replace' }] });
    }

    protected _patch(query: any, values: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'patch' }] });
    }

    protected _delete(query: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'delete' }] });
    }
}

export const schemaTestPipeline =
    {
        model:
            {
                type: 'object',
                additionalProperties: false,
                properties:
                    {
                        id:
                            {
                                oneOf:
                                    [{ description: 'id', type: 'string' },
                                    { type: 'array', items: { description: 'id', type: 'string' } }]
                            }
                    },
                required: ['id']
            },
        createValues:
            {
                type: 'object',
                additionalProperties: false,
                properties:
                    {
                        id: { description: 'id', type: 'string' },
                        method: { description: 'method', type: 'string' }
                    },
                required: ['method']
            },
        createOptions: { type: 'object', additionalProperties: false },
        createWrapper: { type: 'object', additionalProperties: false },
        readQuery:
            {
                type: 'object',
                additionalProperties: false,
                properties:
                    {
                        id:
                            {
                                oneOf:
                                    [{ description: 'id', type: 'string' },
                                    { type: 'array', items: { description: 'id', type: 'string' } }]
                            },
                        method:
                            {
                                oneOf:
                                    [{ description: 'method', type: 'string' },
                                    {
                                        type: 'array',
                                        items: { description: 'method', type: 'string' }
                                    }]
                            }
                    }
            },
        readOptions: { type: 'object', additionalProperties: false },
        readWrapper: { type: 'object', additionalProperties: false },
        replaceValues:
            {
                type: 'object',
                additionalProperties: false,
                properties: { method: { description: 'method', type: 'string' } },
                required: ['method']
            },
        replaceOptions: { type: 'object', additionalProperties: false },
        replaceWrapper: { type: 'object', additionalProperties: false },
        patchQuery:
            {
                type: 'object',
                additionalProperties: false,
                properties:
                    {
                        id:
                            {
                                oneOf:
                                    [{ description: 'id', type: 'string' },
                                    { type: 'array', items: { description: 'id', type: 'string' } }]
                            }
                    },
                required: ['id']
            },
        patchValues:
            {
                type: 'object',
                additionalProperties: false,
                properties: { method: { description: 'method', type: 'string' } }
            },
        patchOptions: { type: 'object', additionalProperties: false },
        patchWrapper: { type: 'object', additionalProperties: false },
        deleteQuery:
            {
                type: 'object',
                additionalProperties: false,
                properties:
                    {
                        id:
                            {
                                oneOf:
                                    [{ description: 'id', type: 'string' },
                                    { type: 'array', items: { description: 'id', type: 'string' } }]
                            }
                    },
                required: ['id']
            },
        deleteOptions: { type: 'object', additionalProperties: false },
        deleteWrapper: { type: 'object', additionalProperties: false }
    };
