import { PipelineAbstract } from '../Abstract'
import { PipelineSchemaProperties } from '../schema/Properties'

/**
 * Symbols where schema of options are stored
 */
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
        create?: PipelineSchemaProperties
        read?: PipelineSchemaProperties
        update?: PipelineSchemaProperties
        patch?: PipelineSchemaProperties
        delete?: PipelineSchemaProperties
    } = {};
    PipelineAbstract.getCRUDMethods().forEach(method => {
        if (target[OPTIONS_SCHEMAS[method]]) {
            result[method] = target[OPTIONS_SCHEMAS[method]]
        }
    })
    return result;
}

/**
 * Symbol where the schema of read result properties is stored
 */
export const READ_DATA_SCHEMA = Symbol("Read Data Schema");

/**
 * Get a schema with all properties created through 'result' on a target object
 */
export function getDataSchema(target: PipelineAbstract) {
    return target[READ_DATA_SCHEMA];
}

/**
 * Symbols where validation functions are stored
 */
export const VALIDATE_FUNCTIONS = {
    "create": Symbol("Create Validation Function"),
    "read": Symbol("Read Validation Function"),
    "update": Symbol("Update Validation Function"),
    "patch": Symbol("Patch Validation Function"),
    "delete": Symbol("Delete Validation Function")
};