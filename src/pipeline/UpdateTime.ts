import { PipelineAbstract, option, description, validate } from '../serafin/pipeline/Abstract'
import { ReadWrapperInterface } from '../serafin/pipeline/model/Resource'


@description("Adds creation and update timestamps to the resources")
export class UpdateTime extends PipelineAbstract<{ createdAt: number, updatedAt: number }> {

    constructor() {
        super()
    }

    @description("Returns the creation and update time of each resource, and the latest creation and update time overall")
    async read(query?: {}, options?: {}): Promise<{ lastCreatedAt: number, lastUpdatedAt: number, results: { createdAt: number, updatedAt: number }[] }> {
        return this.parent.read(query).then((items) => {
            let lastCreatedAt = null;
            let lastUpdatedAt = null;
            for (const key in items.results) {
                if (typeof items.results[key] == 'object') {
                    if (Number(items.results[key]['createdAt']) && (!lastCreatedAt || lastCreatedAt < items.results[key]['createdAt'])) {
                        lastCreatedAt = items.results[key]['createdAt'];
                    }

                    if (Number(items.results[key]['updatedAt']) && (!lastUpdatedAt || lastUpdatedAt < items.results[key]['updatedAt'])) {
                        lastCreatedAt = items.results[key]['updatedAt'];
                    }
                }
            }

            if (lastCreatedAt) {
                items['createdAt'] = lastCreatedAt.toString();
            }

            if (lastUpdatedAt) {
                items['updatedAt'] = lastUpdatedAt.toString();
            }

            return Promise.resolve(items);
        });
    }

    @description("Sets the creation time")
    async create(resources: {}[], options?: {}) {
        resources.forEach(resource => {
            resource['createdAt'] = Date.now();
        });

        return this.parent.create(resources);
    }

    @description("Sets the update time")
    async update(id: string, values: {}, options?: {}) {
        values['updatedAt'] = Date.now();
        return this.parent.update(id, values);
    }

    @description("Sets the update time")
    async patch(query: {}, values: {}, options?: {}) {
        values['updatedAt'] = Date.now();
        return this.parent.patch(query, values, options);
    }
}