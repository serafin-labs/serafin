import {
    ConflictErrorName,
    ForbiddenErrorName,
    MovedPermanentlyErrorName,
    NotFoundErrorName,
    NotImplementedErrorName,
    PipelineAbstract,
    UnauthorizedErrorName,
    ValidationErrorName,
} from "@serafin/pipeline"
import { JSONSchema, SchemaBuilder } from "@serafin/schema-builder"
import { Request, Response } from "express"
import * as _ from "lodash"
import VError from "verror"
import { Api } from "../../Api"
import { TransportInterface } from "../TransportInterface"
import { OpenApi } from "./OpenApi"
import { restMiddlewareJson, restRootMiddlewareJson } from "./RestMiddlewareJson"

export interface Error {
    name: string
    message: string
    info?: any
    cause?: any
    jse_cause: { name: string }
}

export type MiddlewareCallback<T, REQ extends Request = Request, RES extends Response = Response> =
    | ((req: REQ, res: RES, data: T) => void)
    | ((req: Request, res: Response, data: T) => void)
export type CallbackOption<T, REQ extends Request = Request, RES extends Response = Response> =
    | MiddlewareCallback<T, REQ, RES>
    | MiddlewareCallback<T, REQ, RES>[]

export interface RestOptions<REQ extends Request = Request, RES extends Response = Response> {
    /**
     * If provided, the Api will use this function to gather internal options for this request.
     * It can be used for example to pass _user or _role to the underlying pipeline.
     */
    internalOptions?: (req: Request) => Object
    /*
     * Allows you to execute custom code on error, primarily useful if you want to add extra logging
     */
    onError?: CallbackOption<VError, REQ, RES>
    onSuccess?: CallbackOption<unknown, REQ, RES>
}

export class RestTransport<REQ extends Request = Request, RES extends Response = Response> implements TransportInterface {
    public api: Api | undefined
    private onErrorsCallbacks: MiddlewareCallback<VError, REQ, RES>[] = []
    private onSuccessCallbacks: MiddlewareCallback<unknown, REQ, RES>[] = []
    constructor(protected options: RestOptions<REQ, RES> = {}) {
        if (options.onSuccess) {
            this.onSuccessCallbacks.push(...(Array.isArray(options.onSuccess) ? options.onSuccess : [options.onSuccess]))
        }
        if (options.onError) {
            this.onErrorsCallbacks.push(...(Array.isArray(options.onError) ? options.onError : [options.onError]))
        }
    }

    init(api: Api) {
        this.api = api
        this.api.application.use(this.api.basePath, restRootMiddlewareJson(this.api))
    }

    /**
     * Use the given pipeline.
     *
     * @param pipeline
     * @param name
     * @param pluralName
     */
    use(pipeline: PipelineAbstract<any>, name: string, pluralName: string) {
        const api = this.api
        if (!api) {
            throw new Error("Misconfigured API")
        }
        // setup the router
        let endpointPath = `${api.basePath}/${pluralName}`
        let resourcesPath = `/${pluralName}`

        let openApi = new OpenApi(api, pipeline, resourcesPath, name, pluralName)

        let availableMethods = RestTransport.availableMethods(pipeline)

        if (availableMethods.canCreate) {
            this.testQueryAndContextConflict(pipeline.schemaBuilders.createOptions.schema, pipeline.schemaBuilders.context.schema)
        }
        if (availableMethods.canRead) {
            this.testQueryAndContextConflict(pipeline.schemaBuilders.readQuery.schema, pipeline.schemaBuilders.context.schema)
        }
        if (availableMethods.canPatch) {
            this.testQueryAndContextConflict(pipeline.schemaBuilders.patchQuery.schema, pipeline.schemaBuilders.context.schema)
        }
        if (availableMethods.canDelete) {
            this.testQueryAndContextConflict(pipeline.schemaBuilders.deleteQuery.schema, pipeline.schemaBuilders.context.schema)
        }

        // attach the routers to the express app
        api.application.use(endpointPath, restMiddlewareJson(this, pipeline, openApi, endpointPath, resourcesPath, name))
    }

    public handleSuccess(req: REQ, res: RES, data: unknown) {
        this.onSuccessCallbacks.forEach((onSuccessCallback) => onSuccessCallback(req, res, data))
    }

    // error handling closure for this endpoint
    public handleError(req: REQ, res: RES, next: (err?: any) => void, error: VError) {
        this.onErrorsCallbacks.forEach((onErrorCallback) => onErrorCallback(req, res, error))
        // handle known errors
        if (
            !(
                [
                    [ValidationErrorName, 400],
                    [NotFoundErrorName, 404],
                    [ConflictErrorName, 409],
                    [NotImplementedErrorName, 405],
                    [UnauthorizedErrorName, 401],
                    [ForbiddenErrorName, 403],
                    [MovedPermanentlyErrorName, 301],
                ] as [string, number][]
            ).some((p: [string, number]) => {
                let [errorName, code] = p
                const causeByName = VError.findCauseByName(error, errorName)
                if (causeByName) {
                    if (code === 301) {
                        const location = VError.info(causeByName).location
                        if (location) {
                            res.header("Location", location)
                        }
                    }
                    res.status(code).json({
                        code: code,
                        message: error.message,
                    })
                    return true
                }
                return false
            })
        ) {
            // or pass the error down the chain
            console.error(VError.fullStack(error))
            next(error)
        }
    }

    public handleContextAndQuery(
        req: REQ,
        res: RES,
        next: () => any,
        contextSchemaBuilder: SchemaBuilder<any>,
        querySchemaBuilder: SchemaBuilder<any> | null = null,
        id?: string | string[],
    ): { context: object; query: object } | null {
        const api = this.api
        if (!api) {
            throw new Error("Misconfigured API")
        }
        try {
            let pipelineContext = api.filterInternalOptions(_.cloneDeep(req.query))
            if (this.options.internalOptions) {
                _.merge(pipelineContext, this.options.internalOptions(req))
            }
            contextSchemaBuilder.validate(pipelineContext)

            let pipelineQuery = {}
            if (querySchemaBuilder !== null) {
                pipelineQuery = id ? { ..._.cloneDeep(req.query), id } : _.cloneDeep(req.query)
                querySchemaBuilder.validate(pipelineQuery)
            }
            return { context: pipelineContext, query: pipelineQuery }
        } catch (e) {
            this.handleError(req, res, next, Api.apiError(e, req))
        }
        return null
    }

    private testQueryAndContextConflict(contextSchema: JSONSchema, querySchema: JSONSchema): void {
        if (contextSchema && querySchema) {
            let intersection = _.intersection(Object.keys(contextSchema.properties || {}), Object.keys(querySchema.properties || {}))
            if (intersection.length > 0) {
                throw new VError("SerafinRestParamsNameConflict", `Name conflict between context and query (${intersection.toString()})`, {
                    conflict: intersection,
                    optionsSchema: contextSchema,
                    querySchema: querySchema,
                })
            }
        }
    }

    public static availableMethods(pipeline: PipelineAbstract) {
        return {
            canRead: !!pipeline.schemaBuilders.readQuery,
            canCreate: !!pipeline.schemaBuilders.createValues,
            canPatch: !!pipeline.schemaBuilders.patchValues,
            canDelete: !!pipeline.schemaBuilders.deleteQuery,
        }
    }
}
