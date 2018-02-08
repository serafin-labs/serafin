import * as _ from 'lodash'
import { PipeAbstract } from '../serafin/pipeline'
import { notImplementedError } from "../serafin/error/Error"
import { SchemaBuilder } from '@serafin/schema-builder';
import { PipeInterface } from '../serafin/pipeline/PipeInterface';

// @description("Force given actions to be unavailable")
export class NotImplemented extends PipeAbstract implements PipeInterface {
    constructor(private notImplementedMethods: ("create" | "update" | "patch" | "delete" | "read")[]) {
        super();
    }

    schemaBuilderReadQuery = (s) => this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readQuery
    schemaBuilderReadOptionsSchemaBuilder = (s) => this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readQuery
    schemaBuilderReadWrapperSchemaBuilder = (s) => this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readWrapper
    schemaBuilderCreateValuesSchemaBuilder = (s) => this.notImplementedMethods.indexOf("create") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createValues
    schemaBuilderCreateOptionsSchemaBuilder = (s) => this.notImplementedMethods.indexOf("create") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createOptions
    schemaBuilderCreateWrapperSchemaBuilder = (s) => this.notImplementedMethods.indexOf("create") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createWrapper
    schemaBuilderUpdateValuesSchemaBuilder = (s) => this.notImplementedMethods.indexOf("update") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.updateValues
    schemaBuilderPatchQuerySchemaBuilder = (s) => this.notImplementedMethods.indexOf("patch") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.patchQuery
    schemaBuilderPatchValuesSchemaBuilder = (s) => this.notImplementedMethods.indexOf("patch") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.patchValues
    schemaBuilderDdeleteQuerySchemaBuilder = (s) => this.notImplementedMethods.indexOf("delete") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.deleteQuery

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