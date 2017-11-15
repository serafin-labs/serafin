import { PipelineSchemaBase } from '../schema/Base'
import * as util from 'util'
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
            PipelineSchemaBase.setMethodDescriptionToTarget(targetOrCtor, propertyKey, text);
        }
    };
}