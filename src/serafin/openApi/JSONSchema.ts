/**
 * Interface that represents a JSON Schema.
 * This is a subpart of the actual JSON Schema spec. It follows what Open API 3 has decided to support + $id, $schema and definitions
 * Nullable is not supported.
 * @see https://swagger.io/specification/#schema-object-98
 */
export interface JSONSchema {
    $id?: string
    $schema?: "http://serafin-framework.com/schema"
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

    /**
     * Additional definitions are allowed in a schema. Serafin will take care of flattening the result in the resulting Open API spec.
     */
    definitions?: {
        [k: string]: JSONSchema
    }

    // fields specific to OpenApi spec
    example?: any
    deprecated?: boolean
    externalDocs?: { url: string, description: string }
    discriminator?: { propertyName: string, mapping: { [name: string]: string } }
    readOnly?: boolean
    writeOnly?: boolean

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
export const metaSchemaUri = "http://serafin-framework.com/schema";

/**
 * Meta schema that can verify that input schemas are compatible with Open Api spec.
 * If $schema is not set, it is considered to be this metaSchema.
 */
export const metaSchema = {
    "$id": metaSchemaUri,
    "$schema": "http://json-schema.org/draft-07/schema#",
    "oneOf": [{
        "$ref": "#/definitions/Schema"
    }, {
        "$ref": "#/definitions/Reference"
    }],
    "definitions": {
        "Reference": {
            "type": "object",
            "required": [
                "$ref"
            ],
            "properties": {
                "$ref": {
                    "type": "string",
                    "format": "uri-reference"
                }
            }
        },
        "Schema": {
            "type": "object",
            "properties": {
                "$id": {
                    "type": "string",
                    "format": "uri"
                },
                "$schema": {
                    "type": "string",
                    "enum": [metaSchemaUri],
                    "default": metaSchemaUri
                },
                "title": {
                    "type": "string"
                },
                "multipleOf": {
                    "type": "number",
                    "exclusiveMinimum": 0
                },
                "maximum": {
                    "type": "number"
                },
                "exclusiveMaximum": {
                    "type": "boolean",
                    "default": false
                },
                "minimum": {
                    "type": "number"
                },
                "exclusiveMinimum": {
                    "type": "boolean",
                    "default": false
                },
                "maxLength": {
                    "type": "integer",
                    "minimum": 0
                },
                "minLength": {
                    "type": "integer",
                    "minimum": 0,
                    "default": 0
                },
                "pattern": {
                    "type": "string",
                    "format": "regex"
                },
                "maxItems": {
                    "type": "integer",
                    "minimum": 0
                },
                "minItems": {
                    "type": "integer",
                    "minimum": 0,
                    "default": 0
                },
                "uniqueItems": {
                    "type": "boolean",
                    "default": false
                },
                "maxProperties": {
                    "type": "integer",
                    "minimum": 0
                },
                "minProperties": {
                    "type": "integer",
                    "minimum": 0,
                    "default": 0
                },
                "required": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "minItems": 1,
                    "uniqueItems": true
                },
                "enum": {
                    "type": "array",
                    "items": {
                    },
                    "minItems": 1,
                    "uniqueItems": true
                },
                "type": {
                    "type": "string",
                    "enum": [
                        "array",
                        "boolean",
                        "integer",
                        "number",
                        "object",
                        "string"
                    ]
                },
                "not": {
                    "oneOf": [
                        {
                            "$ref": "#/definitions/Schema"
                        },
                        {
                            "$ref": "#/definitions/Reference"
                        }
                    ]
                },
                "allOf": {
                    "type": "array",
                    "items": {
                        "oneOf": [
                            {
                                "$ref": "#/definitions/Schema"
                            },
                            {
                                "$ref": "#/definitions/Reference"
                            }
                        ]
                    }
                },
                "oneOf": {
                    "type": "array",
                    "items": {
                        "oneOf": [
                            {
                                "$ref": "#/definitions/Schema"
                            },
                            {
                                "$ref": "#/definitions/Reference"
                            }
                        ]
                    }
                },
                "anyOf": {
                    "type": "array",
                    "items": {
                        "oneOf": [
                            {
                                "$ref": "#/definitions/Schema"
                            },
                            {
                                "$ref": "#/definitions/Reference"
                            }
                        ]
                    }
                },
                "items": {
                    "oneOf": [
                        {
                            "$ref": "#/definitions/Schema"
                        },
                        {
                            "$ref": "#/definitions/Reference"
                        }
                    ]
                },
                "properties": {
                    "type": "object",
                    "additionalProperties": {
                        "oneOf": [
                            {
                                "$ref": "#/definitions/Schema"
                            },
                            {
                                "$ref": "#/definitions/Reference"
                            }
                        ]
                    }
                },
                "additionalProperties": {
                    "oneOf": [
                        {
                            "$ref": "#/definitions/Schema"
                        },
                        {
                            "$ref": "#/definitions/Reference"
                        },
                        {
                            "type": "boolean"
                        }
                    ],
                    "default": true
                },
                "description": {
                    "type": "string"
                },
                "format": {
                    "type": "string"
                },
                "default": {
                },
                "definitions": {
                    "type": "object",
                    "additionalProperties": { "$ref": "#/definitions/Schema" },
                    "default": {}
                },
                "discriminator": {
                    "type": "object",
                    "required": [
                        "propertyName"
                    ],
                    "properties": {
                        "propertyName": {
                            "type": "string"
                        },
                        "mapping": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    }
                },
                "readOnly": {
                    "type": "boolean",
                    "default": false
                },
                "writeOnly": {
                    "type": "boolean",
                    "default": false
                },
                "example": {
                },
                "externalDocs": {
                    "type": "object",
                    "required": [
                        "url"
                    ],
                    "properties": {
                        "description": {
                            "type": "string"
                        },
                        "url": {
                            "type": "string",
                            "format": "uri-reference"
                        }
                    },
                    "additionalProperties": false
                },
                "deprecated": {
                    "type": "boolean",
                    "default": false
                }
            },
            "patternProperties": {
                "^x-": {
                }
            },
            "additionalProperties": false,
        }
    }
}