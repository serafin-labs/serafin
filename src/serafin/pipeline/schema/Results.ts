import { description } from '../decorator/Description';
import { PipelineSchemaAbstract } from "./Abstract"
import { JSONSchema4 } from "json-schema"

/**
 *  Schema that represents additional response results
 */
export class PipelineSchemaResults extends PipelineSchemaAbstract {
    /**
     * An array of all the registered options separetly
     */
    public results: {
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
    }

    /**
     * Add the following result property to the schema
     * 
     * @param name 
     * @param schema 
     * @param description 
     * @param required 
     */
    addResult(name: string, schema: JSONSchema4, description: string, required: boolean): this {
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
     * Merge the current options schema with another one. This operation modifies the schema.
     */
    merge(otherResults: PipelineSchemaResults): this {
        if (!otherResults) {
            return this
        }

        for (let option in otherResults.options) {
            let optionMetadata = otherOptions.options[option]
            this.addOption(option, optionMetadata.schema, optionMetadata.description, optionMetadata.required)
        }
        return this;
    }
}