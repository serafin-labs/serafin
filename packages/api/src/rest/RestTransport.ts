import { PipelineAbstract, notFoundError } from "@serafin/pipeline"
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express"
import VError from "verror"
import type { Api } from "../Api.js"
import type { ExposedPipeline, PipelineAction, TransportInterface } from "../TransportInterface.js"
import { documentPipeline, type Routes } from "./documentPipeline.js"
import { errorResponse, HttpError, type ErrorResponse } from "./errors.js"
import { RequestParameters } from "./RequestParameters.js"
import { allowsArray, schemaProperties, type Schema } from "./schemas.js"

export type RestCallback<T, REQ extends Request = Request, RES extends Response = Response> = (req: REQ, res: RES, data: T) => void

export interface RestOptions<REQ extends Request = Request, RES extends Response = Response> {
    /**
     * The context the request runs in, that the client cannot set, such as the authenticated user.
     * It is merged over the context parameters of the query string.
     */
    context?: (req: REQ) => Record<string, unknown> | Promise<Record<string, unknown>>
    /**
     * Whether a context property is internal: the client cannot set it, and it is not documented.
     * @default names starting with `_`
     */
    isInternal?: (name: string) => boolean
    /**
     * What to do with query string parameters that are neither in the query schema nor in the context schema,
     * internal context properties included:
     * - `"reject"` answers 400, so a typo in a filter cannot silently widen a read, a patch or a delete,
     * - `"ignore"` drops them, as earlier versions of the transport did, and logs a warning. Meant for a transition.
     * @default "reject"
     */
    unknownParameters?: "reject" | "ignore"
    /**
     * Called with the results of every successful request, before the response is sent.
     */
    onSuccess?: RestCallback<unknown, REQ, RES> | RestCallback<unknown, REQ, RES>[]
    /**
     * Called with every error, before the error response is sent, e.g. to log it.
     */
    onError?: RestCallback<unknown, REQ, RES> | RestCallback<unknown, REQ, RES>[]
    /**
     * Change the body of an error response before it is sent, e.g. to hide the message of server errors.
     * Its `code` is the status of the response.
     */
    formatError?: (response: ErrorResponse, error: unknown, req: REQ) => ErrorResponse
    /**
     * Where unexpected errors are logged, and the warnings about ignored query parameters.
     * @default console
     */
    logger?: { error(...data: unknown[]): void; warn(...data: unknown[]): void }
    /**
     * The maximum size of a request body, as a number of bytes or a string such as `"100kb"`.
     * @default "1mb"
     */
    bodyLimit?: number | string
}

const jsonTypes = ["application/json", "application/merge-patch+json"]

/** The `:id` route parameter, always a single segment. */
const idOf = (req: Request) => req.params.id as string

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value])

/**
 * Exposes pipelines as REST endpoints, and documents them in the OpenAPI document of the Api.
 *
 * For a `book` pipeline exposed as `books`, depending on the actions the pipeline implements:
 * - `GET /books` finds the books matching the query string,
 * - `GET /books/{id}` gets a book,
 * - `POST /books` creates a book, or several from a list,
 * - `PATCH /books/{id}` patches a book, with a JSON merge patch,
 * - `PATCH /books` patches the books matching the query string, when the patch query can select several,
 * - `DELETE /books/{id}` deletes a book,
 * - `DELETE /books` deletes the books matching the query string, when the delete query can select several.
 *
 * Every response body is JSON: `{ data, meta }` on success, an `ErrorResponse` on error.
 */
export class RestTransport<REQ extends Request = Request, RES extends Response = Response> implements TransportInterface {
    private api: Api | undefined
    private readonly isInternal: (name: string) => boolean

    constructor(private readonly options: RestOptions<REQ, RES> = {}) {
        this.isInternal = options.isInternal ?? ((name) => name.startsWith("_"))
    }

    init(api: Api) {
        if (this.api) {
            throw new Error("The transport is already used by an Api")
        }
        this.api = api
    }

    use(exposed: ExposedPipeline) {
        if (!this.api) {
            throw new Error("The transport must be added to an Api with `api.configure` before exposing pipelines")
        }
        const api = this.api
        const { pipeline, name, pluralName } = exposed
        const schemas = pipeline.schemaBuilders
        const actions = exposedActions(exposed)
        const hasId = (schema: Schema) => "id" in schemaProperties(schema).properties
        const routes: Routes = {
            find: actions.has("read"),
            get: actions.has("read") && hasId(schemas.readQuery.schema),
            create: actions.has("create"),
            patchOne: actions.has("patch") && hasId(schemas.patchQuery.schema),
            patchMany: actions.has("patch") && selectsSeveral(schemas.patchQuery.schema),
            deleteOne: actions.has("delete") && hasId(schemas.deleteQuery.schema),
            deleteMany: actions.has("delete") && selectsSeveral(schemas.deleteQuery.schema),
        }

        // the query string is shared by the query and the context: their parameters must be distinct
        const contextNames = Object.keys(schemaProperties(schemas.context.schema).properties).filter((n) => !this.isInternal(n))
        for (const [action, schema] of [
            ["read", schemas.readQuery],
            ["create", schemas.createOptions],
            ["patch", schemas.patchQuery],
            ["delete", schemas.deleteQuery],
        ] as const) {
            const conflicts = Object.keys(schemaProperties(schema.schema).properties).filter((n) => contextNames.includes(n))
            if (actions.has(action) && conflicts.length > 0) {
                throw new Error(`Cannot expose '${pluralName}': ${action} parameters and context parameters share the names ${conflicts.join(", ")}`)
            }
        }

        const parameters = (schema: (typeof schemas)["readQuery"]) =>
            new RequestParameters(schema, schemas.context, this.isInternal, this.options.unknownParameters !== "ignore")
        const readParameters = parameters(schemas.readQuery)
        const createParameters = parameters(schemas.createOptions)
        const patchParameters = parameters(schemas.patchQuery)
        const deleteParameters = parameters(schemas.deleteQuery)
        const resourcePath = (id: unknown) => `${api.basePath}/${pluralName}/${encodeURIComponent(String(id))}`
        const notFound = <T extends { data: unknown[] }>(results: T, id: string) => {
            if (results.data.length === 0) {
                throw notFoundError(`${name}:${id}`)
            }
            return results
        }

        const router = express.Router()
        router.use(this.negotiate)
        router.use(express.json({ limit: this.options.bodyLimit ?? "1mb", type: jsonTypes }))

        if (routes.find) {
            router.get(
                "/",
                this.handle(async (req) => {
                    const { query, context } = await this.parameters(readParameters, req)
                    return { status: 200, body: await pipeline.read(query, context) }
                }),
            )
        }
        if (routes.get) {
            router.get(
                "/:id",
                this.handle(async (req) => {
                    const { query, context } = await this.parameters(readParameters, req, idOf(req))
                    return { status: 200, body: notFound(await pipeline.read(query, context), idOf(req)) }
                }),
            )
        }
        if (routes.create) {
            router.post(
                "/",
                this.handle(async (req) => {
                    const body = this.body(req)
                    const resources = Array.isArray(body) ? body : [body]
                    const { query, context } = await this.parameters(createParameters, req)
                    const results = await pipeline.create(resources, query, context)
                    const single = results.data.length === 1 && (results.data[0] as { id?: unknown }).id !== undefined
                    return { status: 201, body: results, headers: single ? { Location: resourcePath((results.data[0] as { id: unknown }).id) } : undefined }
                }),
            )
        }
        if (routes.patchOne) {
            router.patch(
                "/:id",
                this.handle(async (req) => {
                    const values = this.body(req)
                    const { query, context } = await this.parameters(patchParameters, req, idOf(req))
                    return { status: 200, body: notFound(await pipeline.patch(query, values, context), idOf(req)) }
                }),
            )
        }
        if (routes.patchMany) {
            router.patch(
                "/",
                this.handle(async (req) => {
                    const values = this.body(req)
                    const { query, context } = await this.parameters(patchParameters, req)
                    return { status: 200, body: await pipeline.patch(query, values, context) }
                }),
            )
        }
        if (routes.deleteOne) {
            router.delete(
                "/:id",
                this.handle(async (req) => {
                    const { query, context } = await this.parameters(deleteParameters, req, idOf(req))
                    return { status: 200, body: notFound(await pipeline.delete(query, context), idOf(req)) }
                }),
            )
        }
        if (routes.deleteMany) {
            router.delete(
                "/",
                this.handle(async (req) => {
                    const { query, context } = await this.parameters(deleteParameters, req)
                    return { status: 200, body: await pipeline.delete(query, context) }
                }),
            )
        }
        router.all("/", this.methodNotAllowed([routes.find && "GET", routes.create && "POST", routes.patchMany && "PATCH", routes.deleteMany && "DELETE"]))
        router.all("/:id", this.methodNotAllowed([routes.get && "GET", routes.patchOne && "PATCH", routes.deleteOne && "DELETE"]))
        // errors raised before a handler runs, such as a malformed body
        router.use((error: unknown, req: Request, res: Response, next: NextFunction) => this.sendError(req as REQ, res as RES, error))

        api.application.use(`${api.basePath}/${pluralName}`, router)
        api.openApi = documentPipeline(api.openApi, exposed, routes, this.isInternal)
    }

    /**
     * Answer 406 to clients that do not accept JSON.
     */
    private readonly negotiate: RequestHandler = (req, res, next) => {
        if (req.accepts("application/json")) {
            next()
        } else {
            next(new HttpError(406, "The response is only available as application/json"))
        }
    }

    private methodNotAllowed(methods: (string | false)[]): RequestHandler {
        const allowed = methods.filter((m): m is string => m !== false)
        const allow = [...allowed, ...(allowed.includes("GET") ? ["HEAD"] : []), "OPTIONS"].join(", ")
        return (req, res, next) => {
            if (req.method === "OPTIONS") {
                res.set("Allow", allow).status(204).end()
            } else {
                next(new HttpError(405, `${req.method} is not allowed here, use ${allowed.length > 0 ? allowed.join(", ") : "OPTIONS"}`, { Allow: allow }))
            }
        }
    }

    private async parameters(parameters: RequestParameters, req: Request, id?: string) {
        const { query, context, ignored } = parameters.parse(req, id)
        if (ignored.length > 0) {
            this.logger.warn(`${req.method} ${req.originalUrl} ignored the query parameter${ignored.length > 1 ? "s" : ""} ${ignored.join(", ")}`)
        }
        const internal = this.options.context ? await this.options.context(req as REQ) : {}
        return { query, context: { ...context, ...internal } }
    }

    private body(req: Request): any {
        // `null` when there is no body, `false` when it is not JSON
        const type = req.is(jsonTypes)
        if (type === null || req.headers["content-length"] === "0") {
            throw new HttpError(400, "The request body is required")
        }
        if (type === false) {
            throw new HttpError(415, `The request body must be ${jsonTypes.join(" or ")}`)
        }
        return req.body
    }

    private handle(action: (req: REQ) => Promise<{ status: number; body: object; headers?: Record<string, string> }>): RequestHandler {
        return async (req, res) => {
            try {
                const { status, body, headers } = await action(req as REQ)
                asArray(this.options.onSuccess).forEach((callback) => callback(req as REQ, res as RES, body))
                res.status(status)
                    .set(headers ?? {})
                    .json(body)
            } catch (error) {
                this.sendError(req as REQ, res as RES, error)
            }
        }
    }

    private sendError(req: REQ, res: RES, error: unknown) {
        const { response, headers, unexpected } = errorResponse(error)
        try {
            asArray(this.options.onError).forEach((callback) => callback(req, res, error))
        } catch (callbackError) {
            this.log("An onError callback failed", callbackError)
        }
        if (unexpected) {
            this.log(`${req.method} ${req.originalUrl} failed`, error)
        }
        let body = response
        try {
            body = this.options.formatError?.(response, error, req) ?? response
        } catch (formatError) {
            this.log("The formatError option failed", formatError)
        }
        res.status(body.code).set(headers).json(body)
    }

    private log(message: string, error: unknown) {
        this.logger.error(message, error instanceof Error ? VError.fullStack(error) : error)
    }

    private get logger() {
        return this.options.logger ?? console
    }
}

/**
 * The actions to expose: the ones asked for, or every action the pipeline implements.
 */
function exposedActions({ pipeline, actions }: ExposedPipeline): Set<PipelineAction> {
    if (actions) {
        return new Set(actions)
    }
    const base = PipelineAbstract.prototype as unknown as Record<string, unknown>
    const implemented = (action: PipelineAction) => (pipeline as unknown as Record<string, unknown>)[`_${action}`] !== base[`_${action}`]
    return new Set((["create", "read", "patch", "delete"] as const).filter(implemented))
}

/**
 * Whether a patch or delete query can select several resources: either it does not require an id, or its id accepts a list.
 */
function selectsSeveral(schema: Schema): boolean {
    const { properties, required } = schemaProperties(schema)
    return !required.has("id") || allowsArray(properties.id)
}
