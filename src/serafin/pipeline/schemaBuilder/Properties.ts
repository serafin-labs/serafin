import { description } from '../decorator/Description';
import { PipelineSchemaBuilderAbstract } from "./Abstract"
import { JSONSchema } from "../../openApi"

/**
 *  Schema that represents a set of properties for a pipeline
 */
export class PipelineSchemaBuilderProperties extends PipelineSchemaBuilderAbstract {

    /**
     * An array of all the registered properties separetly
     */
    public properties: {
        [name: string]: {
            schema: JSONSchema,
            description: string,
            required: boolean
        }
    }

    constructor() {
        let schema = {
            type: 'object',
            properties: {}
        } as JSONSchema;
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
    addProperty(name: string, schema: JSONSchema, description: string, required: boolean): this {
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
     * Rename a property into the schema
     * 
     * @param current name 
     * @param new name
     */
    renameProperty(name: string, newName: string): this {
        if (this.hasProperty(name)) {
            this.properties[newName] = this.properties[name];
            this.schemaObject.properties[newName] = this.schemaObject.properties[name];
            delete (this.properties[name]);
            delete (this.schemaObject.properties[name]);

            if (Array.isArray(this.schemaObject.required)) {
                let index = this.schemaObject.required.indexOf(name);
                if (index !== -1) {
                    delete (this.schemaObject.required[index]);
                    this.schemaObject.required.push(newName);
                }
            }
        }

        return this;
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
    merge(otherProperties: PipelineSchemaBuilderProperties): this {
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