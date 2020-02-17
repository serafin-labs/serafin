import * as _ from "lodash";
import * as util from "util";
import { SchemaBuilder } from "@serafin/schema-builder";
import { notImplementedError, error } from "./error";
import { final } from "./FinalDecorator";
import { IdentityInterface } from "./IdentityInterface";
import { PIPELINE, PipeAbstract } from "./PipeAbstract";
import { SchemaBuildersInterface } from "./SchemaBuildersInterface";
import { PipeInterface } from "./PipeInterface";
import { Relation } from "./Relation";
import { ResultsInterface } from "./ResultsInterface";

export type PipelineMethods = "create" | "read" | "replace" | "patch" | "delete";

export abstract class PipelineAbstract<M extends IdentityInterface, CV = {}, CO = {}, CM = {}, RQ = {}, RO = {}, RM = {},
    UV = {}, UO = {}, UM = {}, PQ = {}, PV = {}, PO = {}, PM = {}, DQ = {}, DO = {}, DM = {}, R extends {} = {}> {
    public relations: R = {} as any;
    public static CRUDMethods: PipelineMethods[] = ['create', 'read', 'replace', 'patch', 'delete'];

    private pipes: PipeInterface[] = []

    constructor(public schemaBuilders: SchemaBuildersInterface<M, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM>) {
    }

    public get modelSchemaBuilder(): SchemaBuilder<M> {
        return this.schemaBuilders.model as any
    }

    public pipe<
        M2 extends IdentityInterface = M,
        CV2 = CV, CO2 = CO, CM2 = CM,
        RQ2 = RQ, RO2 = RO, RM2 = RM,
        UV2 = UV, UO2 = UO, UM2 = UM,
        PQ2 = PQ, PV2 = PV, PO2 = PO, PM2 = PM,
        DQ2 = DQ, DO2 = DO, DM2 = DM
    >(pipe: PipeInterface<M, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM, M2, CV2, CO2, CM2, RQ2, RO2, RM2, UV2, UO2, UM2, PQ2, PV2, PO2, PM2, DQ2, DO2, DM2>) {

        // Pipeline association
        if (pipe[PIPELINE]) {
            throw Error("Pipe already associated to a pipeline");
        }
        pipe[PIPELINE] = this;

        // SchemaBuilders modification
        _.forEach(this.schemaBuilders, (value, key) => {
            let schemaBuilderResolver = pipe["schemaBuilder" + _.upperFirst(key)];

            if (typeof schemaBuilderResolver == 'function') {
                this.schemaBuilders[key] = schemaBuilderResolver(this.schemaBuilders[key]);
            }
        });

        // add pipe to the pipeline if it implements at least one of the CRUD methods
        if ("read" in pipe || "create" in pipe || "replace" in pipe || "patch" in pipe || "delete" in pipe) {
            this.pipes.unshift(pipe)
        }

        return this as any as PipelineAbstract<M2, CV2, CO2, CM2, RQ2, RO2, RM2, UV2, UO2, UM2, PQ2, PV2, PO2, PM2, DQ2, DO2, DM2, R>;
    }

    /**
     * Build a recursive function that will call all the pipes for a CRUD method
     */
    private pipeChain(method: PipelineMethods) {
        var i = 0;
        const callChain = async (...args) => {
            while (i < this.pipes.length && !(method in this.pipes[i])) { ++i }
            if (i >= this.pipes.length) {
                return this[`_${method}`](...args)
            } else {
                return (this.pipes[i++] as any)[method](callChain, ...args)
            }
        }
        return callChain
    }

    /**
     * Add a relation to the pipeline.
     * This method modifies the pipeline and affect the templated type.
     *
     * @param relation
     */
    public addRelation<
        NameKey extends keyof any,
        M2 extends IdentityInterface,
        CV2, CO2, CM2,
        RQ2, RO2, RM2,
        UV2, UO2, UM2,
        PQ2, PV2, PO2, PM2,
        DQ2, DO2, DM2,
        PR
    >(name: NameKey, pipeline: () => PipelineAbstract<M2, CV2, CO2, CM2, RQ2, RO2, RM2, UV2, UO2, UM2, PQ2, PV2, PO2, PM2, DQ2, DO2, DM2, PR>, query: Partial<RQ2>, options?: Partial<RO2>) {
        (this.relations as any)[name] = new Relation(this as any, name, pipeline as any, query, options)
        return this as any as PipelineAbstract<M, CV, CO, CM, RQ, RO, RM, UV, UO, UM, PQ, PV, PO, PM, DQ, DO, DM, R & { [key in NameKey]: Relation<M, NameKey, M2, RQ2, RO2, RM2> }>;
    }

    /**
     * Get a readable description of what this pipeline does
     */
    toString(): string {
        return (util.inspect(_.mapValues(this.schemaBuilders, (schema: SchemaBuilder<any>) => schema.schema), false, null));
    }

    /**
     * Create new resources based on `resources` input array.
     *
     * @param resources An array of partial resources to be created
     * @param options Map of options to be used by pipelines
     */
    @final async create(resources: CV[], options?: CO): Promise<ResultsInterface<M, CM>> {
        resources = _.cloneDeep(resources)
        options = _.cloneDeep(options)
        this.handleValidate('create', () => {
            this.schemaBuilders.createValues.validateList(resources);
            this.schemaBuilders.createOptions.validate(options || {} as any);
        });

        return this.pipeChain("create")(resources, options)
    }

    protected _create(resources: CV[], options?: CO): Promise<ResultsInterface<M, CM>> {
        throw notImplementedError("create", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Read resources from the underlying source according to the given `query` and `options`.
     *
     * @param query The query filter to be used for fetching the data
     * @param options Map of options to be used by pipelines
     */
    @final async read(query?: RQ, options?: RO): Promise<ResultsInterface<M, RM>> {
        query = _.cloneDeep(query)
        options = _.cloneDeep(options)
        this.handleValidate('read', () => {
            this.schemaBuilders.readQuery.validate(query || {} as any);
            this.schemaBuilders.readOptions.validate(options || {} as any);
        });

        return this.pipeChain("read")(query, options)
    }

    protected _read(query?: RQ, options?: RO): Promise<ResultsInterface<M, RM>> {
        throw notImplementedError("read", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Replace replaces an existing resource with the given values.
     * Because it replaces the resource, only one can be replaced at a time.
     * If you need to replace many resources in a single query, please use patch instead
     *
     * @param id
     * @param values
     * @param options
     */
    @final async replace(id: string, values: UV, options?: UO): Promise<ResultsInterface<M, UM>> {
        values = _.cloneDeep(values)
        options = _.cloneDeep(options)
        this.handleValidate('replace', () => {
            this.schemaBuilders.replaceValues.validate(values || {} as any);
            this.schemaBuilders.replaceOptions.validate(options || {} as any);
        });

        return this.pipeChain("replace")(id, values, options)
    }

    protected _replace(id: string, values: UV, options?: UO): Promise<ResultsInterface<M, UM>> {
        throw notImplementedError("replace", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Patch resources according to the given query and values.
     * The Query will select a subset of the underlying data source and given `values` are updated on it.
     * This method follow the JSON merge patch standard. @see https://tools.ietf.org/html/rfc7396
     *
     * @param query
     * @param values
     * @param options
     */
    @final async patch(query: PQ, values: PV, options?: PO): Promise<ResultsInterface<M, PM>> {
        query = _.cloneDeep(query)
        values = _.cloneDeep(values)
        options = _.cloneDeep(options)
        this.handleValidate('patch', () => {
            this.schemaBuilders.patchQuery.validate(query);
            this.schemaBuilders.patchValues.validate(values || {} as any);
            this.schemaBuilders.patchOptions.validate(options || {} as any);
        });
        return this.pipeChain("patch")(query, values, options)
    }

    protected _patch(query: PQ, values: PV, options?: PO): Promise<ResultsInterface<M, PM>> {
        throw notImplementedError("patch", Object.getPrototypeOf(this).constructor.name);
    }

    /**
     * Delete resources that match th given Query.
     * @param query The query filter to be used for selecting resources to delete
     * @param options Map of options to be used by pipelines
     */
    @final async delete(query: DQ, options?: DO): Promise<ResultsInterface<M, DM>> {
        query = _.cloneDeep(query)
        options = _.cloneDeep(options)
        this.handleValidate('delete', () => {
            this.schemaBuilders.deleteQuery.validate(query);
            this.schemaBuilders.deleteOptions.validate(options || {} as any);
        });
        return this.pipeChain("delete")(query, options)
    }

    protected _delete(query: DQ, options?: DO): Promise<ResultsInterface<M, DM>> {
        throw notImplementedError("delete", Object.getPrototypeOf(this).constructor.name);
    }

    private handleValidate(method: string, validate: () => void) {
        try {
            validate();
        } catch (e) {
            throw error('SerafinValidationError', `Validation failed in ${Object.getPrototypeOf(this).constructor.name}::${method}`,
                { constructor: Object.getPrototypeOf(this).constructor.name, method: method }, e);
        }
    }

    clone(): this {
        let clonedPipeline = _.cloneDeepWith(this, (value: any, key: number | string | undefined) => {
            if (key === "relations") {
                return _.clone(value)
            }
            if (key === "schemaBuilders") {
                return _.clone(value)
            }
            if (key === "pipes") {
                return value ? value.map((pipe: PipeInterface & PipeAbstract) => pipe.clone()) : _.clone(value)
            }
        })
        for (let pipe of clonedPipeline.pipes) {
            pipe[PIPELINE] = clonedPipeline
        }
        return clonedPipeline
    }
}
