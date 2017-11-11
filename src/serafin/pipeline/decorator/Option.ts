import { setPipelineMethodSchema } from '../Abstract'

/**
 * Class or method decorator used to declare an action option, along with its JSONSchema definition.
 * 
 * @param option Name of the option
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 * @param description Description of the option
 */
export function option(option: string, schema: Object | (() => Object), required: boolean = true, description: string = null) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let methodSchema = {
            type: 'object',
            properties: {
                options: {
                    type: 'object',
                    properties: {
                        [option]: (typeof schema == 'function') ? schema() : schema
                    },
                    required: []
                }
            }
        };

        if (description) {
            methodSchema.properties.options.properties[option]['description'] = description;
        }

        if (required) {
            methodSchema.properties.options.required.push(option);
        }

        setPipelineMethodSchema(target, propertyKey, methodSchema);
    }
}