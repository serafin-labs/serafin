import * as chai from "chai";
import * as util from 'util';
import { expect } from "chai";
import { TestPipeline, schemaTestPipeline } from "./TestPipeline";
import { TestPipe } from "./TestPipe";
import { SchemaBuilder } from "@serafin/schema-builder";
import { PipelineAbstract } from "../PipelineAbstract";
import { IdentityInterface } from "../IdentityInterface";

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

const testEmptyPipeline = () => new (class extends PipelineAbstract<any> { })(SchemaBuilder.emptySchema()
    .addString("id", { description: "id" })
    .addString("method", { description: "method" }));

describe('PipelineAbstract', function () {
    it('should be implemented by a concrete class', function () {
        let p = testPipeline();
        expect(p).to.be.an.instanceOf(TestPipeline);
        expect(p).to.be.an.instanceOf(PipelineAbstract);
    });

    it('should represent itself as JSONSchema definitions', function () {
        let p = testPipeline();
        expect(p.toString()).to.be.equal(util.inspect(schemaTestPipeline, false, null));
    });

    it(`should associate a pipe to a pipeline`, function () {
        let p = testPipeline();
        let testPipe = new TestPipe();
        p.pipe(testPipe as any);
        return expect(testPipe.pipeline).to.equal(p);
    });

    it(`should fail when associating an already associated pipe to a pipeline`, function () {
        let p = testPipeline();
        let testPipe = new TestPipe();
        p.pipe(testPipe as any);
        let p2 = testPipeline();
        return expect(() => p2.pipe(testPipe as any)).to.throw();
    });

    it(`should extend schema builders`, function () {
        class ExtendedPipeline<M extends IdentityInterface> extends PipelineAbstract<M> {
            schemaBuilders = {
                model: super.getSchemaBuilders().model,
                createValues: super.getSchemaBuilders().createValues.addString("additionalValue"),
                createOptions: super.getSchemaBuilders().createOptions.addString("additionalOption"),
                createWrapper: super.getSchemaBuilders().createWrapper.addString("additionalWrapper"),
                readQuery: super.getSchemaBuilders().readQuery.addString("additionalQuery"),
                readOptions: super.getSchemaBuilders().readOptions.addString("additionalOption"),
                readWrapper: super.getSchemaBuilders().readWrapper.addString("additionalWrapper"),
                replaceValues: super.getSchemaBuilders().replaceValues,
                replaceOptions: super.getSchemaBuilders().replaceOptions.addString("additionalOption"),
                replaceWrapper: super.getSchemaBuilders().replaceWrapper.addString("additionalWrapper"),
                patchQuery: super.getSchemaBuilders().patchQuery.addString("additionalQuery"),
                patchValues: super.getSchemaBuilders().patchValues,
                patchOptions: super.getSchemaBuilders().patchOptions.addString("additionalOption"),
                patchWrapper: super.getSchemaBuilders().patchWrapper.addString("additionalWrapper"),
                deleteQuery: super.getSchemaBuilders().deleteQuery.addString("additionalQuery"),
                deleteOptions: super.getSchemaBuilders().deleteOptions.addString("additionalOption"),
                deleteWrapper: super.getSchemaBuilders().deleteWrapper.addString("additionalWrapper")
            }
        };
        let p = new ExtendedPipeline
            (SchemaBuilder.emptySchema()
                .addString("id", { description: "id" })
                .addString("method", { description: "method" }));

        expect(p.schemaBuilders.model instanceof SchemaBuilder &&
            p.schemaBuilders.createValues instanceof SchemaBuilder && p.schemaBuilders.createValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.createOptions instanceof SchemaBuilder && p.schemaBuilders.createOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.createWrapper instanceof SchemaBuilder && p.schemaBuilders.createWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.readQuery instanceof SchemaBuilder && p.schemaBuilders.readQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.readOptions instanceof SchemaBuilder && p.schemaBuilders.readOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.readWrapper instanceof SchemaBuilder && p.schemaBuilders.readWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.replaceValues instanceof SchemaBuilder &&
            p.schemaBuilders.replaceOptions instanceof SchemaBuilder && p.schemaBuilders.replaceOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.replaceWrapper instanceof SchemaBuilder && p.schemaBuilders.replaceWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.patchQuery instanceof SchemaBuilder && p.schemaBuilders.patchQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.patchValues instanceof SchemaBuilder &&
            p.schemaBuilders.patchOptions instanceof SchemaBuilder && p.schemaBuilders.patchOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.patchWrapper instanceof SchemaBuilder && p.schemaBuilders.patchWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.deleteQuery instanceof SchemaBuilder && p.schemaBuilders.deleteQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.deleteOptions instanceof SchemaBuilder && p.schemaBuilders.deleteOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.deleteWrapper instanceof SchemaBuilder && p.schemaBuilders.deleteWrapper.schema.properties.additionalWrapper.type == 'string'
        ).to.be.true;
    });

    it(`should alter schema builders`, function () {
        let p = testPipeline()
            .alterSchemaBuilders((s) => ({
                model: s.model,
                createValues: s.createValues.addString("additionalValue"),
                createOptions: s.createOptions.addString("additionalOption"),
                createWrapper: s.createWrapper.addString("additionalWrapper"),
                readQuery: s.readQuery.addString("additionalQuery"),
                readOptions: s.readOptions.addString("additionalOption"),
                readWrapper: s.readWrapper.addString("additionalWrapper"),
                replaceValues: s.replaceValues.addString("additionalValue"),
                replaceOptions: s.replaceOptions.addString("additionalOption"),
                replaceWrapper: s.replaceWrapper.addString("additionalWrapper"),
                patchQuery: s.patchQuery.addString("additionalQuery"),
                patchValues: s.patchValues.addString("additionalValue"),
                patchOptions: s.patchOptions.addString("additionalOption"),
                patchWrapper: s.patchWrapper.addString("additionalWrapper"),
                deleteQuery: s.deleteQuery.addString("additionalQuery"),
                deleteOptions: s.deleteOptions.addString("additionalOption"),
                deleteWrapper: s.deleteWrapper.addString("additionalWrapper")
            }));

        expect(p.schemaBuilders.model instanceof SchemaBuilder &&
            p.schemaBuilders.createValues instanceof SchemaBuilder && p.schemaBuilders.createValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.createOptions instanceof SchemaBuilder && p.schemaBuilders.createOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.createWrapper instanceof SchemaBuilder && p.schemaBuilders.createWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.readQuery instanceof SchemaBuilder && p.schemaBuilders.readQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.readOptions instanceof SchemaBuilder && p.schemaBuilders.readOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.readWrapper instanceof SchemaBuilder && p.schemaBuilders.readWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.replaceValues instanceof SchemaBuilder && p.schemaBuilders.replaceValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.replaceOptions instanceof SchemaBuilder && p.schemaBuilders.replaceOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.replaceWrapper instanceof SchemaBuilder && p.schemaBuilders.replaceWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.patchQuery instanceof SchemaBuilder && p.schemaBuilders.patchQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.patchValues instanceof SchemaBuilder && p.schemaBuilders.patchValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.patchOptions instanceof SchemaBuilder && p.schemaBuilders.patchOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.patchWrapper instanceof SchemaBuilder && p.schemaBuilders.patchWrapper.schema.properties.additionalWrapper.type == 'string' &&
            p.schemaBuilders.deleteQuery instanceof SchemaBuilder && p.schemaBuilders.deleteQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.deleteOptions instanceof SchemaBuilder && p.schemaBuilders.deleteOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.deleteWrapper instanceof SchemaBuilder && p.schemaBuilders.deleteWrapper.schema.properties.additionalWrapper.type == 'string'
        ).to.be.true;
    });

    describe('Pipeline methods', function () {
        it(`should call properly the create method`, function () {
            return expect(testPipeline().create([{ 'method': 'create' }])).to.eventually.deep.equal({ data: [{ id: '1', method: 'create' }] });
        });
        it(`should call properly the read method`, function () {
            return expect(testPipeline().read({})).to.eventually.deep.equal({ data: [{ id: '1', method: 'read' }] });
        });
        it(`should call properly the replace method`, function () {
            return expect(testPipeline().replace('1', { method: 'replace' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'replace' }] });
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
        // TODO: design question: should we allow additional properties in these fields as a default?
        it.skip(`should fail calling the read method`, function () {
            return expect(testPipeline().read({ q: 'read' } as any, { opt: 'read' } as any)).to.be.rejected;
        });
        it(`should fail calling the replace method`, function () {
            return expect(testPipeline().replace('1', { val: 'replace' } as any)).to.be.rejected;
        });
        it(`should fail calling the patch method`, function () {
            return expect(testPipeline().patch({ val: '1' } as any, { val: 'patch' } as any)).to.be.rejected;
        });
        it(`should fail calling the delete method`, function () {
            return expect(testPipeline().delete({ val: '1' } as any)).to.be.rejected;
        });
    });

    describe('Pipeline with no implemented methods', function () {
        it(`should fail calling the create method`, function () {
            return expect(testEmptyPipeline().create([{ 'method': 'test' } as any])).to.be.rejected;
        });
        it(`should fail calling the read method`, function () {
            return expect(testEmptyPipeline().read({})).to.be.rejected;
        });
        it(`should fail calling the replace method`, function () {
            return expect(testEmptyPipeline().replace('1', { 'method': 'test' })).to.be.rejected;
        });
        it(`should fail calling the patch method`, function () {
            return expect(testEmptyPipeline().patch({ id: '1' }, {})).to.be.rejected;
        });
        it(`should fail calling the delete method`, function () {
            return expect(testEmptyPipeline().delete({ id: '1' })).to.be.rejected;
        });
    });

    describe('Pipeline with no implemented methods, and a pipe', function () {
        it(`should fail calling the create method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe() as any).create([{ 'method': 'test' } as any])).to.be.rejected;
        });
        it(`should fail calling the read method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe() as any).read({})).to.be.rejected;
        });
        it(`should fail calling the replace method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe() as any).replace('1', { 'method': 'test' })).to.be.rejected;
        });
        it(`should fail calling the patch method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe() as any).patch({ id: '1' }, { id: '1' })).to.be.rejected;
        });
        it(`should fail calling the delete method`, function () {
            return expect(testEmptyPipeline().pipe(new TestPipe() as any).delete({ id: '1' })).to.be.rejected;
        });
    });

    describe('Pipeline with a pipe', function () {
        it(`should call properly the create method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).create([{ method: 'create', testCreateValuesString: 'value' }], { testCreateOptionsString: 'test' })).to.eventually.deep.equal(
                { testCreateWrapperString: 'testCreateWrapperValue', data: [{ id: '1', method: 'create', testString: 'test' }] });
        });
        it(`should call properly the read method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).read({ testReadQueryString: 'test' }, { testReadOptionsString: 'test' })).to.eventually.deep.equal(
                { testReadWrapperString: 'testReadWrapperValue', data: [{ id: '1', method: 'read', testQueryString: 'test', testOptionsString: 'test' }] });
        });
        it(`should call properly the replace method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).replace('1', { method: 'replace', testReplaceValuesString: 'test' }, { testReplaceOptionsString: 'test' })).to.eventually.deep.equal(
                { testReplaceWrapperString: 'testReplaceWrapperValue', data: [{ id: '1', method: 'replace', testOptionsString: 'test', testValuesString: 'test' }] });
        });
        it(`should call properly the patch method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).patch({ id: '1', testPatchQueryString: 'test' }, { method: 'patch', testPatchValuesString: 'test' }, { testPatchOptionsString: 'test' })).to.eventually.deep.equal(
                { testPatchWrapperString: 'testPatchWrapperValue', data: [{ id: '1', method: 'patch', testValuesString: 'test', testQueryString: 'test', testOptionsString: 'test' }] });
        });
        it(`should call properly the delete method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).delete({ id: '1', testDeleteQueryString: 'test' }, { testDeleteOptionsString: 'test' })).to.eventually.deep.equal(
                { testDeleteWrapperString: 'testDeleteWrapperValue', data: [{ id: '1', method: 'delete', testOptionsString: 'test', testQueryString: 'test' }] });
        });

        it(`should fail calling the create method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).create([{ method: 'create', testCreateValuesString2: 'value' } as any], { testCreateOptionsString: 'test' })).to.be.rejected;
        });
        it(`should fail calling the read method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).read({ testReadQueryString: 'test' }, { testReadOptionsString2: 'test' } as any)).to.be.rejected;
        });
        it(`should fail calling the replace method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).replace('1', { method: 'replace', testReplaceValuesString2: 'test' } as any, { testReplaceOptionsString: 'test' })).to.be.rejected;
        });
        it(`should fail calling the patch method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).patch({ id: '1', testPatchQueryString: 'test' }, { method: 'patch', testPatchValuesString2: 'test' } as any, { testPatchOptionsString: 'test' })).to.be.rejected;
        });
        it(`should fail calling the delete method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).delete({ id: '1', testDeleteQueryString: 'test' }, { testDeleteOptionsString2: 'test' } as any)).to.be.rejected;
        });

    });

});