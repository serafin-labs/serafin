import { PipeAbstract } from '../serafin/pipeline'
import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeInterface } from '../serafin/pipeline/PipeInterface';

// @description("Adds creation and update timestamps to the resources")
export class UpdateTime<RW> extends PipeAbstract implements PipeInterface {
    schemaBuilderReadWrapper = (s: SchemaBuilder<RW>) => s
        .addNumber("lastCreatedAt", { description: "Most recent creation date" })
        .addNumber("lastUpdatedAt", { description: "Most recent update date" })

    public async read(next, query?: {}, options?: {}): Promise<{ lastCreatedAt: number, lastUpdatedAt: number, data: { createdAt: number, updatedAt: number }[] }> {
        let readWrapper = (await next(query, options)) as { lastCreatedAt: number, lastUpdatedAt: number, data: { createdAt: number, updatedAt: number }[] }
        let lastCreatedAt = null;
        let lastUpdatedAt = null;
        readWrapper.data.forEach(result => {
            if (result.createdAt && (!lastCreatedAt || lastCreatedAt < result.createdAt)) {
                lastCreatedAt = result.createdAt;
            }
            if (result.updatedAt && (!lastUpdatedAt || lastUpdatedAt < result.updatedAt)) {
                lastCreatedAt = result.updatedAt;
            }
        });

        if (lastCreatedAt !== null) {
            readWrapper.lastCreatedAt = lastCreatedAt;
        }

        if (lastUpdatedAt !== null) {
            readWrapper.lastUpdatedAt = lastUpdatedAt;
        }

        return readWrapper
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