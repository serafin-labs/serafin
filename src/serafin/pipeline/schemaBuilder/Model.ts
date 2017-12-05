import * as _ from "lodash";
import { PipelineSchemaBuilderAbstract } from "./Abstract"
import { JSONSchema4 } from "json-schema"
import { ResourceIdentityInterface } from "./ResourceInterfaces"
import { PipelineSchemaBuilder } from "./SchemaBuilder";

enum SCHEMA_FILTER {
    NONE = 0,
    ALL = 1,
    NO_ID = 2,
    ONLY_ID = 3
}

/**
 * Defines schemas related to the model that are used by the pipeline for validation.
 */
export class PipelineSchemaBuilderModel<
    T extends ResourceIdentityInterface = ResourceIdentityInterface,
    ReadQuery = any,
    CreateValues = any,
    UpdateValues = any,
    PatchQuery = any,
    PatchValues = any,
    DeleteQuery = any> extends PipelineSchemaBuilderAbstract {

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
                this.schemaObject.definitions.createValues = this.schemaObject.definitions.createValues || this.toDefinitionSchema(SCHEMA_FILTER.ALL, SCHEMA_FILTER.NO_ID);
            } else {
                delete this.schemaObject.definitions.createValues
            }
            if (methods.indexOf("read") !== -1) {
                this.schemaObject.definitions.readQuery = this.schemaObject.definitions.readQuery || this.toDefinitionSchema(SCHEMA_FILTER.ALL, SCHEMA_FILTER.NONE, true);
            } else {
                delete this.schemaObject.definitions.readQuery
            }
            if (methods.indexOf("update") !== -1) {
                this.schemaObject.definitions.updateValues = this.schemaObject.definitions.updateValues || this.toDefinitionSchema(SCHEMA_FILTER.ALL, SCHEMA_FILTER.NO_ID);
            } else {
                delete this.schemaObject.definitions.updateValues
            }
            if (methods.indexOf("patch") !== -1) {
                this.schemaObject.definitions.patchQuery = this.schemaObject.definitions.patchQuery || this.toDefinitionSchema(SCHEMA_FILTER.ALL, SCHEMA_FILTER.ONLY_ID, true);
                this.schemaObject.definitions.patchValues = this.schemaObject.definitions.patchValues || this.toDefinitionSchema(SCHEMA_FILTER.NO_ID, SCHEMA_FILTER.NONE);
            } else {
                delete this.schemaObject.definitions.patchQuery
                delete this.schemaObject.definitions.patchValues
            }
            if (methods.indexOf("delete") !== -1) {
                this.schemaObject.definitions.deleteQuery = this.schemaObject.definitions.deleteQuery || this.toDefinitionSchema(SCHEMA_FILTER.ONLY_ID, SCHEMA_FILTER.ONLY_ID, true);
            } else {
                delete this.schemaObject.definitions.deleteQuery
            }
        }
    }

    private toDefinitionSchema(propertiesFilter: SCHEMA_FILTER, requiredFilter: SCHEMA_FILTER, toArray: boolean = false) {
        let schema: JSONSchema4 = {
            type: 'object',
            properties: _.clone(this.schemaObject.properties),
            additionalProperties: false
        };

        if (typeof this.schemaObject.required === 'object') {
            schema.required = _.clone(this.schemaObject.required);
            requiredFilter === SCHEMA_FILTER.ALL ||
                (requiredFilter === SCHEMA_FILTER.ONLY_ID && (schema.required = _.filter(schema.required, (value) => value == 'id'))) ||
                (requiredFilter === SCHEMA_FILTER.NO_ID && (schema.required = _.reject(schema.required, (value) => value == 'id'))) ||
                delete schema.required;
        }

        propertiesFilter === SCHEMA_FILTER.ALL ||
            (propertiesFilter === SCHEMA_FILTER.ONLY_ID && (schema.properties = _.pick(schema.properties, 'id'))) ||
            (propertiesFilter === SCHEMA_FILTER.NO_ID && (schema.properties = _.omit(schema.properties, 'id'))) ||
            (schema.properties = {});

        if (toArray === true) {
            for (let key in schema.properties) {
                let description = schema.properties[key].description;
                delete schema.properties[key].description;
                if (schema.properties[key].type === 'array' && schema.properties[key].items) {
                    schema.properties[key] = { oneOf: [schema.properties[key].items, schema.properties[key]], description: description };
                } else {
                    schema.properties[key] = { oneOf: [schema.properties[key], { type: 'array', items: schema.properties[key] }], description: description };
                }
            }
        }

        return schema;
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