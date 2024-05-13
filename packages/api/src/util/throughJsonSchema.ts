import * as _ from "lodash"
import { JSONSchema } from "@serafin/schema-builder"

/**
 * Go through the given schema and apply the given action to all the schema element.
 *
 * @param schema
 * @param action
 */
export function throughJsonSchema(schema: boolean | JSONSchema | JSONSchema[], action: (schema: JSONSchema) => void) {
    if (typeof schema !== "boolean") {
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
            if ((schema as any).definitions) {
                for (let property in (schema as any).definitions) {
                    throughJsonSchema((schema as any).definitions[property], action)
                }
            }
            if (schema.oneOf) {
                schema.oneOf.forEach((s) => throughJsonSchema(s, action))
            }
            if (schema.allOf) {
                schema.allOf.forEach((s) => throughJsonSchema(s, action))
            }
            if (schema.anyOf) {
                schema.anyOf.forEach((s) => throughJsonSchema(s, action))
            }
            if (schema.items) {
                throughJsonSchema(schema.items as JSONSchema, action)
            }
            if (schema.not) {
                throughJsonSchema(schema.not, action)
            }
            if ("additionalProperties" in schema && typeof schema.additionalProperties !== "boolean" && schema.additionalProperties) {
                throughJsonSchema(schema.additionalProperties, action)
            }
        }
    }
    return schema
}
