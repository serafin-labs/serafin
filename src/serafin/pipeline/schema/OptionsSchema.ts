import { description } from '../decorator/Description';
import { Schema } from "./Schema"
import { JSONSchema4 } from "json-schema"
import { ResourceIdentityInterface } from "../model/Resource"

/**
 * Defines schemas related to the model that are used by the pipeline for validation.
 */
export class OptionsSchema extends Schema {

    /**
     * Reference to the internal option schema to be modified by 'addOption' method
     */
    private optionsSchema: JSONSchema4

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
            id: 'options',
            type: 'object',
            properties: {},
            required: []
        } as JSONSchema4;
        super(schema)
        this.optionsSchema = schema
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
        this.optionsSchema.properties[name] = schema;

        // set the option as required if necessary
        if (required) {
            (this.optionsSchema.required as string[]).push(name)
        }
        return this
    }


    /**
     * Set the following description on this set of options
     * 
     * @param description 
     */
    setDescription(description: string): this {
        this.optionsSchema.description = description;
        return this
    }


    /**
     * Merge the current options schema with another one. This operation modifies the schema.
     */
    merge(otherOptions: OptionsSchema): this {
        for (let option in otherOptions.options) {
            let optionMetadata = otherOptions.options[option]
            this.addOption(option, optionMetadata.schema, optionMetadata.description, optionMetadata.required)
        }
        return this
    }
}