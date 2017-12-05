import { PipelineAbstract, option, description, result } from '../serafin/pipeline'
import { notImplementedError } from "../serafin/error/Error"
import * as _ from 'lodash'

@description("Force given actions to be unavailable")
export class NotImplemented extends PipelineAbstract<{}> {

    constructor(private notImplementedMethods: ("create" | "update" | "patch" | "delete" | "read")[]) {
        super()
    }

    protected attach(pipeline: PipelineAbstract) {
        super.attach(pipeline)
        this.modelSchemaBuilder = this.findModelSchema().clone();
        this.modelSchemaBuilder.implementedMethods = _.difference(this.modelSchemaBuilder.implementedMethods, this.notImplementedMethods)
    }

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