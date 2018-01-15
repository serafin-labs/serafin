import * as util from 'util';
import * as _ from 'lodash';
import * as Ajv from 'ajv'
import * as VError from 'verror';
import { validationError, serafinError, } from "../error/Error"
import { SchemaBuilder, Omit } from "@serafin/schema-builder"
import { Pipeline } from './Pipeline';
import { PipelineRelation } from './Relation';
import { IdentityInterface } from './IdentityInterface'

// export type PipeMethods = "create" | "read" | "update" | "patch" | "delete";

export interface PipeAbstract<
    T extends {} = {},
    ReadQuery = {},
    ReadOptions = {},
    ReadWrapper = {},
    CreateValues = {},
    CreateOptions = {},
    CreateWrapper = {},
    UpdateValues = {},
    UpdateOptions = {},
    UpdateWrapper = {},
    PatchQuery = {},
    PatchValues = {},
    PatchOptions = {},
    PatchWrapper = {},
    DeleteQuery = {},
    DeleteOptions = {},
    DeleteWrapper = {}
    > {
    create?(next: (...args) => any, resources: CreateValues[], options?: CreateOptions): Promise<{ data: T[] } & CreateWrapper>;
    read?(next: (...args) => any, query?: ReadQuery, options?: ReadOptions): Promise<{ data: T[] } & ReadWrapper>;
    update?(next: (...args) => any, id: string, values: UpdateValues, options?: UpdateOptions): Promise<{ data: T } & UpdateWrapper>;
    patch?(next: (...args) => any, query: PatchQuery, values: PatchValues, options?: PatchOptions): Promise<{ data: T[] } & PatchWrapper>;
    delete?(next: (...args) => any, query: DeleteQuery, options?: DeleteOptions): Promise<{ data: T[] } & DeleteWrapper>;
}

/**
 * Abstract Class representing a pipeline.
 * It contains the base type and method definition that all parts of pipelines must extend.
 * 
 * A pipeline is a component designed to define and modify a resource access behavior (read, write, delete actions...) using a functional approach.
 * A pipeline is always plugged (piped) to another pipeline except for source pipelines, and can affect one or many of the actions, by overriding them.
 */
export abstract class PipeAbstract<
    T extends {} = {},
    ReadQuery = {},
    ReadOptions = {},
    ReadWrapper = {},
    CreateValues = {},
    CreateOptions = {},
    CreateWrapper = {},
    UpdateValues = {},
    UpdateOptions = {},
    UpdateWrapper = {},
    PatchQuery = {},
    PatchValues = {},
    PatchOptions = {},
    PatchWrapper = {},
    DeleteQuery = {},
    DeleteOptions = {},
    DeleteWrapper = {}
    > {
    /**
     * The parent pipeline. It has to be used internally by pipelines to access the next element of the pipeline.
     * Types are all 'any' because pipelines are reusable and they can't make assumption on what is the next element of the pipeline.
     */

    protected modelSchemaBuilder?: SchemaBuilder<T>

    public readQuerySchemaBuilder?: SchemaBuilder<ReadQuery>
    public readOptionsSchemaBuilder?: SchemaBuilder<ReadOptions>
    public readWrapperSchemaBuilder?: SchemaBuilder<ReadWrapper>

    public createValuesSchemaBuilder?: SchemaBuilder<CreateValues>
    public createOptionsSchemaBuilder?: SchemaBuilder<CreateOptions>
    public createWrapperSchemaBuilder?: SchemaBuilder<CreateWrapper>

    public updateValuesSchemaBuilder?: SchemaBuilder<UpdateValues>
    public updateOptionsSchemaBuilder?: SchemaBuilder<UpdateOptions>
    public updateWrapperSchemaBuilder?: SchemaBuilder<UpdateWrapper>

    public patchQuerySchemaBuilder?: SchemaBuilder<PatchQuery>
    public patchValuesSchemaBuilder?: SchemaBuilder<PatchValues>
    public patchOptionsSchemaBuilder?: SchemaBuilder<PatchOptions>
    public patchWrapperSchemaBuilder?: SchemaBuilder<PatchWrapper>

    public deleteQuerySchemaBuilder?: SchemaBuilder<DeleteQuery>
    public deleteOptionsSchemaBuilder?: SchemaBuilder<DeleteOptions>
    public deleteWrapperSchemaBuilder?: SchemaBuilder<DeleteWrapper>

    // private optionsMapping: Partial<Record<PipeMethods, { [k: string]: string }>> = {};

    protected pipeline: Pipeline = null;

    /**
     * Flag indicating if this pipeline has been attached to a source
     */
    // protected get isAttachedToSource() {
    //     if (!this._isAttachedToSource) {
    //         this._isAttachedToSource = this.parent ? this.parent.isAttachedToSource : false
    //     }
    //     return this._isAttachedToSource
    // }

    public attach(pipeline: Pipeline) {
        this.pipeline = pipeline;
    }

    /**
     * Remap a read options to change its name. To be used in case of conflict between two pipelines.
     * 
     * @param opt 
     * @param renamedOpt 
     */
    // public remapReadOption<K extends keyof ReadOptions, K2 extends keyof any>(opt: K, renamedOpt: K2): PipelineAbstract<T, ReadQuery, Omit<ReadOptions, K> & {[P in K2]: ReadOptions[K]}, ReadWrapper, CreateValues, CreateOptions, CreateWrapper, UpdateValues, UpdateOptions, UpdateWrapper, PatchQuery, PatchValues, PatchOptions, PatchWrapper, DeleteQuery, DeleteOptions, DeleteWrapper> {
    //     return this.remapOptions("read", opt, renamedOpt)
    // }

    /**
     * Remap the given options to change its name for the given method.
     * 
     * @param method 
     * @param opt 
     * @param renamedOpt 
     */
    // private remapOptions(method: PipeMethods, opt: string, renamedOpt: string) {
    //     this.optionsMapping = this.optionsMapping || {};
    //     this.optionsMapping[method] = this.optionsMapping[method] || {};
    //     this.optionsMapping[method][renamedOpt as string] = opt as string;
    //     let schemaBuilderName = `_${method}OptionsSchemaBuilder`
    //     if (!this.hasOwnProperty(schemaBuilderName)) {
    //         this[schemaBuilderName] = this[schemaBuilderName].clone();
    //     }
    //     this[schemaBuilderName].renameProperty(opt, renamedOpt);
    //     return this as any;
    // }

    /**
     * Map the input options object according to the configured mapping
     */
    // private prepareOptionsMapping(options, method: PipelineMethods) {
    //     if (typeof options === 'object' && this.optionsMapping) {
    //         for (let key in this.optionsMapping[method]) {
    //             if (options[key]) {
    //                 options[this.optionsMapping[key]] = options[key];
    //                 delete (options[key]);
    //             }
    //         }
    //     }
    //     return options;
    // }
}
