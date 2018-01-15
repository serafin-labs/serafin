import * as VError from 'verror';
import { conflictError } from "../../serafin/error/Error"
import { PipelineAbstract, Query, description, IdentityInterface } from '../../serafin/pipeline';

import { jsonMergePatch } from '../../serafin/util/jsonMergePatch';
import * as _ from 'lodash'
import * as uuid from "node-uuid"
import { Omit, DeepPartial } from '@serafin/schema-builder';

@description("Loads and stores resources as objects into memory. Any data stored here will be lost when node process exits. Ideal for unit tests and prototyping.")
export class PipeSourceInMemory<
    T extends IdentityInterface,
    ReadQuery = Partial<Query<T>>,
    CreateValues = Omit<T, "id">,
    UpdateValues = Omit<T, "id">,
    PatchQuery = Query<Pick<T, "id">>,
    PatchValues = DeepPartial<Omit<T, "id">>,
    DeleteQuery = Query<Pick<T, "id">>> extends PipelineAbstract<T, ReadQuery, {}, {}, CreateValues, {}, {}, UpdateValues, {}, {}, PatchQuery, PatchValues, {}, {}, DeleteQuery, {}, {}> {
    protected resources: { [index: string]: T } = {} as { [index: string]: T };

    private generateUUID(): string {
        var uid: string = uuid.v4();
        return uid.split("-").join("");
    }

    private toIdentifiedResource(resource: Partial<T>): Partial<T> {
        resource.id = resource['id'] || this.generateUUID();
        return resource;
    }

    private async readInMemory(query: any): Promise<{ data: T[] }> {
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

        return { data: _.cloneDeep(resources) } as any;
    }

    async create(next, resources: CreateValues[], options?: {}) {
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

        return { data: createdResources };
    }

    async read(next, query?: ReadQuery, options?: {}): Promise<{ data: T[] }> {
        return this.readInMemory(query)
    }

    async update(next, id: string, values: UpdateValues, options?: {}) {
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
            return { data: values as any };
        }
        return { data: undefined };
    }

    async patch(next, query: PatchQuery, values: PatchValues, options?: {}) {
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

        return { data: updatedResources };
    }

    async delete(next, query?: DeleteQuery, options?: {}) {
        var resources = await this.readInMemory(query);
        let deletedResources: T[] = [];

        resources.data.forEach((resource) => {
            delete this.resources[resource.id];
            deletedResources.push(resource);
        });

        return { data: deletedResources };
    }
}