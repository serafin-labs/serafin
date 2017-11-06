import { JSONSchema4 } from "json-schema"

/**
 * Option decorator used to declare an action option, along with its JSONSchema definition.
 * 
 * @param property Name of the option
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 */
export function option(option: string, schema: Object | (() => Object), required: boolean = true, description: string = null) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!descriptor.value['properties']) {
            descriptor.value['properties'] = {
                options: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            };
        }

        descriptor.value['properties'].options.properties[option] = (typeof schema == 'function') ? schema() : schema;
        if (required) {
           descriptor.value['properties'].options.required.push(option);
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


