import { PipelineAbstract, PipeAbstract, PipelineRelation, description } from ".."
import { SchemaBuilder } from "@serafin/schema-builder";

export class TestPipe extends PipeAbstract {
    modelSchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString description" });

    // readQuerySchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString query description" });
    // readOptionsSchemaBuilder = SchemaBuilder.emptySchema().addString('testReadOptionString', { description: "testReadOptionString options description" });
    // readWrapperSchemaBuilder = SchemaBuilder.emptySchema().addString('testReadWrapperString', { description: "testReadWrapperString wrapper description" });

    // createValuesSchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString values description" });
    // createOptionsSchemaBuilder = SchemaBuilder.emptySchema().addString('testCreateOptionsString', { description: "testCreateOptionsString options description" });
    // createWrapperSchemaBuilder = SchemaBuilder.emptySchema().addString('testCreateWrapperString', { description: "testCreateWrapperString wrapper description" });

    // updateValuesSchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString values description" });
    // updateOptionsSchemaBuilder = SchemaBuilder.emptySchema().addString('testUpdateOptionsString', { description: "testUpdateOptionsString options description" });
    // updateWrapperSchemaBuilder = SchemaBuilder.emptySchema().addString('testUpdateWrapperString', { description: "testUpdateWrapperString wrapper description" });

    // patchQuerySchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString query description" });
    // patchValuesSchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString description" });
    // patchOptionsSchemaBuilder = SchemaBuilder.emptySchema().addString('testPatchOptionsString', { description: "testPatchOptionsString options  description" });
    // patchWrapperSchemaBuilder = SchemaBuilder.emptySchema().addString('testPatchWrapperString', { description: "testPatchWrapperString wrapper description" });

    // deleteQuerySchemaBuilder = SchemaBuilder.emptySchema().addString('testModelString', { description: "testModelString query description" });
    // deleteOptionsSchemaBuilder = SchemaBuilder.emptySchema().addString('testDeleteOptionsString', { description: "testDeleteOptionsString options description" });
    // deleteWrapperSchemaBuilder = SchemaBuilder.emptySchema().addString('testDeleteWrapperString', { description: "testDeleteWrapperString wrapper description" });

    @description("create test description")
    public async create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any> {
        let results = await (next(resources, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testCreateOptionsString;
        }
        results.testCreateWrapperString = 'testCreateWrapperValue';
    }

    @description("read test description")
    public async read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any> {
        let results = await (next(query, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testReadOptionString;
        }
        results.testReadWrapperString = 'testReadWrapperValue';
    }

    @description("update test description")
    public async update(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any> {
        let results = await (next(id, values, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testUpdateOptionString;
        }
        results.testUpdateWrapperString = 'testUpdateWrapperValue';
    }

    @description("patch test description")
    public async patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any> {
        let results = await (next(query, values, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testPatchOptionString;
        }
        results.testUpdateWrapperString = 'testPatchWrapperValue';
    }

    @description("delete test description")
    public async delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any> {
        let results = await (next(query, options));
        if (results.data[0]) {
            results.data[0].testModelString = options.testDeleteOptionString;
        }
        results.testDeleteWrapperString = 'testDeleteWrapperValue';
    }
}

export const schemaTestPipe = {
    modelSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                { testModelString: { description: 'testModelString description', type: 'string' } },
            required: ['testModelString']
        },
    readQuerySchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testModelString:
                        {
                            description: 'testModelString query description',
                            type: 'string'
                        }
                },
            required: ['testModelString']
        },
    readOptionsSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testReadOptionString:
                        {
                            description: 'testReadOptionString options description',
                            type: 'string'
                        }
                },
            required: ['testReadOptionString']
        },
    readWrapperSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testReadWrapperString:
                        {
                            description: 'testReadWrapperString wrapper description',
                            type: 'string'
                        }
                },
            required: ['testReadWrapperString']
        },
    createValuesSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testModelString:
                        {
                            description: 'testModelString values description',
                            type: 'string'
                        }
                },
            required: ['testModelString']
        },
    createOptionsSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testCreateOptionsString:
                        {
                            description: 'testCreateOptionsString options description',
                            type: 'string'
                        }
                },
            required: ['testCreateOptionsString']
        },
    createWrapperSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testCreateWrapperString:
                        {
                            description: 'testCreateWrapperString wrapper description',
                            type: 'string'
                        }
                },
            required: ['testCreateWrapperString']
        },
    updateValuesSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testModelString:
                        {
                            description: 'testModelString values description',
                            type: 'string'
                        }
                },
            required: ['testModelString']
        },
    updateOptionsSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testUpdateOptionsString:
                        {
                            description: 'testUpdateOptionsString options description',
                            type: 'string'
                        }
                },
            required: ['testUpdateOptionsString']
        },
    updateWrapperSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testUpdateWrapperString:
                        {
                            description: 'testUpdateWrapperString wrapper description',
                            type: 'string'
                        }
                },
            required: ['testUpdateWrapperString']
        },
    patchQuerySchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testModelString:
                        {
                            description: 'testModelString query description',
                            type: 'string'
                        }
                },
            required: ['testModelString']
        },
    patchValuesSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                { testModelString: { description: 'testModelString description', type: 'string' } },
            required: ['testModelString']
        },
    patchOptionsSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testPatchOptionsString:
                        {
                            description: 'testPatchOptionsString options  description',
                            type: 'string'
                        }
                },
            required: ['testPatchOptionsString']
        },
    patchWrapperSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testPatchWrapperString:
                        {
                            description: 'testPatchWrapperString wrapper description',
                            type: 'string'
                        }
                },
            required: ['testPatchWrapperString']
        },
    deleteQuerySchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testModelString:
                        {
                            description: 'testModelString query description',
                            type: 'string'
                        }
                },
            required: ['testModelString']
        },
    deleteOptionsSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testDeleteOptionsString:
                        {
                            description: 'testDeleteOptionsString options description',
                            type: 'string'
                        }
                },
            required: ['testDeleteOptionsString']
        },
    deleteWrapperSchemaBuilder:
        {
            type: 'object',
            additionalProperties: false,
            properties:
                {
                    testDeleteWrapperString:
                        {
                            description: 'testDeleteWrapperString wrapper description',
                            type: 'string'
                        }
                },
            required: ['testDeleteWrapperString']
        }
};
