import { PipeAbstract, option, description, result } from '../serafin/pipeline'
import { notImplementedError } from "../serafin/error/Error"
import * as _ from 'lodash'
import { SchemaBuilder } from '@serafin/schema-builder';

@description("Force given actions to be unavailable")
export class NotImplemented extends PipeAbstract<{}> {
    constructor(private notImplementedMethods: ("create" | "update" | "patch" | "delete" | "read")[]) {
        super();
    }

    // schemaBuilders = {
    //     readQuery: this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readQuery,
    //     readOptions: this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readQuery,
    //     readWrapper: this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readWrapper,
    //     createValues: this.notImplementedMethods.indexOf("create") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createValues,
    //     createOptions: this.notImplementedMethods.indexOf("create") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createOptions,
    //     createWrapper: this.notImplementedMethods.indexOf("create") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createWrapper,
    //     updateValues: this.notImplementedMethods.indexOf("update") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.updateValues,
    //     patchQuery: this.notImplementedMethods.indexOf("patch") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.patchQuery,
    //     patchValues: this.notImplementedMethods.indexOf("patch") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.patchValues,
    //     deleteQuery: this.notImplementedMethods.indexOf("delete") !== -1 ?  SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.deleteQuery
    // };

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