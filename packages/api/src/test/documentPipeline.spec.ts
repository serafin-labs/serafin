import { defaultSchemaBuilders, PipelineAbstract } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import { expect } from "chai"
import express from "express"
import { Api } from "../Api.js"
import { RestTransport } from "../rest/RestTransport.js"
import { bookModel, EchoPipeline, echoSchemaBuilders, library } from "./fixtures.js"

function documented(use: (api: Api) => void) {
    const api = new Api(express(), { basePath: "/v1", openApi: { title: "Library", version: "1.0.0" } }).configure(new RestTransport())
    use(api)
    return api.openApi.validate()
}

describe("OpenAPI documentation", function () {
    it("documents every route of a pipeline in a valid OpenAPI 3.2 document", function () {
        const openApi = documented((api) => {
            const { books, authors } = library()
            api.use(books, "book").use(authors, "author")
        })
        expect(openApi.operations.map(({ method, path, operation }) => `${method} ${path} ${operation.operationId}`)).to.eql([
            "get /books findBooks",
            "post /books createBooks",
            "delete /books deleteBooks",
            "patch /books patchBooks",
            "get /books/{id} getBook",
            "delete /books/{id} deleteBook",
            "patch /books/{id} patchBook",
            "get /authors findAuthors",
            "post /authors createAuthors",
            "delete /authors deleteAuthors",
            "patch /authors patchAuthors",
            "get /authors/{id} getAuthor",
            "delete /authors/{id} deleteAuthor",
            "patch /authors/{id} patchAuthor",
        ])
        expect(openApi.document.tags).to.eql([{ name: "books" }, { name: "authors" }])
        expect(Object.keys(openApi.document.components!.schemas!)).to.include.members([
            "Error",
            "Book",
            "BookReadResults",
            "BookCreateValues",
            "BookCreateResults",
            "BookPatchValues",
            "BookPatchResults",
            "BookDeleteResults",
        ])
        expect(Object.keys(openApi.document.components!.responses!)).to.eql(["BadRequest", "NotFound", "Conflict", "UnexpectedError"])
    })

    it("documents the query string parameters", function () {
        const openApi = documented((api) => api.use(library().books, "book"))
        const find = openApi.getOperation("/books", "get")!
        const parameter = (name: string) => find.parameters!.find((p) => "name" in p && p.name === name)
        expect(parameter("title")).to.deep.include({ in: "query", name: "title", description: "The title of the book" })
        expect(parameter("title")).to.not.have.property("required")
        expect(parameter("title")).to.have.nested.property("schema.oneOf")
        expect(parameter("sort")).to.include({ style: "deepObject", explode: true })
        expect(parameter("withAuthor")).to.deep.include({ in: "query", name: "withAuthor" })
        const get = openApi.getOperation("/books/{id}", "get")!
        expect(get.parameters![0]).to.eql({ in: "path", name: "id", required: true, description: "The id of the book", schema: { type: "string" } })
        expect(get.parameters!.filter((p) => "name" in p && p.name === "id")).to.have.length(1)
    })

    it("documents results with the meta of each action, relations included", function () {
        const openApi = documented((api) => api.use(library().books, "book"))
        const meta = (component: string) => (openApi.getComponent("schemas", component) as any).properties.meta.properties
        expect(meta("BookReadResults")).to.have.keys("relations", "count")
        expect(meta("BookCreateResults")).to.have.keys("relations")
        expect((openApi.getOperation("/books", "post")!.responses as any)[201]).to.have.nested.property("headers.Location")
    })

    it("combines meta schemas that are not plain objects", function () {
        const meta = SchemaBuilder.oneOf(SchemaBuilder.emptySchema().addString("a"), SchemaBuilder.emptySchema().addString("b")) as SchemaBuilder<any>
        const openApi = documented((api) => api.use(new EchoPipeline({ ...echoSchemaBuilders(), meta }), "book"))
        const results = openApi.getComponent("schemas", "BookReadResults") as any
        expect(results.properties.meta.unevaluatedProperties).to.eql(false)
        expect(results.properties.meta.allOf[1]).to.not.have.property("additionalProperties")
    })

    it("documents the context parameters, without the internal ones", function () {
        const openApi = documented((api) => api.use(new EchoPipeline(echoSchemaBuilders()), "book"))
        const names = openApi.getOperation("/books", "get")!.parameters!.map((p) => ("name" in p ? p.name : p.$ref))
        expect(names).to.include("lang")
        expect(names).to.not.include("_user")
    })

    it("documents required parameters", function () {
        const deleteQuery = SchemaBuilder.emptySchema().addString("id").addString("reason")
        const openApi = documented((api) => api.use(new EchoPipeline({ ...echoSchemaBuilders(), deleteQuery }), "book"))
        expect(openApi.getOperation("/books/{id}", "delete")!.parameters![1]).to.eql({ in: "query", name: "reason", required: true, schema: { type: "string" } })
        expect(openApi.hasOperation("/books", "delete")).to.be.false
    })

    it("only documents the routes that exist", function () {
        class ReadOnly extends PipelineAbstract<any> {
            protected async _read() {
                return { data: [], meta: {} }
            }
        }
        const openApi = documented((api) => api.use(new ReadOnly(defaultSchemaBuilders(bookModel)), "book"))
        expect(openApi.operations.map(({ method, path }) => `${method} ${path}`)).to.eql(["get /books", "get /books/{id}"])
        expect(openApi.hasComponent("schemas", "BookCreateValues")).to.be.false
    })

    it("uses distinct operation ids when the singular and plural names are the same", function () {
        const openApi = documented((api) => api.use(library().books, "sheep", "sheep"))
        expect(openApi.operations.map(({ operation }) => operation.operationId)).to.eql([
            "findManySheep",
            "createManySheep",
            "deleteManySheep",
            "patchManySheep",
            "getSheep",
            "deleteSheep",
            "patchSheep",
        ])
    })

    it("documents an id parameter even when the model does not describe it", function () {
        const model = SchemaBuilder.emptySchema().addString("title") as SchemaBuilder<any>
        const openApi = documented((api) => api.use(new EchoPipeline({ ...echoSchemaBuilders(), model }), "book", { actions: ["read"] }))
        expect(openApi.getOperation("/books/{id}", "get")!.parameters![0]).to.deep.include({ schema: { type: "string" } })
    })

    it("can be decorated by the caller", function () {
        const app = express()
        const api = new Api(app, { openApi: { title: "Library", version: "1.0.0" } }).configure(new RestTransport()).use(library().books, "book")
        api.openApi = api.openApi
            .addComponent("securitySchemes", "bearer", { type: "http", scheme: "bearer" })
            .mapOperations((operation) => ({ ...operation, security: [{ bearer: [] }] }))
            .replaceOperation("/books", "get", (operation) => ({ ...operation, summary: "Search the catalog" }))
        expect(api.openApi.validate().getOperation("/books", "get")).to.deep.include({ summary: "Search the catalog", security: [{ bearer: [] }] })
    })
})
