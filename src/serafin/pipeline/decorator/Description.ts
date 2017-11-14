import { PipelineSchemaAllOptions } from '../schema/AllOptions'

/**
 * Class decorator associating a description to it
 * 
 * @param text 
 */
export function description(text: string) {
    return function (targetOrCtor: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        if (typeof (descriptor) === 'undefined') {
            targetOrCtor['description'] = text;
        } else {
            PipelineSchemaAllOptions.addDescriptionToTarget(targetOrCtor, propertyKey, text);
        }
    };
}