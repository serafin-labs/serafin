/**
 * Interface that represents a JSON Schema.
 * This is a subpart of the current JSON Schema spec. It follows what Open API 3 has decided to support
 * @see https://swagger.io/specification/#schema-object-98
 */
export interface JSONSchema {
    $ref?: string
    type?: JSONSchemaTypeName
    title?: string
    description?: string
    default?: any
    multipleOf?: number
    maximum?: number
    exclusiveMaximum?: boolean
    minimum?: number
    exclusiveMinimum?: boolean
    maxLength?: number
    minLength?: number
    pattern?: string
    format?: string

    items?: JSONSchema

    maxItems?: number
    minItems?: number
    uniqueItems?: boolean
    maxProperties?: number
    minProperties?: number
    required?: false | string[]

    enum?: any[]

    properties?: {
        [k: string]: JSONSchema
    }
    additionalProperties?: boolean | JSONSchema

    allOf?: JSONSchema[]
    anyOf?: JSONSchema[]
    oneOf?: JSONSchema[]
    not?: JSONSchema

    // fields added by Open Api Spec
    /**
     * 	Allows sending a null value for the defined schema. Default value is false.
     */
    nullable?: boolean;
    /**
     * Adds support for polymorphism. The discriminator is an object name that is used to differentiate between other schemas which may satisfy the payload description. See Composition and Inheritance for more details.
     */
    discriminator?: { propertyName: string, mapping: { [name: string]: string } };
    /**
     * Relevant only for Schema "properties" definitions. Declares the property as "read only". This means that it MAY be sent as part of a response but SHOULD NOT be sent as part of the request. If the property is marked as readOnly being true and is in the required list, the required will take effect on the response only. A property MUST NOT be marked as both readOnly and writeOnly being true. Default value is false.
     */
    readOnly?: boolean;
    /**
     * Relevant only for Schema "properties" definitions. Declares the property as "write only". Therefore, it MAY be sent as part of a request but SHOULD NOT be sent as part of the response. If the property is marked as writeOnly being true and is in the required list, the required will take effect on the request only. A property MUST NOT be marked as both readOnly and writeOnly being true. Default value is false.
     */
    writeOnly?: boolean;
    /**
     * This MAY be used only on properties schemas. It has no effect on root schemas. Adds additional metadata to describe the XML representation of this property.
     */
    xml?: any
    /**
     * Additional external documentation for this schema.
     */
    externalDocs?: { url: string, description: string };
    /**
     * A free-form property to include an example of an instance for this schema. To represent examples that cannot be naturally represented in JSON or YAML, a string value can be used to contain the example with escaping where necessary.
     */
    example?: any;
    /**
     * Specifies that a schema is deprecated and SHOULD be transitioned out of usage. Default value is false.
     */
    deprecated?: boolean;

    // allow custom extentions, extentions MUST use "x-" prefix as specified in Open Api
    [k: string]: any
}

/**
 * Type names available for this schema
 */
export type JSONSchemaTypeName = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'


/**
 * Uri used for this special meta schema
 */
export const metaSchemaUri = "http://serafin-labs.com/schema";

/**
 * A meta schema that can verify that input schemas are compatible with Open Api spec.
 * If $schema is not set, it is considered to be http://serafin-labs.com/schema.
 */
export const metaSchema: any