export interface PipelineSchemaPropertiesInterface {
    description?: string,
    methods: {
        'type': string,
        properties: {
            'create'?: {
                type: string,
                properties: {
                    'resources'?: {
                        type?: string,
                        items?: Object
                        minItems?: number
                    }
                },
                required?: string[]
            },
            'read'?: {
                type: string,
                properties: {
                    'query'?: Object
                }
            },
            'update'?: {
                type: string,
                properties: {
                    'query'?: Object,
                    'values'?: Object
                }
                required?: string[]
            },
            'patch'?: {
                type: string,
                properties: {
                    'query'?: Object,
                    'values'?: Object
                }
                required?: string[]
            },
            'delete'?: {
                type: string,
                properties: {
                    'query'?: Object
                },
                required?: string[]
            }
        }
    }
}