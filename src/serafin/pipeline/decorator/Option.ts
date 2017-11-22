import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validtionError } from "../../error/Error"
import { PipelineAbstract } from '../Abstract'
import { PipelineSchemaProperties } from '../schema/Properties'
import { OPTIONS_SCHEMAS } from './decoratorSymbols'

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
        let optionsSchema: PipelineSchemaProperties
        if (!target.hasOwnProperty(OPTIONS_SCHEMAS[propertyKey])) {
            target[OPTIONS_SCHEMAS[propertyKey]] = new PipelineSchemaProperties()
        }
        optionsSchema = target[OPTIONS_SCHEMAS[propertyKey]]
        optionsSchema.addProperty(option, schemaObject, description, required);

        // add validation code to the method
        if (validation && typeof descriptor.value == 'function' && PipelineAbstract.getCRUDMethods().find((key) => propertyKey == key)) {
            let func: Function = descriptor.value;

            // validate function to check this option alone
            var ajv = new Ajv();
            ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
            let validate = ajv.compile({
                type: 'object',
                properties: {
                    [option]: schemaObject
                },
                required: required ? [option] : []
            });
            // index of the option parameter based on the method name
            var optPosition = propertyKey === "create" || propertyKey === "read" || propertyKey === "delete" ? 1 : 2;

            // wrap the method to add validation
            descriptor.value = function (...params) {
                // get options from params
                let options = params.length > optPosition ? params[optPosition] : null;
                // run validation
                let valid = validate(options || {});
                if (!valid) {
                    return Promise.reject(validtionError(ajv.errorsText(validate.errors)))
                }
                // call the real implementation
                return func.apply(this, params);
            };
        }
    }
}