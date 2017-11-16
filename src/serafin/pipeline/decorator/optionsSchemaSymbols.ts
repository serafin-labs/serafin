import { PipelineAbstract } from '../Abstract'
import { PipelineSchemaMethodOptions } from '../schema/MethodOptions'

export const OPTIONS_SCHEMAS = {
    "create": Symbol("Create Options Schema"),
    "read": Symbol("Read Options Schema"),
    "update": Symbol("Update Options Schema"),
    "patch": Symbol("Patch Options Schema"),
    "delete": Symbol("Delete Options Schema")
};

/**
 * Get an object with all OptionsSchema created through 'option' and 'description' decorators on a target object
 */
export function getOptionsSchemas(target: PipelineAbstract) {
    let result: {
        create?: PipelineSchemaMethodOptions
        read?: PipelineSchemaMethodOptions
        update?: PipelineSchemaMethodOptions
        patch?: PipelineSchemaMethodOptions
        delete?: PipelineSchemaMethodOptions
    } = {};
    PipelineAbstract.getCRUDMethods().forEach(method => {
        if (target[OPTIONS_SCHEMAS[method]]) {
            result[method] = target[OPTIONS_SCHEMAS[method]]
        }
    })
    return result;
}
