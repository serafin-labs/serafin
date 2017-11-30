import * as Ajv from "ajv";
import * as Swagger from 'swagger-schema-official';
import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import { JSONSchema4 } from "json-schema"
import { TransportInterface } from "../TransportInterface"
import { PipelineAbstract } from "../../../pipeline/Abstract"
import { Api } from "../../Api"
import { validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../../../error/Error"
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToSwaggerParameter } from "../../openApiUtils"

export interface RestOptions {
    /**
     * If provided, the Api will use this function to gather internal options for this request.
     * It can be used for example to pass _user or _role to the underlying pipeline.
     */
    internalOptions?: (req: express.Request) => Object
}

export class RestTransport implements TransportInterface {
    protected api: Api
    constructor(protected options: RestOptions = {}) {
    }

    init(api: Api) {
        this.api = api;
    }

    /**
     * Use the given pipeline.
     * 
     * @param pipeline 
     * @param name 
     * @param pluralName 
     */
    use(pipeline: PipelineAbstract, name: string, pluralName: string) {
        // register the pipeline

        // setup the router
        let endpointPath = `${this.api.basePath}/${pluralName}`;
        let resourcesPath = `/${pluralName}`;
        let router = express.Router();

        // error handling closure for this endpoint
        let handleError = (error, res: express.Response, next: (err?: any) => void) => {
            // handle known errors
            if (![[ValidationErrorName, 400], [NotFoundErrorName, 404], [ConflictErrorName, 409], [NotImplementedErrorName, 405], [UnauthorizedErrorName, 401]].some((p: [string, number]) => {
                let [errorName, code] = p;
                if (VError.findCauseByName(error, errorName)) {
                    res.status(code).json({
                        code: code,
                        message: error.message
                    })
                    return true
                }
                return false
            })) {
                // or pass the error down the chain
                console.error(VError.fullStack(error));
                next(error)
            }
        };

        // import pipeline schemas to openApi definitions
        var pipelineSchema = pipeline.schema;
        this.api.openApi.definitions[name] = remapRefs(jsonSchemaToOpenApiSchema(_.cloneDeep(pipelineSchema.schema)), `#/definitions/${name}`) as any
        flattenSchemas(this.api.openApi.definitions as any)

        // determine what are the available actions
        let canRead = !!pipelineSchema.schema.definitions.readQuery
        let canCreate = !!pipelineSchema.schema.definitions.createValues
        let canUpdate = !!pipelineSchema.schema.definitions.updateValues
        let canPatch = !!pipelineSchema.schema.definitions.patchValues
        let canDelete = !!pipelineSchema.schema.definitions.deleteQuery

        // prepare open API metadata for each endpoint
        var resourcesPathWithId = `${resourcesPath}/{id}`;
        this.api.openApi.paths[resourcesPath] = this.api.openApi.paths[resourcesPath] || {};
        this.api.openApi.paths[resourcesPathWithId] = this.api.openApi.paths[resourcesPathWithId] || {};

        // prepare Ajv filters
        let ajv = new Ajv({ coerceTypes: true, removeAdditional: true });
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        ajv.addSchema(pipelineSchema.schema, "pipelineSchema");


        // create the routes for this endpoint

        if (canRead) {
            let readQueryParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.readQuery || null, this.api.openApi);
            let readOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(pipelineSchema.schema.definitions.readOptions || null, this.api.openApi));
            let readQueryFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readQuery' });
            let readOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readOptions' });

            // get many resources
            router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                // separate options from query based on pipeline metadata
                let options = this.api.filterInternalOptions(_.cloneDeep(req.query));
                if (this.options.internalOptions) {
                    _.merge(options, this.options.internalOptions(req))
                }
                let internalOptions
                let query = _.cloneDeep(req.query);
                let optionsValid = readOptionsFilter(options);
                let queryValid = readQueryFilter(query);
                if (!optionsValid || !queryValid) {
                    let error = Api.apiError(validationError(ajv.errorsText(optionsValid ? readQueryFilter.errors : readOptionsFilter.errors)), req)
                    return handleError(error, res, next);
                }

                // run the query
                pipeline.read(query, options).then(wrapper => {
                    res.status(200).json(wrapper);
                    res.end();
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })

            // get a resource by its id
            router.get("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                // extract parameters
                let options = this.api.filterInternalOptions(_.cloneDeep(req.query));
                if (this.options.internalOptions) {
                    _.merge(options, this.options.internalOptions(req))
                }
                let optionsValid = readOptionsFilter(options);
                if (!optionsValid) {
                    let error = Api.apiError(validationError(ajv.errorsText(readOptionsFilter.errors)), req)
                    return handleError(error, res, next);
                }
                var id = req.params.id

                // run the query
                pipeline.read({
                    id: id
                }, options).then(wrapper => {
                    if (wrapper.results.length > 0) {
                        res.status(200).json(wrapper.results[0])
                    } else {
                        throw notFoundError(`${name}:${id}`)
                    }
                    res.end();
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })


            // general get
            this.api.openApi.paths[resourcesPath]["get"] = {
                description: `Find ${_.upperFirst(pluralName)}`,
                operationId: `find${_.upperFirst(pluralName)}`,
                parameters: removeDuplicatedParameters(readQueryParameters.concat(readOptionsParameters)),
                responses: {
                    200: {
                        description: `${_.upperFirst(pluralName)} corresponding to the query`,
                        schema: {
                            allOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        results: {
                                            type: 'array',
                                            items: { "$ref": `#/definitions/${name}` },
                                        }
                                    }
                                },
                                { $ref: `#/definitions/${name}ReadResults` }
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
            this.api.openApi.paths[resourcesPathWithId]["get"] = {
                description: `Get one ${_.upperFirst(name)} by its id`,
                operationId: `get${_.upperFirst(name)}ById`,
                parameters: [{
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }],
                responses: {
                    200: {
                        description: `${_.upperFirst(name)} corresponding to the provided id`,
                        schema: { $ref: `#/definitions/${name}` }
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


        if (canCreate) {
            let createOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(pipelineSchema.schema.definitions.createOptions || null, this.api.openApi));
            let createOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/createOptions' });

            // create a new resource
            router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                // extract parameters
                let options = this.api.filterInternalOptions(_.cloneDeep(req.query));
                if (this.options.internalOptions) {
                    _.merge(options, this.options.internalOptions(req))
                }
                let optionsValid = createOptionsFilter(options);
                if (!optionsValid) {
                    let error = Api.apiError(validationError(ajv.errorsText(createOptionsFilter.errors)), req)
                    return handleError(error, res, next);
                }
                var data = req.body

                // run the query
                pipeline.create([data], options).then(createdResources => {
                    if (createdResources.length !== 1) {
                        throw new Error(`Api Error: unexpected create result for endpoint ${resourcesPath}`)
                    }
                    res.status(201).json(createdResources[0])
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })

            // post a new resource
            this.api.openApi.paths[resourcesPath]["post"] = {
                description: `Create a new ${_.upperFirst(name)}`,
                operationId: `add${_.upperFirst(name)}`,
                parameters: removeDuplicatedParameters(createOptionsParameters).concat([{
                    in: "body",
                    name: name,
                    description: `The ${_.upperFirst(name)} to be created.`,
                    schema: { $ref: `#/definitions/${name}CreateValues` }
                }]),
                responses: {
                    201: {
                        description: `${_.upperFirst(name)} created`,
                        schema: { $ref: `#/definitions/${name}` }
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

        if (canPatch) {
            let patchQueryParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.patchQuery || null, this.api.openApi)
            let patchOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(pipelineSchema.schema.definitions.patchOptions || null, this.api.openApi));
            let patchOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/patchOptions' });

            // patch an existing resource
            router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                // extract parameters
                let options = this.api.filterInternalOptions(_.cloneDeep(req.query));
                if (this.options.internalOptions) {
                    _.merge(options, this.options.internalOptions(req))
                }
                let optionsValid = patchOptionsFilter(options);
                if (!optionsValid) {
                    let error = Api.apiError(validationError(ajv.errorsText(patchOptionsFilter.errors)), req)
                    return handleError(error, res, next);
                }
                var patch = req.body
                var id = req.params.id

                // run the query
                pipeline.patch({
                    id: id
                }, patch, options).then(updatedResources => {
                    if (updatedResources.length === 0) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(updatedResources[0])
                    }
                    res.end()
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })

            // patch by id
            this.api.openApi.paths[resourcesPathWithId]["patch"] = {
                description: `Patch a ${_.upperFirst(name)} using its id`,
                operationId: `patch${_.upperFirst(name)}`,
                parameters: removeDuplicatedParameters(patchOptionsParameters).concat([
                    {
                        in: "body",
                        name: name,
                        description: `The patch of ${_.upperFirst(name)}.`,
                        schema: { $ref: `#/definitions/${name}PatchValues` }
                    }, {
                        in: "path",
                        name: "id",
                        type: "string",
                        required: true
                    }
                ]),
                responses: {
                    200: {
                        description: `Updated ${_.upperFirst(name)}`,
                        schema: { $ref: `#/definitions/${name}` }
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

        if (canUpdate) {
            let updateOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(pipelineSchema.schema.definitions.updateOptions || null, this.api.openApi));
            let updateOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/updateOptions' });

            // put an existing resource
            router.put("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                // extract parameters
                let options = this.api.filterInternalOptions(_.cloneDeep(req.query));
                if (this.options.internalOptions) {
                    _.merge(options, this.options.internalOptions(req))
                }
                let optionsValid = updateOptionsFilter(options);
                if (!optionsValid) {
                    let error = Api.apiError(validationError(ajv.errorsText(updateOptionsFilter.errors)), req)
                    return handleError(error, res, next);
                }
                var data = req.body
                var id = req.params.id

                // run the query
                pipeline.update(id, data, options).then(updatedResource => {
                    if (!updatedResource) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(updatedResource)
                    }
                    res.end()
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })

            // put by id
            this.api.openApi.paths[resourcesPathWithId]["put"] = {
                description: `Put a ${_.upperFirst(name)} using its id`,
                operationId: `put${_.upperFirst(name)}`,
                parameters: removeDuplicatedParameters(updateOptionsParameters).concat([
                    {
                        in: "body",
                        name: name,
                        description: `The ${_.upperFirst(name)} to be updated.`,
                        schema: { $ref: `#/definitions/${name}UpdateValues` }
                    }, {
                        in: "path",
                        name: "id",
                        type: "string",
                        required: true
                    }
                ]),
                responses: {
                    200: {
                        description: `Updated ${_.upperFirst(name)}`,
                        schema: { $ref: `#/definitions/${name}` }
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

        if (canDelete) {
            let deleteOptionsParameters = this.api.filterInternalParameters(schemaToSwaggerParameter(pipelineSchema.schema.definitions.deleteOptions || null, this.api.openApi));
            let deleteOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/deleteOptions' });

            // delete an existing resource
            router.delete("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                // extract parameters
                let options = this.api.filterInternalOptions(_.cloneDeep(req.query));
                if (this.options.internalOptions) {
                    _.merge(options, this.options.internalOptions(req))
                }
                let optionsValid = deleteOptionsFilter(options);
                if (!optionsValid) {
                    let error = Api.apiError(validationError(ajv.errorsText(deleteOptionsFilter.errors)), req)
                    return handleError(error, res, next);
                }
                var id = req.params.id

                // run the query
                pipeline.delete({
                    id: id
                }, options).then(deletedResources => {
                    if (deletedResources.length === 0) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(deletedResources[0])
                    }
                    res.end()
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })

            // delete by id
            this.api.openApi.paths[resourcesPathWithId]["delete"] = {
                description: `Delete a ${_.upperFirst(name)} using its id`,
                operationId: `delete${_.upperFirst(name)}`,
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
                        description: `Deleted ${_.upperFirst(name)}`,
                        schema: { $ref: `#/definitions/${name}` }
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

        // attach the router to the express app
        this.api.application.use(endpointPath, router);
    }
}