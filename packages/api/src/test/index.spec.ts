import { ParameterObject } from "@serafin/open-api"
import { defaultSchemaBuilders, IdentityInterface, PipeAbstract, PipelineAbstract } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import * as chai from "chai"
import { expect } from "chai"
import * as express from "express"
import { Api } from "../Api"
import { RestTransport } from "../transport/rest/Rest"
import * as bodyParser from "body-parser"
import chaiHttp from "chai-http"

chaiHttp
chai.use(require("chai-http"))
chai.use(require("chai-as-promised"))

class TestPipeline<
    M extends IdentityInterface,
    CV = {},
    CO = {},
    CM = {},
    RQ = {},
    RO = {},
    RM = {},
    UV = {},
    UO = {},
    UM = {},
    PQ = {},
    PV = {},
    PO = {},
    PM = {},
    DQ = {},
    DO = {},
    DM = {},
    R = {},
> extends PipelineAbstract<M, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM, R> {
    protected async _create(resources: any[], options?: any): Promise<any> {
        return { data: [{ id: "1", method: "create", resources, options }], meta: {} }
    }

    protected async _read(query?: any, options?: any): Promise<any> {
        return { data: [{ id: "1", method: "read", query, options }], meta: {} }
    }

    protected async _replace(id: string, values: any, options?: any): Promise<any> {
        return { data: [{ id: "1", method: "replace", values, options }], meta: {} }
    }

    protected async _patch(query: any, values: any, options?: any): Promise<any> {
        return { data: [{ id: "1", method: "patch", query, values, options }], meta: {} }
    }

    protected async _delete(query: any, options?: any): Promise<any> {
        return { data: [{ id: "1", method: "delete", query, options }], meta: {} }
    }
}

class GeneralPatchPipe<M extends IdentityInterface, PQ> extends PipeAbstract {
    schemaBuilderModel = (s: SchemaBuilder<M>) => s
    schemaBuilderPatchQuery = (s: SchemaBuilder<PQ>) => s.toOptionals().addString("test", {}, false)
}

export class RolePipe<M, RO, CO, UO, PO, DO> extends PipeAbstract {
    schemaBuilderModel = (s: SchemaBuilder<M>) => s

    schemaBuilderReadOptions = (s: SchemaBuilder<RO>) => s.addString("_role", {}, false).addNumber("v", {}, false)

    schemaBuilderCreateOptions = (s: SchemaBuilder<CO>) => s.addString("_role", {}, false).addNumber("v", {}, false)

    schemaBuilderReplaceOptions = (s: SchemaBuilder<UO>) => s.addString("_role", {}, false).addNumber("v", {}, false)

    schemaBuilderPatchOptions = (s: SchemaBuilder<PO>) => s.addString("_role", {}, false).addNumber("v", {}, false)

    schemaBuilderDeleteOptions = (s: SchemaBuilder<DO>) => s.addString("_role", {}, false).addNumber("v", {}, false)
}

describe("Api", function () {
    let api: Api
    let app: express.Application
    let server: any
    beforeEach(function (done) {
        app = express()
        app.use(bodyParser.json())
        api = new Api(app, {
            openapi: "3.0.0",
            info: {
                version: "1.0.0",
                title: "Unit test Api",
            },
            paths: {},
        })
        api.configure(new RestTransport())
        const pipeline = new TestPipeline(defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id", { maxLength: 2 }).addNumber("value"))).pipe(
            new RolePipe(),
        )
        api.use(pipeline, "test")
        server = app.listen(+process.env.PORT || 8089, "localhost", () => {
            done()
        })
    })
    afterEach(function () {
        server.close()
    })

    it("should be initialized with an express app", function () {
        expect(api).to.exist
        expect(api.openApi).to.be.an.instanceOf(Object)
        expect(api.use).to.exist
        expect(api.configure).to.exist
    })

    it("should provide a /api.json enpoint", function (done) {
        chai.request(app)
            .get("/api.json")
            .end((err, res) => {
                expect(err).to.not.exist
                expect(res.status).to.eql(200)
                expect(res.type).to.eql("application/json")
                expect(res.body).to.include.keys("openapi", "info", "paths", "components")
                server.close()
                done()
            })
    })

    it("should configure a transport and handle requests", function (done) {
        // malformed read
        chai.request(app)
            .get("/tests/badId")
            .end((err, res) => {
                expect(res.status).to.eql(400)
            })

        // read by id
        chai.request(app)
            .get("/tests/1")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
            })

        // read
        chai.request(app)
            .get("/tests/")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
            })

        // read with type coercion
        chai.request(app)
            .get("/tests/?value=42")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
                expect(res.body.data[0].query.value).to.equals(42)
            })

        // read with params filtering
        chai.request(app)
            .get("/tests/?other=none")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
                expect(res.body.data[0].query.v).to.equals(undefined)
            })

        // read with private options
        chai.request(app)
            .get("/tests/?_role=admin&v=1")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
                expect(res.body.data[0].options._role).to.equals(undefined)
                expect(res.body.data[0].options.v).to.equals(1)
            })

        // malformed create
        chai.request(app)
            .post("/tests/")
            .send([{ id: "1" }])
            .end((err, res) => {
                expect(res.status).to.eql(400)
            })

        // create
        chai.request(app)
            .post("/tests/?_role=admin&v=1")
            .send([{ value: 42 }])
            .end((err, res) => {
                expect(res.status).to.eql(201)
                expect(res.body.data[0].method).to.eql("create")
                expect(res.body.data[0].options._role).to.equals(undefined)
                expect(res.body.data[0].options.v).to.equals(1)
            })

        // patch
        chai.request(app)
            .patch("/tests/1?_role=admin&v=1")
            .send({ value: 42 })
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("patch")
                expect(res.body.data[0].options._role).to.equals(undefined)
                expect(res.body.data[0].options.v).to.equals(1)
            })

        // replace
        chai.request(app)
            .put("/tests/1?_role=admin&v=1")
            .send({ value: 42 })
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("replace")
                expect(res.body.data[0].options._role).to.equals(undefined)
                expect(res.body.data[0].options.v).to.equals(1)
            })

        // delete
        chai.request(app)
            .del("/tests/1?_role=admin&v=1")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("delete")
                expect(res.body.data[0].options._role).to.equals(undefined)
                expect(res.body.data[0].options.v).to.equals(1)
                done()
            })
    })

    it("should filter internal options", function () {
        let options = {
            okOption: 42,
            _internalOption: "It should be filtered",
        }
        expect(typeof api.isNotAnInternalOption).to.eql("function")
        expect(api.isNotAnInternalOption("okOption")).to.be.true
        expect(api.isNotAnInternalOption("_internalOption")).to.be.false
        expect(api.filterInternalOptions(options)).to.not.include.keys("_internalOption")
        expect(api.filterInternalOptions(options)).to.include.keys("okOption")
    })

    it("should filter internal options parameters", function () {
        let parameters: ParameterObject[] = [
            {
                in: "query",
                name: "_internalOption",
            },
            {
                in: "query",
                name: "okOption",
            },
        ]
        let filteredParameters = api.filterInternalParameters(parameters)
        expect(filteredParameters).to.exist
        expect(filteredParameters.length).to.eql(1)
        expect(filteredParameters[0].name).to.eql("okOption")
    })

    it("should expose general patch only if the schema allows it", function () {
        const pipeline1 = new TestPipeline(defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id", { maxLength: 2 }).addString("test")))
        const pipeline2 = pipeline1.clone().pipe(new GeneralPatchPipe())
        api.use(pipeline1, "p1", "p1")
        api.use(pipeline2, "p2", "p2")

        chai.request(app)
            .patch("/p1/?test=42")
            .send({ test: "21" })
            .end((err, res) => {
                expect(res.status).to.eql(404)
            })

        chai.request(app)
            .patch("/p2/?test=42")
            .send({ test: "21" })
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("patch")
                expect(res.body.data[0].values.test).to.equals("21")
                expect(res.body.data[0].query.test).to.equals("42")
            })
    })
})
