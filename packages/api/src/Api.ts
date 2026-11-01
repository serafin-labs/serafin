import { OpenApiBuilder, type InfoObject } from "@serafin/open-api"
import type { Application } from "express"
import type { AnyPipeline, ExposedPipeline, PipelineAction, TransportInterface } from "./TransportInterface.js"

export interface ApiOptions {
    /**
     * The path the API is exposed under, e.g. `/v1`. Defaults to the root.
     */
    basePath?: string
    /**
     * The OpenAPI document to start from: either its `info`, or a builder to start from a complete document.
     * When `basePath` is set and the document declares no server, a server with `basePath` as url is added,
     * so the paths of the document resolve.
     */
    openApi: InfoObject | OpenApiBuilder
    /**
     * Where the OpenAPI document is served, relative to `basePath`, or `false` to not serve it.
     * @default "/openapi.json"
     */
    openApiPath?: string | false
}

export interface UseOptions {
    /** Plural name of the resource, which is also its path. Defaults to the name followed by `s`. */
    pluralName?: string
    /** The actions to expose. Defaults to every action the pipeline implements. */
    actions?: PipelineAction[]
}

/**
 * A set of pipelines exposed through transports, and the OpenAPI document that describes them.
 *
 * ```ts
 * const api = new Api(app, { basePath: "/v1", openApi: { title: "Library", version: "1.0.0" } })
 *     .configure(new RestTransport())
 *     .use(bookPipeline, "book")
 *
 * // decorate the generated document
 * api.openApi = api.openApi.mapOperations((operation) => ({ ...operation, security: [{ bearer: [] }] }))
 * ```
 */
export class Api {
    /**
     * The OpenAPI document of the API. Transports add to it as pipelines are exposed, and it can be decorated
     * at any time by assigning a new builder: it is served as it is when requested.
     */
    public openApi: OpenApiBuilder

    /**
     * The path the API is exposed under, normalized: empty or starting with `/`, without a trailing `/`.
     */
    public readonly basePath: string

    private readonly transports: TransportInterface[] = []
    private readonly exposed = new Map<string, ExposedPipeline>()

    constructor(
        public readonly application: Application,
        options: ApiOptions,
    ) {
        this.basePath = normalizeBasePath(options.basePath ?? "")
        this.openApi = options.openApi instanceof OpenApiBuilder ? options.openApi : OpenApiBuilder.create(options.openApi)
        if (this.basePath !== "" && (this.openApi.document.servers ?? []).length === 0) {
            this.openApi = this.openApi.addServer({ url: this.basePath })
        }
        const openApiPath = options.openApiPath ?? "/openapi.json"
        if (openApiPath !== false) {
            this.application.get(`${this.basePath}${openApiPath}`, (req, res) => {
                res.json(this.openApi.document)
            })
        }
    }

    /**
     * The pipelines exposed on this API.
     */
    get pipelines(): ExposedPipeline[] {
        return [...this.exposed.values()]
    }

    /**
     * Add a transport. Pipelines already exposed are passed to it.
     */
    configure(transport: TransportInterface): this {
        transport.init(this)
        this.transports.push(transport)
        for (const exposed of this.exposed.values()) {
            transport.use(exposed)
        }
        return this
    }

    /**
     * Expose a pipeline through every transport of this API.
     *
     * @param pipeline the pipeline to expose
     * @param name singular name of the resource, e.g. `book`
     * @param options the plural name of the resource, or options
     */
    use(pipeline: AnyPipeline, name: string, options: string | UseOptions = {}): this {
        const { pluralName = `${name}s`, actions } = typeof options === "string" ? { pluralName: options } : options
        if (this.exposed.has(pluralName)) {
            throw new Error(`A pipeline is already exposed as '${pluralName}'`)
        }
        const exposed: ExposedPipeline = { pipeline, name, pluralName, ...(actions ? { actions } : {}) }
        for (const transport of this.transports) {
            transport.use(exposed)
        }
        // only once the transports accepted it, so a refused pipeline can be fixed and exposed again
        this.exposed.set(pluralName, exposed)
        return this
    }
}

function normalizeBasePath(basePath: string): string {
    const trimmed = basePath.replace(/\/+$/, "")
    if (trimmed !== "" && !trimmed.startsWith("/")) {
        throw new Error(`The base path must start with '/', got '${basePath}'`)
    }
    return trimmed
}
