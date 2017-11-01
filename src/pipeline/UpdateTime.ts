import { PipelineAbstract, option, description } from '../serafin/pipeline/Abstract'
import * as Promise from "bluebird"

@description("Adds creation and update timestamps to the resources")
export class UpdateTime<T = { createdAt: number, updatedAt: number },
    ReadQuery = {},
    ReadOptions = {},
    ReadWrapper = { lastCreatedAt: number, lastUpdatedAt: number, results: { createdAt: number, updatedAt: number }[] }>
    extends PipelineAbstract<T, ReadQuery, ReadOptions, ReadWrapper> {

    @description("Returns the creation and update time of each resource, and the latest creation and update time overall")
    read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
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
    create(resources: any[], options?: {}) {
        resources.forEach(resource => {
            resource['createdAt'] = Date.now();
        });

        return this.parent.create(resources);
    }

    @description("Sets the update time")
    update(query: {}, values: {}, options?: {}) {
        values['updatedAt'] = Date.now();
        return this.parent.update(query, values);
    }
}