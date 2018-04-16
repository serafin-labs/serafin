import * as VError from 'verror';
import { conflictError, serafinError, notFoundError } from "../../serafin/error/Error"
import { PipelineAbstract, IdentityInterface } from '../../serafin/pipeline';

import { jsonMergePatch } from '../../serafin/util/jsonMergePatch';
import * as _ from 'lodash'
import * as uuid from "node-uuid"
import { Omit, DeepPartial } from '@serafin/schema-builder';
import { ResultsInterface } from '../../serafin/pipeline/ResultsInterface';

// @description("Loads and stores resources as objects into memory. Any data stored here will be lost when node process exits. Ideal for unit tests and prototyping.")
export class PipeSourceInMemory<T extends IdentityInterface> extends PipelineAbstract<T> {
    protected resources: { [index: string]: T } = {} as { [index: string]: T };

    private generateUUID(): string {
        var uid: string = uuid.v4();
        return uid.split("-").join("");
    }

    private toIdentifiedResource(resource: Partial<T>): Partial<T> {
        resource.id = resource['id'] || this.generateUUID();
        return resource;
    }

    private async readInMemory(query: any): Promise<ResultsInterface<T>> {
        if (!query) {
            query = {};
        }

        let resources = _.filter(this.resources, resource => {
            for (var property in query) {
                if (Array.isArray(query[property])) {
                    if (Array.isArray(resource[property])) {
                        // query property: array, resource property: array

                        throw Error('Array to array queries are not handled');
                    } else if (query[property].indexOf(resource[property]) === -1) {
                        // query property: array, resource property: other
                        return false;
                    }
                } else if (Array.isArray(resource[property])) {
                    // query property: other, resource property: array
                    if (resource[property].indexOf(query[property]) === -1) {
                        return false;
                    }
                }
                else if (query[property] !== resource[property]) {
                    // query property: other, resource property: other
                    return false;
                }
            }

            return true;
        });

        return { data: (_.cloneDeep(resources)), meta: {} };
    }

    protected async _create(resources, options): Promise<ResultsInterface<T>> {
        let createdResources: T[] = [];
        resources.forEach(resource => {
            let identifiedResource = this.toIdentifiedResource(resource);
            if (!this.resources[resource["id"]]) {
                this.resources[resource["id"]] = <any>_.cloneDeep(identifiedResource);
                createdResources.push(<any>identifiedResource);
            } else {
                // Todo: put the conflict test at beginning (for atomicity)
                throw conflictError(resource["id"])
            }
        });

        return { data: createdResources, meta: {} };
    }

    protected _read(query, options): Promise<ResultsInterface<T>> {
        return this.readInMemory(query)
    }

    protected async _replace(id, values, options): Promise<ResultsInterface<T>> {
        var resources = await this.readInMemory({
            id: id
        });
        if (resources.data.length > 0) {
            var resource = resources.data[0]
            if (resource.id && resource.id !== id) {
                delete (this.resources[resource.id]);
            }
            // in case it wasn't assigned yet
            values["id"] = values["id"] || id;
            this.resources[id] = _.cloneDeep(values) as any;
            return { data: values, meta: {} };
        }

        throw notFoundError(id);
    }

    protected async _patch(query, values, options): Promise<ResultsInterface<T>> {
        var resources = await this.readInMemory(query);
        let updatedResources: T[] = [];

        resources.data.forEach(resource => {
            let id = resource.id;
            resource = jsonMergePatch(resource, values)
            if (resource.id !== id) {
                delete (this.resources[resource.id]);
            }
            this.resources[id] = _.cloneDeep(resource);
            updatedResources.push(resource);
        });

        return { data: updatedResources, meta: {} };
    }

    protected async _delete(query, options): Promise<ResultsInterface<T>> {
        var resources = await this.readInMemory(query);
        let deletedResources: T[] = [];

        resources.data.forEach((resource) => {
            delete this.resources[resource.id];
            deletedResources.push(resource);
        });

        return { data: deletedResources, meta: {} };
    }
}
