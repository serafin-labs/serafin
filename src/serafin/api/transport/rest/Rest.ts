import * as Swagger from 'swagger-schema-official';
import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import * as Ajv from "ajv";
import { JSONSchema4 } from "json-schema"
import { TransportInterface } from "../TransportInterface"
import { PipelineAbstract } from "../../../pipeline/Abstract"
import { OpenApi } from "./OpenApi"
import { Api } from "../../Api"
import { validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../../../error/Error"
import { JsonHal } from './JsonHal';

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
        // setup the router
        let endpointPath = `${this.api.basePath}/${pluralName}`;
        let resourcesPath = `/${pluralName}`;
        let router = express.Router();
        let openApi = new OpenApi(this.api, pipeline.schema, resourcesPath, name, pluralName);

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

        // determine what are the available actions
        let canRead = !!pipelineSchema.schema.definitions.readQuery
        let canCreate = !!pipelineSchema.schema.definitions.createValues
        let canUpdate = !!pipelineSchema.schema.definitions.updateValues
        let canPatch = !!pipelineSchema.schema.definitions.patchValues
        let canDelete = !!pipelineSchema.schema.definitions.deleteQuery

        // prepare Ajv filters
        let ajv = new Ajv({ coerceTypes: true, removeAdditional: true });
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        ajv.addSchema(pipelineSchema.schema, "pipelineSchema");

        // create the routes for this endpoint
        if (canRead) {
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
                    if (req.headers['content-type'] && req.headers['content-type'] == 'application/hal+json') {
                        let links = (new JsonHal(endpointPath, this.api, pipeline.relations)).links();
                        wrapper["_links"] = links;
                        if (wrapper.results) {
                            wrapper.results = wrapper.results.map((result) => {
                                if (result['id']) {
                                    result['_links'] = (new JsonHal(endpointPath + `/${result['id']}`, this.api, pipeline.relations)).links(result);
                                }
                                return result;
                            });
                        }
                    }

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
                        if (req.headers['content-type'] && req.headers['content-type'] == 'application/hal+json') {
                            wrapper.results[0]['_links'] = (new JsonHal(endpointPath + `/${id}`, this.api, pipeline.relations)).links(wrapper.results[0]);
                        }
                        res.status(200).json(wrapper.results[0])
                    } else {
                        throw notFoundError(`${name}:${id}`)
                    }
                    res.end();
                }).catch(error => {
                    handleError(Api.apiError(error, req), res, next)
                });
            })

            openApi.addReadDoc();
        }

        if (canCreate) {
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
            });

            openApi.addCreateDoc();
        }

        if (canPatch) {
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

            openApi.addPatchDoc();
        }

        if (canUpdate) {
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
            });

            openApi.addUpdateDoc();
        }

        if (canDelete) {
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
            });

            openApi.addDeleteDoc();
        }

        // attach the router to the express app
        this.api.application.use(endpointPath, router);
    }
}