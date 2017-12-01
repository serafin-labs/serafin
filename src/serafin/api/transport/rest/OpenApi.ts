import * as _ from 'lodash';
import * as Swagger from 'swagger-schema-official';
import * as jsonpointer from 'jsonpointer';
import { JSONSchema4 } from "json-schema";
import { Api } from "../../Api"

import { throughJsonSchema } from "../../../util/throughJsonSchema"

export class OpenApi {
    private resourcesPathWithId;
    private ajv;

    constructor(private api: Api, private pipelineSchema, private resourcesPath, private name: string, private pluralName: string) {
        // import pipeline schemas to openApi definitions
        this.api.openApi.definitions[name] = OpenApi.remapRefs(OpenApi.jsonSchemaToOpenApiSchema(
            _.cloneDeep(this.pipelineSchema.schema)), `#/definitions/${name}`) as any;
        OpenApi.flattenSchemas(this.api.openApi.definitions as any);

        // prepare open API metadata for each endpoint
        this.resourcesPathWithId = `${resourcesPath}/{id}`;
        this.api.openApi.paths[this.resourcesPath] = this.api.openApi.paths[this.resourcesPath] || {};
        this.api.openApi.paths[this.resourcesPathWithId] = this.api.openApi.paths[this.resourcesPathWithId] || {};
    }

    addReadDoc() {
        let readQueryParameters = OpenApi.schemaToSwaggerParameter(this.pipelineSchema.schema.definitions.readQuery || null, this.api.openApi);
        let readOptionsParameters = this.api.filterInternalParameters(OpenApi.schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.readOptions || null, this.api.openApi));

        // general get
        this.api.openApi.paths[this.resourcesPath]["get"] = {
            description: `Find ${_.upperFirst(this.pluralName)}`,
            operationId: `find${_.upperFirst(this.pluralName)}`,
            parameters: OpenApi.removeDuplicatedParameters(readQueryParameters.concat(readOptionsParameters)),
            responses: {
                200: {
                    description: `${_.upperFirst(this.pluralName)} corresponding to the query`,
                    schema: {
                        allOf: [
                            {
                                type: 'object',
                                properties: {
                                    results: {
                                        type: 'array',
                                        items: { "$ref": `#/definitions/${this.name}` },
                                    }
                                }
                            },
                            { $ref: `#/definitions/${this.name}ReadResults` }
                        ]
                    }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // get by id
        this.api.openApi.paths[this.resourcesPathWithId]["get"] = {
            description: `Get one ${_.upperFirst(this.name)} by its id`,
            operationId: `get${_.upperFirst(this.name)}ById`,
            parameters: [{
                in: "path",
                name: "id",
                type: "string",
                required: true
            }],
            responses: {
                200: {
                    description: `${_.upperFirst(this.name)} corresponding to the provided id`,
                    schema: { $ref: `#/definitions/${this.name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }
    }

    addCreateDoc() {
        let createOptionsParameters = this.api.filterInternalParameters(OpenApi.schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.createOptions || null, this.api.openApi));

        // post a new resource
        this.api.openApi.paths[this.resourcesPath]["post"] = {
            description: `Create a new ${_.upperFirst(this.name)}`,
            operationId: `add${_.upperFirst(this.name)}`,
            parameters: OpenApi.removeDuplicatedParameters(createOptionsParameters).concat([{
                in: "body",
                name: this.name,
                description: `The ${_.upperFirst(this.name)} to be created.`,
                schema: { $ref: `#/definitions/${this.name}CreateValues` }
            }]),
            responses: {
                201: {
                    description: `${_.upperFirst(this.name)} created`,
                    schema: { $ref: `#/definitions/${this.name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                409: {
                    description: "Conflict",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }
    }

    addPatchDoc() {
        let patchQueryParameters = OpenApi.schemaToSwaggerParameter(this.pipelineSchema.schema.definitions.patchQuery || null, this.api.openApi)
        let patchOptionsParameters = this.api.filterInternalParameters(OpenApi.schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.patchOptions || null, this.api.openApi));

        // patch by id
        this.api.openApi.paths[this.resourcesPathWithId]["patch"] = {
            description: `Patch a ${_.upperFirst(this.name)} using its id`,
            operationId: `patch${_.upperFirst(this.name)}`,
            parameters: OpenApi.removeDuplicatedParameters(patchOptionsParameters).concat([
                {
                    in: "body",
                    name: this.name,
                    description: `The patch of ${_.upperFirst(this.name)}.`,
                    schema: { $ref: `#/definitions/${this.name}PatchValues` }
                }, {
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Updated ${_.upperFirst(this.name)}`,
                    schema: { $ref: `#/definitions/${this.name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }
    }

    addUpdateDoc() {
        let updateOptionsParameters = this.api.filterInternalParameters(OpenApi.schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.updateOptions || null, this.api.openApi));

        // put by id
        this.api.openApi.paths[this.resourcesPathWithId]["put"] = {
            description: `Put a ${_.upperFirst(this.name)} using its id`,
            operationId: `put${_.upperFirst(this.name)}`,
            parameters: OpenApi.removeDuplicatedParameters(updateOptionsParameters).concat([
                {
                    in: "body",
                    name: this.name,
                    description: `The ${_.upperFirst(this.name)} to be updated.`,
                    schema: { $ref: `#/definitions/${this.name}UpdateValues` }
                }, {
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Updated ${_.upperFirst(this.name)}`,
                    schema: { $ref: `#/definitions/${this.name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }
    }

    addDeleteDoc() {
        let deleteOptionsParameters = this.api.filterInternalParameters(OpenApi.schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.deleteOptions || null, this.api.openApi));
        // delete by id
        this.api.openApi.paths[this.resourcesPathWithId]["delete"] = {
            description: `Delete a ${_.upperFirst(this.name)} using its id`,
            operationId: `delete${_.upperFirst(this.name)}`,
            parameters: OpenApi.removeDuplicatedParameters(deleteOptionsParameters).concat([
                {
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Deleted ${_.upperFirst(this.name)}`,
                    schema: { $ref: `#/definitions/${this.name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }
    }

    /**
     * Go through the given schema and remove properties not supported by Open API
     * 
     * @param schema 
     */
    static jsonSchemaToOpenApiSchema(schema: JSONSchema4) {
        throughJsonSchema(schema, (s) => {
            delete s.id;
            delete s.$id;
            delete s.$schema;
        })
        return schema
    }

    /**
     * Go through the whole schema and modify refs that points to a local schema and prepend the basepath.
     */
    static remapRefs(schema: JSONSchema4, basePath: string) {
        throughJsonSchema(schema, (s) => {
            if (s.$ref && s.$ref.startsWith("#")) {
                s.$ref = `${basePath}${s.$ref.substr(1)}`
            }
        })
        return schema
    }


    /**
     * Flatten the given schema definitions, so any sub-schema is moved back to the top and refs are moved accordingly.
     * The name of the subschema is obtained by combining property names using camelCase.
     * 
     * @param schema 
     */
    static flattenSchemas(definitions: { [name: string]: JSONSchema4 }) {
        // determine schemas that needs to be moved
        let definitionsToMove = []
        for (let name in definitions) {
            let schema = definitions[name]
            if (schema.definitions) {
                for (let subSchemaName in schema.definitions) {
                    // add the sub schema to an array so it can be apended to definitions
                    let newSchemaName = `${name}${_.upperFirst(subSchemaName)}`
                    definitionsToMove.push([newSchemaName, schema.definitions[subSchemaName]])

                    // remap refs to work with the futur position of this schema
                    let originalPath = `#/definitions/${name}/definitions/${subSchemaName}`;
                    let newPath = `#/definitions/${newSchemaName}`
                    throughJsonSchema(_.values(definitions), s => {
                        if (s.$ref && s.$ref === originalPath) {
                            s.$ref = newPath
                        }
                    })
                }
                delete schema.definitions
            }
        }

        // move the definitions to the top
        definitionsToMove.forEach((def) => {
            let [name, schema] = def;
            definitions[name] = schema;
        })

        // if definitions were moved, call recursively flatten to process other 'definitions' that have emerged
        if (definitionsToMove.length > 0) {
            OpenApi.flattenSchemas(definitions)
        }
    }


    /**
     * Deduce parameters to set in Open API spec from the JSON Schema provided.
     * /!\ This function doesn't support the full spectrum of JSON Schema.
     * Things like pattern properties are for example impossible to convert to Open API Parameter format.
     * 
     * @param schema 
     * @param definitions 
     */
    static schemaToSwaggerParameter(schema: JSONSchema4, spec: Swagger.Spec): Swagger.Parameter[] {
        if (schema && schema.$ref && schema.$ref.startsWith("#")) {
            // the schema is a reference. Let's try to locate the schema
            return OpenApi.schemaToSwaggerParameter(jsonpointer.get(spec, schema.$ref.substr(1)), spec)
        }
        if (schema && schema.type === "object") {
            let results = []
            for (let property in schema.properties) {
                let propertySchema = schema.properties[property]
                if (["string", "number", "boolean", "integer"].indexOf(propertySchema.type as string) !== -1) {
                    // we have a primitive type
                    let parameter: Swagger.Parameter = {
                        in: "query",
                        name: property,
                        type: propertySchema.type as any,
                        description: propertySchema.description,
                        required: schema.required && schema.required.indexOf(property) !== -1,

                    }
                    if (propertySchema.minimum) {
                        parameter.minimum = propertySchema.minimum
                    }
                    if (propertySchema.maximum) {
                        parameter.maximum = propertySchema.maximum
                    }
                    if (propertySchema.default) {
                        parameter.default = propertySchema.default
                    }
                    results.push(parameter)
                }
                if (propertySchema.type === "array" && ["string", "number", "boolean", "integer"].indexOf(propertySchema.items["type"] as string) !== -1) {
                    // if the array contains a primitive type
                    let parameter: Swagger.Parameter = {
                        in: "query",
                        name: property,
                        type: "array",
                        description: propertySchema.description,
                        required: schema.required && schema.required.indexOf(property) !== -1,
                        collectionFormat: "multi",
                        items: {
                            type: propertySchema.items["type"] as any
                        }
                    }
                    if (propertySchema.default) {
                        parameter.default = propertySchema.default
                    }
                    results.push(parameter)
                }
            }
            if (schema.oneOf) {
                results = results.concat(schema.oneOf.map(subSchema => OpenApi.schemaToSwaggerParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
            }
            if (schema.anyOf) {
                results = results.concat(schema.anyOf.map(subSchema => OpenApi.schemaToSwaggerParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
            }
            if (schema.allOf) {
                results = results.concat(schema.allOf.map(subSchema => OpenApi.schemaToSwaggerParameter(subSchema, spec)).reduce((p, c) => p.concat(c), []))
            }
            return results
        }
        return []
    }

    /**
     * Filter a paramater array to remove duplicates. The first occurance is kept and the others are discarded.
     * 
     * @param parameters 
     */
    static removeDuplicatedParameters(parameters: Swagger.Parameter[]): Swagger.Parameter[] {
        // filter duplicated params (in case allOf, oneOf or anyOf contains multiple schemas with the same property)
        return parameters.filter((value: Swagger.Parameter, index, array) => {
            for (var i = 0; i < index; ++i) {
                if (array[i].name === value.name) {
                    return false
                }
            }
            return true
        })
    }

    /**
     * Parse the given parameters array and move the specified ones to `path`
     * 
     * @param parameters 
     */
    static pathParameters(parameters: Swagger.Parameter[], inPath: string[]): Swagger.Parameter[] {
        parameters.forEach(parameter => {
            if (inPath.indexOf(parameter.name) !== -1) {
                parameter.in = "path"
            }
        })
        return parameters
    }
}