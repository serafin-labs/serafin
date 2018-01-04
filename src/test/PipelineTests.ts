import { expect } from "chai";
import * as chai from "chai";
import { PipelineAbstract, PipelineSourceAbstract, PipelineRelations } from "../"
import { SchemaBuilder } from "@serafin/schema-builder";

chai.use(require("chai-as-promised"))

describe('Pipelines', function () {
    let TestPipeline = class extends PipelineAbstract { }
    let TestSourcePipeline = class extends PipelineSourceAbstract<any> { }
    describe('Abstract', function () {
        it('should be implemented by a concrete class', function () {
            let i = new TestPipeline()
            expect(i).to.be.an.instanceOf(PipelineAbstract)
        });
        it('should pipe with another pipeline', function () {
            let p1 = new TestPipeline()
            let p2 = new TestPipeline()
            let p = p1.pipe(p2)
            expect(p1["parent"]).to.be.undefined
            expect(p2["parent"]).to.be.eql(p1)
        });

        it('should define a schema', function () {
            let p = new TestPipeline()
            expect(p.toString().length).to.be.above(10)
        });

        it('should add relations', function () {
            let p1 = new TestPipeline()
            let p2 = new TestPipeline()
            p1.addRelation({
                name: "test",
                pipeline: p2,
                query: {}
            });
            expect(p1.relations).to.exist
            expect(p1.relations).to.be.an.instanceof(PipelineRelations)
            expect(p1.relations.list.length).to.eql(1)
        });

        it('should inherit relations', function () {
            let p1 = new TestPipeline()
            let p2 = new TestPipeline()
            let p = p1.pipe(p2)
            p1.addRelation({
                name: "test",
                pipeline: p2,
                query: {}
            });
            expect(p.relations).to.exist
            expect(p.relations).to.be.an.instanceof(PipelineRelations)
            expect(p.relations.list.length).to.eql(1)
        });

        it('should throw an error if used whitout parent', async function () {
            let p = new TestPipeline()
            let promise = p.read();
            await expect(promise).to.eventually.be.rejected
        });
    });

    describe("SourceAbstract", function () {
        it('should be implemented by a concrete class', function () {
            let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
            expect(s).to.be.an.instanceOf(PipelineAbstract)
            expect(s).to.be.an.instanceOf(PipelineSourceAbstract)
        });
        it('should not be piped', function () {
            let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
            let p = new TestPipeline();
            expect(p.pipe.bind(p, s)).to.throw()
        });
        it('should fail on unimplemented operations', async function () {
            let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
            await expect(s.read()).to.eventually.be.rejected
            await expect(s.create([{}])).to.eventually.be.rejected
            await expect(s.update("", {})).to.eventually.be.rejected
            await expect(s.patch({ id: "" }, {})).to.eventually.be.rejected
            await expect(s.delete({ id: "" })).to.eventually.be.rejected
        });
    })
});