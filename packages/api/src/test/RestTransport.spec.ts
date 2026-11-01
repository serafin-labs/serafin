import { conflictError, defaultSchemaBuilders, forbiddenError, movedPermanentlyError, PipelineAbstract, unauthorizedError } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import { expect } from "chai"
import { RestTransport } from "../rest/RestTransport.js"
import { Api } from "../Api.js"
import { bookModel, echoSchemaBuilders, EchoPipeline, expressVersions, library, request, setup } from "./fixtures.js"

for (const { label, express } of expressVersions) {
    describe(`RestTransport (${label})`, function () {
        describe("reading", function () {
            it("finds resources", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books")
                expect(res.status).to.eql(200)
                expect(res.type).to.eql("application/json")
                expect(res.body.data.map((b: any) => b.id)).to.eql(["1", "2"])
                expect(res.body.meta).to.eql({})
            })

            it("filters with the query string, coercing values to their schema", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books?year=1971&limit=1&withCount=true")
                expect(res.status).to.eql(200)
                expect(res.body.data.map((b: any) => b.id)).to.eql(["2"])
                expect(res.body.meta).to.eql({ count: 1 })
            })

            it("reads deep objects and lists from the query string, whatever the query parser of the application", async function () {
                const { app, api } = setup(express)
                app.set("query parser", "simple")
                api.use(library().books, "book")
                const sorted = await request.execute(app).get("/books?sort[year]=1")
                expect(sorted.body.data.map((b: any) => b.id)).to.eql(["2", "1"])
                const repeated = await request.execute(app).get("/books?id=1&id=2&sort[year]=-1")
                expect(repeated.body.data.map((b: any) => b.id)).to.eql(["1", "2"])
                const brackets = await request.execute(app).get("/books?id[]=2")
                expect(brackets.body.data.map((b: any) => b.id)).to.eql(["2"])
            })

            it("turns a single value of an array property into a one element array", async function () {
                const { app, api } = setup(express)
                api.use(new EchoPipeline(echoSchemaBuilders()), "book")
                const res = await request.execute(app).get("/books?tags=sf&year=1974&available=false")
                expect(res.body.data[0].args[0]).to.eql({ tags: ["sf"], year: 1974, available: false })
            })

            it("resolves relations into the meta when asked to", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books/1?withAuthor=true")
                expect(res.body.meta.relations.author.data).to.eql({ a1: { id: "a1", name: "Ursula" } })
            })

            it("gets a resource by id", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books/2")
                expect(res.status).to.eql(200)
                expect(res.body.data).to.have.length(1)
                expect(res.body.data[0].title).to.eql("The Lathe of Heaven")
                const head = await request.execute(app).head("/books/2")
                expect(head.status).to.eql(200)
            })

            it("answers 404 for a resource that does not exist", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books/42")
                expect(res.status).to.eql(404)
                expect(res.body).to.eql({ code: 404, name: "NotFound", message: "The entity book:42 does not exist." })
            })

            it("answers 400 to invalid queries, with the details of each problem", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books?year=recent")
                expect(res.status).to.eql(400)
                expect(res.body.name).to.eql("BadRequest")
                expect(res.body.message).to.match(/^Invalid parameters: data\/year must be integer/)
                expect(res.body.errors).to.deep.include({ path: "/year", message: "must be integer" })
            })

            it("rejects unknown parameters, rather than widening the query", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const one = await request.execute(app).get("/books?yaer=1974")
                expect(one.status).to.eql(400)
                expect(one.body.message).to.eql("Unknown query parameter: yaer")
                const two = await request.execute(app).get("/books?a=1&b=2")
                expect(two.body.message).to.eql("Unknown query parameters: a, b")
                const id = await request.execute(app).get("/books/1?id=2")
                expect(id.status).to.eql(400)
                expect(id.body.message).to.eql("The id is given by the path, it cannot be a query parameter too")
            })

            it("ignores unknown parameters when asked to, with a warning", async function () {
                const { app, api, warned } = setup(express, { unknownParameters: "ignore" })
                api.use(new EchoPipeline(echoSchemaBuilders()), "book")
                const res = await request.execute(app).get("/books/1?id=2&yaer=1974&_user=admin&lang=fr")
                expect(res.status).to.eql(200)
                expect(res.body.data[0].args).to.eql([{ id: "1" }, { lang: "fr" }])
                expect(warned).to.eql([["GET /books/1?id=2&yaer=1974&_user=admin&lang=fr ignored the query parameters id, yaer, _user"]])
                await request.execute(app).get("/books?yaer=1974")
                expect(warned[1]).to.eql(["GET /books?yaer=1974 ignored the query parameter yaer"])
                await request.execute(app).get("/books?lang=fr")
                expect(warned).to.have.length(2)
            })
        })

        describe("context", function () {
            it("reads the context from the query string, without its internal properties", async function () {
                const { app, api } = setup(express)
                api.use(new EchoPipeline(echoSchemaBuilders()), "book")
                const res = await request.execute(app).get("/books?lang=fr")
                expect(res.body.data[0].args[1]).to.eql({ lang: "fr" })
                const internal = await request.execute(app).get("/books?_user=admin")
                expect(internal.status).to.eql(400)
                expect(internal.body.message).to.eql("Unknown query parameter: _user")
            })

            it("adds the context of the request, over the one of the client", async function () {
                const { app, api } = setup(express, { context: async (req) => ({ _user: req.get("X-User"), lang: "en" }) })
                api.use(new EchoPipeline(echoSchemaBuilders()), "book")
                const res = await request.execute(app).get("/books/1?lang=fr").set("X-User", "ursula")
                expect(res.body.data[0].args[1]).to.eql({ _user: "ursula", lang: "en" })
            })

            it("lets the internal properties be chosen", async function () {
                const { app, api } = setup(express, { isInternal: (name) => name === "lang" })
                api.use(new EchoPipeline(echoSchemaBuilders()), "book")
                expect((await request.execute(app).get("/books?_user=admin")).body.data[0].args[1]).to.eql({ _user: "admin" })
                expect((await request.execute(app).get("/books?lang=fr")).status).to.eql(400)
            })

            it("refuses pipelines whose query and context parameters share a name", function () {
                const { api } = setup(express)
                const schemaBuilders = { ...echoSchemaBuilders(), context: SchemaBuilder.emptySchema().addString("title", {}, false) }
                expect(() => api.use(new EchoPipeline(schemaBuilders), "book")).to.throw(
                    "Cannot expose 'books': read parameters and context parameters share the names title",
                )
                // only the exposed actions matter
                expect(() => api.use(new EchoPipeline(schemaBuilders), "book", { actions: ["delete"] })).to.not.throw()
            })
        })

        describe("creating", function () {
            it("creates a resource and tells where it is", async function () {
                const { app, api } = setup(express, {}, "/v1")
                api.use(library().books, "book")
                const res = await request.execute(app).post("/v1/books").send({ title: "Always Coming Home" })
                expect(res.status).to.eql(201)
                expect(res.headers.location).to.eql("/v1/books/b1")
                expect(res.body.data).to.eql([{ id: "b1", title: "Always Coming Home" }])
            })

            it("creates several resources", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request
                    .execute(app)
                    .post("/books")
                    .send([{ title: "A" }, { title: "B" }])
                expect(res.status).to.eql(201)
                expect(res.headers).to.not.have.property("location")
                expect(res.body.data.map((b: any) => b.id)).to.eql(["b1", "b2"])
            })

            it("encodes the id in the location, and leaves it out when there is no id", async function () {
                const { app, api } = setup(express)
                const answers = [
                    { data: [{ id: "a/b" }], meta: {} },
                    { data: [{ title: "no id" }], meta: {} },
                ]
                api.use(new EchoPipeline(echoSchemaBuilders(), () => answers.shift()), "book")
                expect((await request.execute(app).post("/books").send({ title: "A" })).headers.location).to.eql("/books/a%2Fb")
                expect((await request.execute(app).post("/books").send({ title: "A" })).headers).to.not.have.property("location")
            })

            it("reports the faulty resource of a list", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request
                    .execute(app)
                    .post("/books")
                    .send([{ title: "A" }, { title: "B", year: "soon" }])
                expect(res.status).to.eql(400)
                expect(res.body.errors).to.eql([{ path: "/1/year", message: "must be integer" }])
                const extra = await request.execute(app).post("/books").send({ title: "A", isbn: "x" })
                expect(extra.body.errors).to.eql([{ path: "/0", message: "must NOT have additional properties: 'isbn'" }])
            })

            it("answers 409 to conflicts", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).post("/books").send({ id: "1", title: "Duplicate" })
                expect(res.status).to.eql(409)
                expect(res.body.name).to.eql("Conflict")
            })

            it("requires a JSON body", async function () {
                const { app, api } = setup(express, { bodyLimit: 30 })
                api.use(library().books, "book")
                const missing = await request.execute(app).post("/books")
                expect(missing.status).to.eql(400)
                expect(missing.body.message).to.eql("The request body is required")
                const text = await request.execute(app).post("/books").set("Content-Type", "text/plain").send("a book")
                expect(text.status).to.eql(415)
                expect(text.body).to.eql({
                    code: 415,
                    name: "UnsupportedMediaType",
                    message: "The request body must be application/json or application/merge-patch+json",
                })
                const malformed = await request.execute(app).post("/books").set("Content-Type", "application/json").send('{"title":')
                expect(malformed.status).to.eql(400)
                expect(malformed.body.name).to.eql("BadRequest")
                const large = await request.execute(app).post("/books").send({ title: "A title longer than the limit" })
                expect(large.status).to.eql(413)
                expect(large.body.name).to.eql("PayloadTooLarge")
            })

            it("reads create options from the query string", async function () {
                const { app, api } = setup(express)
                const schemaBuilders = { ...echoSchemaBuilders(), createOptions: SchemaBuilder.emptySchema().addBoolean("dryRun", {}, false) }
                api.use(new EchoPipeline(schemaBuilders), "book")
                const res = await request.execute(app).post("/books?dryRun=true&lang=fr").send({ title: "A" })
                expect(res.body.data[0].args.slice(1)).to.eql([{ dryRun: true }, { lang: "fr" }])
            })
        })

        describe("patching", function () {
            it("patches a resource with a JSON merge patch", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request
                    .execute(app)
                    .patch("/books/1")
                    .set("Content-Type", "application/merge-patch+json")
                    .send(JSON.stringify({ year: null, available: false }))
                expect(res.status).to.eql(200)
                expect(res.body.data).to.eql([{ id: "1", title: "The Dispossessed", tags: ["sf"], available: false, authorId: "a1" }])
                const json = await request.execute(app).patch("/books/1").send({ title: "Les Dépossédés" })
                expect(json.body.data[0].title).to.eql("Les Dépossédés")
            })

            it("answers 404 when the resource does not exist", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).patch("/books/42").send({ title: "A" })
                expect(res.status).to.eql(404)
            })

            it("patches the resources matching the query", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).patch("/books?id=1&id=2").send({ available: true })
                expect(res.status).to.eql(200)
                expect(res.body.data.map((b: any) => b.available)).to.eql([true, true])
                const missing = await request.execute(app).patch("/books?id=42").send({ available: true })
                expect(missing.status).to.eql(200)
                expect(missing.body.data).to.eql([])
            })

            it("requires a body", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                expect((await request.execute(app).patch("/books/1")).status).to.eql(400)
                expect((await request.execute(app).patch("/books?id=1")).status).to.eql(400)
            })
        })

        describe("deleting", function () {
            it("deletes a resource", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).delete("/books/1")
                expect(res.status).to.eql(200)
                expect(res.body.data[0].id).to.eql("1")
                expect((await request.execute(app).delete("/books/1")).status).to.eql(404)
            })

            it("deletes the resources matching the query", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const res = await request.execute(app).delete("/books?id=1&id=2")
                expect(res.body.data.map((b: any) => b.id)).to.eql(["1", "2"])
                expect((await request.execute(app).get("/books")).body.data).to.eql([])
            })
        })

        describe("routes", function () {
            it("only exposes the actions the pipeline implements", async function () {
                class ReadOnly extends PipelineAbstract<any> {
                    protected async _read() {
                        return { data: [], meta: {} }
                    }
                }
                const { app, api } = setup(express)
                api.use(new ReadOnly(defaultSchemaBuilders(bookModel)), "book")
                const post = await request.execute(app).post("/books").send({ title: "A" })
                expect(post.status).to.eql(405)
                expect(post.headers.allow).to.eql("GET, HEAD, OPTIONS")
                expect(post.body.message).to.eql("POST is not allowed here, use GET")
                expect((await request.execute(app).delete("/books/1")).headers.allow).to.eql("GET, HEAD, OPTIONS")
            })

            it("exposes the actions asked for", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book", { actions: ["delete"] })
                const get = await request.execute(app).get("/books")
                expect(get.status).to.eql(405)
                expect(get.headers.allow).to.eql("DELETE, OPTIONS")
                expect((await request.execute(app).delete("/books/1")).status).to.eql(200)
            })

            it("answers 501 to an action the pipeline does not implement", async function () {
                class ReadOnly extends PipelineAbstract<any> {}
                const { app, api } = setup(express)
                api.use(new ReadOnly(defaultSchemaBuilders(bookModel)), "book", { actions: ["create"] })
                const res = await request.execute(app).post("/books").send({ title: "A" })
                expect(res.status).to.eql(501)
                expect(res.body.name).to.eql("NotImplemented")
            })

            it("answers OPTIONS with the allowed methods", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                const collection = await request.execute(app).options("/books")
                expect(collection.status).to.eql(204)
                expect(collection.headers.allow).to.eql("GET, POST, PATCH, DELETE, HEAD, OPTIONS")
                expect((await request.execute(app).options("/books/1")).headers.allow).to.eql("GET, PATCH, DELETE, HEAD, OPTIONS")
            })

            it("only patches or deletes by query when the query can select several resources", async function () {
                const { app, api } = setup(express)
                const single = SchemaBuilder.emptySchema().addString("id")
                api.use(new EchoPipeline({ ...echoSchemaBuilders(), patchQuery: single, deleteQuery: single }), "book")
                expect((await request.execute(app).patch("/books?id=1").send({})).status).to.eql(405)
                expect((await request.execute(app).delete("/books?id=1")).status).to.eql(405)
                expect((await request.execute(app).delete("/books/1")).status).to.eql(200)
                const empty = await request.execute(app).put("/books")
                expect(empty.headers.allow).to.eql("GET, POST, HEAD, OPTIONS")
            })

            it("has no by id routes when the queries have no id", async function () {
                const { app, api } = setup(express)
                const noId = SchemaBuilder.emptySchema().addString("title", {}, false)
                api.use(new EchoPipeline({ ...echoSchemaBuilders(), readQuery: noId, patchQuery: noId, deleteQuery: noId }), "book", {
                    actions: ["read", "patch", "delete"],
                })
                const res = await request.execute(app).get("/books/1")
                expect(res.status).to.eql(405)
                expect(res.body.message).to.eql("GET is not allowed here, use OPTIONS")
                expect(res.headers.allow).to.eql("OPTIONS")
                expect((await request.execute(app).delete("/books?title=A")).status).to.eql(200)
            })

            it("negotiates JSON responses", async function () {
                const { app, api } = setup(express)
                api.use(library().books, "book")
                expect((await request.execute(app).get("/books").set("Accept", "*/*")).status).to.eql(200)
                expect((await request.execute(app).get("/books").set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")).status).to.eql(200)
                const html = await request.execute(app).get("/books").set("Accept", "text/html")
                expect(html.status).to.eql(406)
                expect(html.body.name).to.eql("NotAcceptable")
            })
        })

        describe("errors", function () {
            const failing = (error: unknown) => new EchoPipeline(echoSchemaBuilders(), () => Promise.reject(error))

            it("maps pipeline errors to HTTP statuses", async function () {
                for (const [error, status] of [
                    [unauthorizedError("no token"), 401],
                    [forbiddenError("not yours"), 403],
                    [conflictError("1"), 409],
                ] as const) {
                    const { app, api } = setup(express)
                    api.use(failing(error), "book")
                    const res = await request.execute(app).get("/books")
                    expect(res.status).to.eql(status)
                    expect(res.body.message).to.eql(error.message)
                }
            })

            it("redirects moved resources", async function () {
                const { app, api } = setup(express)
                api.use(failing(movedPermanentlyError("/books/2", { location: "/books/2" })), "book")
                api.use(failing(movedPermanentlyError("elsewhere")), "novel")
                const res = await request.execute(app).get("/books/1").redirects(0)
                expect(res.status).to.eql(301)
                expect(res.headers.location).to.eql("/books/2")
                const unknown = await request.execute(app).get("/novels/1").redirects(0)
                expect(unknown.headers).to.not.have.property("location")
            })

            it("answers and logs unexpected errors", async function () {
                for (const error of [new Error("the database is down"), "a string"]) {
                    const { app, api, logged } = setup(express)
                    api.use(failing(error), "book")
                    const res = await request.execute(app).get("/books?lang=fr")
                    expect(res.status).to.eql(500)
                    expect(res.body).to.eql({ code: 500, name: "InternalServerError", message: error instanceof Error ? error.message : error })
                    expect(logged[0][0]).to.eql("GET /books?lang=fr failed")
                    expect(String(logged[0][1])).to.contain(error instanceof Error ? error.message : error)
                }
            })

            it("lets the error responses be changed, e.g. to hide server errors", async function () {
                const seen: unknown[] = []
                const { app, api } = setup(express, {
                    formatError: (response, error, req) => {
                        seen.push([error, req.originalUrl])
                        return response.code >= 500 ? { code: response.code, name: response.name, message: "An unexpected error occurred" } : response
                    },
                })
                const error = new Error("the database is down")
                api.use(failing(error), "book")
                api.use(library().authors, "author")
                const res = await request.execute(app).get("/books")
                expect(res.status).to.eql(500)
                expect(res.body).to.eql({ code: 500, name: "InternalServerError", message: "An unexpected error occurred" })
                expect(seen).to.eql([[error, "/books"]])
                const notFound = await request.execute(app).get("/authors/42")
                expect(notFound.body.message).to.eql("The entity author:42 does not exist.")
            })

            it("sends the original error response when formatError fails", async function () {
                const { app, api, logged } = setup(express, {
                    formatError: () => {
                        throw new Error("format failed")
                    },
                })
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books/42")
                expect(res.status).to.eql(404)
                expect(res.body.name).to.eql("NotFound")
                expect(logged[0][0]).to.eql("The formatError option failed")
            })

            it("logs to the console by default", async function () {
                const app = express()
                const api = new Api(app, { openApi: { title: "t", version: "1" } }).configure(new RestTransport())
                api.use(failing(new Error("boom")), "book")
                const original = console.error
                const logged: unknown[] = []
                console.error = (...data: unknown[]) => logged.push(data)
                try {
                    expect((await request.execute(app).get("/books")).status).to.eql(500)
                } finally {
                    console.error = original
                }
                expect(logged).to.have.length(1)
            })
        })

        describe("callbacks", function () {
            it("calls onSuccess before sending the results", async function () {
                const seen: unknown[] = []
                const { app, api } = setup(express, {
                    onSuccess: [(req, res, data) => seen.push(data), (req, res) => res.set("X-Seen", "yes")],
                })
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books/1")
                expect(res.headers["x-seen"]).to.eql("yes")
                expect((seen[0] as any).data[0].id).to.eql("1")
            })

            it("calls onError before sending the error, and survives it failing", async function () {
                const seen: unknown[] = []
                const { app, api, logged } = setup(express, {
                    onError: (req, res, error) => {
                        seen.push(error)
                        throw new Error("callback failed")
                    },
                })
                api.use(library().books, "book")
                const res = await request.execute(app).get("/books/42")
                expect(res.status).to.eql(404)
                expect(seen).to.have.length(1)
                expect(logged[0][0]).to.eql("An onError callback failed")
            })

            it("answers 500 when onSuccess fails", async function () {
                const { app, api } = setup(express, {
                    onSuccess: () => {
                        throw new Error("callback failed")
                    },
                })
                api.use(library().books, "book")
                expect((await request.execute(app).get("/books")).status).to.eql(500)
            })
        })
    })
}

describe("RestTransport", function () {
    it("can only be added to one Api", function () {
        const { api } = setup(expressVersions[0].express)
        const transport = new RestTransport()
        api.configure(transport)
        expect(() => transport.init(api)).to.throw("The transport is already used by an Api")
    })

    it("must be added to an Api before exposing pipelines", function () {
        expect(() => new RestTransport().use({ pipeline: library().books, name: "book", pluralName: "books" })).to.throw(
            "The transport must be added to an Api with `api.configure` before exposing pipelines",
        )
    })
})
