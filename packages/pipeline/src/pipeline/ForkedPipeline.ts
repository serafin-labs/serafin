import { IdentityInterface } from "../IdentityInterface.js"
import { ResultsInterface } from "../ResultsInterface.js"
import { PipelineAbstract } from "../PipelineAbstract.js"
import { Relation } from "../Relation.js"
import { RelationType } from "../RelationType.js"

/**
 * What a fork can still promise of its base's capabilities. The fork reaches its base through the
 * base's public actions, which validate again: an operator or a dotted path a pipe hands down to the
 * fork is refused there, while a read option, a meta key or a context capability passes through.
 */
function forwardedCapabilities(capabilities: ReadonlySet<string> | undefined): string[] | undefined {
    return capabilities && [...capabilities].filter((capability) => !capability.startsWith("$") && capability !== "dotted-paths")
}

/**
 * Forked version of a pipeline.
 * The provided base pipeline will be called internally.
 *
 * It declares the base's capabilities minus the operators and dotted paths, which the base's own
 * validation would refuse, so a pipe attached to the fork that needs one fails when attached.
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
    CTX = any,
    META = any,
    R extends Record<string, Relation<IdentityInterface, string, IdentityInterface, any, any, RelationType>> = {},
> extends PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, R> {
    constructor(
        private basePipeline: PipelineAbstract<M, CV, CO, RQ, PQ, PV, DQ, CM, RM, PM, DM, CTX, META, R>,
        title: string,
        description: string,
        validationEnabled = true,
    ) {
        const newModelSchema = basePipeline.schemaBuilders.model.setSchemaAttributes({ title, description })
        super({ ...basePipeline.schemaBuilders, model: newModelSchema }, { validationEnabled, capabilities: forwardedCapabilities(basePipeline.capabilities) })
    }

    protected async _create(resources: CV[], options: CO, context: CTX): Promise<ResultsInterface<M, CM>> {
        return this.basePipeline.create(resources, options, context)
    }
    protected async _read(query: RQ, context: CTX): Promise<ResultsInterface<M, RM>> {
        return this.basePipeline.read(query, context)
    }

    protected async _patch(query: PQ, values: PV, context: CTX): Promise<ResultsInterface<M, PM>> {
        return this.basePipeline.patch(query, values, context)
    }

    protected async _delete(query: DQ, context: CTX): Promise<ResultsInterface<M, DM>> {
        return this.basePipeline.delete(query, context)
    }
}
