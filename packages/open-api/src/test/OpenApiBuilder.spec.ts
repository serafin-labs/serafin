import { expect } from "chai"
import { OpenApiBuilder, OpenApiBuilderError, OpenApiValidationError, defaultOpenApiVersion, type OpenAPIObject, type OperationObject } from "../index.js"

const info = { title: "Library", version: "1.0.0" }
const ok = { 200: { description: "OK" } }
const op = (operationId?: string, extra: Partial<OperationObject> = {}): OperationObject => ({
    ...(operationId ? { operationId } : {}),
    responses: ok,
    ...extra,
})

describe("OpenApiBuilder", function () {
    describe("documents", function () {
        it("creates an OpenAPI 3.2 document", function () {
            const document = OpenApiBuilder.create(info).document
            expect(document).to.eql({ openapi: defaultOpenApiVersion, info })
            expect(OpenApiBuilder.create(info, { openapi: "3.2.1", paths: {} }).document).to.eql({ openapi: "3.2.1", paths: {}, info })
        })

        it("only accepts OpenAPI 3.2 documents", function () {
            expect(() => OpenApiBuilder.from({ openapi: "3.1.0", info })).to.throw(OpenApiBuilderError, "Only OpenAPI 3.2 documents are supported, got '3.1.0'")
            expect(() => OpenApiBuilder.from({ info } as any)).to.throw(OpenApiBuilderError, "got 'undefined'")
            expect(() => OpenApiBuilder.from(undefined as any)).to.throw(OpenApiBuilderError, "got 'undefined'")
            expect(OpenApiBuilder.from({ openapi: "3.2.0-rc1", info }).document.openapi).to.eql("3.2.0-rc1")
        })

        it("copies and freezes the documents it holds", function () {
            const source: OpenAPIObject = { openapi: "3.2.0", info: { ...info }, tags: [{ name: "a" }] }
            const builder = OpenApiBuilder.from(source)
            source.info.title = "changed"
            expect(builder.document.info.title).to.eql("Library")
            expect(Object.isFrozen(builder.document)).to.be.true
            expect(Object.isFrozen(builder.document.tags![0])).to.be.true
            expect(Reflect.set(builder.document.info, "title", "x")).to.be.false
        })

        it("never changes the builder a method is called on, and shares what did not change", function () {
            const base = OpenApiBuilder.create(info).addComponent("schemas", "Book", { type: "object" })
            const next = base.addTag({ name: "books" })
            expect(base.hasTag("books")).to.be.false
            expect(next.document.components).to.equal(base.document.components)
        })

        it("serializes to the document", function () {
            const builder = OpenApiBuilder.create(info)
            expect(builder.toJSON()).to.equal(builder.document)
            expect(JSON.parse(JSON.stringify(builder))).to.eql({ openapi: "3.2.0", info })
        })

        it("validates the document", function () {
            const valid = OpenApiBuilder.create(info).addOperation("/books", "get", op("findBooks"))
            expect(valid.validate()).to.equal(valid)
            const invalid = OpenApiBuilder.create(info)
            expect(() => invalid.validate()).to.throw(OpenApiValidationError, "must match a schema in anyOf")
        })

        it("transforms the document with a mutable copy", function () {
            const builder = OpenApiBuilder.create(info)
            const mutated = builder.transform((d) => {
                d.info.title = "Mutated"
            })
            const replaced = builder.transform((d) => ({ ...d, info: { ...d.info, title: "Replaced" } }))
            expect(builder.document.info.title).to.eql("Library")
            expect(mutated.document.info.title).to.eql("Mutated")
            expect(replaced.document.info.title).to.eql("Replaced")
            expect(Object.isFrozen(mutated.document.info)).to.be.true
        })
    })

    describe("root fields", function () {
        it("sets the info", function () {
            const builder = OpenApiBuilder.create(info)
            expect(builder.setInfo({ title: "T", version: "2" }).document.info).to.eql({ title: "T", version: "2" })
            expect(builder.setInfo((i) => ({ ...i, summary: "S" })).document.info).to.eql({ ...info, summary: "S" })
        })

        it("sets and removes the external documentation", function () {
            const builder = OpenApiBuilder.create(info).setExternalDocs({ url: "https://docs" })
            expect(builder.document.externalDocs).to.eql({ url: "https://docs" })
            expect(builder.setExternalDocs((d) => ({ ...d, description: "D" })).document.externalDocs).to.eql({ url: "https://docs", description: "D" })
            expect(builder.removeExternalDocs().document).to.not.have.property("externalDocs")
            expect(() => OpenApiBuilder.create(info).removeExternalDocs()).to.throw(OpenApiBuilderError, "externalDocs is not set")
        })

        it("sets and removes extensions", function () {
            const builder = OpenApiBuilder.create(info).setExtension("x-logo", { url: "logo.png" })
            expect(builder.document["x-logo"]).to.eql({ url: "logo.png" })
            expect(builder.removeExtension("x-logo").document).to.not.have.property("x-logo")
            expect(() => builder.setExtension("logo" as any, 1)).to.throw(OpenApiBuilderError, "'logo' is not an extension name")
            expect(() => builder.removeExtension("x-other")).to.throw(OpenApiBuilderError, "extension 'x-other' is not set")
        })
    })

    describe("servers", function () {
        const builder = OpenApiBuilder.create(info).addServer({ url: "https://a" }).addServer({ url: "https://b" })

        it("adds servers identified by their url", function () {
            expect(builder.document.servers).to.eql([{ url: "https://a" }, { url: "https://b" }])
            expect(builder.getServer("https://a")).to.eql({ url: "https://a" })
            expect(OpenApiBuilder.create(info).hasServer("https://a")).to.be.false
            expect(() => builder.addServer({ url: "https://a" })).to.throw(OpenApiBuilderError, "server 'https://a' already exists")
        })

        it("sets, replaces and removes servers", function () {
            expect(builder.setServer({ url: "https://a", name: "A" }).document.servers).to.eql([{ url: "https://a", name: "A" }, { url: "https://b" }])
            expect(builder.setServer({ url: "https://c" }).document.servers).to.have.length(3)
            expect(builder.replaceServer("https://b", (s) => ({ ...s, url: "https://c" })).document.servers).to.eql([
                { url: "https://a" },
                { url: "https://c" },
            ])
            expect(() => builder.replaceServer("https://b", { url: "https://a" })).to.throw(OpenApiBuilderError, "server 'https://a' already exists")
            expect(() => builder.replaceServer("https://z", { url: "https://z" })).to.throw(OpenApiBuilderError, "server 'https://z' does not exist")
            expect(builder.removeServer("https://a").document.servers).to.eql([{ url: "https://b" }])
            expect(builder.removeServer("https://a").removeServer("https://b").document).to.not.have.property("servers")
            expect(() => builder.removeServer("https://z")).to.throw(OpenApiBuilderError, "server 'https://z' does not exist")
        })
    })

    describe("tags", function () {
        const builder = OpenApiBuilder.create(info)
            .addTag({ name: "library" })
            .addTag({ name: "books", parent: "library" })
            .addOperation("/books", "get", op("findBooks", { tags: ["books", "public"] }))
            .addOperation("/books", "post", op("createBook", { tags: ["books"] }))
            .addOperation("/authors", "get", op("findAuthors"))
            .addWebhook("bookCreated", { post: op("onBookCreated", { tags: ["books"] }) })

        it("adds tags identified by their name, nested under existing tags", function () {
            expect(builder.getTag("books")).to.eql({ name: "books", parent: "library" })
            expect(OpenApiBuilder.create(info).hasTag("books")).to.be.false
            expect(() => builder.addTag({ name: "books" })).to.throw(OpenApiBuilderError, "tag 'books' already exists")
            expect(() => builder.addTag({ name: "x", parent: "unknown" })).to.throw(OpenApiBuilderError, "parent tag 'unknown' of 'x' does not exist")
            expect(() => builder.addTag({ name: "x", parent: "x" })).to.throw(OpenApiBuilderError, "tag 'x' cannot be its own parent")
        })

        it("sets and replaces tags without nesting them in a cycle", function () {
            expect(builder.setTag({ name: "library", description: "D" }).getTag("library")).to.eql({ name: "library", description: "D" })
            expect(builder.setTag({ name: "authors" }).hasTag("authors")).to.be.true
            expect(builder.replaceTag("books", (t) => ({ ...t, summary: "S" })).getTag("books")).to.eql({ name: "books", parent: "library", summary: "S" })
            expect(() => builder.replaceTag("library", { name: "library", parent: "books" })).to.throw(
                OpenApiBuilderError,
                "tag 'library' would be nested in a cycle",
            )
            expect(() => builder.replaceTag("unknown", { name: "unknown" })).to.throw(OpenApiBuilderError, "tag 'unknown' does not exist")
        })

        it("does not loop on documents that already nest tags in a cycle", function () {
            const cyclic = OpenApiBuilder.from({
                openapi: "3.2.0",
                info,
                tags: [
                    { name: "a", parent: "b" },
                    { name: "b", parent: "a" },
                ],
            })
            expect(() => cyclic.addTag({ name: "c", parent: "a" })).to.throw(OpenApiBuilderError, "tag 'c' would be nested in a cycle")
        })

        it("renames a tag everywhere it is used", function () {
            const renamed = builder.replaceTag("library", { name: "catalog" })
            expect(renamed.getTag("books")).to.eql({ name: "books", parent: "catalog" })
            const books = builder.replaceTag("books", { name: "volumes", parent: "library" })
            expect(books.getOperation("/books", "get")!.tags).to.eql(["volumes", "public"])
            expect(books.getOperation("/books", "post")!.tags).to.eql(["volumes"])
            expect(books.getWebhook("bookCreated")!.post!.tags).to.eql(["volumes"])
            expect(books.getOperation("/authors", "get")).to.equal(builder.getOperation("/authors", "get"))
            expect(() => builder.replaceTag("books", { name: "library" })).to.throw(OpenApiBuilderError, "tag 'library' already exists")
            expect(() => builder.replaceTag("books", { name: "volumes", parent: "unknown" })).to.throw(OpenApiBuilderError, "parent tag 'unknown'")
        })

        it("removes a tag from the document and its operations", function () {
            const removed = builder.removeTag("books")
            expect(removed.hasTag("books")).to.be.false
            expect(removed.getOperation("/books", "get")!.tags).to.eql(["public"])
            expect(removed.getOperation("/books", "post")).to.not.have.property("tags")
            expect(removed.removeTag("library").document).to.not.have.property("tags")
            expect(() => builder.removeTag("library")).to.throw(OpenApiBuilderError, "tag 'library' cannot be removed, tags 'books' are nested under it")
            expect(() => builder.removeTag("unknown")).to.throw(OpenApiBuilderError, "tag 'unknown' does not exist")
        })
    })

    describe("security", function () {
        const builder = OpenApiBuilder.create(info).addComponent("securitySchemes", "bearer", { type: "http", scheme: "bearer" })

        it("adds requirements made of declared schemes", function () {
            const secured = builder.addSecurityRequirement({ bearer: [] }).addSecurityRequirement({})
            expect(secured.document.security).to.eql([{ bearer: [] }, {}])
            expect(() => builder.addSecurityRequirement({ apiKey: [] })).to.throw(
                OpenApiBuilderError,
                "security scheme 'apiKey' is not declared in components.securitySchemes",
            )
            expect(secured.setSecurity(undefined).document).to.not.have.property("security")
            expect(builder.setSecurity([]).document.security).to.eql([])
        })
    })

    describe("paths", function () {
        const builder = OpenApiBuilder.create(info).addPath("/books/{id}", { summary: "A book" })

        it("adds paths, refusing equivalent templated paths", function () {
            expect(OpenApiBuilder.create(info).addPath("/books").document.paths).to.eql({ "/books": {} })
            expect(builder.getPath("/books/{id}")).to.eql({ summary: "A book" })
            expect(OpenApiBuilder.create(info).hasPath("/books")).to.be.false
            expect(() => builder.addPath("books")).to.throw(OpenApiBuilderError, "path 'books' must start with '/'")
            expect(() => builder.addPath("/books/{id}")).to.throw(OpenApiBuilderError, "path '/books/{id}' already exists")
            expect(() => builder.addPath("/books/{key}")).to.throw(OpenApiBuilderError, "path '/books/{key}' is equivalent to the existing path '/books/{id}'")
        })

        it("refuses operation ids already used", function () {
            const withOp = builder.addOperation("/books", "get", op("findBooks"))
            expect(() => withOp.addPath("/other", { get: op("findBooks") })).to.throw(
                OpenApiBuilderError,
                "operationId 'findBooks' is already used by /paths/~1books/get",
            )
            expect(() => builder.addPath("/other", { get: op("x"), additionalOperations: { COPY: op("x") } })).to.throw(
                OpenApiBuilderError,
                "operationId 'x' is used twice in the path item",
            )
            expect(withOp.replacePath("/books", (p) => ({ ...p, summary: "Books" })).getPath("/books")).to.eql({ get: op("findBooks"), summary: "Books" })
        })

        it("sets, replaces and removes paths", function () {
            expect(builder.setPath("/books/{id}", { description: "D" }).getPath("/books/{id}")).to.eql({ description: "D" })
            expect(builder.setPath("/authors", {}).hasPath("/authors")).to.be.true
            expect(() => builder.replacePath("/authors", {})).to.throw(OpenApiBuilderError, "path '/authors' does not exist")
            expect(builder.removePath("/books/{id}").document.paths).to.eql({})
            expect(() => builder.removePath("/authors")).to.throw(OpenApiBuilderError, "path '/authors' does not exist")
        })
    })

    describe("operations", function () {
        const builder = OpenApiBuilder.create(info).addOperation("/books", "get", op("findBooks")).addOperation("/books", "COPY", op("copyBooks"))

        it("adds operations, creating their path", function () {
            expect(builder.getPath("/books")).to.eql({ get: op("findBooks"), additionalOperations: { COPY: op("copyBooks") } })
            expect(builder.addOperation("/books", "POST", op("createBook")).getOperation("/books", "post")).to.eql(op("createBook"))
            expect(builder.hasOperation("/books", "GET")).to.be.true
            expect(builder.hasOperation("/authors", "get")).to.be.false
            expect(builder.addOperation("/books", "query", op()).hasOperation("/books", "query")).to.be.true
            expect(() => builder.addOperation("/books", "get", op())).to.throw(OpenApiBuilderError, "operation GET /books already exists")
            expect(() => builder.addOperation("/books", "BAD METHOD", op())).to.throw(OpenApiBuilderError, "'BAD METHOD' is not a valid HTTP method name")
            expect(() => builder.addOperation("/authors", "get", op("findBooks"))).to.throw(OpenApiBuilderError, "operationId 'findBooks' is already used")
            expect(() => builder.addOperation("/books/{id}", "get", op()).addOperation("/books/{key}", "put", op())).to.throw(
                OpenApiBuilderError,
                "is equivalent",
            )
        })

        it("sets and replaces operations", function () {
            expect(builder.setOperation("/books", "get", op("findBooks", { summary: "S" })).getOperation("/books", "get")).to.eql(
                op("findBooks", { summary: "S" }),
            )
            expect(builder.replaceOperation("/books", "COPY", (o) => ({ ...o, deprecated: true })).getOperation("/books", "COPY")).to.eql(
                op("copyBooks", { deprecated: true }),
            )
            expect(() => builder.replaceOperation("/books", "delete", op())).to.throw(OpenApiBuilderError, "operation DELETE /books does not exist")
        })

        it("removes operations, and their path once empty", function () {
            const withoutGet = builder.removeOperation("/books", "get")
            expect(withoutGet.getPath("/books")).to.eql({ additionalOperations: { COPY: op("copyBooks") } })
            expect(withoutGet.removeOperation("/books", "COPY").document.paths).to.eql({})
            const described = OpenApiBuilder.create(info).addPath("/books", { summary: "S" }).addOperation("/books", "get", op())
            expect(described.removeOperation("/books", "get").getPath("/books")).to.eql({ summary: "S" })
            expect(() => builder.removeOperation("/books", "put")).to.throw(OpenApiBuilderError, "operation PUT /books does not exist")
        })

        it("lists and maps every operation", function () {
            expect(builder.operations.map(({ path, method }) => `${method} ${path}`)).to.eql(["get /books", "COPY /books"])
            const secured = builder.mapOperations((operation, { method }) => ({ ...operation, summary: method }))
            expect(secured.getOperation("/books", "get")!.summary).to.eql("get")
            expect(secured.getOperation("/books", "COPY")!.summary).to.eql("COPY")
        })
    })

    describe("webhooks", function () {
        const builder = OpenApiBuilder.create(info).addWebhook("bookCreated", { post: op("onBookCreated") })

        it("adds, sets, replaces and removes webhooks", function () {
            expect(builder.getWebhook("bookCreated")).to.eql({ post: op("onBookCreated") })
            expect(OpenApiBuilder.create(info).hasWebhook("bookCreated")).to.be.false
            expect(() => builder.addWebhook("bookCreated", {})).to.throw(OpenApiBuilderError, "webhook 'bookCreated' already exists")
            expect(builder.setWebhook("bookCreated", { summary: "S" }).getWebhook("bookCreated")).to.eql({ summary: "S" })
            expect(builder.setWebhook("bookDeleted", {}).hasWebhook("bookDeleted")).to.be.true
            expect(builder.replaceWebhook("bookCreated", (w) => ({ ...w, summary: "S" })).getWebhook("bookCreated")).to.eql({
                post: op("onBookCreated"),
                summary: "S",
            })
            expect(() => builder.replaceWebhook("unknown", {})).to.throw(OpenApiBuilderError, "webhook 'unknown' does not exist")
            expect(builder.removeWebhook("bookCreated").document.webhooks).to.eql({})
            expect(() => builder.removeWebhook("unknown")).to.throw(OpenApiBuilderError, "webhook 'unknown' does not exist")
        })

        it("shares operation ids with the paths", function () {
            expect(() => builder.addOperation("/books", "post", op("onBookCreated"))).to.throw(
                OpenApiBuilderError,
                "already used by /webhooks/bookCreated/post",
            )
            expect(() => builder.addWebhook("other", { put: op("onBookCreated") })).to.throw(OpenApiBuilderError, "already used by /webhooks/bookCreated/post")
        })
    })

    describe("components", function () {
        const builder = OpenApiBuilder.create(info)
            .addComponent("schemas", "Book", { type: "object" })
            .addComponent("schemas", "Author", { type: "object" })
            .addComponent("responses", "NotFound", { description: "Not found" })

        it("adds components with valid names", function () {
            expect(builder.getComponent("schemas", "Book")).to.eql({ type: "object" })
            expect(OpenApiBuilder.create(info).hasComponent("schemas", "Book")).to.be.false
            expect(() => builder.addComponent("schemas", "Book", true)).to.throw(OpenApiBuilderError, "component 'Book' already exists in schemas")
            expect(() => builder.addComponent("schemas", "A Book", true)).to.throw(OpenApiBuilderError, "'A Book' is not a valid component name")
        })

        it("sets, replaces and removes components", function () {
            expect(builder.setComponent("schemas", "Book", { type: "string" }).getComponent("schemas", "Book")).to.eql({ type: "string" })
            expect(builder.setComponent("schemas", "Tag", false).getComponent("schemas", "Tag")).to.eql(false)
            expect(builder.replaceComponent("responses", "NotFound", (r) => ({ ...r, summary: "S" })).getComponent("responses", "NotFound")).to.eql({
                description: "Not found",
                summary: "S",
            })
            expect(() => builder.replaceComponent("schemas", "Tag", {})).to.throw(OpenApiBuilderError, "component 'Tag' does not exist in schemas")
            expect(builder.removeComponent("schemas", "Book").document.components).to.eql({
                schemas: { Author: { type: "object" } },
                responses: { NotFound: { description: "Not found" } },
            })
            expect(builder.removeComponent("responses", "NotFound").document.components).to.not.have.property("responses")
            expect(() => builder.removeComponent("schemas", "Tag")).to.throw(OpenApiBuilderError, "component 'Tag' does not exist in schemas")
        })

        it("creates references to existing components only", function () {
            expect(builder.ref("schemas", "Book")).to.eql({ $ref: "#/components/schemas/Book" })
            expect(builder.ref("responses", "NotFound", { description: "D" })).to.eql({ $ref: "#/components/responses/NotFound", description: "D" })
            expect(() => builder.ref("schemas", "Tag")).to.throw(OpenApiBuilderError, "component 'Tag' does not exist in schemas")
        })

        it("refuses to remove a referenced component", function () {
            const referenced = builder
                .replaceComponent("schemas", "Author", { type: "object", properties: { books: { type: "array", items: builder.ref("schemas", "Book") } } })
                .addOperation("/books", "get", { responses: { 404: builder.ref("responses", "NotFound") } })
            expect(() => referenced.removeComponent("schemas", "Book")).to.throw(
                OpenApiBuilderError,
                "component 'Book' of schemas cannot be removed, it is referenced at /components/schemas/Author/properties/books/items/$ref",
            )
            const nested = builder.replaceComponent("schemas", "Author", { $ref: "#/components/schemas/Book/properties/title" })
            expect(() => nested.removeComponent("schemas", "Book")).to.throw(OpenApiBuilderError, "referenced at /components/schemas/Author/$ref")
            expect(() => referenced.removeComponent("responses", "NotFound")).to.throw(
                OpenApiBuilderError,
                "referenced at /paths/~1books/get/responses/404/$ref",
            )
            expect(nested.removeComponent("responses", "NotFound").hasComponent("responses", "NotFound")).to.be.false
        })
    })

    it("builds a complete valid document", function () {
        let builder = OpenApiBuilder.create(info, { $self: "https://example.com/openapi.json" })
            .addServer({ url: "https://example.com/v1", name: "production" })
            .addTag({ name: "books", kind: "nav" })
            .addComponent("schemas", "Book", { type: "object", properties: { id: { type: "string" }, title: { type: ["string", "null"] } }, required: ["id"] })
            .addComponent("securitySchemes", "bearer", { type: "http", scheme: "bearer", bearerFormat: "JWT" })
            .addComponent("parameters", "id", { in: "path", name: "id", required: true, schema: { type: "string" } })
        builder = builder
            .addSecurityRequirement({ bearer: [] })
            .addOperation("/books/{id}", "get", {
                operationId: "getBook",
                tags: ["books"],
                parameters: [builder.ref("parameters", "id")],
                responses: { 200: { description: "A book", content: { "application/json": { schema: builder.ref("schemas", "Book") } } } },
            })
            .addOperation("/books", "query", {
                operationId: "queryBooks",
                requestBody: { content: { "application/json": { schema: { type: "object" } } } },
                responses: { 200: { content: { "application/jsonl": { itemSchema: builder.ref("schemas", "Book") } } } },
            })
            .addWebhook("bookCreated", { post: { requestBody: { content: { "application/json": { schema: builder.ref("schemas", "Book") } } } } })
            .setExtension("x-audience", "public")
        expect(() => builder.validate()).to.not.throw()
    })
})
