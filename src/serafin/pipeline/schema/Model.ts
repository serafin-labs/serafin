import * as _ from "lodash";
import { PipelineSchemaAbstract } from "./Abstract"
import { JSONSchema4 } from "json-schema"
import { ResourceIdentityInterface } from "./ResourceInterfaces"
import { PipelineSchema } from "./Pipeline";

/**
 * Defines schemas related to the model that are used by the pipeline for validation.
 */
export class PipelineSchemaModel<
    T extends ResourceIdentityInterface = ResourceIdentityInterface, 
    ReadQuery = any,
    CreateValues = any,
    UpdateValues = any,
    PatchQuery = any,
    PatchValues = any,
    DeleteQuery = any> extends PipelineSchemaAbstract {
        
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
        return super.addSchema(schemaObject, name)
    }

    protected _implementedMethods: string[]
    /**
     * Initialize default query & values for given implemented methods
     */
    set implementedMethods(methods: string[]) {
        this._implementedMethods = methods
        this.schemaObject.definitions = this.schemaObject.definitions || {}
        if (Array.isArray(this._implementedMethods)) {
            if (methods.indexOf("create") !== -1) {
                this.schemaObject.definitions.createValues = this.schemaObject.definitions.createValues || { "$ref": "#" };
            } else {
                delete this.schemaObject.definitions.createValues
            }
            if (methods.indexOf("read") !== -1) {
                this.schemaObject.definitions.readQuery = this.schemaObject.definitions.readQuery || { type: "object" };
            } else {
                delete this.schemaObject.definitions.readQuery
            }
            if (methods.indexOf("update") !== -1) {
                this.schemaObject.definitions.updateValues = this.schemaObject.definitions.updateValues || { "$ref": "#" };
            } else {
                delete this.schemaObject.definitions.updateValues
            }
            if (methods.indexOf("patch") !== -1) {
                this.schemaObject.definitions.patchQuery = this.schemaObject.definitions.patchQuery || { type: 'object', "minProperties": 1 };
                this.schemaObject.definitions.patchValues = this.schemaObject.definitions.patchValues || { type: 'object', "minProperties": 1 }
            } else {
                delete this.schemaObject.definitions.patchQuery
                delete this.schemaObject.definitions.patchValues
            }
            if (methods.indexOf("delete") !== -1) {
                this.schemaObject.definitions.deleteQuery = this.schemaObject.definitions.deleteQuery || { type: 'object', "minProperties": 1 }
            } else {
                delete this.schemaObject.definitions.deleteQuery
            }
        }
    }
    get implementedMethods() {
        return this._implementedMethods
    }

    public clone(): this {
        return _.cloneDeep(this)
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