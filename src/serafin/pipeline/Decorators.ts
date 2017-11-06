import { JSONSchema4 } from "json-schema"

/**
 * Option decorator used to declare an action option, along with its JSONSchema definition.
 * 
 * @param property Name of the option
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 */
export function option(property: string, schema: Object | (() => Object), required: boolean = true) {
    return parameterDecorator('option', property, schema, required);
}

export function queryProperty(property: string, schema: Object | (() => Object), required: boolean = true) {
    return parameterDecorator('query', property, schema, required);
}

export function resourceProperty(property: string, schema: Object | (() => Object), required: boolean = true) {
    return parameterDecorator('resources', property, schema, required);
}

export function resourceValue(property: string, schema: Object | (() => Object), required: boolean = true) {
    return parameterDecorator('values', property, schema, required);
}

function parameterDecorator(parameterName:string, property: string, schema: Object | (() => Object), required: boolean = true) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        console.log(target.schemaHelper);
        if (!descriptor.value['properties']) {
            descriptor.value['properties'] = {
                type: 'object',
                properties: {

                }
            };
        }

      //  descriptor.value['properties'].properties[parameterName].properties[property] = (typeof schema == 'function') ? schema() : schema;
        if (required) {
           // descriptor.value['properties'].properties[parameterName].required.push(property);
        }

        console.log();
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


