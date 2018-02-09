import * as chai from "chai";
import * as util from 'util';
import { expect } from "chai";
import { TestPipe, schemaTestPipe } from "./TestPipe";
import { PipeAbstract } from "../PipeAbstract";

chai.use(require("chai-as-promised"))

describe('PipeAbstract', function () {
    it('should be implemented by a concrete class', function () {
        let s = new TestPipe();
        expect(s).to.be.an.instanceOf(TestPipe);
        expect(s).to.be.an.instanceOf(PipeAbstract);
    });
    it('should not be piped', function () {
        let s = new TestPipe();
        expect(() => s.pipeline).to.throw();
    });
});