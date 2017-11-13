import * as _ from "lodash"
import { JSONSchema4 } from "json-schema"

/**
 * Go through the given schema and apply the given action to all the schema element.
 * 
 * @param schema 
 * @param action 
 */
export function throughJsonSchema(schema: JSONSchema4 | JSONSchema4[], action: (schema: JSONSchema4) => void) {
    if (Array.isArray(schema)) {
        schema.forEach((s) => {
            throughJsonSchema(s, action)
        })
    } else {
        if (!_.isObject(schema)) {
            return
        }
        action(schema)
        if (schema.properties) {
            for (let property in schema.properties) {
                throughJsonSchema(schema.properties[property], action)
            }
        }
        if (schema.definitions) {
            for (let property in schema.definitions) {
                throughJsonSchema(schema.definitions[property], action)
            }
        }
        if (schema.oneOf) {
            schema.oneOf.forEach(s => throughJsonSchema(s, action))
        }
        if (schema.allOf) {
            schema.allOf.forEach(s => throughJsonSchema(s, action))
        }
        if (schema.anyOf) {
            schema.anyOf.forEach(s => throughJsonSchema(s, action))
        }
        if (schema.items) {
            throughJsonSchema(schema.items, action)
        }
        if (schema.patternProperties) {
            for (let property in schema.patternProperties) {
                throughJsonSchema(schema.patternProperties[property], action)
            }
        }
        if (schema.not) {
            throughJsonSchema(schema.not, action)
        }
        if ("additionalProperties" in schema && typeof schema.additionalProperties !== "boolean") {
            throughJsonSchema(schema.additionalProperties, action)
        }
        if ("additionalItems" in schema && typeof schema.additionalItems !== "boolean") {
            throughJsonSchema(schema.additionalItems, action)
        }
    }
    return schema
}