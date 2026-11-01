import type { SchemaObject } from "@serafin/open-api"

export type Schema = SchemaObject | boolean

/**
 * The properties of an object schema, including those of its `allOf`, `oneOf` and `anyOf` branches.
 * A property is required when the schema or one of its `allOf` branches requires it: what a `oneOf` or
 * `anyOf` branch requires depends on the branch that matches.
 */
export function schemaProperties(schema: Schema): { properties: Record<string, Schema>; required: Set<string> } {
    const properties: Record<string, Schema> = {}
    const required = new Set<string>()
    const visit = (s: Schema, mandatory: boolean) => {
        if (typeof s !== "object") {
            return
        }
        for (const [name, property] of Object.entries(s.properties ?? {})) {
            properties[name] ??= property
        }
        if (mandatory) {
            s.required?.forEach((name) => required.add(name))
        }
        s.allOf?.forEach((branch) => visit(branch, mandatory))
        s.oneOf?.forEach((branch) => visit(branch, false))
        s.anyOf?.forEach((branch) => visit(branch, false))
    }
    visit(schema, true)
    return { properties, required }
}

function types(schema: SchemaObject): string[] {
    return schema.type === undefined ? [] : Array.isArray(schema.type) ? schema.type : [schema.type]
}

/**
 * Whether the schema accepts an array, directly or through one of its `oneOf` or `anyOf` branches.
 */
export function allowsArray(schema: Schema | undefined): boolean {
    if (typeof schema !== "object") {
        return schema === true
    }
    return types(schema).includes("array") || [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].some(allowsArray)
}

/**
 * Whether the schema only accepts arrays, in which case a single query string value is a one element array.
 */
export function onlyAllowsArray(schema: Schema): boolean {
    return typeof schema === "object" && types(schema).length > 0 && types(schema).every((t) => t === "array")
}

/**
 * Whether the schema describes an object, which is serialized as `name[property]=value` in a query string.
 */
export function isObjectSchema(schema: Schema): boolean {
    return typeof schema === "object" && types(schema).includes("object")
}

/**
 * The description of a schema, or the one its `oneOf` or `anyOf` branches agree on, as when a property
 * is turned into "a value or a list of values".
 */
export function schemaDescription(schema: Schema): string | undefined {
    if (typeof schema !== "object") {
        return undefined
    }
    if (schema.description !== undefined) {
        return schema.description
    }
    const descriptions = new Set(
        [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].map(schemaDescription).filter((d): d is string => d !== undefined),
    )
    return descriptions.size === 1 ? [...descriptions][0] : undefined
}
