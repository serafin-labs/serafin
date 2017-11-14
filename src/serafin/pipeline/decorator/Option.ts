import { PipelineSchemaAllOptions } from '../schema/AllOptions'

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
        let schemaObject = null;
        if (typeof schema === "function") {
            schemaObject = schema();
        } else {
            schemaObject = schema;
        }

        // add option metadata to the pipeline
        PipelineSchemaAllOptions.addOptionToTarget(target, propertyKey, option, schemaObject, description, required);
    }
}