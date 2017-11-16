import { PipelineSchemaBase } from '../schema/Base'
import * as util from 'util'
import { OPTIONS_SCHEMAS } from './optionsSchemaSymbols'
import { PipelineSchemaMethodOptions } from '../schema/MethodOptions'

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
            let optionsSchema: PipelineSchemaMethodOptions
            if (!targetOrCtor.hasOwnProperty(OPTIONS_SCHEMAS[propertyKey])) {
                targetOrCtor[OPTIONS_SCHEMAS[propertyKey]] = new PipelineSchemaMethodOptions()
            }
            optionsSchema = targetOrCtor[OPTIONS_SCHEMAS[propertyKey]]
            optionsSchema.setDescription(text);
        }
    };
}