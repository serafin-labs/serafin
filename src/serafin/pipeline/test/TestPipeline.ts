import { PipelineAbstract, PipeAbstract, PipelineRelation, description } from ".."
import { SchemaBuilder } from "@serafin/schema-builder";
import { IdentityInterface } from "../IdentityInterface";

// @description("test pipeline description")
export class TestPipeline<T extends IdentityInterface> extends PipelineAbstract<T> {
    protected _create(resources: any[], options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'create' }] });
    }

    protected _read(query?: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'read' }] });
    }

    protected _update(id: string, values: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'update' }] });
    }

    protected _patch(query: any, values: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'patch' }] });
    }

    protected _delete(query: any, options?: any): Promise<any> {
        return Promise.resolve({ data: [{ id: '1', method: 'delete' }] });
    }
}

export const schemaTestPipeline = {

};
