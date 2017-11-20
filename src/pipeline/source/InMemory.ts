import { PipelineSourceAbstract, description, validate } from '../../serafin/pipeline';
import { ReadWrapperInterface, ResourceIdentityInterface } from '../../serafin/pipeline/schema/ResourceInterfaces';
import { jsonMergePatch } from '../../serafin/util/jsonMergePatch';
import { PipelineSchemaModel } from '../../serafin/pipeline/schema/Model'
import * as _ from 'lodash'
import * as uuid from "node-uuid"

@description("Loads and stores resources as objects into memory. Any data is lost upon source uninstanciation. Ideal for unit tests.")
export class PipelineSourceInMemory<
    T extends ResourceIdentityInterface,
    ReadQuery extends Partial<ResourceIdentityInterface> = Partial<T>,
    ReadOptions = {},
    ReadWrapper extends ReadWrapperInterface<T> = ReadWrapperInterface<T>,
    CreateResources = Partial<T>,
    CreateOptions = {},
    UpdateValues = Partial<T>,
    UpdateOptions = {},
    PatchQuery extends Partial<ResourceIdentityInterface> = Partial<T>,
    PatchValues = Partial<T>,
    PatchOptions = {},
    DeleteQuery extends Partial<ResourceIdentityInterface> = Partial<T>,
    DeleteOptions = {}> extends PipelineSourceAbstract<T, ReadQuery, ReadOptions, ReadWrapper, CreateResources, CreateOptions, UpdateValues, UpdateOptions, PatchQuery, PatchValues, PatchOptions, DeleteQuery, DeleteOptions> {
    protected resources: { [index: string]: T };

    constructor(schema: PipelineSchemaModel<T, ReadQuery, CreateResources, UpdateValues, PatchQuery, PatchValues, DeleteQuery>) {
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

    private async _read(query: any): Promise<ReadWrapper> {
        if (!query) {
            query = {};
        }

        let resources = _.filter(this.resources, resource => {
            for (var property in query) {
                if (query[property] != resource[property as string]) {
                    return false;
                }
            }

            return true;
        });

        return { results: resources } as ReadWrapper;
    }

    @validate
    async create(resources: CreateResources[], options?: CreateOptions) {
        let createdResources: T[] = [];
        resources.forEach(resource => {
            let identifiedResource = this.toIdentifiedResource(resource);
            if (!this.resources[resource["id"]]) {
                this.resources[resource["id"]] = <any>identifiedResource;
                createdResources.push(<any>identifiedResource);
            } else {
                // Todo: put the conflict test at beginning (for atomicity)
                throw new Error('Conflict');
            }
        });

        return createdResources;
    }

    @validate
    async read(query?: ReadQuery, options?: ReadOptions): Promise<ReadWrapper> {
        return this._read(query)
    }


    @validate
    async update(id: string, values: Partial<T>, options?: UpdateOptions): Promise<T> {
        var resources = await this._read({
            id: id
        });
        if (resources.results.length > 0) {
            var resource = resources.results[0]
            if (resource.id && resource.id !== id) {
                delete (this.resources[resource.id]);
            }
            // in case it wasn't assigned yet
            values.id = values.id || id;
            this.resources[id] = values as any;
            return values as any;
        }
        return undefined;
    }

    @validate
    async patch(query: PatchQuery, values: PatchValues, options?: PatchOptions) {
        var resources = await this._read(query);
        let updatedResources: T[] = [];

        resources.results.forEach(resource => {
            let id = resource.id;
            resource = jsonMergePatch(resource, values)
            if (resource.id !== id) {
                delete (this.resources[resource.id]);
            }
            this.resources[id] = resource;
            updatedResources.push(resource);
        });

        return updatedResources;
    }

    @validate
    async delete(query?: DeleteQuery, options?: DeleteOptions) {
        var resources = await this._read(query);
        let deletedResources: T[] = [];

        resources.results.forEach((resource) => {
            delete this.resources[resource.id];
            deletedResources.push(resource);
        });

        return deletedResources;
    }
}