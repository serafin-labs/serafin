import { description } from '../decorator/Description';
import { PipelineSchemaAbstract } from "./Abstract"
import { JSONSchema4 } from "json-schema"

/**
 * Defines schemas related to the model that are used by the pipeline for validation.
 */
export class PipelineSchemaMethodOptions extends PipelineSchemaAbstract {

    /**
     * An array of all the registered options separetly
     */
    public options: {
        [name: string]: {
            schema: JSONSchema4,
            description: string,
            required: boolean
        }
    }

    constructor() {
        let schema = {
            type: 'object',
            properties: {},
            required: []
        } as JSONSchema4;
        super(schema)
        this.options = {}
    }

    /**
     * Add the following option to the schema
     * 
     * @param name 
     * @param option 
     * @param description 
     * @param required 
     */
    addOption(name: string, schema: JSONSchema4, description: string, required: boolean): this {
        this.options[name] = {
            schema: schema,
            description: description,
            required: required
        }

        // add the option to the main schema
        this.schemaObject.properties[name] = schema;
        this.schemaObject.properties[name].description = description;

        // set the option as required if necessary
        if (required) {
            (this.schemaObject.required as string[]).push(name)
        }
        return this
    }

    hasOption(name): boolean {
        return !!this.options[name];
    }

    /**
     * Set the following description on this set of options
     * 
     * @param description 
     */
    setDescription(description: string): this {
        this.schemaObject.description = description;
        return this;
    }

    /**
     * Merge the current options schema with another one. This operation modifies the schema.
     */
    merge(otherOptions: PipelineSchemaMethodOptions): this {
        if (!otherOptions) {
            otherOptions = new PipelineSchemaMethodOptions();
        }

        for (let option in otherOptions.options) {
            let optionMetadata = otherOptions.options[option]
            this.addOption(option, optionMetadata.schema, optionMetadata.description, optionMetadata.required)
        }
        return this;
    }
}