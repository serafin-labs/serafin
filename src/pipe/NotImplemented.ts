import { PipeAbstract, option, description, result } from '../serafin/pipeline'
import { notImplementedError } from "../serafin/error/Error"
import * as _ from 'lodash'
import { SchemaBuilder } from '@serafin/schema-builder';

@description("Force given actions to be unavailable")
export class NotImplemented extends PipeAbstract<{}> {
    constructor(private notImplementedMethods: ("create" | "update" | "patch" | "delete" | "read")[]) {
        super()
    }

    public get readQuerySchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("read") !== -1 ? null : this.pipeline.readQuerySchemaBuilder }
    public get createValuesSchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("create") !== -1 ? null : this.pipeline.createValuesSchemaBuilder }
    public get updateValuesSchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("update") !== -1 ? null : this.pipeline.updateValuesSchemaBuilder }
    public get patchQuerySchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("patch") !== -1 ? null : this.pipeline.patchQuerySchemaBuilder }
    public get patchValuesSchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("patch") !== -1 ? null : this.pipeline.patchValuesSchemaBuilder }
    public get deleteQuerySchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("delete") !== -1 ? null : this.pipeline.deleteQuerySchemaBuilder }

    public async create(next, resources, options?) {
        if (this.notImplementedMethods.indexOf("create") !== -1) {
            throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
        }
        return next(resources, options)
    }

    public async read(next, query?, options?) {
        if (this.notImplementedMethods.indexOf("read") !== -1) {
            throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
        }
        return next(query, options)
    }

    public async update(next, id, values, options?) {
        if (this.notImplementedMethods.indexOf("update") !== -1) {
            throw notImplementedError("update", Object.getPrototypeOf(this).constructor.name);
        }
        return next(id, values, options)
    }

    public async patch(next, query, values, options?) {
        if (this.notImplementedMethods.indexOf("patch") !== -1) {
            throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
        }
        return next(query, values, options)
    }

    public async delete(next, query, options?) {
        if (this.notImplementedMethods.indexOf("delete") !== -1) {
            throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
        }
        return next(query, options)
    }
}