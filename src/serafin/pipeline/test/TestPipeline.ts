import { PipelineAbstract, PipeAbstract, PipelineRelation, description } from ".."
import { SchemaBuilder } from "@serafin/schema-builder";
import { IdentityInterface } from "../IdentityInterface";

@description("test pipeline description")
export class TestPipeline<T extends IdentityInterface> extends PipelineAbstract<T> {
    @description("create test description")
    protected _create(resources: any[], options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'create' }] });
    }

    @description("read test description")
    protected _read(query?: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'read' }] });
    }

    @description("update test description")
    protected _update(id: string, values: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'update' }] });
    }

    @description("patch test description")
    protected _patch(query: any, values: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'patch' }] });
    }

    @description("delete test description")
    protected _delete(query: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'delete' }] });
    }
}

export const schemaTestPipeline = {
    modelSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    id: { description: 'id', type: 'string' },
                    method: { description: 'method', type: 'string' }
                },
            required: ['id', 'method']
        },
    readQuerySchemaBuilder:
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
    readOptionsSchemaBuilder: { type: 'object', additionalProperties: false },
    readWrapperSchemaBuilder: { type: 'object', additionalProperties: false },
    createValuesSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties: { method: { description: 'method', type: 'string' } },
            required: ['method']
        },
    createOptionsSchemaBuilder: { type: 'object', additionalProperties: false },
    createWrapperSchemaBuilder: { type: 'object', additionalProperties: false },
    updateValuesSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties: { method: { description: 'method', type: 'string' } },
            required: ['method']
        },
    updateOptionsSchemaBuilder: { type: 'object', additionalProperties: false },
    updateWrapperSchemaBuilder: { type: 'object', additionalProperties: false },
    patchQuerySchemaBuilder:
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
    patchValuesSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties: { method: { description: 'method', type: 'string' } }
        },
    patchOptionsSchemaBuilder: { type: 'object', additionalProperties: false },
    patchWrapperSchemaBuilder: { type: 'object', additionalProperties: false },
    deleteQuerySchemaBuilder:
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
    deleteOptionsSchemaBuilder: { type: 'object', additionalProperties: false },
    deleteWrapperSchemaBuilder: { type: 'object', additionalProperties: false }
};
