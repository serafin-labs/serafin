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
    it('should represent itself as JSONSchema parts', function () {
        let s = new TestPipe();
        expect(s.toString()).to.equal(util.inspect(schemaTestPipe, false, null));
    });
    // it('should fail on unimplemented operations', async function () {
    //     let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
    //     await expect(s.read()).to.eventually.be.rejected
    //     await expect(s.create([{}])).to.eventually.be.rejected
    //     await expect(s.update("", {})).to.eventually.be.rejected
    //     await expect(s.patch({ id: "" }, {})).to.eventually.be.rejected
    //     await expect(s.delete({ id: "" })).to.eventually.be.rejected
    // });
});