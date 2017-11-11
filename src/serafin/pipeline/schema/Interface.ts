import { PipelineSchemaMethodInterface } from './MethodInterface'

export interface PipelineSchemaInterface {
    title?: string,
    type: string,
    description?: string,
    definitions: {
        model?: Object,
        methods: {
            'create'?: PipelineSchemaMethodInterface & {
                properties: {
                    'resources'?: {
                        type?: string,
                        items?: Object
                        minItems?: number
                    }
                },
                required?: string[] | { oneOf: Object[] }
            },
            'read'?: PipelineSchemaMethodInterface & {
                properties: {
                    'query'?: Object
                }
            } | { oneOf: Object[] },
            'update'?: PipelineSchemaMethodInterface & {
                properties: {
                    'id': { type: string },
                    'values'?: Object
                }
                required?: string[]
            } | { oneOf: Object[] },
            'patch'?: PipelineSchemaMethodInterface & {
                properties: {
                    'query'?: Object,
                    'values'?: Object
                }
                required?: string[]
            } | { oneOf: Object[] },
            'delete'?: PipelineSchemaMethodInterface & {
                properties: {
                    'query'?: Object
                },
                required?: string[]
            } | { oneOf: Object[] }
        }
    }
}

