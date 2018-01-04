import { PipelineAbstract, option, description, result } from '../serafin/pipeline'
import { notImplementedError } from "../serafin/error/Error"
import * as _ from 'lodash'
import { SchemaBuilder } from '@serafin/schema-builder';

@description("Force given actions to be unavailable")
export class NotImplemented extends PipelineAbstract<{}> {

    constructor(private notImplementedMethods: ("create" | "update" | "patch" | "delete" | "read")[]) {
        super()
    }

    public get readQuerySchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("read") !== -1 ? null : this.nearestSchemaBuilder("_readQuerySchemaBuilder") }
    public get createValuesSchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("create") !== -1 ? null : this.nearestSchemaBuilder("_createValuesSchemaBuilder") }
    public get updateValuesSchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("update") !== -1 ? null : this.nearestSchemaBuilder("_updateValuesSchemaBuilder") }
    public get patchQuerySchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("patch") !== -1 ? null : this.nearestSchemaBuilder("_patchQuerySchemaBuilder") }
    public get patchValuesSchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("patch") !== -1 ? null : this.nearestSchemaBuilder("_patchValuesSchemaBuilder") }
    public get deleteQuerySchemaBuilder(): SchemaBuilder<{}> { return this.notImplementedMethods.indexOf("delete") !== -1 ? null : this.nearestSchemaBuilder("_deleteQuerySchemaBuilder") }

    protected async _create(resources, options?) {
        if (this.notImplementedMethods.indexOf("create") !== -1) {
            throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
        }
        return this.parent.create(resources, options)
    }

    protected async _read(query?, options?) {
        if (this.notImplementedMethods.indexOf("read") !== -1) {
            throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
        }
        return this.parent.read(query, options)
    }

    protected async _update(id, values, options?) {
        if (this.notImplementedMethods.indexOf("update") !== -1) {
            throw notImplementedError("update", Object.getPrototypeOf(this).constructor.name);
        }
        return this.parent.update(id, values, options)
    }

    protected async _patch(query, values, options?) {
        if (this.notImplementedMethods.indexOf("patch") !== -1) {
            throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
        }
        return this.parent.patch(query, values, options)
    }

    protected async _delete(query, options?) {
        if (this.notImplementedMethods.indexOf("delete") !== -1) {
            throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
        }
        return this.parent.delete(query, options)
    }
}