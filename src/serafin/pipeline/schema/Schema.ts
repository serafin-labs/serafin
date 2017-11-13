import { JSONSchema4 } from "json-schema"
import * as _ from "lodash"

/**
 * Represents a Schema and its dependencies
 */
export class Schema {
    /**
     * The JSON Schema object
     */
    public schemaObject: JSONSchema4

    /**
     * An array that keep tracks of all references added
     */
    private refs: { id: string, name: string }[] = []

    /**
     * Id of the Schema. It is used to resolve refs.
     */
    private id: string

    constructor(schemaObject: JSONSchema4, id?: string) {
        this.id = id || schemaObject.id;
        this.schemaObject = schemaObject;
    }

    /**
     * Add the given schema to the "definitions" of this schema under the given name.
     * /!\ The provided schema is directly included as is. It will only works if the refs are local already. If you need to add a schema that uses a diffrent URI, use 'addRef' instead
     * 
     * @param schemaObject 
     * @param name 
     */
    addSchema(schemaObject, name: string) {
        if (this.schemaObject.definitions && this.schemaObject.definitions[name]) {
            throw new Error(`Schema Error: The name ${name} is already used on this schema`)
        }
        this.schemaObject.definitions = this.schemaObject.definitions || {};
        this.schemaObject.definitions[name] = schemaObject;
    }

    /**
     * Add a ref to the schema.
     * The schema is added directly to the definitions of the current schema. Any Ref with the appropriate uri is modified to point to this schema.
     * 
     * @param refSchemaObject The referenced schema that needs to be added
     * @param name A name representing this schema 
     * @param id An optional id that represents the URI of the schema 
     */
    addRef(refSchemaObject: JSONSchema4, name: string, id?: string): this {
        var refId = id || refSchemaObject.id
        if (!refId) {
            throw new Error(`Schema Error: Schemas added as "reference" must have an 'id' provided.`)
        }
        if (this.schemaObject.definitions && this.schemaObject.definitions[name]) {
            throw new Error(`Schema Error: The name ${name} is already used on this schema`)
        }
        this.schemaObject.definitions = this.schemaObject.definitions || {};
        this.schemaObject.definitions[name] = refSchemaObject;
        delete refSchemaObject.id;
        this.refs.push({ id: refId, name: name })
        this.remapRefs(this.schemaObject)
        return this
    }

    /**
     * go through the whole schema and modify refs that points to known URI
     */
    private remapRefs(schema: JSONSchema4) {
        if (schema.$ref) {
            let ref = this.refs.reduce((result, currentRef) => {
                // TODO handle relative refs
                return schema.$ref.startsWith(currentRef.id) ? currentRef : result
            }, null);
            if (ref) {
                let $ref = schema.$ref.substr(ref.id.length);
                if ($ref.startsWith("#")) {
                    $ref = schema.$ref.substr(1);
                }
                schema.$ref = `#/definitions/${ref.name}${$ref}`
            }
        }
        if (schema.properties) {
            for (let property in schema.properties) {
                this.remapRefs(schema.properties[property])
            }
        }
        if (schema.definitions) {
            for (let property in schema.definitions) {
                this.remapRefs(schema.definitions[property])
            }
        }
        if (schema.oneOf) {
            schema.oneOf.forEach(s => this.remapRefs(s))
        }
        if (schema.allOf) {
            schema.allOf.forEach(s => this.remapRefs(s))
        }
        if (schema.anyOf) {
            schema.anyOf.forEach(s => this.remapRefs(s))
        }
    }
}