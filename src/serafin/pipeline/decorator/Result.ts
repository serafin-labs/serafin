import { PipelineSchemaBuilderProperties } from '../schemaBuilder/Properties'
import { READ_DATA_SCHEMA } from './decoratorSymbols'


/**
 * method decorator used to declare an additional result property, along with its JSONSchema definition.
 * 
 * @param name Name of the property
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 * @param description Description of the property
 */
export function result(name: string, schema: Object, required: boolean = true, description: string = null) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // add option metadata to the pipeline
        let dataSchemaBuilder: PipelineSchemaBuilderProperties
        if (!target.hasOwnProperty(READ_DATA_SCHEMA)) {
            target[READ_DATA_SCHEMA] = new PipelineSchemaBuilderProperties()
        }
        dataSchemaBuilder = target[READ_DATA_SCHEMA]
        dataSchemaBuilder.addProperty(name, schema, description, required);
    }
}