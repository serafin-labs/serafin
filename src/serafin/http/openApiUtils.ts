import { JSONSchema4 } from "json-schema";
import * as Swagger from 'swagger-schema-official';
import * as _ from "lodash";
import * as jsonpointer from 'jsonpointer';

import { throughJsonSchema } from "../schema/throughJsonSchema"

/**
 * Go through the given schema and remove properties not supported by Open API
 * 
 * @param schema 
 */
export function jsonSchemaToOpenApiSchema(schema: JSONSchema4) {
    throughJsonSchema(schema, (s) => {
        delete s.id;
        delete s.$id;
        delete s.$schema;
    })
    return schema
}

/**
 * Go through the whole schema and modify refs that points to a local schema and prepend the basepath.=
 */
export function remapRefs(schema: JSONSchema4, basePath: string) {
    throughJsonSchema(schema, (s) => {
        if (s.$ref && s.$ref.startsWith("#")) {
            s.$ref = `${basePath}${s.$ref.substr(1)}`
        }
    })
    return schema
}


/**
 * Flatten the given schema definitions, so any sub-schema is moved back to the top and refs are moved accordingly.
 * The name of the subschema is obtained by combining property names using camelCase.
 * 
 * @param schema 
 */
export function flattenSchemas(definitions: { [name: string]: JSONSchema4 }) {
    // determine schemas that needs to be moved
    let definitionsToMove = []
    for (let name in definitions) {
        let schema = definitions[name]
        if (schema.definitions) {
            for (let subSchemaName in schema.definitions) {
                // add the sub schema to an array so it can be apended to definitions
                let newSchemaName = `${name}${_.upperFirst(subSchemaName)}`
                definitionsToMove.push([newSchemaName, schema.definitions[subSchemaName]])

                // remap refs to work with the futur position of this schema
                let originalPath = `#/definitions/${name}/definitions/${subSchemaName}`;
                let newPath = `#/definitions/${newSchemaName}`
                throughJsonSchema(_.values(definitions), s => {
                    if (s.$ref && s.$ref === originalPath) {
                        s.$ref = newPath
                    }
                })
            }
            delete schema.definitions
        }
    }

    // move the definitions to the top
    definitionsToMove.forEach((def) => {
        let [name, schema] = def;
        definitions[name] = schema;
    })

    // if definitions were moved, call recursively flatten to process other 'definitions' that have emerged
    if (definitionsToMove.length > 0) {
        flattenSchemas(definitions)
    }
}


/**
 * Deduce parameters to set in Open API spec from the JSON Schema provided.
 * /!\ This function doesn't support the full spectrum of JSON Schema.
 * Things like pattern properties are for example impossible to convert to Open API Parameter format.
 * 
 * @param schema 
 * @param definitions 
 */
export function schemaToSwaggerParameter(schema: JSONSchema4, spec: Swagger.Spec): Swagger.Parameter[] {
    if (schema && schema.$ref && schema.$ref.startsWith("#")) {
        // the schema is a reference. Let's try to locate the schema
        return schemaToSwaggerParameter(jsonpointer.get(spec, schema.$ref.substr(1)), spec)
    }
    if (schema && schema.type === "object") {
        let results = []
        for (let property in schema.properties) {
            let propertySchema = schema.properties[property]
            if (["string", "number", "boolean", "integer"].indexOf(propertySchema.type as string) !== -1) {
                // we have a primitive type
                let parameter: Swagger.Parameter = {
                    in: "query",
                    name: property,
                    type: propertySchema.type as any,
                    description: propertySchema.description,
                    required: schema.required && schema.required.indexOf(property) !== -1,

                }
                if (propertySchema.minimum) {
                    parameter.minimum = propertySchema.minimum
                }
                if (propertySchema.maximum) {
                    parameter.maximum = propertySchema.maximum
                }
                if (propertySchema.default) {
                    parameter.default = propertySchema.default
                }
                results.push(parameter)
            }
            if (propertySchema.type === "array" && ["string", "number", "boolean", "integer"].indexOf(propertySchema.items["type"] as string) !== -1) {
                // if the array contains a primitive type
                let parameter: Swagger.Parameter = {
                    in: "query",
                    name: property,
                    type: "array",
                    description: propertySchema.description,
                    required: schema.required && schema.required.indexOf(property) !== -1,
                    collectionFormat: "multi",
                    items: {
                        type: propertySchema.items["type"] as any
                    }
                }
                if (propertySchema.default) {
                    parameter.default = propertySchema.default
                }
                results.push(parameter)
            }
        }
        if (schema.oneOf) {
            results = results.concat(schema.oneOf.map(subSchema => schemaToSwaggerParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
        }
        if (schema.anyOf) {
            results = results.concat(schema.anyOf.map(subSchema => schemaToSwaggerParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
        }
        if (schema.allOf) {
            results = results.concat(schema.allOf.map(subSchema => schemaToSwaggerParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
        }
        return results
    }
    return []
}

/**
 * Filter a paramater array to remove duplicates. The first occurance is kept and the others are discarded.
 * 
 * @param parameters 
 */
export function removeDuplicatedParameters(parameters: Swagger.Parameter[]): Swagger.Parameter[] {
    // filter duplicated params (in case allOf, oneOf or anyOf contains multiple schemas with the same property)
    return parameters.filter((value: Swagger.Parameter, index, array) => {
        for (var i = 0; i < index; ++i) {
            if (array[i].name === value.name) {
                return false
            }
        }
        return true
    })
}

/**
 * Parse the given paramters array and move the specified ones to `path`
 * 
 * @param parameters 
 */
export function pathParameters(parameters: Swagger.Parameter[], inPath: string[]): Swagger.Parameter[] {
    parameters.forEach(parameter => {
        if (inPath.indexOf(parameter.name) !== -1) {
            parameter.in = "path"
        }
    })
    return parameters
}