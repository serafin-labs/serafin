import { setPipelineDescription } from '../Abstract'

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
            //setPipelineDescription(targetOrCtor, propertyKey, text);
        }
    };
}