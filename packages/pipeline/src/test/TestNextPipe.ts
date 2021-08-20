import { PipeAbstract } from ".."
import { SchemaBuilder } from "@serafin/schema-builder"

export class TestNextPipe<M> extends PipeAbstract {
    schemaBuilderModel = (s: SchemaBuilder<M>) => s

    public async create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any> {
        let results = await next(resources, options)
        let secondResults = await next([{}], {testCreateOptionsString: "second"})
        return {...results, data: [...results.data, ...secondResults.data]}
    }

}
