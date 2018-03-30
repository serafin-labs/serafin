import * as chai from "chai";
import * as util from 'util';
import { expect } from "chai";
import { TestPipeline, schemaTestPipeline } from "./TestPipeline";
import { TestPipe } from "./TestPipe";
import { SchemaBuilder } from "@serafin/schema-builder";
import { PipelineAbstract } from "../PipelineAbstract";
import { IdentityInterface } from "../IdentityInterface";
import { PipelineRelation } from "..";
import { QueryTemplate } from "../QueryTemplate";

chai.use(require("chai-as-promised"))

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
                createValues: super.getSchemaBuilders().createValues,
                createOptions: super.getSchemaBuilders().createOptions.addString("additionalOption"),
                createMeta: super.getSchemaBuilders().createMeta.addString("additionalMeta"),
                readQuery: super.getSchemaBuilders().readQuery,
                readOptions: super.getSchemaBuilders().readOptions.addString("additionalOption"),
                readMeta: super.getSchemaBuilders().readMeta.addString("additionalMeta"),
                replaceValues: super.getSchemaBuilders().replaceValues,
                replaceOptions: super.getSchemaBuilders().replaceOptions.addString("additionalOption"),
                replaceMeta: super.getSchemaBuilders().replaceMeta.addString("additionalMeta"),
                patchQuery: super.getSchemaBuilders().patchQuery.addString("additionalQuery"),
                patchValues: super.getSchemaBuilders().patchValues,
                patchOptions: super.getSchemaBuilders().patchOptions.addString("additionalOption"),
                patchMeta: super.getSchemaBuilders().patchMeta.addString("additionalMeta"),
                deleteQuery: super.getSchemaBuilders().deleteQuery.addString("additionalQuery"),
                deleteOptions: super.getSchemaBuilders().deleteOptions.addString("additionalOption"),
                deleteMeta: super.getSchemaBuilders().deleteMeta.addString("additionalMeta")
            }
        };
        let p = new ExtendedPipeline
            (SchemaBuilder.emptySchema()
                .addString("id", { description: "id" })
                .addString("method", { description: "method" }));

        expect(p.schemaBuilders.model instanceof SchemaBuilder &&
            p.schemaBuilders.createValues instanceof SchemaBuilder && // p.schemaBuilders.createValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.createOptions instanceof SchemaBuilder && p.schemaBuilders.createOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.createMeta instanceof SchemaBuilder && p.schemaBuilders.createMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.readQuery instanceof SchemaBuilder && //p.schemaBuilders.readQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.readOptions instanceof SchemaBuilder && p.schemaBuilders.readOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.readMeta instanceof SchemaBuilder && p.schemaBuilders.readMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.replaceValues instanceof SchemaBuilder &&
            p.schemaBuilders.replaceOptions instanceof SchemaBuilder && p.schemaBuilders.replaceOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.replaceMeta instanceof SchemaBuilder && p.schemaBuilders.replaceMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.patchQuery instanceof SchemaBuilder && p.schemaBuilders.patchQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.patchValues instanceof SchemaBuilder &&
            p.schemaBuilders.patchOptions instanceof SchemaBuilder && p.schemaBuilders.patchOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.patchMeta instanceof SchemaBuilder && p.schemaBuilders.patchMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.deleteQuery instanceof SchemaBuilder && p.schemaBuilders.deleteQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.deleteOptions instanceof SchemaBuilder && p.schemaBuilders.deleteOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.deleteMeta instanceof SchemaBuilder && p.schemaBuilders.deleteMeta.schema.properties.additionalMeta.type == 'string'
        ).to.be.true;
    });

    it(`should alter schema builders`, function () {
        let p = testPipeline()
            .alterSchemaBuilders((s) => ({
                model: s.model,
                createValues: s.createValues.addString("additionalValue"),
                createOptions: s.createOptions.addString("additionalOption"),
                createMeta: s.createMeta.addString("additionalMeta"),
                readQuery: s.readQuery.addString("additionalQuery"),
                readOptions: s.readOptions.addString("additionalOption"),
                readMeta: s.readMeta.addString("additionalMeta"),
                replaceValues: s.replaceValues.addString("additionalValue"),
                replaceOptions: s.replaceOptions.addString("additionalOption"),
                replaceMeta: s.replaceMeta.addString("additionalMeta"),
                patchQuery: s.patchQuery.addString("additionalQuery"),
                patchValues: s.patchValues.addString("additionalValue"),
                patchOptions: s.patchOptions.addString("additionalOption"),
                patchMeta: s.patchMeta.addString("additionalMeta"),
                deleteQuery: s.deleteQuery.addString("additionalQuery"),
                deleteOptions: s.deleteOptions.addString("additionalOption"),
                deleteMeta: s.deleteMeta.addString("additionalMeta")
            }));

        expect(p.schemaBuilders.model instanceof SchemaBuilder &&
            p.schemaBuilders.createValues instanceof SchemaBuilder && p.schemaBuilders.createValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.createOptions instanceof SchemaBuilder && p.schemaBuilders.createOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.createMeta instanceof SchemaBuilder && p.schemaBuilders.createMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.readQuery instanceof SchemaBuilder && p.schemaBuilders.readQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.readOptions instanceof SchemaBuilder && p.schemaBuilders.readOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.readMeta instanceof SchemaBuilder && p.schemaBuilders.readMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.replaceValues instanceof SchemaBuilder && p.schemaBuilders.replaceValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.replaceOptions instanceof SchemaBuilder && p.schemaBuilders.replaceOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.replaceMeta instanceof SchemaBuilder && p.schemaBuilders.replaceMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.patchQuery instanceof SchemaBuilder && p.schemaBuilders.patchQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.patchValues instanceof SchemaBuilder && p.schemaBuilders.patchValues.schema.properties.additionalValue.type == 'string' &&
            p.schemaBuilders.patchOptions instanceof SchemaBuilder && p.schemaBuilders.patchOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.patchMeta instanceof SchemaBuilder && p.schemaBuilders.patchMeta.schema.properties.additionalMeta.type == 'string' &&
            p.schemaBuilders.deleteQuery instanceof SchemaBuilder && p.schemaBuilders.deleteQuery.schema.properties.additionalQuery.type == 'string' &&
            p.schemaBuilders.deleteOptions instanceof SchemaBuilder && p.schemaBuilders.deleteOptions.schema.properties.additionalOption.type == 'string' &&
            p.schemaBuilders.deleteMeta instanceof SchemaBuilder && p.schemaBuilders.deleteMeta.schema.properties.additionalMeta.type == 'string'
        ).to.be.true;
    });

    describe('Pipeline methods', function () {
        it(`should call properly the create method`, function () {
            return expect(testPipeline().create([{ 'method': 'create' }])).to.eventually.deep.equal({ data: [{ id: '1', method: 'create' }], meta: {} });
        });
        it(`should call properly the read method`, function () {
            return expect(testPipeline().read({})).to.eventually.deep.equal({ data: [{ id: '1', method: 'read' }], meta: {} });
        });
        it(`should call properly the replace method`, function () {
            return expect(testPipeline().replace('1', { method: 'replace' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'replace' }], meta: {} });
        });
        it(`should call properly the patch method`, function () {
            return expect(testPipeline().patch({ id: '1' }, { method: 'patch' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'patch' }], meta: {} });
        });
        it(`should call properly the delete method`, function () {
            return expect(testPipeline().delete({ id: '1' })).to.eventually.deep.equal({ data: [{ id: '1', method: 'delete' }], meta: {} })
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
                { meta: { testCreateMetaString: 'testCreateMetaValue' }, data: [{ id: '1', method: 'create', testString: 'test' }] });
        });
        it(`should call properly the read method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).read({ testReadQueryString: 'test' }, { testReadOptionsString: 'test' })).to.eventually.deep.equal(
                { meta: { testReadMetaString: 'testReadMetaValue' }, data: [{ id: '1', method: 'read', testQueryString: 'test', testOptionsString: 'test' }] });
        });
        it(`should call properly the replace method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).replace('1', { method: 'replace', testReplaceValuesString: 'test' }, { testReplaceOptionsString: 'test' })).to.eventually.deep.equal(
                { meta: { testReplaceMetaString: 'testReplaceMetaValue' }, data: [{ id: '1', method: 'replace', testOptionsString: 'test', testValuesString: 'test' }] });
        });
        it(`should call properly the patch method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).patch({ id: '1', testPatchQueryString: 'test' }, { method: 'patch', testPatchValuesString: 'test' }, { testPatchOptionsString: 'test' })).to.eventually.deep.equal(
                { meta: { testPatchMetaString: 'testPatchMetaValue' }, data: [{ id: '1', method: 'patch', testValuesString: 'test', testQueryString: 'test', testOptionsString: 'test' }] });
        });
        it(`should call properly the delete method`, function () {
            return expect(testPipeline().pipe(new TestPipe()).delete({ id: '1', testDeleteQueryString: 'test' }, { testDeleteOptionsString: 'test' })).to.eventually.deep.equal(
                { meta: { testDeleteMetaString: 'testDeleteMetaValue' }, data: [{ id: '1', method: 'delete', testOptionsString: 'test', testQueryString: 'test' }] });
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

    describe('Relations', function () {
        it('should add relations', function () {
            let p2 = testPipeline()
            let p1 = testPipeline().addRelation("test", () => p2, {})
            expect(p1.relations).to.exist
            expect(p1.relations.test).to.be.an.instanceof(PipelineRelation)
            expect(Object.keys(p1.relations).length).to.eql(1)
        });

        it('should inherit relations', function () {
            let p2 = testPipeline()
            let p1 = testPipeline().addRelation("test", () => p2, {}).pipe(new TestPipe);
            expect(p1.relations).to.exist
            expect(p1.relations.test).to.be.an.instanceof(PipelineRelation)
        });

        it('should support templated relations', function () {
            let p2 = testPipeline();
            let p1 = testPipeline().addRelation("p2", () => p2, { "id": ":id" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.eventually.deep.equal({ data: [{ id: '1', method: 'read' }], meta: {} });
        });

        it('should associate properly the remote pipeline properties and allow arrays', function () {
            let p2 = new TestPipeline(SchemaBuilder.emptySchema()
                .addString("id", { description: "id" })
                .addArray("test", SchemaBuilder.emptySchema().addString('hop')))
            let p1 = testPipeline().addRelation("p2", () => p2, { test: ["hop"] });
            expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.eventually.deep.equal({ data: [{ id: '1', method: 'read' }], meta: {} });
        });

        it('should determine the nature (one/many) of a relation', function () {
            // Relation referencing the remote object "id": one relation
            let p2 = testPipeline();
            let p1 = testPipeline().addRelation("p2", () => p2, { "id": ":id" });
            expect(p1.relations.p2.type).to.equal("one");

            // Relation referencing the remote object "id", with a non templated value: one relation
            let p5 = testPipeline().addRelation("p2", () => p2, { "id": "1" });
            expect(p5.relations.p2.type).to.equal("one");

            // Relation referencing another field: many relation
            let p3 = testPipeline().addRelation("p2", () => p2, { "method": ":method" });
            expect(p3.relations.p2.type).to.equal("many");

            // Relation referencing the remote object "id", but from an array: many relation
            let p4 = new TestPipeline(SchemaBuilder.emptySchema()
                .addString("id", { description: "id" })
                .addArray("test", SchemaBuilder.emptySchema().addString('hop')))
                .addRelation("test", () => p2, { "id": ":test" });
            expect(p4.relations.test.type).to.equal("many");

            // Relation referencing the remote object "id", with an array value: many relation
            let p6 = testPipeline().addRelation("p2", () => p2, { "id": [":id"] });
            return expect(p6.relations.p2.type).to.equal("many");
        });

        it('should fail for templated relations referring to a non existing property', function () {
            let p2 = testPipeline();
            let p1 = testPipeline().addRelation("p2", () => p2, { "id": ":blabliblou" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.be.rejected;
        });

        it('should support templated relations with a piped pipeline', function () {
            let p2 = testPipeline()
                .pipe(new TestPipe);
            let p1 = testPipeline().addRelation("p2", () => p2, { testReadQueryString: ":method" }, { testReadOptionsString: "test" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.eventually.deep.equal({ data: [{ id: '1', method: 'read', testQueryString: "read", testOptionsString: "test" }], meta: { testReadMetaString: "testReadMetaValue" } });
        });

        it('should support escaping query parameters when it begins with ":"', function () {
            let p2 = testPipeline()
                .pipe(new TestPipe);
            let p1 = testPipeline().addRelation("p2", () => p2, { id: "1", testReadQueryString: "\\:method" }, { testReadOptionsString: "test" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.fetch({ id: "1", method: "read" })).to.eventually.deep.equal({ data: [{ id: '1', method: 'read', testQueryString: ":method", testOptionsString: "test" }], meta: { testReadMetaString: "testReadMetaValue" } });
        });

        it('should support adding query and option parameters when fetching a relation', function () {
            let p2 = testPipeline()
                .pipe(new TestPipe);
            let p1 = testPipeline().addRelation("p2", () => p2, { id: "1" }, { testReadOptionsString: "testOption" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.fetch({ id: "1", method: "read" }, { testReadQueryString: "testQuery" }, { testReadOptionsString: "testOption2" }))
                .to.eventually.deep.equal({ data: [{ id: '1', method: 'read', testQueryString: "testQuery", testOptionsString: "testOption2" }], meta: { testReadMetaString: "testReadMetaValue" } });
        });

        it('should return separately the templated and non-templated parts of a relation query', function () {
            let query = { id: "1", method: ":method", someVar: "a", someOtherVar: ":b" };
            expect(QueryTemplate.getTemplatedParts(query)).to.deep.equal({ method: ":method", someOtherVar: ":b" });
            expect(QueryTemplate.getNonTemplatedParts(query)).to.deep.equal({ id: "1", someVar: "a" });
        });

        it('should assign the relation result to a resource', function () {
            let p2 = testPipeline()
                .pipe(new TestPipe);
            let p1 = testPipeline().addRelation("p2", () => p2, { id: "1" }, { testReadOptionsString: "testOption" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.assignToResource({ id: "1", method: "read" }, { testReadQueryString: "testQuery" }, { testReadOptionsString: "testOption2" }))
                .to.eventually.deep.equal(
                    {
                        id: "1", method: "read", p2: {
                            id: '1', method: 'read', testQueryString: "testQuery", testOptionsString: "testOption2"
                        }
                    });
        });

        it('should assign the relation with a one relation results to resources', function () {
            let p2 = testPipeline()
                .pipe(new TestPipe);
            let p1 = testPipeline().addRelation("p2", () => p2, { id: "1" }, { testReadOptionsString: "testOption" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.assignToResources([{ id: "1", method: "read" }, { id: "2", method: "read" }], { testReadQueryString: "testQuery" }, { testReadOptionsString: "testOption2" }))
                .to.eventually.deep.equal([
                    {
                        id: "1", method: "read", p2: {
                            id: '1', method: 'read', testQueryString: "testQuery", testOptionsString: "testOption2"
                        }
                    }, {
                        id: "2", method: "read", p2: {
                            id: '1', method: 'read', testQueryString: "testQuery", testOptionsString: "testOption2"
                        }
                    }
                ]);
        });

        it('should assign the relation with a many relation results to resources', function () {
            let p2 = testPipeline()
                .pipe(new TestPipe);
            let p1 = testPipeline().addRelation("p2", () => p2, { method: ":method" });
            expect(p1.relations.p2).to.be.an.instanceof(PipelineRelation);
            return expect(p1.relations.p2.assignToResources([{ id: "1", method: "read" }, { id: "2", method: "read" }], { testReadQueryString: "testQuery" }, { testReadOptionsString: "testOption2" }))
                .to.eventually.deep.equal([
                    {
                        id: "1", method: "read", p2: [{
                            id: '1', method: 'read', testQueryString: "testQuery", testOptionsString: "testOption2"
                        }]
                    }, {
                        id: "2", method: "read", p2: [{
                            id: '1', method: 'read', testQueryString: "testQuery", testOptionsString: "testOption2"
                        }]
                    }
                ]);
        });
    });
});
