import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeAbstract, PipeInterface, IdentityInterface, ResultsInterface } from "@serafin/pipeline"

// @description("Adds creation and update timestamps to the resources")
export class UpdateTime<M extends IdentityInterface, RQ, RM> extends PipeAbstract implements PipeInterface {

    schemaBuilderModel = (s: SchemaBuilder<M>) => s
        .addNumber("createdAt", { description: "Creation date" })
        .addNumber("updatedAt", { description: "Last Modification date" });

    schemaBuilderReadQuery = (s: SchemaBuilder<RQ>) => s
        .addNumber("createdAt", { description: "Creation date" }, false)
        .addNumber("updatedAt", { description: "Last Modification date" }, false)
        .transformPropertiesToArray(["createdAt", "updatedAt"]);

    schemaBuilderReadMeta = (s: SchemaBuilder<RM>) => s
        .addNumber("lastCreatedAt", { description: "Most recent creation date" })
        .addNumber("lastUpdatedAt", { description: "Most recent update date" });

    public async read(next, query?: {}, options?: {}): Promise<ResultsInterface<{ createdAt: number, updatedAt: number }, { lastCreatedAt: number, lastUpdatedAt: number }>> {
        let results = (await next(query, options)) as ResultsInterface<{ createdAt: number, updatedAt: number }, { lastCreatedAt: number, lastUpdatedAt: number }>;
        let lastCreatedAt = null;
        let lastUpdatedAt = null;
        results.data.forEach(res => {
            if (res.createdAt && (!lastCreatedAt || lastCreatedAt < res.createdAt)) {
                lastCreatedAt = res.createdAt;
            }
            if (res.updatedAt && (!lastUpdatedAt || lastUpdatedAt < res.updatedAt)) {
                lastCreatedAt = res.updatedAt;
            }
        });

        if (lastCreatedAt !== null) {
            results.meta.lastCreatedAt = lastCreatedAt;
        }

        if (lastUpdatedAt !== null) {
            results.meta.lastUpdatedAt = lastUpdatedAt;
        }

        return results;
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
