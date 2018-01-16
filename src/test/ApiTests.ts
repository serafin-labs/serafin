import { expect } from "chai";
import * as chai from "chai";
import * as express from "express"
import { Api, RestTransport, PipelineAbstract } from "../";
import { ParameterObject } from "@serafin/open-api";

chai.use(require("chai-http"))
chai.use(require("chai-as-promised"))

describe('Api', function () {
    let api: Api
    let app: express.Application
    beforeEach(function () {
        app = express()
        api = new Api(app, {
            "openapi": "3.0.0",
            "info": {
                "version": "1.0.0",
                "title": "Unit test Api"
            },
            paths: {}
        })
    })

    it('should be initialized with an express app', function () {
        expect(api).to.exist
        expect(api.openApi).to.be.an.instanceOf(Object)
        expect(api.use).to.exist
        expect(api.configure).to.exist
    });

    it('should provide a /api.json enpoint', function (done) {
        app.listen(process.env.PORT || 8089, (error: any) => {
            if (error) {
                return done(error)
            }
            chai.request(app)
                .get("/api.json")
                .end((err, res) => {
                    expect(err).to.not.exist
                    expect(res.status).to.eql(200)
                    expect(res.type).to.eql("application/json")
                    expect(res.body).to.include.keys("openapi", "info", "paths", "components")
                    done()
                })

        });
    });

    it('should configure a transport', function () {
        api.configure(new RestTransport)
        expect(api).to.exist
    });

    // it('should use a pipeline', function () {
    //     let testPipeline = class extends PipelineAbstract { }
    //     api.use(new testPipeline, "test")
    //     expect(api).to.exist
    // });

    it('should filter internal options', function () {
        let options = {
            okOption: 42,
            _internalOption: "It should be filtered"
        }
        expect(typeof api.isNotAnInternalOption).to.eql("function")
        expect(api.isNotAnInternalOption("okOption")).to.be.true
        expect(api.isNotAnInternalOption("_internalOption")).to.be.false
        expect(api.filterInternalOptions(options)).to.not.include.keys("_internalOption")
        expect(api.filterInternalOptions(options)).to.include.keys("okOption")
    });

    it('should filter internal options parameters', function () {
        let parameters: ParameterObject[] = [{
            in: "query",
            name: "_internalOption"
        }, {
            in: "query",
            name: "okOption"
        }]
        let filteredParameters = api.filterInternalParameters(parameters);
        expect(filteredParameters).to.exist
        expect(filteredParameters.length).to.eql(1)
        expect(filteredParameters[0].name).to.eql("okOption")
    })
});