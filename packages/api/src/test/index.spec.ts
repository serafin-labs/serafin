import { ParameterObject } from "@serafin/open-api"
import { defaultSchemaBuilders, IdentityInterface, PipelineAbstract, PipelineAbstractOptions, SchemaBuildersInterface } from "@serafin/pipeline"
import { SchemaBuilder } from "@serafin/schema-builder"
import { use } from "chai"
import { expect, request } from "chai"
import express from "express"
import { Api } from "../Api"
import { RestTransport } from "../transport/rest/Rest"
import * as bodyParser from "body-parser"
import chaiHttp from "chai-http"

chaiHttp
use(require("chai-http"))
use(require("chai-as-promised"))

class TestingPipeline<
    M extends IdentityInterface = IdentityInterface,
    CV extends object = object,
    CO extends object = object,
    RQ extends object = object,
    PQ extends object = object,
    PV extends object = object,
    DQ extends object = object,
    CM extends object = object,
    RM extends object = object,
    PM extends object = object,
    DM extends object = object,
    CTX extends object = object,
> extends PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX> {
    constructor(schemaBuilders: SchemaBuildersInterface<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX>, options?: PipelineAbstractOptions) {
        super(schemaBuilders, options)
    }
    protected async _create(resources: any[], options: any, context: any): Promise<any> {
        return { data: [{ id: "1", method: "create", resources, options, context }], meta: {} }
    }

    protected async _read(query: any, context: any): Promise<any> {
        return { data: [{ id: "1", method: "read", query, context }], meta: {} }
    }

    protected async _patch(query: any, values: any, context: any): Promise<any> {
        return { data: [{ id: "1", method: "patch", query, values, context }], meta: {} }
    }

    protected async _delete(query: any, context: any): Promise<any> {
        return { data: [{ id: "1", method: "delete", query, context }], meta: {} }
    }
}

export class RolePipe<CTX> {
    transform = (p: { context: SchemaBuilder<CTX> }) => ({
        context: p.context.addString("_role", {}, false).addNumber("v", {}, false),
    })
}

describe("Api", function () {
    let api: Api
    let app: express.Application
    let server: any
    beforeEach(function (done) {
        app = express()
        app.use(bodyParser.json())
        api = new Api(app, "", {
            openapi: "3.0.0",
            info: {
                version: "1.0.0",
                title: "Unit test Api",
            },
            paths: {},
        })
        api.configure(new RestTransport())
        const pipeline = new TestingPipeline(defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id", { maxLength: 2 }).addNumber("value"))).pipe(
            new RolePipe(),
        )
        api.use(pipeline, "test")
        server = app.listen(process.env.PORT ? Number(process.env.PORT) : 8089, "localhost", () => {
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
        request(app)
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
        request(app)
            .get("/tests/badId")
            .end((err, res) => {
                expect(res.status).to.eql(400)
            })

        // read by id
        request(app)
            .get("/tests/1")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
            })

        // read
        request(app)
            .get("/tests/")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
            })

        // read with type coercion
        request(app)
            .get("/tests/?value=42")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
                expect(res.body.data[0].query.value).to.equals(42)
            })

        // read with params filtering
        request(app)
            .get("/tests/?other=none")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
                expect(res.body.data[0].query.v).to.equals(undefined)
            })

        // read with private options
        request(app)
            .get("/tests/?_role=admin&v=1")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("read")
                expect(res.body.data[0].context._role).to.equals(undefined)
                expect(res.body.data[0].context.v).to.equals(1)
            })

        // malformed create
        request(app)
            .post("/tests/")
            .send([{ id: "1" }])
            .end((err, res) => {
                expect(res.status).to.eql(400)
            })

        // create
        request(app)
            .post("/tests/?_role=admin&v=1")
            .send([{ value: 42 }])
            .end((err, res) => {
                expect(res.status).to.eql(201)
                expect(res.body.data[0].method).to.eql("create")
                expect(res.body.data[0].context._role).to.equals(undefined)
                expect(res.body.data[0].context.v).to.equals(1)
            })

        // patch
        request(app)
            .patch("/tests/1?_role=admin&v=1")
            .send({ value: 42 })
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("patch")
                expect(res.body.data[0].context._role).to.equals(undefined)
                expect(res.body.data[0].context.v).to.equals(1)
            })

        // delete
        request(app)
            .del("/tests/1?_role=admin&v=1")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("delete")
                expect(res.body.data[0].context._role).to.equals(undefined)
                expect(res.body.data[0].context.v).to.equals(1)
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

    it("should support general patch", function () {
        const pipeline1 = new TestingPipeline(defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id", { maxLength: 2 }).addString("test")))
        api.use(pipeline1, "p1", "p1")

        request(app)
            .patch("/p1?id=42&id=21")
            .send({ test: "21" })
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("patch")
                expect(res.body.data[0].values.test).to.equals("21")
                expect(res.body.data[0].query.id).to.eql(["42", "21"])
            })
    })

    it("should support general delete", function () {
        const pipeline1 = new TestingPipeline(defaultSchemaBuilders(SchemaBuilder.emptySchema().addString("id", { maxLength: 2 }).addString("test")))
        api.use(pipeline1, "p1", "p1")

        request(app)
            .delete("/p1?id=42&id=21")
            .end((err, res) => {
                expect(res.status).to.eql(200)
                expect(res.body.data[0].method).to.eql("delete")
                expect(res.body.data[0].query.id).to.eql(["42", "21"])
            })
    })
})
