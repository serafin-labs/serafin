import { IdentityInterface } from "../IdentityInterface"
import { ResultsInterface } from "../ResultsInterface"
import { PipelineAbstract } from "../PipelineAbstract"
import { Relation } from "../Relation"
import { RelationType } from "../RelationType"

/**
 * Forked version of a pipeline.
 * The provided base pipeline will be called internally.
 */
export abstract class ForkedPipeline<
    M extends IdentityInterface = IdentityInterface,
    CV = any,
    CO = any,
    RQ = any,
    PQ = any,
    PV = any,
    DQ = any,
    CM = any,
    RM = any,
    PM = any,
    DM = any,
    R extends Record<string, Relation<IdentityInterface, string, IdentityInterface, any, any, RelationType>> = {},
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
