import { JSONSchema4 } from "json-schema"

/**
 * Parameter decorator used to declare an action parameter, along with its JSONSchema definition. This parameter will become one of
 * the properties of the JSONSchema representing the pipeline
 * 
 * @param property Name of the parameter
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 */
export function option(property: string, schema: JSONSchema4 | (() => JSONSchema4), required: boolean = true) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!descriptor.value.params) {
            descriptor.value.params = [];
        }

        if (!descriptor.value.required) {
            descriptor.value.required = [];
        }

        descriptor.value.params[property] = (typeof schema == 'function') ? schema() : schema;
        if (required) {
            descriptor.value.required.push(property);
        }
    }
}

/**
 * Class decorator associating a description
 * 
 * @param text 
 */
export function description(text: string) {
    return function (targetOrCtor: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        if (typeof (descriptor) === 'undefined') {
            targetOrCtor['description'] = text;
        } else {
            descriptor.value.description = text;
        }
    };
}


