import * as chai from "chai";
import * as util from 'util';
import { expect } from "chai";
import { TestPipeline, schemaTestPipeline } from "./TestPipeline";
import { TestPipe } from "./TestPipe";
import { SchemaBuilder } from "@serafin/schema-builder";
import { PipelineAbstract } from "../PipelineAbstract";

chai.use(require("chai-as-promised"))

// describe('Pipelines', function () {
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


const testPipeline = () => new TestPipeline(SchemaBuilder.emptySchema()
    .addString("id", { description: "id" })
    .addString("method", { description: "method" }));

const testEmptyPipeline = () => new (class extends PipelineAbstract { })(SchemaBuilder.emptySchema()
    .addString("id", { description: "id" })
    .addString("method", { description: "method" }));

describe('PipelineAbstract', function () {
    it('should be implemented by a concrete class', function () {
        let p = testPipeline();
        expect(p).to.be.an.instanceOf(TestPipeline);
        expect(p).to.be.an.instanceOf(PipelineAbstract);
    });
    it('should represent itself as JSONSchema parts', function () {
        let p = testPipeline();
        expect(p.toString()).to.be.equal(util.inspect(schemaTestPipeline, false, null));
    });

    it(`should associate a pipe to a pipeline`, function () {
        let p = testPipeline();
        let testPipe = new TestPipe();
        p.pipe(testPipe);
        return expect(testPipe.pipeline).to.equal(p);
    });

    describe('Pipeline methods', function () {
        it(`should call properly the create method`, function () {
            return expect(testPipeline().create([{ 'method': 'create' }])).to.eventually.deep.equal({ data: [{ id: '1', method: 'create' }] });
        });
        it(`should call properly the read method`, function () {
            return expect(testPipeline().read({})).to.eventually.deep.equal({ data: [{ id: '1', method: 'read' }] });
        });
        it(`should call properly the update method`, function () {
            return expect(testPipeline().update('1', { method: 'update' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'update' }] });
        });
        it(`should call properly the patch method`, function () {
            return expect(testPipeline().patch({ id: '1' }, { method: 'patch' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'patch' }] });
        });
        it(`should call properly the delete method`, function () {
            return expect(testPipeline().delete({ id: '1' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'delete' }] })
        });

        it(`should fail calling the create method`, function () {
            return expect(testPipeline().create([{ val: 'create' } as any])).to.be.rejected;
        });
        it(`should fail calling the read method`, function () {
            return expect(testPipeline().read({ val: 'read' } as any)).to.be.rejected;
        });
        it(`should fail calling the update method`, function () {
            return expect(testPipeline().update('1', { val: 'update' } as any)).to.be.rejected;
        });
        it(`should fail calling the patch method`, function () {
            return expect(testPipeline().patch({ id: '1' }, { val: 'patch' } as any)).to.be.rejected;
        });
        it(`should fail calling the delete method`, function () {
            return expect(testPipeline().delete({ val: '1' } as any)).to.be.rejected;
        });
    });

    describe('Pipeline with no implemented methods', function () {
        it(`should fail calling the create method with invalid params`, function () {
            return expect(testEmptyPipeline().create([{ val: 'create' }])).to.be.rejected;
        });
        it(`should fail calling the read method with invalid params`, function () {
            return expect(testEmptyPipeline().read({ val: 'read' } as any)).to.be.rejected;
        });
        it(`should fail calling the update method with invalid params`, function () {
            return expect(testEmptyPipeline().update('1', { val: 'update' })).to.be.rejected;
        });
        it(`should fail calling the patch method with invalid params`, function () {
            return expect(testEmptyPipeline().patch({ id: '1' }, { val: 'patch' })).to.be.rejected;
        });
        it(`should fail calling the delete method with invalid params`, function () {
            return expect(testEmptyPipeline().delete({ val: '1' } as any)).to.be.rejected;
        });
    });

    describe('Pipeline with no implemented methods, and a pipe', function () {
        it(`should fail calling the create method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe()).create([{ val: 'create' } as any])).to.be.rejected;
        });
        it(`should fail calling the read method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe()).read({ val: 'read' } as any)).to.be.rejected;
        });
        it(`should fail calling the update method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe()).update('1', { val: 'update' } as any)).to.be.rejected;
        });
        it(`should fail calling the patch method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe()).patch({ id: '1' } as any, { val: 'patch' } as any)).to.be.rejected;
        });
        it(`should fail calling the delete method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe()).delete({ val: '1' } as any)).to.be.rejected;
        });
    });

    describe('Pipeline with a pipe', function () {
        it(`should call properly the create method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).create([{ val: 'create' } as any], { testCreateOptionString: 'test' } as any)).to.eventually.deep.equal(
                { testCreateWrapperString: 'testCreateWrapperValue', data: [{ id: '1', method: 'create', testModelString: 'test' }] });
        });
        it(`should call properly the read method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).read({ val: 'read' } as any, { testReadOptionString: 'test' })).to.eventually.deep.equal(
                { testReadWrapperString: 'testReadWrapperValue', data: [{ id: '1', method: 'read', testModelString: 'test' }] });
        });
        it(`should call properly the update method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).update('1', { val: 'update' } as any, { testUpdateOptionString: 'test' })).to.eventually.deep.equal(
                { testUpdateWrapperString: 'testUpdateWrapperValue', data: [{ id: '1', method: 'update', testModelString: 'test' }] });
        });
        it(`should call properly the patch method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).patch({ id: '1' } as any, { val: 'patch' } as any, { testPatchOptionString: 'test' })).to.eventually.deep.equal(
                { testPatchWrapperString: 'testPatchWrapperValue', data: [{ id: '1', method: 'patch', testModelString: 'test' }] });
        });
        it(`should call properly the delete method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).delete({ val: '1' } as any, { testDeleteOptionString: 'test' })).to.eventually.deep.equal(
                { testDeleteWrapperString: 'testDeleteWrapperValue', data: [{ id: '1', method: 'delete', testModelString: 'test' }] });
        });
    });
});