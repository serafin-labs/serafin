import { PipelineAbstract, option, description, result } from '../serafin/pipeline'

@description("Adds creation and update timestamps to the resources")
export class UpdateTime extends PipelineAbstract<{ createdAt: number, updatedAt: number }, {}, {}, { lastCreatedAt: number, lastUpdatedAt: number}> {

    constructor() {
        super()
    }

    @description("Returns the creation and update time of each resource, and the latest creation and update time overall")
    @result("lastCreatedAt", { type: "integer" }, true, "Last creation date")
    @result("lastUpdatedAt", { type: "integer" }, true, "Last modification date")
    protected async _read(query?: {}, options?: {}): Promise<{ lastCreatedAt: number, lastUpdatedAt: number, results: { createdAt: number, updatedAt: number }[] }> {
        let readWrapper = (await this.parent.read(query, options)) as { lastCreatedAt: number, lastUpdatedAt: number, results: { createdAt: number, updatedAt: number }[] }
        let lastCreatedAt = null;
        let lastUpdatedAt = null;
        readWrapper.results.forEach(result => {
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
    protected async _create(resources: { createdAt: number }[], options?: {}) {
        resources.forEach(resource => {
            resource.createdAt = Date.now();
        });

        return this.parent.create(resources, options);
    }

    @description("Sets the update time")
    protected async _update(id: string, values: { updatedAt: number }, options?: {}) {
        values.updatedAt = Date.now();
        return this.parent.update(id, values, options);
    }

    @description("Sets the update time")
    protected async _patch(query: {}, values: { updatedAt: number }, options?: {}) {
        values.updatedAt = Date.now();
        return this.parent.patch(query, values, options);
    }
}