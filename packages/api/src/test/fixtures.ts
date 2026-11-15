import { defaultSchemaBuilders, MemoryPipeline, PipelineAbstract, type SchemaBuildersInterface } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import { use } from "chai"
import chaiHttp, { request as chaiRequest } from "chai-http"
import express5 from "express"
import express4 from "express4"
import http from "node:http"
import { Api } from "../Api.js"
import { RestTransport, type RestOptions } from "../rest/RestTransport.js"

use(chaiHttp)

/**
 * The `request` of chai-http, with the server of an application listening on the loopback address only.
 *
 * chai-http listens on every address but sends to 127.0.0.1, where another process may listen on the same port,
 * and answer instead of the application. Listening on 127.0.0.1 only is asynchronous: the request is built
 * as usual, and sent once the server listens.
 */
export const request = {
    execute(app: (req: http.IncomingMessage, res: http.ServerResponse) => void): ReturnType<typeof chaiRequest.execute> {
        const listening = new Promise<ReturnType<typeof chaiRequest.execute>>((resolve) => {
            const server = http.createServer(app).listen(0, "127.0.0.1", () => resolve(chaiRequest.execute(server)))
        })
        const deferred = (method: string, path: string) => {
            const calls: [string, unknown[]][] = []
            const send = () => listening.then((agent) => calls.reduce((test: any, [name, args]) => test[name](...args), (agent as any)[method](path)))
            const proxy: any = new Proxy(
                {},
                {
                    get: (target, name: string) =>
                        name === "then"
                            ? (resolve: any, reject: any) => send().then(resolve, reject)
                            : (...args: unknown[]) => {
                                  calls.push([name, args])
                                  return proxy
                              },
                },
            )
            return proxy
        }
        return new Proxy({}, { get: (target, method: string) => (path: string) => deferred(method, path) }) as ReturnType<typeof chaiRequest.execute>
    },
}

/**
 * Every test of the transport runs against both major versions of express the package supports.
 */
export const expressVersions = [
    { label: "express 5", express: express5 as unknown as typeof express5 },
    { label: "express 4", express: express4 as unknown as typeof express5 },
]

export const bookModel = SchemaBuilder.emptySchema({ title: "Book" })
    .addString("id")
    .addString("title", { description: "The title of the book" })
    .addInteger("year", {}, false)
    .addArray("tags", SchemaBuilder.stringSchema(), {}, false)
    .addBoolean("available", {}, false)
    .addString("authorId", {}, false)

export const authorModel = SchemaBuilder.emptySchema({ title: "Author" }).addString("id").addString("name")

export function counter(prefix: string) {
    let next = 1
    return () => `${prefix}${next++}`
}

/**
 * A library: books held in memory, related to their author.
 */
export function library() {
    const authors = new MemoryPipeline(authorModel, { initialData: [{ id: "a1", name: "Ursula" }] })
    const books = new MemoryPipeline(bookModel, {
        generateId: counter("b"),
        initialData: [
            { id: "1", title: "The Dispossessed", year: 1974, tags: ["sf"], available: true, authorId: "a1" },
            { id: "2", title: "The Lathe of Heaven", year: 1971, tags: ["sf", "classic"], available: false, authorId: "a1" },
        ],
    }).addRelationWithOne("author", authors, { id: ":authorId" })
    return { authors, books }
}

/**
 * A pipeline that answers every action with what it received, to observe how requests are read.
 */
export class EchoPipeline extends PipelineAbstract<any> {
    constructor(
        schemaBuilders: SchemaBuildersInterface<any>,
        private readonly answer?: (action: string, args: unknown[]) => unknown,
    ) {
        super(schemaBuilders)
    }
    private respond(action: string, ...args: unknown[]): Promise<any> {
        return Promise.resolve(this.answer ? this.answer(action, args) : { data: [{ id: "1", action, args }], meta: {} })
    }
    protected _create(resources: any, options: any, context: any) {
        return this.respond("create", resources, options, context)
    }
    protected _read(query: any, context: any) {
        return this.respond("read", query, context)
    }
    protected _patch(query: any, values: any, context: any) {
        return this.respond("patch", query, values, context)
    }
    protected _delete(query: any, context: any) {
        return this.respond("delete", query, context)
    }
}

export const echoContext = SchemaBuilder.emptySchema().addString("lang", {}, false).addString("_user", {}, false)

export function echoSchemaBuilders(model: SchemaBuilder<any> = bookModel) {
    return { ...defaultSchemaBuilders(model), context: echoContext } as SchemaBuildersInterface<any>
}

export interface Setup {
    app: ReturnType<typeof express5>
    api: Api
    logged: unknown[][]
    warned: unknown[][]
}

/**
 * An application exposing pipelines through a REST transport, with every route, the ones `byQuery` adds included.
 */
export function setup(express: typeof express5, options: RestOptions<any, any> = {}, basePath = ""): Setup {
    const app = express()
    const logged: unknown[][] = []
    const warned: unknown[][] = []
    const api = new Api(app, { basePath, openApi: { title: "Library", version: "1.0.0" } }).configure(
        new RestTransport({ byQuery: true, logger: { error: (...data) => logged.push(data), warn: (...data) => warned.push(data) }, ...options }),
    )
    return { app, api, logged, warned }
}
