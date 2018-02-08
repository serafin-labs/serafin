import { PipelineAbstract, PipeAbstract, PipelineRelation } from ".."
import { SchemaBuilder } from "@serafin/schema-builder";
import { PipeInterface } from "../PipeInterface";

export class TestPipe<M, RQ, RO, RW, CV, CO, CW, UV, UO, UW, PQ, PV, PO, PW, DQ, DO, DW> extends PipeAbstract implements PipeInterface {
    schemaBuilderModel = (s: SchemaBuilder<M>) => s.addOptionalString('testModelString', { description: "testModelString description" });

    schemaBuilderReadQuery = (s: SchemaBuilder<RQ>) => s.addString('testReadQueryString', { description: "testReadQueryString query description" });
    schemaBuilderReadOptions = (s: SchemaBuilder<RO>) => s.addString('testReadOptionString', { description: "testReadOptionString options description" });
    schemaBuilderReadWrapper = (s: SchemaBuilder<RW>) => s.addString('testReadWrapperString', { description: "testReadWrapperString wrapper description" });

    schemaBuilderCreateValues = (s: SchemaBuilder<CV>) => s.addString('testCreateValuesString', { description: "testCreateValuesString values description" });
    schemaBuilderCreateOptions = (s: SchemaBuilder<CO>) => s.addString('testCreateOptionsString', { description: "testCreateOptionsString options description" });
    schemaBuilderCreateWrapper = (s: SchemaBuilder<CW>) => s.addString('testCreateWrapperString', { description: "testCreateWrapperString wrapper description" });

    schemaBuilderUpdateValues = (s: SchemaBuilder<UV>) => s.addString('tesUpdateValuesString', { description: "tesUpdateValuesString values description" });
    schemaBuilderUpdateOptions = (s: SchemaBuilder<UO>) => s.addString('testUpdateOptionsString', { description: "testUpdateOptionsString options description" });
    schemaBuilderUpdateWrapper = (s: SchemaBuilder<UW>) => s.addString('testUpdateWrapperString', { description: "testUpdateWrapperString wrapper description" });

    schemaBuilderPatchQuery = (s: SchemaBuilder<PQ>) => s.addString('testPatchQueryString', { description: "testPatchQueryString query description" });
    schemaBuilderPatchValues = (s: SchemaBuilder<PV>) => s.addString('testPatchValuesString', { description: "testPatchValuesString description" });
    schemaBuilderPatchOptions = (s: SchemaBuilder<PO>) => s.addString('testPatchOptionsString', { description: "testPatchOptionsString options  description" });
    schemaBuilderPatchWrapper = (s: SchemaBuilder<PW>) => s.addString('testPatchWrapperString', { description: "testPatchWrapperString wrapper description" });

    schemaBuilderDeleteQuery = (s: SchemaBuilder<DQ>) => s.addString('testDeleteQueryString', { description: "testDeleteQueryString query description" });
    schemaBuilderDeleteOptions = (s: SchemaBuilder<DO>) => s.addString('testDeleteOptionsString', { description: "testDeleteOptionsString options description" });
    schemaBuilderDeleteWrapper = (s: SchemaBuilder<DW>) => s.addString('testDeleteWrapperString', { description: "testDeleteWrapperString wrapper description" });

    public async create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any> {
        let results = await (next(resources, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testCreateOptionsString;
        }
        results.testCreateWrapperString = 'testCreateWrapperValue';
    }

    public async read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any> {
        let results = await (next(query, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testReadOptionString;
        }
        results.testReadWrapperString = 'testReadWrapperValue';
    }

    public async update(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any> {
        let results = await (next(id, values, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testUpdateOptionString;
        }
        results.testUpdateWrapperString = 'testUpdateWrapperValue';
    }

    public async patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any> {
        let results = await (next(query, values, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testPatchOptionString;
        }
        results.testUpdateWrapperString = 'testPatchWrapperValue';
    }

    public async delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any> {
        let results = await (next(query, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testDeleteOptionString;
        }
        results.testDeleteWrapperString = 'testDeleteWrapperValue';
    }
}

export const schemaTestPipe = {
};
