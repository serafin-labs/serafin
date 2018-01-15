import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import { JSONSchema, metaSchema } from "@serafin/open-api"
import { TransportInterface } from "../TransportInterface"
import { Pipeline} from "../../../pipeline/Pipeline"
import { OpenApi } from "./OpenApi"
import { Api } from "../../Api"
import { serafinError, validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../../../error/Error"
import { JsonHal } from './JsonHal';
import { SchemaBuilder } from '@serafin/schema-builder';

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
    use(pipeline: Pipeline, name: string, pluralName: string) {
        // setup the router
        let endpointPath = `${this.api.basePath}/${pluralName}`;
        let resourcesPath = `/${pluralName}`;
        let router = express.Router();
        let openApi = new OpenApi(this.api, pipeline, resourcesPath, name, pluralName);

        // determine what are the available actions
        let canRead = !!pipeline.readQuerySchemaBuilder
        let canCreate = !!pipeline.createValuesSchemaBuilder
        let canUpdate = !!pipeline.updateValuesSchemaBuilder
        let canPatch = !!pipeline.patchValuesSchemaBuilder
        let canDelete = !!pipeline.deleteQuerySchemaBuilder

        this.testOptionsAndQueryConflict(pipeline.readQuerySchemaBuilder.schema, pipeline.readOptionsSchemaBuilder.schema);
        this.testOptionsAndQueryConflict(pipeline.patchQuerySchemaBuilder.schema, pipeline.patchOptionsSchemaBuilder.schema);
        this.testOptionsAndQueryConflict(pipeline.deleteQuerySchemaBuilder.schema, pipeline.deleteOptionsSchemaBuilder.schema);

        // create the routes for this endpoint
        if (canRead) {
            // get many resources
            router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = this.handleOptionsAndQuery(req, res, next, pipeline.readOptionsSchemaBuilder, pipeline.readQuerySchemaBuilder);
                if (!pipelineParams) {
                    return
                }

                // run the query
                pipeline.read(pipelineParams.query, pipelineParams.options).then(wrapper => {
                    if (req.headers['content-type'] && req.headers['content-type'] == 'application/hal+json') {
                        let links = (new JsonHal(endpointPath, this.api, pipeline.relations)).links();
                        wrapper["_links"] = links;
                        if (wrapper.data) {
                            wrapper.data = wrapper.data.map((result) => {
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
                    this.handleError(Api.apiError(error, req), res, next)
                });
            })

            // get a resource by its id
            router.get("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let id = req.params.id
                let pipelineParams = this.handleOptionsAndQuery(req, res, next, pipeline.readOptionsSchemaBuilder);
                if (!pipelineParams) {
                    return
                }

                // run the query
                pipeline.read({
                    id: id
                }, pipelineParams.options).then(wrapper => {
                    if (wrapper.data.length > 0) {
                        if (req.headers['content-type'] && req.headers['content-type'] == 'application/hal+json') {
                            wrapper.data[0]['_links'] = (new JsonHal(endpointPath + `/${id}`, this.api, pipeline.relations)).links(wrapper.data[0]);
                        }
                        res.status(200).json(wrapper.data[0])
                    } else {
                        throw notFoundError(`${name}:${id}`)
                    }
                    res.end();
                }).catch(error => {
                    this.handleError(Api.apiError(error, req), res, next)
                });
            })

            openApi.addReadDoc();
        }

        if (canCreate) {
            // create a new resource
            router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = this.handleOptionsAndQuery(req, res, next, pipeline.createOptionsSchemaBuilder);
                if (!pipelineParams) {
                    return
                }
                var data = req.body

                // run the query
                pipeline.create([data], pipelineParams.options).then(createdResources => {
                    if (createdResources.data.length !== 1) {
                        throw new Error(`Api Error: unexpected create result for endpoint ${resourcesPath}`)
                    }
                    res.status(201).json(createdResources.data[0])
                }).catch(error => {
                    this.handleError(Api.apiError(error, req), res, next)
                });
            });

            openApi.addCreateDoc();
        }

        if (canPatch) {
            // patch an existing resource
            router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = this.handleOptionsAndQuery(req, res, next, pipeline.patchOptionsSchemaBuilder);
                if (!pipelineParams) {
                    return
                }

                var patch = req.body
                var id = req.params.id

                // run the query
                pipeline.patch({
                    id: id
                }, patch, pipelineParams.options).then(updatedResources => {
                    if (updatedResources.data.length === 0) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(updatedResources.data[0])
                    }
                    res.end()
                }).catch(error => {
                    this.handleError(Api.apiError(error, req), res, next)
                });
            })

            openApi.addPatchDoc();
        }

        if (canUpdate) {

            // put an existing resource
            router.put("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = this.handleOptionsAndQuery(req, res, next, pipeline.updateOptionsSchemaBuilder);
                if (!pipelineParams) {
                    return
                }

                var data = req.body
                var id = req.params.id

                // run the query
                pipeline.update(id, data, pipelineParams.options).then(updatedResource => {
                    if (!updatedResource) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(updatedResource)
                    }
                    res.end()
                }).catch(error => {
                    this.handleError(Api.apiError(error, req), res, next)
                });
            });

            openApi.addUpdateDoc();
        }

        if (canDelete) {

            // delete an existing resource
            router.delete("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = this.handleOptionsAndQuery(req, res, next, pipeline.deleteOptionsSchemaBuilder);
                if (!pipelineParams) {
                    return
                }

                let id = req.params.id;

                // run the query
                pipeline.delete({
                    id: id
                }, pipelineParams.options).then(deletedResources => {
                    if (deletedResources.data.length === 0) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(deletedResources.data[0])
                    }
                    res.end()
                }).catch(error => {
                    this.handleError(Api.apiError(error, req), res, next)
                });
            });

            openApi.addDeleteDoc();
        }

        // attach the router to the express app
        this.api.application.use(endpointPath, router);

        this.api.application.get(this.api.basePath, (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            if (req.headers['content-type'] && req.headers['content-type'] == 'application/hal+json') {
                res.status(200).json({
                    _links: _.mapValues(this.api.pipelineByName, (pipeline, key) => {
                        return { href: `${this.api.basePath}/${key}` }
                    })
                });
            } else {
                throw notFoundError('/');
            }
        });
    }

    // error handling closure for this endpoint
    private handleError(error, res: express.Response, next: (err?: any) => void) {
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
    }

    private handleOptionsAndQuery(req: express.Request, res: express.Response, next: () => any, optionsSchemaBuilder: SchemaBuilder<any>, querySchemaBuilder: SchemaBuilder<any> = null): { options: object, query: object } {
        try {
            let pipelineOptions = this.api.filterInternalOptions(_.cloneDeep(req.query));
            if (this.options.internalOptions) {
                _.merge(pipelineOptions, this.options.internalOptions(req));
            }
            optionsSchemaBuilder.validate(pipelineOptions);

            let pipelineQuery = {};
            if (querySchemaBuilder !== null) {
                pipelineQuery = _.cloneDeep(req.query)
                querySchemaBuilder.validate(pipelineQuery);
            }
            return { options: pipelineOptions, query: pipelineQuery }
        } catch (e) {
            this.handleError(Api.apiError(e, req), res, next)
        }
        return null
    }

    private testOptionsAndQueryConflict(optionsSchema: JSONSchema, querySchema: JSONSchema): void {
        if (optionsSchema && querySchema) {
            let intersection = _.intersection(Object.keys(optionsSchema.properties || {}), Object.keys(querySchema.properties || {}));
            if (intersection.length > 0) {
                throw serafinError('SerafinRestParamsNameConflict', `Name conflict between options and query (${intersection.toString()})`,
                    { conflict: intersection, optionsSchema: optionsSchema, querySchema: querySchema });
            }
        }
    }
}