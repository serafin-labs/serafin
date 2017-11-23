import * as Ajv from "ajv";
import * as Swagger from 'swagger-schema-official';
import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import { JSONSchema4 } from "json-schema"
import { PipelineAbstract } from "../pipeline/Abstract"
import { throughJsonSchema } from "../util/throughJsonSchema"
import { validtionError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../error/Error"
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToSwaggerParameter } from "./openApiUtils"




/**
 * Api class represents a set of endpoints based on pipelines.
 * It will register all routes for the endpoints and for metadata (swagger / open API).
 */
export class Api {

    /**
     * Map of all exposed pipelines
     */
    protected pipelineByName: { [name: string]: PipelineAbstract } = {}

    /**
     * Base path of the API
     */
    protected get basePath(): string {
        return this.openApi.basePath || ""
    }

    /**
     * @param application the express app the Api will rely on to register endpoints
     * @param openApi Base open api document. To be used to provide general information about the api.
     */
    constructor(protected application: express.Application, protected openApi: Swagger.Spec = <any>{}) {
        // init open Api specs
        this.openApi.paths = this.openApi.paths || {};
        this.openApi.definitions = this.openApi.definitions || {};
        this.openApi.definitions.Error = {
            type: "object",
            properties: {
                code: { type: "number" },
                message: { type: "string" }
            }
        }

        // setup endpoints for api metadata
        this.application.get(this.basePath + "/api.json", (req, res) => {
            res.json(this.openApi).end();
        });
    }

    /**
     * Expose a pipeline on this API. All implemented methods are automatically binded to the corrsponding actions and urls.
     * 
     * @param pipeline The pipeline to expose on the API
     * @param name The singular name of the underlying resource. It is used to generate the url of the endpoint.
     * @param pluralName The plural name the underlying resource. It is used to generate the url of the endpoint. If not provided, it defaults to `${name}s`
     */
    use(pipeline: PipelineAbstract, name: string, pluralName: string = `${name}s`): this {
        // register the pipeline
        this.pipelineByName[name] = pipeline;

        // setup the router
        let endpointPath = `${this.basePath}/${pluralName}`;
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
        this.openApi.definitions[name] = remapRefs(jsonSchemaToOpenApiSchema(_.cloneDeep(pipelineSchema.schema)), `#/definitions/${name}`) as any
        flattenSchemas(this.openApi.definitions as any)

        // prepare allowed options
        let readQueryParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.readQuery || null, this.openApi);   
        let readOptionsParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.readOptions || null, this.openApi);
        let createOptionsParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.createOptions || null, this.openApi);
        let updateOptionsParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.updateOptions || null, this.openApi);
        let patchQueryParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.patchQuery || null, this.openApi)
        let patchOptionsParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.patchOptions || null, this.openApi);
        let deleteOptionsParameters = schemaToSwaggerParameter(pipelineSchema.schema.definitions.deleteOptions || null, this.openApi);
        
        // prepare Ajv filters
        let ajv = new Ajv({ coerceTypes: true, removeAdditional: true });
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        ajv.addSchema(pipelineSchema.schema, "pipelineSchema");
        let readQueryFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readQuery' });
        let readOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readOptions' });
        let createOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/createOptions' });
        let updateOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/updateOptions' });
        let patchOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/patchOptions' });
        let deleteOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/deleteOptions' });


        // create the routes for this endpoint

        // get many resources
        router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // separate options from query based on pipeline metadata
            let options = _.cloneDeep(req.query);
            let query = _.cloneDeep(req.query);
            let optionsValid = readOptionsFilter(options);
            let queryValid = readQueryFilter(query);
            if (!optionsValid || !queryValid) {
                let error = this.apiError(validtionError(ajv.errorsText(optionsValid ? readQueryFilter.errors : readOptionsFilter.errors)), req)
                return handleError(error, res, next);
            }

            // run the query
            pipeline.read(query, options).then(wrapper => {
                res.status(200).json(wrapper);
                res.end();
            }).catch(error => {
                handleError(this.apiError(error, req), res, next)
            });
        })

        // get a resource by its id
        router.get("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            let options = _.cloneDeep(req.query);
            let optionsValid = readOptionsFilter(options);
            if (!optionsValid) {
                let error = this.apiError(validtionError(ajv.errorsText(readOptionsFilter.errors)), req)
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
                handleError(this.apiError(error, req), res, next)
            });
        })

        // create a new resource
        router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            let options = _.cloneDeep(req.query);
            let optionsValid = createOptionsFilter(options);
            if (!optionsValid) {
                let error = this.apiError(validtionError(ajv.errorsText(createOptionsFilter.errors)), req)
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
                handleError(this.apiError(error, req), res, next)
            });
        })

        // patch an existing resource
        router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            let options = _.cloneDeep(req.query);
            let optionsValid = patchOptionsFilter(options);
            if (!optionsValid) {
                let error = this.apiError(validtionError(ajv.errorsText(patchOptionsFilter.errors)), req)
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
                handleError(this.apiError(error, req), res, next)
            });
        })

        // put an existing resource
        router.put("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            let options = _.cloneDeep(req.query);
            let optionsValid = updateOptionsFilter(options);
            if (!optionsValid) {
                let error = this.apiError(validtionError(ajv.errorsText(updateOptionsFilter.errors)), req)
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
                handleError(this.apiError(error, req), res, next)
            });
        })

        // delete an existing resource
        router.delete("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            let options = _.cloneDeep(req.query);
            let optionsValid = deleteOptionsFilter(options);
            if (!optionsValid) {
                let error = this.apiError(validtionError(ajv.errorsText(deleteOptionsFilter.errors)), req)
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
                handleError(this.apiError(error, req), res, next)
            });
        })

        // attach the router to the express app
        this.application.use(endpointPath, router);

        // prepare open API metadata for each endpoint
        var resourcesPathWithId = `${resourcesPath}/{id}`;
        this.openApi.paths[resourcesPath] = this.openApi.paths[resourcesPath] || {};
        this.openApi.paths[resourcesPathWithId] = this.openApi.paths[resourcesPathWithId] || {};

        // general get
        this.openApi.paths[resourcesPath]["get"] = {
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

        // post a new resource
        this.openApi.paths[resourcesPath]["post"] = {
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

        // get by id
        this.openApi.paths[resourcesPathWithId]["get"] = {
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

        // put by id
        this.openApi.paths[resourcesPathWithId]["put"] = {
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

        // patch by id
        this.openApi.paths[resourcesPathWithId]["patch"] = {
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

        // delete by id
        this.openApi.paths[resourcesPathWithId]["delete"] = {
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

        // return this for easy chaining of operations
        return this;
    }

    protected apiError(cause: any, req: express.Request) {
        return new VError({
            name: "SerafinRequestError",
            cause: cause,
            info: {
                url: req.url,
                method: req.method,
                ip: req.ip
            }
        }, `Request ${req.method} ${req.baseUrl}${req.url} by ${req.ip} failed`)
    }
}