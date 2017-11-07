import {PipelineSchemaPropertiesInterface} from './PropertiesInterface'

export interface PipelineSchemaInterface {
    title?: string,
    type: string,
    description?: string,
    properties: PipelineSchemaPropertiesInterface,
    definitions?: {
        model: Object
    }
}

