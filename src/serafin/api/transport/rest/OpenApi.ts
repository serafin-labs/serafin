import * as _ from 'lodash';
import * as jsonpointer from 'jsonpointer';
import { OpenAPIObject, ParameterObject } from "../../../openApi"
import { Api } from "../../Api"

import { throughJsonSchema } from "../../../util/throughJsonSchema";
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToOpenApiParameter } from "../../openApiUtils";


export class OpenApi {
    private resourcesPathWithId;

    constructor(private api: Api, private pipelineSchema, private resourcesPath, private name: string, private pluralName: string) {
        // import pipeline schemas to openApi definitions
        this.api.openApi.components.schemas[name] = remapRefs(jsonSchemaToOpenApiSchema(
            _.cloneDeep(this.pipelineSchema.schema)), `#/components/schemas/${name}`) as any;
        flattenSchemas(this.api.openApi.components.schemas);

        // prepare open API metadata for each endpoint
        this.resourcesPathWithId = `${resourcesPath}/{id}`;
        this.api.openApi.paths[this.resourcesPath] = this.api.openApi.paths[this.resourcesPath] || {};
        this.api.openApi.paths[this.resourcesPathWithId] = this.api.openApi.paths[this.resourcesPathWithId] || {};
    }

    addReadDoc() {
        let readQueryParameters = schemaToOpenApiParameter(this.pipelineSchema.schema.definitions.readQuery || null, this.api.openApi);
        let readOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(
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
                            { $ref: `#/definitions/${this.name}ReadResults` }
                        ]
                    }
                },
                400: {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
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
                schema: { type: "string" },
                required: true
            }],
            responses: {
                200: {
                    description: `${_.upperFirst(this.name)} corresponding to the provided id`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.name}` }
                        }
                    }
                },
                400: {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                404: {
                    description: "Not Found",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        }
    }

    addCreateDoc() {
        let createOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(
            this.pipelineSchema.schema.definitions.createOptions || null, this.api.openApi));

        // post a new resource
        this.api.openApi.paths[this.resourcesPath]["post"] = {
            description: `Create a new ${_.upperFirst(this.name)}`,
            operationId: `add${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(createOptionsParameters),
            requestBody: {
                description: `The ${_.upperFirst(this.name)} to be created.`,
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: `#/components/schemas/${this.name}CreateValues` }
                    }
                }
            },
            responses: {
                201: {
                    description: `${_.upperFirst(this.name)} created`,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${this.name}`
                            }
                        }
                    }
                },
                400: {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                409: {
                    description: "Conflict",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        }
    }

    addPatchDoc() {
        let patchQueryParameters = schemaToOpenApiParameter(this.pipelineSchema.schema.definitions.patchQuery || null, this.api.openApi)
        let patchOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(
            this.pipelineSchema.schema.definitions.patchOptions || null, this.api.openApi));

        // patch by id
        this.api.openApi.paths[this.resourcesPathWithId]["patch"] = {
            description: `Patch a ${_.upperFirst(this.name)} using its id`,
            operationId: `patch${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(patchOptionsParameters).concat([{
                in: "path",
                name: "id",
                schema: { type: "string" },
                required: true
            }]),
            requestBody: {
                description: `The patch of ${_.upperFirst(this.name)}.`,
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: `#/components/schemas/${this.name}PatchValues` }
                    }
                }
            },
            responses: {
                200: {
                    description: `Updated ${_.upperFirst(this.name)}`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.name}` }
                        }
                    }
                },
                400: {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                404: {
                    description: "Not Found",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        }
    }

    addUpdateDoc() {
        let updateOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(
            this.pipelineSchema.schema.definitions.updateOptions || null, this.api.openApi));

        // put by id
        this.api.openApi.paths[this.resourcesPathWithId]["put"] = {
            description: `Put a ${_.upperFirst(this.name)} using its id`,
            operationId: `put${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(updateOptionsParameters).concat([{
                in: "path",
                name: "id",
                schema: { type: "string" },
                required: true
            }]),
            requestBody: {
                description: `The ${_.upperFirst(this.name)} to be updated.`,
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: `#/components/schemas/${this.name}UpdateValues` }
                    }
                }
            },
            responses: {
                200: {
                    description: `Updated ${_.upperFirst(this.name)}`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.name}` }
                        }
                    }
                },
                400: {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                404: {
                    description: "Not Found",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        }
    }

    addDeleteDoc() {
        let deleteOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(
            this.pipelineSchema.schema.definitions.deleteOptions || null, this.api.openApi));
        // delete by id
        this.api.openApi.paths[this.resourcesPathWithId]["delete"] = {
            description: `Delete a ${_.upperFirst(this.name)} using its id`,
            operationId: `delete${_.upperFirst(this.name)}`,
            parameters: removeDuplicatedParameters(deleteOptionsParameters).concat([
                {
                    in: "path",
                    name: "id",
                    schema: { type: "string" },
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Deleted ${_.upperFirst(this.name)}`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.name}` }
                        }
                    }
                },
                400: {
                    description: "Bad request",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                404: {
                    description: "Not Found",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    content: {
                        "application/json": {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        }
    }
}