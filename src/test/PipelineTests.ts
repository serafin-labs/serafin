import { expect } from "chai";
import * as chai from "chai";
import { PipeAbstract, PipeSourceAbstract, PipelineRelation } from "../"
import { SchemaBuilder } from "@serafin/schema-builder";

chai.use(require("chai-as-promised"))

// describe('Pipelines', function () {
//     let TestPipe = class extends PipeAbstract<any> { }
//     let TestSourcePipe = class extends PipeSourceAbstract<any> { }
//     describe('Abstract', function () {
//         it('should be implemented by a concrete class', function () {
//             let i = new TestPipe()
//             expect(i).to.be.an.instanceOf(PipeAbstract)
//         });
//         it('should pipe with another pipeline', function () {
//             let p1 = new TestPipe()
//             let p2 = new TestPipe()
//             let p = p1.pipe(p2)
//             expect(p1["parent"]).to.be.undefined
//             expect(p2["parent"]).to.be.eql(p1)
//         });

//         it('should add relations', function () {
//             let p2 = new TestPipeline()
//             let p1 = new TestPipeline().addRelation("test", () => p2, {})
//             expect(p1.relations).to.exist
//             expect(p1.relations.test).to.be.an.instanceof(PipelineRelation)
//             expect(Object.keys(p1.relations).length).to.eql(1)
//         });

//         it('should inherit relations', function () {
//             let p1 = new TestPipeline().addRelation("test", () => p2, {})
//             let p2 = new TestPipeline()
//             let p = p1.pipe(p2);
//             expect(p.relations).to.exist
//             expect(p.relations.test).to.be.an.instanceof(PipelineRelation)
//         });

//         it('should throw an error if used whitout parent', async function () {
//             let p = new TestPipeline()
//             let promise = p.read();
//             await expect(promise).to.eventually.be.rejected
//         });
//     });

//     describe("SourceAbstract", function () {
//         it('should be implemented by a concrete class', function () {
//             let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
//             expect(s).to.be.an.instanceOf(PipelineAbstract)
//             expect(s).to.be.an.instanceOf(PipelineSourceAbstract)
//         });
//         it('should not be piped', function () {
//             let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
//             let p = new TestPipeline();
//             expect(p.pipe.bind(p, s)).to.throw()
//         });
//         it('should fail on unimplemented operations', async function () {
//             let s = new TestSourcePipeline(SchemaBuilder.emptySchema().addString("id"), {})
//             await expect(s.read()).to.eventually.be.rejected
//             await expect(s.create([{}])).to.eventually.be.rejected
//             await expect(s.update("", {})).to.eventually.be.rejected
//             await expect(s.patch({ id: "" }, {})).to.eventually.be.rejected
//             await expect(s.delete({ id: "" })).to.eventually.be.rejected
//         });
//     })
// });