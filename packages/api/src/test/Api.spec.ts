import { OpenApiBuilder } from "@serafin/open-api"
import { expect } from "chai"
import express from "express"
import { Api } from "../Api.js"
import type { ExposedPipeline, TransportInterface } from "../TransportInterface.js"
import { library, request } from "./fixtures.js"

const info = { title: "Library", version: "1.0.0" }

class RecordingTransport implements TransportInterface {
    api: Api | undefined
    exposed: ExposedPipeline[] = []
    init(api: Api) {
        this.api = api
    }
    use(exposed: ExposedPipeline) {
        this.exposed.push(exposed)
    }
}

describe("Api", function () {
    it("starts the OpenAPI document from its info or from a builder", function () {
        expect(new Api(express(), { openApi: info }).openApi.document).to.eql({ openapi: "3.2.0", info })
        const builder = OpenApiBuilder.create(info).addTag({ name: "library" })
        expect(new Api(express(), { openApi: builder }).openApi).to.equal(builder)
    })

    it("normalizes the base path, and declares it as the server of the document", function () {
        const api = new Api(express(), { basePath: "/v1/", openApi: info })
        expect(api.basePath).to.eql("/v1")
        expect(api.openApi.document.servers).to.eql([{ url: "/v1" }])
        expect(new Api(express(), { basePath: "/", openApi: info }).basePath).to.eql("")
        const withServer = OpenApiBuilder.create(info).addServer({ url: "https://example.com/v1" })
        expect(new Api(express(), { basePath: "/v1", openApi: withServer }).openApi.document.servers).to.eql([{ url: "https://example.com/v1" }])
        expect(() => new Api(express(), { basePath: "v1", openApi: info })).to.throw("The base path must start with '/', got 'v1'")
    })

    it("serves the OpenAPI document as it is when requested", async function () {
        const app = express()
        const api = new Api(app, { basePath: "/v1", openApi: info })
        api.openApi = api.openApi.addTag({ name: "decorated" })
        const res = await request.execute(app).get("/v1/openapi.json")
        expect(res.status).to.eql(200)
        expect(res.body.tags).to.eql([{ name: "decorated" }])
    })

    it("serves the OpenAPI document where asked, or not at all", async function () {
        const app = express()
        new Api(app, { openApi: info, openApiPath: "/spec.json" })
        expect((await request.execute(app).get("/spec.json")).status).to.eql(200)
        expect((await request.execute(app).get("/openapi.json")).status).to.eql(404)
        const hidden = express()
        new Api(hidden, { openApi: info, openApiPath: false })
        expect((await request.execute(hidden).get("/openapi.json")).status).to.eql(404)
    })

    it("exposes pipelines through every transport, including the ones added later", function () {
        const { books, authors } = library()
        const first = new RecordingTransport()
        const api = new Api(express(), { openApi: info }).configure(first).use(books, "book").use(authors, "author", "writers")
        const later = new RecordingTransport()
        api.configure(later).use(books, "novel", { pluralName: "novels", actions: ["read"] })
        expect(first.api).to.equal(api)
        const names = (t: RecordingTransport) => t.exposed.map((e) => `${e.name}/${e.pluralName}/${e.actions ?? "all"}`)
        expect(names(first)).to.eql(["book/books/all", "author/writers/all", "novel/novels/read"])
        expect(names(later)).to.eql(names(first))
        expect(api.pipelines.map((p) => p.pluralName)).to.eql(["books", "writers", "novels"])
    })

    it("refuses two pipelines with the same plural name", function () {
        const { books } = library()
        const api = new Api(express(), { openApi: info }).use(books, "book")
        expect(() => api.use(books, "book")).to.throw("A pipeline is already exposed as 'books'")
    })
})
