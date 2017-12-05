import * as _ from 'lodash';
import * as Swagger from 'swagger-schema-official';
import * as jsonpointer from 'jsonpointer';
import { JSONSchema4 } from "json-schema";
import { Api } from "../../Api"

import { throughJsonSchema } from "../../../util/throughJsonSchema";
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToSwaggerParameter } from "../../openApiUtils";


export class OpenApi {
    private resourcesPathWithId;
    private ajv;

    constructor(private api: Api, private pipelineSchema, private resourcesPath, private name: string, private pluralName: string) {
        // import pipeline schemas to openApi definitions
        this.api.openApi.definitions[name] = remapRefs(jsonSchemaToOpenApiSchema(
            _.cloneDeep(this.pipelineSchema.schema)), `#/definitions/${name}`) as any;
        flattenSchemas(this.api.openApi.definitions as any);

        // prepare open API metadata for each endpoint
        this.resourcesPathWithId = `${resourcesPath}/{id}`;
        this.api.openApi.paths[this.resourcesPath] = this.api.openApi.paths[this.resourcesPath] || {};
        this.api.openApi.paths[this.resourcesPathWithId] = this.api.openApi.paths[this.resourcesPathWithId] || {};
    }

    addReadDoc() {
        let readQueryParameters = schemaToSwaggerParameter(this.pipelineSchema.schema.definitions.readQuery || null, this.api.openApi);
        let readOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.readOptions || null, this.api.openApi));

        // general get
        this.api.openApi.paths[this.resourcesPath]["get"] = {
            description: `Find ${_.upperFirst(this.pluralName)}`,
            operationId: `find${_.upperFirst(this.pluralName)}`,
            parameters: removeDuplicatedParameters(readQueryParameters.concat(readOptionsParameters)),
            responses: {
                200: {
                    description: `${_.upperFirst(this.pluralName)} corresponding to the query`,
                    schema: {
                        allOf: [
                            {
                                type: 'object',
                                properties: {
                                    data: {
                                        type: 'array',
                                        items: { "$ref": `#/definitions/${this.name}` },
                                    }
                                }
                            },
                            { $ref: `#/definitions/${this.name}ReadData` }
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
        let createOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.createOptions || null, this.api.openApi));

        // post a new resource
        this.api.openApi.paths[this.resourcesPath]["post"] = {
            description: `Create a new ${_.upperFirst(this.name)}`,
            operationId: `add${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(createOptionsParameters).concat([{
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
        let patchQueryParameters = schemaToSwaggerParameter(this.pipelineSchema.schema.definitions.patchQuery || null, this.api.openApi)
        let patchOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.patchOptions || null, this.api.openApi));

        // patch by id
        this.api.openApi.paths[this.resourcesPathWithId]["patch"] = {
            description: `Patch a ${_.upperFirst(this.name)} using its id`,
            operationId: `patch${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(patchOptionsParameters).concat([
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
        let updateOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.updateOptions || null, this.api.openApi));

        // put by id
        this.api.openApi.paths[this.resourcesPathWithId]["put"] = {
            description: `Put a ${_.upperFirst(this.name)} using its id`,
            operationId: `put${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(updateOptionsParameters).concat([
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
        let deleteOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(
            this.pipelineSchema.schema.definitions.deleteOptions || null, this.api.openApi));
        // delete by id
        this.api.openApi.paths[this.resourcesPathWithId]["delete"] = {
            description: `Delete a ${_.upperFirst(this.name)} using its id`,
            operationId: `delete${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(deleteOptionsParameters).concat([
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
}