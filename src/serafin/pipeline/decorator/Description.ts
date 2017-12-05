import { OPTIONS_SCHEMAS } from './decoratorSymbols'
import { PipelineSchemaBuilderProperties } from '../schemaBuilder/Properties'

/**
 * Class and method decorator associating a description to it
 * 
 * @param text 
 */
export function description(text: string) {
    return function (targetOrCtor: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        if (typeof (descriptor) === 'undefined') {
            // Class
            targetOrCtor['description'] = text;
        } else {
            // Method
            if (propertyKey.startsWith('_')) {
                propertyKey = propertyKey.slice(1);
            }
            let optionsSchema: PipelineSchemaBuilderProperties;
            if (!targetOrCtor.hasOwnProperty(OPTIONS_SCHEMAS[propertyKey])) {
                targetOrCtor[OPTIONS_SCHEMAS[propertyKey]] = new PipelineSchemaBuilderProperties()
            }
            optionsSchema = targetOrCtor[OPTIONS_SCHEMAS[propertyKey]]
            optionsSchema.setDescription(text);
        }
    };
}