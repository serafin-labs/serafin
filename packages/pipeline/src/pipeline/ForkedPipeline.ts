import { IdentityInterface } from "../IdentityInterface"
import { ResultsInterface } from "../ResultsInterface"
import { PipelineAbstract } from "../PipelineAbstract"

/**
 * Forked version of a pipeline.
 * The provided base pipeline will be called internally.
 */
export abstract class ForkedPipeline<
    M extends IdentityInterface = IdentityInterface,
    CV extends object = object,
    CO extends object = object,
    RQ extends object = object,
    PQ extends object = object,
    PV extends object = object,
    DQ extends object = object,
    CM extends object = object,
    RM extends object = object,
    PM extends object = object,
    DM extends object = object,
    R extends object = object,
> extends PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, R> {
    constructor(
        private basePipeline: PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, R>,
        title: string,
        description: string,
        validationEnabled = true,
    ) {
        const newModelSchema = basePipeline.schemaBuilders.model.setSchemaAttributes({ title, description })
        super({ ...basePipeline.schemaBuilders, model: newModelSchema }, { validationEnabled })
    }

    protected async _create(resources: CV[], options: CO): Promise<ResultsInterface<M, CM>> {
        return this.basePipeline.create(resources, options)
    }
    protected async _read(query: RQ): Promise<ResultsInterface<M, RM>> {
        return this.basePipeline.read(query)
    }

    protected async _patch(query: PQ, values: PV): Promise<ResultsInterface<M, PM>> {
        return this.basePipeline.patch(query, values)
    }

    protected async _delete(query: DQ): Promise<ResultsInterface<M, DM>> {
        return this.basePipeline.delete(query)
    }
}
