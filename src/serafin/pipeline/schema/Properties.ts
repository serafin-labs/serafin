import { description } from '../decorator/Description';
import { PipelineSchemaAbstract } from "./Abstract"
import { JSONSchema4 } from "json-schema"

/**
 *  Schema that represents a set of properties for a pipeline
 */
export class PipelineSchemaProperties extends PipelineSchemaAbstract {

    /**
     * An array of all the registered properties separetly
     */
    public properties: {
        [name: string]: {
            schema: JSONSchema4,
            description: string,
            required: boolean
        }
    }

    constructor() {
        let schema = {
            type: 'object',
            properties: {}
        } as JSONSchema4;
        super(schema)
        this.properties = {}
    }

    /**
     * Add the following property to the schema
     * 
     * @param name 
     * @param schema 
     * @param description 
     * @param required 
     */
    addProperty(name: string, schema: JSONSchema4, description: string, required: boolean): this {
        this.properties[name] = {
            schema: schema,
            description: description,
            required: required
        }

        // add the option to the main schema
        this.schemaObject.properties[name] = schema;
        this.schemaObject.properties[name].description = description;

        // set the option as required if necessary
        if (required) {
            this.schemaObject.required = this.schemaObject.required || [];
            (this.schemaObject.required as string[]).push(name);
        }
        return this
    }

    /**
     * Test if a property exists or not
     * 
     * @param name 
     */
    hasProperty(name): boolean {
        return !!this.properties[name];
    }

    /**
     * Set the following description on this set of properties
     * 
     * @param description 
     */
    setDescription(description: string): this {
        this.schemaObject.description = description;
        return this;
    }

    /**
     * Merge the current properties schema with another one. This operation modifies the schema.
     */
    merge(otherProperties: PipelineSchemaProperties): this {
        if (!otherProperties) {
            return this
        }

        for (let property in otherProperties.properties) {
            let propertyMetadata = otherProperties.properties[property]
            this.addProperty(property, propertyMetadata.schema, propertyMetadata.description, propertyMetadata.required)
        }
        return this;
    }
}