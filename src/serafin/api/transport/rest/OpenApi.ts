import * as _ from 'lodash';
import * as jsonpointer from 'jsonpointer';
import { OpenAPIObject, ParameterObject } from "@serafin/open-api"

import { Api } from "../../Api"
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToOpenApiParameter } from "../../openApiUtils";
import { PipelineAbstract, throughJsonSchema } from '../../../../';

function mapSchemaBuilderName(schemaBuilderName: string, modelName: string) {
    if (schemaBuilderName === "modelSchemaBuilder") {
        return modelName
    } else {
        return modelName + _.upperFirst(schemaBuilderName.replace("SchemaBuilder", ""))
    }
}
export class OpenApi {
    private resourcesPathWithId;
    private upperName: string;
    private upperPluralName: string

    constructor(private api: Api, private pipeline: PipelineAbstract<any, any>, private resourcesPath, private name: string, private pluralName: string) {
        // import pipeline schemas to openApi definitions
        this.upperName = _.upperFirst(name);
        this.upperPluralName = _.upperFirst(pluralName);

        for (let schemaBuilderName of PipelineAbstract.schemaBuilderNames) {
            let schemaName = mapSchemaBuilderName(schemaBuilderName, this.upperName)
            let schema = jsonSchemaToOpenApiSchema(_.cloneDeep(pipeline[schemaBuilderName].schema));
            schema.title = schemaName;
            this.api.openApi.components.schemas[schemaName] = schema
        }
        flattenSchemas(this.api.openApi.components.schemas);

        // prepare open API metadata for each endpoint
        this.resourcesPathWithId = `${resourcesPath}/{id}`;
        this.api.openApi.paths[this.resourcesPath] = this.api.openApi.paths[this.resourcesPath] || {};
        this.api.openApi.paths[this.resourcesPathWithId] = this.api.openApi.paths[this.resourcesPathWithId] || {};
    }

    addReadDoc() {
        let readQueryParameters = schemaToOpenApiParameter(this.pipeline.schemaBuilders.readQuery.schema, this.api.openApi);
        let readOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(this.pipeline.schemaBuilders.readOptions.schema, this.api.openApi));

        // general get
        this.api.openApi.paths[this.resourcesPath]["get"] = {
            description: `Find ${this.upperPluralName}`,
            operationId: `find${this.upperPluralName}`,
            parameters: removeDuplicatedParameters(readQueryParameters.concat(readOptionsParameters)),
            responses: {
                200: {
                    description: `${this.upperPluralName} corresponding to the query`,
                    content: {
                        "application/json": {
                            schema: {
                                allOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            data: {
                                                type: 'array',
                                                items: { "$ref": `#/components/schemas/${this.upperName}` },
                                            }
                                        }
                                    },
                                    { $ref: `#/components/schemas/${this.upperName}ReadMeta` }
                                ]
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
            description: `Get one ${this.upperName} by its id`,
            operationId: `get${this.upperName}ById`,
            parameters: [{
                in: "path",
                name: "id",
                schema: { type: "string" },
                required: true
            }],
            responses: {
                200: {
                    description: `${this.upperPluralName} corresponding to the provided id`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.upperName}` }
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
        let createOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(this.pipeline.schemaBuilders.createOptions.schema, this.api.openApi));

        // post a new resource
        this.api.openApi.paths[this.resourcesPath]["post"] = {
            description: `Create a new ${this.upperName}`,
            operationId: `add${this.upperName}`,
            parameters: removeDuplicatedParameters(createOptionsParameters),
            requestBody: {
                description: `The ${this.upperName} to be created.`,
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: `#/components/schemas/${this.upperName}CreateValues` }
                    }
                }
            },
            responses: {
                201: {
                    description: `${this.upperName} created`,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: `#/components/schemas/${this.upperName}`
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
        let patchQueryParameters = schemaToOpenApiParameter(this.pipeline.schemaBuilders.patchQuery.schema, this.api.openApi)
        let patchOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(this.pipeline.schemaBuilders.patchOptions.schema, this.api.openApi));

        // patch by id
        this.api.openApi.paths[this.resourcesPathWithId]["patch"] = {
            description: `Patch a ${this.upperName} using its id`,
            operationId: `patch${this.upperName}`,
            parameters: removeDuplicatedParameters(patchOptionsParameters).concat([{
                in: "path",
                name: "id",
                schema: { type: "string" },
                required: true
            }]),
            requestBody: {
                description: `The patch of ${this.upperName}.`,
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: `#/components/schemas/${this.upperName}PatchValues` }
                    }
                }
            },
            responses: {
                200: {
                    description: `Updated ${this.upperName}`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.upperName}` }
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

    addReplaceDoc() {
        let replaceOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(this.pipeline.schemaBuilders.replaceOptions.schema, this.api.openApi));

        // put by id
        this.api.openApi.paths[this.resourcesPathWithId]["put"] = {
            description: `Put a ${this.upperName} using its id`,
            operationId: `put${this.upperName}`,
            parameters: removeDuplicatedParameters(replaceOptionsParameters).concat([{
                in: "path",
                name: "id",
                schema: { type: "string" },
                required: true
            }]),
            requestBody: {
                description: `The ${this.upperName} to be replaced.`,
                required: true,
                content: {
                    "application/json": {
                        schema: { $ref: `#/components/schemas/${this.upperName}ReplaceValues` }
                    }
                }
            },
            responses: {
                200: {
                    description: `Replaced ${this.upperName}`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.upperName}` }
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
        let deleteOptionsParameters = this.api.filterInternalParameters(schemaToOpenApiParameter(this.pipeline.schemaBuilders.deleteOptions.schema, this.api.openApi));
        // delete by id
        this.api.openApi.paths[this.resourcesPathWithId]["delete"] = {
            description: `Delete a ${this.upperName} using its id`,
            operationId: `delete${this.upperName}`,
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
                    description: `Deleted ${this.upperName}`,
                    content: {
                        "application/json": {
                            schema: { $ref: `#/components/schemas/${this.upperName}` }
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