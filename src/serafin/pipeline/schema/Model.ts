import { PipelineSchemaAbstract } from "./Abstract"
import { JSONSchema4 } from "json-schema"
import { ResourceIdentityInterface } from "./Resource"

/**
 * Defines schemas related to the model that are used by the pipeline for validation.
 */
export class PipelineSchemaModel<T extends ResourceIdentityInterface> extends PipelineSchemaAbstract {
    /**
     * The path of the main model schema
     */
    public modelPath: string;

    constructor(schemaObject: JSONSchema4, id?: string) {
        super(schemaObject, id)
    }

    /**
     * Add a Schema to be used by the pipeline for query or values validation. It will override the default value.
     * 
     * @param target 
     * @param schemaObject   
     */
    addSchema(schemaObject: JSONSchema4, name: 'createValues' | 'readQuery' | 'updateValues' | 'patchQuery' | 'patchValues' | 'deleteQuery'): this {
        this.schemaObject.definitions = this.schemaObject.definitions || {}
        this.schemaObject.definitions[name] = schemaObject;
        return this
    }

    /**
     * Initialize default query & values for given implemented methods
     */
    setImplementedMethods(methods: string[]): this {
        this.schemaObject.definitions = this.schemaObject.definitions || {}
        if (methods.indexOf("create") !== -1) {
            this.schemaObject.definitions.createValues = this.schemaObject.definitions.createValues || { "$ref": "#" };
        }
        if (methods.indexOf("read") !== -1) {
            this.schemaObject.definitions.readQuery = this.schemaObject.definitions.readQuery || { type: "object" };
        }
        if (methods.indexOf("update") !== -1) {
            this.schemaObject.definitions.updateValues = this.schemaObject.definitions.updateValues || { "$ref": "#" };
        }
        if (methods.indexOf("patch") !== -1) {
            this.schemaObject.definitions.patchQuery = this.schemaObject.definitions.patchQuery || { type: 'object' };
            this.schemaObject.definitions.patchValues = this.schemaObject.definitions.patchValues || { type: 'object', "minProperties": 1 }
        }
        if (methods.indexOf("delete") !== -1) {
            this.schemaObject.definitions.deleteQuery = this.schemaObject.definitions.deleteQuery || { type: 'object' }
        }
        return this
    }

    /**
     * Schema used by the create method to validate the provided values. It represents one element of the array.
     */
    public get createValues() {
        return this.schemaObject.definitions ? this.schemaObject.definitions['createValues'] : null
    }

    /**
     * Schema used by the read method to validate the query.
     */
    public get readQuery() {
        return this.schemaObject.definitions ? this.schemaObject.definitions['readQuery'] : null
    }

    /**
     * Schema used by the update method to validate the provided values
     */
    public get updateValues() {
        return this.schemaObject.definitions ? this.schemaObject.definitions['updateValues'] : null
    }

    /**
     * Schema used by the patch method to validate the query
     */
    public get patchQuery() {
        return this.schemaObject.definitions ? this.schemaObject.definitions['patchQuery'] : null
    }

    /**
     * Schema used by the patch method to validate the provided values
     */
    public get patchValues() {
        return this.schemaObject.definitions ? this.schemaObject.definitions['patchValues'] : null
    }

    /**
     * Schema used by the delete method to validate the query
     */
    public get deleteQuery() {
        return this.schemaObject.definitions ? this.schemaObject.definitions['deleteQuery'] : null
    }
}