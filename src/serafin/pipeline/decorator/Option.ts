import { PipelineSchemaProperties } from '../schema/Properties'
import { OPTIONS_SCHEMAS } from './decoratorSymbols'

/**
 * Class or method decorator used to declare an action option, along with its JSONSchema definition.
 * 
 * @param option Name of the option
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 * @param description Description of the option
 * @param validation Flag indicating if this option should be validated automatically. Default value : 'true'
 */
export function option(option: string, schema: Object | (() => Object), required: boolean = true, description: string = null, validation = true) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // add option metadata to the pipeline
        if (propertyKey.startsWith('_')) {
            propertyKey = propertyKey.slice(1);
        }
        let optionsSchema: PipelineSchemaProperties;
        if (!target.hasOwnProperty(OPTIONS_SCHEMAS[propertyKey])) {
            target[OPTIONS_SCHEMAS[propertyKey]] = new PipelineSchemaProperties()
        }
        optionsSchema = target[OPTIONS_SCHEMAS[propertyKey]];
        optionsSchema.addProperty(option, (typeof schema === "function") ? schema() : schema, description, required);
    }
}