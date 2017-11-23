import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validtionError } from "../../error/Error"
import { PipelineAbstract } from '../Abstract'
import { PipelineSchemaMethodOptions } from '../schema/MethodOptions'
import { OPTIONS_SCHEMAS } from './optionsSchemaSymbols'

/**
 * Class or method decorator used to declare an action option, along with its JSONSchema definition.
 * 
 * @param option Name of the option
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 * @param description Description of the option
 * @param validation Flag indicating if this option should be validated automatically. Default value : 'true'
 */
export function option(option: string, schema: Object | (() => Object), required: boolean = true, description: string = null, validation = true) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let schemaObject = null;
        if (typeof schema === "function") {
            schemaObject = schema();
        } else {
            schemaObject = schema;
        }

        // add option metadata to the pipeline
        let optionsSchema: PipelineSchemaMethodOptions
        if (!target.hasOwnProperty(OPTIONS_SCHEMAS[propertyKey])) {
            target[OPTIONS_SCHEMAS[propertyKey]] = new PipelineSchemaMethodOptions()
        }
        optionsSchema = target[OPTIONS_SCHEMAS[propertyKey]]
        optionsSchema.addOption(option, schemaObject, description, required);
    }
}