import {PipelineSchemaPropertiesInterface} from './PropertiesInterface'

export interface PipelineSchemaInterface {
    title?: string,
    type: string,
    properties: PipelineSchemaPropertiesInterface,
    definitions?: {
        model: Object
    }
}

export interface PipelineSchemaAllOfInterface {
    title?: string,
    type: string,
    properties: {
        allOf: [PipelineSchemaPropertiesInterface]
    },
    definitions?: {
        model: Object
    }
}