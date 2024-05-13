import { notFoundError, PipelineAbstract } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import * as express from "express"
import * as _ from "lodash"
import { Api } from "../../Api"
import { JsonHal } from "./JsonHal"
import { OpenApi } from "./OpenApi"
import { RestTransport } from "./Rest"

export const restMiddlewareJson = (
    rest: RestTransport,
    pipeline: PipelineAbstract,
    openApi: OpenApi,
    endpointPath: string,
    resourcesPath: string,
    name: string,
) => {
    const api = rest.api
    if (!api) {
        throw new Error("Misconfigured API")
    }
    let router: express.Router = express.Router()
    router.use((req, res, next) => {
        if (req.method !== "OPTIONS") {
            let acceptHeader = req.get("Accept") || ""
            if (acceptHeader && acceptHeader.search("application/json") === -1 && acceptHeader.search("application/hal+json") === -1) {
                return next("router")
            }
        }
        next()
    })

    let availableMethods = RestTransport.availableMethods(pipeline)

    const contextSchema = pipeline.schemaBuilders.context.configureValidation({ coerceTypes: true, removeAdditional: true })
    // create the routes for this endpoint
    if (availableMethods.canRead) {
        // prepare schemas to handle transforming the query params & options and filtering unwanted properties
        const readQuerySchema = pipeline.schemaBuilders.readQuery.configureValidation({ coerceTypes: true, removeAdditional: true })
        // get many resources
        router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema, readQuerySchema)
            if (!pipelineParams) {
                return
            }

            // run the query
            pipeline
                .read(pipelineParams.query, pipelineParams.context)
                .then((result: any) => {
                    let acceptHeader = req.get("Accept") || ""
                    if (acceptHeader.search("application/hal+json") !== -1) {
                        let links = new JsonHal(endpointPath, api, pipeline.relations).links()
                        result["_links"] = links
                        if (result.data) {
                            result.data = result.data.map((result: any) => {
                                if (result["id"]) {
                                    result["_links"] = new JsonHal(endpointPath + `/${result["id"]}`, api, pipeline.relations).links(result)
                                }
                                return result
                            })
                        }
                    }

                    res.status(200).json(result)
                    res.end()
                })
                .catch((error) => {
                    rest.handleError(Api.apiError(error, req), res, next)
                })
        })

        // get a resource by its id
        router.get("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let id = req.params.id
            let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema)
            if (!pipelineParams) {
                return
            }

            // run the query
            pipeline
                .read(
                    {
                        id: id,
                    },
                    pipelineParams.context,
                )
                .then((result: any) => {
                    if (result.data.length > 0) {
                        let acceptHeader = req.get("Accept") || ""
                        if (acceptHeader.search("application/hal+json") !== -1) {
                            result.data[0]["_links"] = new JsonHal(endpointPath + `/${id}`, api, pipeline.relations).links(result.data[0])
                        }
                        res.status(200).json(result)
                    } else {
                        throw notFoundError(`${name}:${id}`)
                    }
                    res.end()
                })
                .catch((error) => {
                    rest.handleError(Api.apiError(error, req), res, next)
                })
        })

        openApi.addReadDoc()
    }

    if (availableMethods.canCreate) {
        // prepare schemas to handle transforming the options and filtering unwanted properties
        const createOptionsSchema = pipeline.schemaBuilders.createOptions.configureValidation({ coerceTypes: true, removeAdditional: true })
        // create a new resource
        router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema, createOptionsSchema)
            if (!pipelineParams) {
                return
            }
            var data = req.body

            // run the query
            pipeline
                .create(data, pipelineParams.query, pipelineParams.context)
                .then((createdResources) => {
                    res.status(201).json(createdResources)
                })
                .catch((error) => {
                    rest.handleError(Api.apiError(error, req), res, next)
                })
        })

        openApi.addCreateDoc()
    }

    if (availableMethods.canPatch) {
        // prepare schemas to handle transforming the query params & options and filtering unwanted properties
        const patchQuerySchema = pipeline.schemaBuilders.patchQuery.configureValidation({ coerceTypes: true, removeAdditional: true })
        // patch an existing resource
        router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            var id = req.params.id
            let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema, patchQuerySchema, id)
            if (!pipelineParams) {
                return
            }

            var patch = req.body

            // run the query
            pipeline
                .patch(
                    {
                        ...pipelineParams.query,
                        id: id,
                    },
                    patch,
                    pipelineParams.context,
                )
                .then((updatedResources) => {
                    if (updatedResources.data.length === 0) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(updatedResources)
                    }
                    res.end()
                })
                .catch((error) => {
                    rest.handleError(Api.apiError(error, req), res, next)
                })
        })
        openApi.addPatchDoc(true)

        if (
            !patchQuerySchema.schema.required?.includes("id") ||
            (patchQuerySchema.schema.properties &&
                typeof patchQuerySchema.schema.properties["id"] !== "boolean" &&
                ((patchQuerySchema.schema.properties["id"]?.oneOf?.length ?? 0) > 1 ||
                    patchQuerySchema.schema.properties["id"]?.type === "array" ||
                    (Array.isArray(patchQuerySchema.schema.properties["id"]?.type) && patchQuerySchema.schema.properties["id"].type.includes("array"))))
        ) {
            // if "id" is not required or id is not just a string identifier, this means we also support general patch on this pipeline
            router.patch("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema, patchQuerySchema)
                if (!pipelineParams) {
                    return
                }

                var patch = req.body

                // run the query
                pipeline
                    .patch(pipelineParams.query, patch, pipelineParams.context)
                    .then((updatedResources) => {
                        res.status(200).json(updatedResources)
                        res.end()
                    })
                    .catch((error) => {
                        rest.handleError(Api.apiError(error, req), res, next)
                    })
            })
            openApi.addPatchDoc(false)
        }
    }

    if (availableMethods.canDelete) {
        // prepare schemas to handle transforming the query params & options and filtering unwanted properties
        const deleteQuerySchema = pipeline.schemaBuilders.deleteQuery.configureValidation({ coerceTypes: true, removeAdditional: true })
        // delete an existing resource
        router.delete("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            var id = req.params.id
            let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema, deleteQuerySchema, id)
            if (!pipelineParams) {
                return
            }

            // run the query
            pipeline
                .delete(
                    {
                        ...pipelineParams.query,
                        id: id,
                    },
                    pipelineParams.context,
                )
                .then((deletedResources) => {
                    if (deletedResources.data.length === 0) {
                        throw notFoundError(`${name}:${id}`)
                    } else {
                        res.status(200).json(deletedResources)
                    }
                    res.end()
                })
                .catch((error) => {
                    rest.handleError(Api.apiError(error, req), res, next)
                })
        })

        openApi.addDeleteDoc(true)

        if (
            !deleteQuerySchema.schema.required?.includes("id") ||
            (deleteQuerySchema.schema.properties &&
                typeof deleteQuerySchema.schema.properties["id"] !== "boolean" &&
                ((deleteQuerySchema.schema.properties["id"]?.oneOf?.length ?? 0) > 1 ||
                    deleteQuerySchema.schema.properties["id"]?.type === "array" ||
                    (Array.isArray(deleteQuerySchema.schema.properties["id"]?.type) && deleteQuerySchema.schema.properties["id"].type.includes("array"))))
        ) {
            // if "id" is not required or id is not just a string identifier, this means we also support general delete on this pipeline
            router.delete("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
                let pipelineParams = rest.handleContextAndQuery(req, res, next, contextSchema, deleteQuerySchema)
                if (!pipelineParams) {
                    return
                }

                // run the query
                pipeline
                    .delete(pipelineParams.query, pipelineParams.context)
                    .then((deletedResources) => {
                        res.status(200).json(deletedResources)
                        res.end()
                    })
                    .catch((error) => {
                        rest.handleError(Api.apiError(error, req), res, next)
                    })
            })
            openApi.addDeleteDoc(false)
        }
    }

    return router
}

export const restRootMiddlewareJson = (api: Api) => {
    let router: express.Router = express.Router()

    router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
        if (req.get("Content-Type") !== "application/hal+json") {
            return next("router")
        }

        res.status(200).json({
            _links: _.mapValues(api.pipelineByName, (pipeline, key) => {
                return { href: `${api.basePath}/${key}` }
            }),
        })
    })

    return router
}
