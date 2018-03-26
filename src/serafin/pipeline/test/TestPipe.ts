import { PipelineAbstract, PipeAbstract, PipelineRelation } from ".."
import { SchemaBuilder } from "@serafin/schema-builder";
import { PipeInterface } from "../PipeInterface";

export class TestPipe<M, RQ, RO, RM, CV, CO, CM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM> extends PipeAbstract implements PipeInterface {
    schemaBuilderModel = (s: SchemaBuilder<M>) => s.addOptionalString('testModelString', { description: "testModelString description" });

    schemaBuilderReadQuery = (s: SchemaBuilder<RQ>) => s.addString('testReadQueryString', { description: "testReadQueryString query description" });
    schemaBuilderReadOptions = (s: SchemaBuilder<RO>) => s.addString('testReadOptionsString', { description: "testReadOptionString options description" });
    schemaBuilderReadMeta = (s: SchemaBuilder<RM>) => s.addString('testReadMetaString', { description: "testReadMetaString meta description" });

    schemaBuilderCreateValues = (s: SchemaBuilder<CV>) => s.addString('testCreateValuesString', { description: "testCreateValuesString values description" });
    schemaBuilderCreateOptions = (s: SchemaBuilder<CO>) => s.addString('testCreateOptionsString', { description: "testCreateOptionsString options description" });
    schemaBuilderCreateMeta = (s: SchemaBuilder<CM>) => s.addString('testCreateMetaString', { description: "testCreateMetaString meta description" });

    schemaBuilderReplaceValues = (s: SchemaBuilder<UV>) => s.addString('testReplaceValuesString', { description: "testReplaceValuesString values description" });
    schemaBuilderReplaceOptions = (s: SchemaBuilder<UO>) => s.addString('testReplaceOptionsString', { description: "testReplaceOptionsString options description" });
    schemaBuilderReplaceMeta = (s: SchemaBuilder<UM>) => s.addString('testReplaceMetaString', { description: "testReplaceMetaString meta description" });

    schemaBuilderPatchQuery = (s: SchemaBuilder<PQ>) => s.addString('testPatchQueryString', { description: "testPatchQueryString query description" });
    schemaBuilderPatchValues = (s: SchemaBuilder<PV>) => s.addString('testPatchValuesString', { description: "testPatchValuesString description" });
    schemaBuilderPatchOptions = (s: SchemaBuilder<PO>) => s.addString('testPatchOptionsString', { description: "testPatchOptionsString options  description" });
    schemaBuilderPatchMeta = (s: SchemaBuilder<PM>) => s.addString('testPatchMetaString', { description: "testPatchMetaString meta description" });

    schemaBuilderDeleteQuery = (s: SchemaBuilder<DQ>) => s.addString('testDeleteQueryString', { description: "testDeleteQueryString query description" });
    schemaBuilderDeleteOptions = (s: SchemaBuilder<DO>) => s.addString('testDeleteOptionsString', { description: "testDeleteOptionsString options description" });
    schemaBuilderDeleteMeta = (s: SchemaBuilder<DM>) => s.addString('testDeleteMetaString', { description: "testDeleteMetaString meta description" });

    public async create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any> {
        let results = await (next(resources, options));
        if (results.data[0]) {
            results.data[0].testString = options.testCreateOptionsString;
        }
        results.meta.testCreateMetaString = 'testCreateMetaValue';
        return results;
    }

    public async read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any> {
        let results = await (next(query, options));
        if (results.data[0]) {
            results.data[0].testQueryString = query.testReadQueryString;
            results.data[0].testOptionsString = options.testReadOptionsString;
        }
        results.meta.testReadMetaString = 'testReadMetaValue';
        return results;
    }

    public async replace(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any> {
        let results = await (next(id, values, options));
        if (results.data[0]) {
            results.data[0].testOptionsString = options.testReplaceOptionsString;
            results.data[0].testValuesString = values.testReplaceValuesString;
        }
        results.meta.testReplaceMetaString = 'testReplaceMetaValue';
        return results;
    }

    public async patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any> {
        let results = await (next(query, values, options));
        if (results.data[0]) {
            results.data[0].testValuesString = values.testPatchValuesString;
            results.data[0].testOptionsString = options.testPatchOptionsString;
            results.data[0].testQueryString = query.testPatchQueryString;
        }
        results.meta.testPatchMetaString = 'testPatchMetaValue';
        return results;
    }

    public async delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any> {
        let results = await (next(query, options));
        if (results.data[0]) {
            results.data[0].testQueryString = query.testDeleteQueryString;
            results.data[0].testOptionsString = options.testDeleteOptionsString;
        }
        results.meta.testDeleteMetaString = 'testDeleteMetaValue';
        return results;
    }
}

export const schemaTestPipe = {
};
