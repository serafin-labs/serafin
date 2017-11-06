import { expect } from "chai";
import { PipelineAbstract } from "../serafin/pipeline/Abstract"

describe('Pipelines', function () {
    describe('Abstract', function () {
        it('should be implemented by a concrete class', function () {
            var TestPipeline = class extends PipelineAbstract { }
            let i = new TestPipeline()
            expect(i).to.be.an.instanceOf(PipelineAbstract)
        });
        it('should pipe with another pipeline', function () {
            var TestPipeline = class extends PipelineAbstract { }
            let p1 = new TestPipeline()
            let p2 = new TestPipeline()
            let p = p1.pipe(p2)
            expect(p1["parent"]).to.be.undefined
            expect(p2["parent"]).to.be.eql(p1)
        });
    });
});