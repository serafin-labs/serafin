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
        if (description) {
            descriptor.value['properties'].options.properties[option].description = description;
        }
        if (required) {
            descriptor.value['properties'].options.required.push(option);
        }
    }
}