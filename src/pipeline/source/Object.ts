import * as Promise from 'bluebird'
import { PipelineSourceAbstract, description } from '../../serafin/pipeline/SourceAbstract'
import { ReadWrapperInterface, ResourceIdentityInterface } from '../../serafin/pipeline/model/Resource';
import { SchemaInterface } from '../../serafin/pipeline/model/SchemaInterface';
import * as _ from 'lodash'
import * as uuid from "node-uuid"

@description("Loads and stores resources as objects into memory. Any data is lost upon source uninstanciation. Ideal for unit tests.")
export class PipelineSourceObject<T extends ResourceIdentityInterface> extends PipelineSourceAbstract<T> {
    protected resources: { [index: string]: T };

    constructor(schema: SchemaInterface) {
        super(schema);
        this.resources = {} as { [index: string]: T };
    }

    private generateUUID(): string {
        var uid: string = uuid.v4();
        return uid.split("-").join("");
    }

    private toIdentifiedResource(resource: Partial<T>): Partial<T> {
        resource.id = resource['id'] || this.generateUUID();
        return resource;
    }

    create(resources: Partial<T>[]) {
        let createdResources: T[] = [];
        resources.forEach(resource => {
            let identifiedResource = this.toIdentifiedResource(resource);
            if (!this.resources[resource.id]) {
                this.resources[resource.id] = <any>identifiedResource;
                createdResources.push(<any>identifiedResource);
            } else {
                // Todo: put the conflict test at beginning (for atomicity)
                return Promise.reject(new Error('Conflict'));
            }
        });

        return Promise.resolve(createdResources);
    }

    read(query?: Partial<T>) {
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

    update(query: Partial<T>, values: Partial<T>) {
        return this.read(query).then((resources) => {
            let updatedResources: T[] = [];

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

    delete(query?: Partial<T>) {
        return this.read(query).then((resources) => {
            let deletedResources: T[] = [];

            resources.results.forEach((resource) => {
                delete this.resources[resource.id];
                deletedResources.push(resource);
            });

            return Promise.resolve(deletedResources);
        });
    }
}