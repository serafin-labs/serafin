import {PipelineSchemaPropertiesInterface} from './PropertiesInterface'

export interface PipelineSchemaAllOfInterface {
    title?: string,
    type: string,
    properties: {
        allOf: PipelineSchemaPropertiesInterface[]
    },
    definitions?: {
        model: Object
    }
}