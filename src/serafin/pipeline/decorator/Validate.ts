import * as Ajv from 'ajv'
import * as util from 'util';
import { PipelineAbstract } from '../Abstract'

/**
 * Method decorator enabling JSONSchema validation upon a CRUD method
 */
export function validate(target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    let validationFunctions = {
        create: function (params: any[]): void {
            let [resources, options] = params;
            if (this.modelSchema) {
                validateSchema.call(this, {
                    type: 'array',
                    items: { "$ref": "modelSchema#/definitions/createValues" },
                    minItems: 1
                }, resources);
            }
            validateSchema.call(this, "baseSchema#/definitions/create/options", options);
        },
        read: function (params: any[]): void {
            let [query, options] = params;
            if (this.modelSchema) {
                validateSchema.call(this, { "$ref": "modelSchema#/definitions/readQuery" }, query);
            }
            validateSchema.call(this, "baseSchema#/definitions/read/options", options);
        },
        update: function (params: any[]): void {
            let [id, values, options] = params;
            if (this.modelSchema) {
                validateSchema.call(this, 'modelSchema#/definitions/updateValues', values);
            }
            validateSchema.call(this, 'baseSchema#/definitions/update/options', options);
        },
        patch: function (params: any[]): void {
            let [query, values, options] = params;
            if (this.modelSchema) {
                validateSchema.call(this, 'modelSchema#/definitions/patchQuery', query);
                validateSchema.call(this, 'modelSchema#/definitions/patchValues', values);
            }
            validateSchema.call(this, "baseSchema#/definitions/patch/options", options);
        },
        delete: function (params: any[]): void {
            let [query, options] = params;
            if (this.modelSchema) {
                validateSchema.call(this, 'modelSchema#/definitions/deleteQuery', query);
            }
            validateSchema.call(this, "baseSchema#/definitions/delete/options", options);
        }
    }

    if (typeof descriptor.value == 'function' && PipelineAbstract.getCRUDMethods().find((key) => propertyKey == key)) {
        let func: Function = descriptor.value;

        descriptor.value = function (...params) {
            try {
                validationFunctions[propertyKey].call(this, params);
                return func.apply(this, params);
            } catch (e) {
                let callError = new Error(`Validation error in ${Object.getPrototypeOf(this).constructor.name}.${propertyKey} : ${e}`);
                console.error(callError.message);
                return Promise.reject(callError);
            }
        };
    }
}

function validateSchema(schema: any, objectToTest: any): void {
    var ajv = new Ajv();
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
    ajv.addSchema(this.baseSchema.schema, "baseSchema")
    if (this.modelSchema) {
        ajv.addSchema(this.modelSchema.schema, "modelSchema");
    }

    if (!objectToTest) {
        objectToTest = {};
    }

    let valid = ajv.validate(schema, objectToTest)
    if (!valid) {
        throw new Error(ajv.errorsText());
    }
}