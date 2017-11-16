import { JSONSchema4 } from "json-schema"
import * as _ from "lodash"

import { throughJsonSchema } from "../../util/throughJsonSchema"

/**
 * Represents a Schema and its dependencies
 */
export abstract class PipelineSchemaAbstract {
    /**
     * An array that keep tracks of all references added
     */
    private refs: { id: string, name: string }[] = []

    /**
     * Id of the Schema. It is used to resolve refs.
     */
    private id: string

    constructor(protected schemaObject: JSONSchema4, id?: string) {
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
    addSchema(schemaObject, name: string): this {
        if (this.schemaObject.definitions && this.schemaObject.definitions[name]) {
            throw new Error(`Schema Error: The name ${name} is already used on this schema`)
        }
        this.schemaObject.definitions = this.schemaObject.definitions || {};
        this.schemaObject.definitions[name] = schemaObject;
        return this
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
        throughJsonSchema(this.schemaObject, (s) => {
            if (s.$ref) {
                let ref = this.refs.reduce((result, currentRef) => {
                    // TODO handle relative refs
                    return s.$ref.startsWith(currentRef.id) ? currentRef : result
                }, null);
                if (ref) {
                    let $ref = s.$ref.substr(ref.id.length);
                    if ($ref.startsWith("#")) {
                        $ref = s.$ref.substr(1);
                    }
                    s.$ref = `#/definitions/${ref.name}${$ref}`
                }
            }
        });
        return this
    }

    public get schema() {
        return this.schemaObject;
    }
}