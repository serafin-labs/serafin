import { expect } from "chai";
import * as express from "express"
import { PipelineAbstract } from "../serafin/pipeline/Abstract"
import { Api } from "../serafin/http/Api"

describe('Api', function () {
    it('should be initialized with an express app', function () {
        var app = express()
        var api = new Api(app)
        expect(api).to.exist
    });
});