import { PipelineAbstract, option, description, validate } from '../serafin/pipeline/Abstract'
import { ReadWrapperInterface } from '../serafin/pipeline/model/Resource'
import * as Promise from "bluebird"


@description("Adds creation and update timestamps to the resources")
export class UpdateTime extends PipelineAbstract<{ createdAt: number, updatedAt: number }> {
    @validate
    @description("Returns the creation and update time of each resource, and the latest creation and update time overall")
    read(query?: {}, options?: {}): Promise<{ lastCreatedAt: number, lastUpdatedAt: number, results: { createdAt: number, updatedAt: number }[] }> {
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

    @validate
    @description("Sets the creation time")
    create(resources: {}[], options?: {}) {
        resources.forEach(resource => {
            resource['createdAt'] = Date.now();
        });

        return this.parent.create(resources);
    }

    @validate
    @description("Sets the update time")
    update(id: string, values: {}, options?: {}) {
        values['updatedAt'] = Date.now();
        return this.parent.update(id, values);
    }

    @validate
    @description("Sets the update time")
    patch(query: {}, values: {}, options?: {}) {
        values['updatedAt'] = Date.now();
        return this.parent.patch(query, values, options);
    }
}