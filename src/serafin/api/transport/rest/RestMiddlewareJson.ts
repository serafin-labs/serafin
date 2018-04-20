import * as express from 'express';
import * as _ from 'lodash';
import { OpenApi } from './OpenApi';
import { PipelineAbstract, Relation, notFoundError } from '@serafin/pipeline'
import { Api } from '../../../..';
import { RestTransport } from './rest'
import { JsonHal } from './JsonHal';

export const restMiddlewareJson = (rest: RestTransport, pipeline: PipelineAbstract<any, any>,
    openApi: OpenApi, endpointPath: string, resourcesPath: string, name: string) => {
    let router: express.Router = express.Router();
    router.use((req, res, next) => {
        if (req.get('Content-Type') !== undefined && req.get('Content-Type') != "application/json"
            && req.get('Content-Type') != "application/hal+json") {
            return next('router');
        }
        next();
    });

    let availableMethods = RestTransport.availableMethods(pipeline);

    // create the routes for this endpoint
    if (availableMethods.canRead) {
        // get many resources
        router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleOptionsAndQuery(req, res, next, pipeline.schemaBuilders.readOptions, pipeline.schemaBuilders.readQuery);
            if (!pipelineParams) {
                return
            }

            // run the query
            pipeline.read(pipelineParams.query, pipelineParams.options).then(result => {
                if (req.get('Content-Type') !== undefined && req.get('Content-Type') == 'application/hal+json') {
                    let links = (new JsonHal(endpointPath, rest.api, pipeline.relations)).links();
                    result["_links"] = links;
                    if (result.data) {
                        result.data = result.data.map((result) => {
                            if (result['id']) {
                                result['_links'] = (new JsonHal(endpointPath + `/${result['id']}`, rest.api, pipeline.relations)).links(result);
                            }
                            return result;
                        });
                    }
                }

                res.status(200).json(result);
                res.end();
            }).catch(error => {
                rest.handleError(Api.apiError(error, req), res, next)
            });
        })

        // get a resource by its id
        router.get("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let id = req.params.id
            let pipelineParams = rest.handleOptionsAndQuery(req, res, next, pipeline.schemaBuilders.readOptions);
            if (!pipelineParams) {
                return
            }

            // run the query
            pipeline.read({
                id: id
            }, pipelineParams.options).then(result => {
                if (result.data.length > 0) {
                    if (req.get('Content-Type') !== undefined && req.get('Content-Type') == 'application/hal+json') {
                        result.data[0]['_links'] = (new JsonHal(endpointPath + `/${id}`, rest.api, pipeline.relations)).links(result.data[0]);
                    }
                    res.status(200).json(result.data[0])
                } else {
                    throw notFoundError(`${name}:${id}`)
                }
                res.end();
            }).catch(error => {
                rest.handleError(Api.apiError(error, req), res, next)
            });
        })

        openApi.addReadDoc();
    }

    if (availableMethods.canCreate) {
        // create a new resource
        router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleOptionsAndQuery(req, res, next, pipeline.schemaBuilders.createOptions);
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
                rest.handleError(Api.apiError(error, req), res, next)
            });
        });

        openApi.addCreateDoc();
    }

    if (availableMethods.canPatch) {
        // patch an existing resource
        router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleOptionsAndQuery(req, res, next, pipeline.schemaBuilders.patchOptions);
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
                rest.handleError(Api.apiError(error, req), res, next)
            });
        })

        openApi.addPatchDoc();
    }

    if (availableMethods.canReplace) {

        // put an existing resource
        router.put("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleOptionsAndQuery(req, res, next, pipeline.schemaBuilders.replaceOptions);
            if (!pipelineParams) {
                return
            }

            var data = req.body
            var id = req.params.id

            // run the query
            pipeline.replace(id, data, pipelineParams.options).then(replacedResource => {
                if (!replacedResource) {
                    throw notFoundError(`${name}:${id}`)
                } else {
                    res.status(200).json(replacedResource)
                }
                res.end()
            }).catch(error => {
                rest.handleError(Api.apiError(error, req), res, next)
            });
        });

        openApi.addReplaceDoc();
    }

    if (availableMethods.canDelete) {

        // delete an existing resource
        router.delete("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleOptionsAndQuery(req, res, next, pipeline.schemaBuilders.deleteOptions);
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
                rest.handleError(Api.apiError(error, req), res, next)
            });
        });

        openApi.addDeleteDoc();
    }

    return router;
}

export const restRootMiddlewareJson = (api) => {
    let router: express.Router = express.Router();

    router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
        if (req.get('Content-Type') !== 'application/hal+json') {
            return next('router');
        }

        res.status(200).json({
            _links: _.mapValues(api.pipelineByName, (pipeline, key) => {
                return { href: `${api.basePath}/${key}` }
            })
        });
    });

    return router;
}
