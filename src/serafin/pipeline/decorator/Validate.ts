import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validtionError } from "../../error/Error"
import { PipelineAbstract } from '../Abstract'
import { VALIDATE_FUNCTIONS } from './decoratorSymbols'



/**
 * Method decorator enabling JSONSchema validation upon a CRUD method
 */
export function validate(target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    // Create the validation function with a compiled schema, so it can be reused for next validation
    let compileValidationFunction = (instance) => {
        var ajv = new Ajv();
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        ajv.addSchema(instance.modelSchema.schema, "modelSchema")
        if (propertyKey === "create") {
            var validateResources = ajv.compile({
                type: 'array',
                items: { "$ref": "modelSchema#/definitions/createValues" },
                minItems: 1
            });
            return (params: any[]) => {
                let [resources, options] = params;
                let valid = validateResources(resources);
                if (!valid) {
                    return validtionError(ajv.errorsText(validateResources.errors))
                }
            }
        } else if (propertyKey === "read") {
            var validateQuery = ajv.compile({ "$ref": "modelSchema#/definitions/readQuery" });
            return (params: any[]) => {
                let [query, options] = params;
                let valid = validateQuery(query || {});
                if (!valid) {
                    return validtionError(ajv.errorsText(validateQuery.errors))
                }
            }
        } else if (propertyKey === "update") {
            var validateValues = ajv.compile({ "$ref": 'modelSchema#/definitions/updateValues' });
            return (params: any[]) => {
                let [id, values, options] = params;
                let valid = validateValues(values);
                if (!valid) {
                    return validtionError(ajv.errorsText(validateValues.errors))
                }
            }
        } else if (propertyKey === "patch") {
            var validateQuery = ajv.compile({ "$ref": 'modelSchema#/definitions/patchQuery' });
            var validateValues = ajv.compile({ "$ref": 'modelSchema#/definitions/patchValues' });
            return (params: any[]) => {
                let [query, values, options] = params;
                let valid = validateQuery(query) && validateValues(values);
                if (!valid) {
                    return validtionError(ajv.errorsText(validateQuery.errors || validateValues.errors))
                }
            }
        } else if (propertyKey === "delete") {
            var validateQuery = ajv.compile({ "$ref": 'modelSchema#/definitions/deleteQuery' });
            return (params: any[]) => {
                let [query, options] = params;
                let valid = validateQuery(query || {});
                if (!valid) {
                    return validtionError(ajv.errorsText(validateQuery.errors))
                }
            }
        }
    }

    // wrap the function to automatically validate parameters that depends on modelSchema
    if (typeof descriptor.value == 'function' && PipelineAbstract.getCRUDMethods().find((key) => propertyKey == key)) {
        let func: Function = descriptor.value;

        descriptor.value = function (...params) {
            // validation function is cached using a symbol for each method
            this[VALIDATE_FUNCTIONS[propertyKey]] = this[VALIDATE_FUNCTIONS[propertyKey]] || compileValidationFunction(this);
            let validate = this[VALIDATE_FUNCTIONS[propertyKey]];
            let error = validate(params);
            if (error) {
                return Promise.reject(error)
            }
            return func.apply(this, params);
        };
    }
}