import * as _ from 'lodash'
import { PipeAbstract, PipeInterface, notImplementedError } from "@serafin/pipeline"
import { SchemaBuilder } from '@serafin/schema-builder';

// @description("Force given actions to be unavailable")
export class NotImplemented extends PipeAbstract implements PipeInterface {
    constructor(private notImplementedMethods: ("create" | "replace" | "patch" | "delete" | "read")[]) {
        super();
    }

    schemaBuilderReadQuery = (s) => this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readQuery
    schemaBuilderReadOptionsSchemaBuilder = (s) => this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readQuery
    schemaBuilderReadMetaSchemaBuilder = (s) => this.notImplementedMethods.indexOf("read") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.readMeta
    schemaBuilderCreateValuesSchemaBuilder = (s) => this.notImplementedMethods.indexOf("create") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createValues
    schemaBuilderCreateOptionsSchemaBuilder = (s) => this.notImplementedMethods.indexOf("create") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createOptions
    schemaBuilderCreateMetaSchemaBuilder = (s) => this.notImplementedMethods.indexOf("create") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.createMeta
    schemaBuilderReplaceValuesSchemaBuilder = (s) => this.notImplementedMethods.indexOf("replace") !== -1 ? SchemaBuilder.emptySchema() : this.pipeline.schemaBuilders.replaceValues
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

    public async replace(next, id, values, options?) {
        if (this.notImplementedMethods.indexOf("replace") !== -1) {
            throw notImplementedError("replace", Object.getPrototypeOf(this).constructor.name);
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
