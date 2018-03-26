import { PipeAbstract } from '../serafin/pipeline'
import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeInterface } from '../serafin/pipeline/PipeInterface';

// @description("Adds creation and update timestamps to the resources")
export class UpdateTime<RW> extends PipeAbstract implements PipeInterface {
    schemaBuilderReadMeta = (s: SchemaBuilder<RW>) => s
        .addNumber("lastCreatedAt", { description: "Most recent creation date" })
        .addNumber("lastUpdatedAt", { description: "Most recent update date" })

    public async read(next, query?: {}, options?: {}): Promise<{ meta: { lastCreatedAt: number, lastUpdatedAt: number }, data: { createdAt: number, updatedAt: number }[] }> {
        let result = (await next(query, options)) as { meta: { lastCreatedAt: number, lastUpdatedAt: number }, data: { createdAt: number, updatedAt: number }[] }
        let lastCreatedAt = null;
        let lastUpdatedAt = null;
        result.data.forEach(res => {
            if (res.createdAt && (!lastCreatedAt || lastCreatedAt < res.createdAt)) {
                lastCreatedAt = res.createdAt;
            }
            if (res.updatedAt && (!lastUpdatedAt || lastUpdatedAt < res.updatedAt)) {
                lastCreatedAt = res.updatedAt;
            }
        });

        if (lastCreatedAt !== null) {
            result.meta.lastCreatedAt = lastCreatedAt;
        }

        if (lastUpdatedAt !== null) {
            result.meta.lastUpdatedAt = lastUpdatedAt;
        }

        return result;
    }

    public async create(next, resources: { createdAt: number }[], options?: {}) {
        resources.forEach(resource => {
            resource.createdAt = Date.now();
        });

        return next(resources, options);
    }

    public async replace(next, id: string, values: { updatedAt: number }, options?: {}) {
        values.updatedAt = Date.now();
        return next(id, values, options);
    }

    public async patch(next, query: {}, values: { updatedAt: number }, options?: {}) {
        values.updatedAt = Date.now();
        return next(query, values, options);
    }
}