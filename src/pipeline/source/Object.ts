import * as Promise from 'bluebird'
import { PipelineSourceAbstract, description } from '../../serafin/pipeline/SourceAbstract'
import * as Model from '../../serafin/pipeline/model/Resource'
import * as _ from 'lodash'
import * as uuid from "node-uuid"

@description("Loads and stores resources as objects into memory. Any data is lost upon source uninstanciation. Ideal for unit tests.")
export class PipelineSourceObject<T> extends PipelineSourceAbstract<T> {
    protected resources: { [index: string]: Model.ResourceIdentified<T> };

    constructor(model: Model.Definition & { Resource: { new(): T } }) {
        super(model);
        this.resources = {} as { [index: string]: Model.ResourceIdentified<T> };
    }

    private generateUUID(): string {
        var uid: string = uuid.v4();
        // cut last 8 random hex digits to make this uid compatible with mongodb ones
        return uid.split("-").join("").substr(0, 24);
    }

    private toIdentifiedResource(resource: Model.Resource<T>): Model.ResourceIdentified<T> {
        resource.id = resource['id'] || this.generateUUID();
        return (resource as Model.ResourceIdentified<T>);
    }

    create(resources: Model.Resource<T>[]) {
        let createdResources: Model.ResourceIdentified<T>[] = [];
        resources.forEach(resource => {
            let identifiedResource = this.toIdentifiedResource(resource);
            if (!this.resources[resource.id]) {
                this.resources[resource.id] = identifiedResource;
                createdResources.push(identifiedResource);
            } else {
                // Todo: put the conflict test at beginning (for atomicity)
                return Promise.reject(new Error('Conflict'));
            }
        });

        return Promise.resolve(createdResources);
    }

    read(query?: Model.ResourcePartial<T>) {
        let resources = _.filter(this.resources, resource => {
            for (var property in query) {
                if (query[property] != resource[property]) {
                    return false;
                }
            }

            return true;
        });

        return Promise.resolve({ results: resources });
    }

    update(query: Model.ResourcePartial<T>, values: Model.ResourcePartial<T>) {
        return this.read(query).then((resources) => {
            let updatedResources: Model.ResourceIdentified<T>[] = [];

            resources.results.forEach(resource => {
                let id = resource.id;
                if (values.id && values.id != resource.id) {
                    delete (this.resources[resource.id]);
                    id = values.id;
                }

                for (const key in values) {
                    resource[key] = values[key];
                }
                this.resources[id] = resource;
                updatedResources.push(resource);
            });

            return Promise.resolve(updatedResources);
        });
    }

    delete(query?: Model.ResourcePartial<T>) {
        return this.read(query).then((resources) => {
            let deletedResources: Model.ResourceIdentified<T>[] = [];

            resources.results.forEach((resource) => {
                delete this.resources[resource.id];
                deletedResources.push(resource);
            });

            return Promise.resolve(deletedResources);
        });
    }
}