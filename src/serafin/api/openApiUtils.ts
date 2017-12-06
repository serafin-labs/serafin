import { OpenAPIObject, ParameterObject, SchemaObject, ReferenceObject } from "../openApi"
import * as _ from "lodash";
import * as jsonpointer from 'jsonpointer';

import { throughJsonSchema } from "../util/throughJsonSchema"

/**
 * Go through the given schema and remove properties not supported by Open API
 * 
 * @param schema 
 */
export function jsonSchemaToOpenApiSchema(schema) {
    throughJsonSchema(schema, (s) => {
        delete s.id;
        delete s.$id;
        delete s.$schema;
    })
    return schema
}

/**
 * Go through the whole schema and modify refs that points to a local schema and prepend the basepath.
 */
export function remapRefs(schema: SchemaObject, basePath: string) {
    throughJsonSchema(schema as any, (s) => {
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
export function flattenSchemas(definitions: { [name: string]: SchemaObject }) {
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
                let originalPath = `#/components/schemas/${name}/definitions/${subSchemaName}`;
                let newPath = `#/components/schemas/${newSchemaName}`
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
export function schemaToOpenApiParameter(schema: SchemaObject, spec: OpenAPIObject): ParameterObject[] {
    if (schema && schema.$ref && schema.$ref.startsWith("#")) {
        // the schema is a reference. Let's try to locate the schema
        return schemaToOpenApiParameter(jsonpointer.get(spec, schema.$ref.substr(1)), spec)
    }
    if (schema && schema.type === "object") {
        let data = []
        for (let property in schema.properties) {
            let propertySchemaObject: SchemaObject
            let propertySchema = schema.properties[property]
            if (propertySchema.hasOwnProperty("$ref") && (propertySchema as ReferenceObject).$ref.startsWith("#")) {
                let propertySchemaReference = propertySchema as ReferenceObject
                propertySchemaObject = jsonpointer.get(spec, propertySchemaReference.$ref.substr(1))
            } else {
                propertySchemaObject = propertySchema as SchemaObject
            }
            if (propertySchemaObject.type) {
                let parameter: ParameterObject = {
                    in: "query",
                    name: property,
                    schema: propertySchemaObject,
                    description: propertySchemaObject.description,
                    required: schema.required && schema.required.indexOf(property) !== -1,

                }
                if (propertySchemaObject.type === 'object') {
                    parameter.style = "deepObject"
                }
                if (propertySchemaObject.type === 'array') {
                    parameter.style = "form"
                }
                data.push(parameter)
            }
        }
        if (schema.oneOf) {
            data = data.concat(schema.oneOf.map(subSchema => schemaToOpenApiParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
        }
        if (schema.anyOf) {
            data = data.concat(schema.anyOf.map(subSchema => schemaToOpenApiParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
        }
        if (schema.allOf) {
            data = data.concat(schema.allOf.map(subSchema => schemaToOpenApiParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
        }
        return data;
    }
    return []
}

/**
 * Filter a paramater array to remove duplicates. The first occurance is kept and the others are discarded.
 * 
 * @param parameters 
 */
export function removeDuplicatedParameters(parameters: ParameterObject[]): ParameterObject[] {
    // filter duplicated params (in case allOf, oneOf or anyOf contains multiple schemas with the same property)
    return parameters.filter((value: ParameterObject, index, array) => {
        for (var i = 0; i < index; ++i) {
            if (array[i].name === value.name) {
                return false
            }
        }
        return true
    })
}

/**
 * Parse the given parameters array and move the specified ones to `path`
 * 
 * @param parameters 
 */
export function pathParameters(parameters: ParameterObject[], inPath: string[]): ParameterObject[] {
    parameters.forEach(parameter => {
        if (inPath.indexOf(parameter.name) !== -1) {
            parameter.in = "path"
        }
    })
    return parameters
}