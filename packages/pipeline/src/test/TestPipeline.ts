import { PipelineAbstract } from "../PipelineAbstract";
import { IdentityInterface } from "../IdentityInterface";

// @description("test pipeline description")
export class TestPipeline<M extends IdentityInterface, CV = {}, CO = {}, CM = {}, RQ = {}, RO = {}, RM = {},
    UV = {}, UO = {}, UM = {}, PQ = {}, PV = {}, PO = {}, PM = {}, DQ = {}, DO = {}, DM = {}, R = {}> extends PipelineAbstract<M, CV, CO, CM, RQ, RO, RM,
    UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM, R> {

    protected async _create(resources: any[]): Promise<any> {
        return { data: [{ id: '1', method: 'create' }], meta: {} };
    }

    protected async _read(query?: any): Promise<any> {
        return { data: [{ id: '1', method: 'read' }], meta: {} };
    }

    protected async _replace(id: string, values: any): Promise<any> {
        return { data: [{ id: '1', method: 'replace' }], meta: {} };
    }

    protected async _patch(query: any, values: any): Promise<any> {
        return { data: [{ id: '1', method: 'patch' }], meta: {} };
    }

    protected async _delete(query: any): Promise<any> {
        return { data: [{ id: '1', method: 'delete' }], meta: {} };
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
            id: { description: 'id', type: 'string' },
            method: { description: 'method', type: 'string' }
        },
        required: ['id', 'method']
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
    createMeta: { type: 'object', additionalProperties: false },
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
    readMeta: { type: 'object', additionalProperties: false },
    replaceValues:
    {
        type: 'object',
        additionalProperties: false,
        properties: { method: { description: 'method', type: 'string' } },
        required: ['method']
    },
    replaceOptions: { type: 'object', additionalProperties: false },
    replaceMeta: { type: 'object', additionalProperties: false },
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
    patchMeta: { type: 'object', additionalProperties: false },
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
    deleteMeta: { type: 'object', additionalProperties: false }
};
