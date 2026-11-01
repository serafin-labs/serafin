import type { Extensions } from "./OpenApi.js"

export type SchemaTypeName = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null"

/**
 * A Schema Object: JSON Schema 2020-12 extended with the OpenAPI 3.2 base vocabulary
 * (`discriminator`, `xml`, `externalDocs` and the deprecated `example`).
 *
 * Wherever a schema is expected, `true` and `false` are also valid schemas.
 *
 * Unlike the other objects, it declares no `x-` extensions: an interface without an index signature, such as
 * the `JSONSchema` of `@serafin/schema-builder`, is then assignable to it. Extensions remain valid in a document.
 *
 * @see https://spec.openapis.org/oas/v3.2.html#schema-object
 */
export interface SchemaObject {
    $id?: string
    $schema?: string
    $anchor?: string
    $dynamicAnchor?: string
    $ref?: string
    $dynamicRef?: string
    $comment?: string
    $defs?: { [name: string]: SchemaObject | boolean }

    type?: SchemaTypeName | SchemaTypeName[]
    enum?: unknown[]
    const?: unknown

    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: number
    minimum?: number
    exclusiveMinimum?: number

    maxLength?: number
    minLength?: number
    pattern?: string

    prefixItems?: (SchemaObject | boolean)[]
    items?: SchemaObject | boolean
    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    contains?: SchemaObject | boolean
    maxContains?: number
    minContains?: number

    maxProperties?: number
    minProperties?: number
    required?: string[]
    properties?: { [name: string]: SchemaObject | boolean }
    patternProperties?: { [pattern: string]: SchemaObject | boolean }
    additionalProperties?: SchemaObject | boolean
    dependentRequired?: { [name: string]: string[] }
    dependentSchemas?: { [name: string]: SchemaObject | boolean }
    propertyNames?: SchemaObject | boolean

    if?: SchemaObject | boolean
    then?: SchemaObject | boolean
    else?: SchemaObject | boolean

    allOf?: (SchemaObject | boolean)[]
    anyOf?: (SchemaObject | boolean)[]
    oneOf?: (SchemaObject | boolean)[]
    not?: SchemaObject | boolean

    unevaluatedItems?: SchemaObject | boolean
    unevaluatedProperties?: SchemaObject | boolean

    format?: string

    contentMediaType?: string
    contentEncoding?: string
    contentSchema?: SchemaObject | boolean

    title?: string
    description?: string
    default?: unknown
    readOnly?: boolean
    writeOnly?: boolean
    examples?: unknown[]
    deprecated?: boolean

    /** Selects the variant of a `oneOf`/`anyOf`/`allOf` from the value of a property. */
    discriminator?: DiscriminatorObject
    /** How the schema is represented in XML. */
    xml?: XmlObject
    externalDocs?: { url: string; description?: string } & Extensions
    /** @deprecated use `examples` */
    example?: unknown
}

export interface DiscriminatorObject extends Extensions {
    /** REQUIRED. The name of the property holding the discriminating value. */
    propertyName: string
    /** Discriminating values mapped to schema names or references. */
    mapping?: { [value: string]: string }
    /** The schema used when the discriminating value matches no `mapping` entry. */
    defaultMapping?: string
}

export interface XmlObject extends Extensions {
    nodeType?: "element" | "attribute" | "text" | "cdata" | "none"
    name?: string
    namespace?: string
    prefix?: string
    /** @deprecated use `nodeType: "attribute"` */
    attribute?: boolean
    /** @deprecated use `nodeType: "element"` on the array */
    wrapped?: boolean
}
