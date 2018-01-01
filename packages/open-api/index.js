exports.metaSchemaUri = "http://serafin-framework.com/schema";

exports.metaSchema = {
    "$id": exports.metaSchemaUri,
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "$ref": {
            "type": "string",
            "format": "uri-reference"
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
            "$ref": "#"
        },
        "allOf": {
            "type": "array",
            "items": {
                "$ref": "#"
            }
        },
        "oneOf": {
            "type": "array",
            "items": {
                "$ref": "#"
            }
        },
        "anyOf": {
            "type": "array",
            "items": {
                "$ref": "#"
            }
        },
        "items": {
            "$ref": "#"
        },
        "properties": {
            "type": "object",
            "additionalProperties": {
                "$ref": "#"
            }
        },
        "additionalProperties": {
            "oneOf": [
                {
                    "$ref": "#"
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
            "additionalProperties": { "$ref": "#" },
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
        "nullable": {
            "type": "boolean",
            "default": false
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
        "xml": {
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
    "additionalProperties": false
}