import { PipeAbstract, option, description, result } from '../serafin/pipeline'

@description("Adds creation and update timestamps to the resources")
export class UpdateTime extends PipeAbstract<{ createdAt: number, updatedAt: number }, {}, {}, { lastCreatedAt: number, lastUpdatedAt: number }> {
    constructor() {
        super()
    }

    @description("Returns the creation and update time of each resource, and the latest creation and update time overall")
    @result("lastCreatedAt", { type: "integer", description: "Last creation date" }, true)
    @result("lastUpdatedAt", { type: "integer", description: "Last modification date" }, true)
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

    @description("Sets the creation time")
    public async create(next, resources: { createdAt: number }[], options?: {}) {
        resources.forEach(resource => {
            resource.createdAt = Date.now();
        });

        return next(resources, options);
    }

    @description("Sets the update time")
    public async update(next, id: string, values: { updatedAt: number }, options?: {}) {
        values.updatedAt = Date.now();
        return next(id, values, options);
    }

    @description("Sets the update time")
    public async patch(next, query: {}, values: { updatedAt: number }, options?: {}) {
        values.updatedAt = Date.now();
        return next(query, values, options);
    }
}