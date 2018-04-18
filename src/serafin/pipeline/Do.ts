import * as _ from "lodash";

import { PipelineAbstract } from ".";
import { PipelineRelation } from ".";
import { SchemaBuilder } from "@serafin/schema-builder";
import { ResultsInterface } from "./ResultsInterface";
import { QueryTemplate } from "./QueryTemplate";

export class DoResult<P extends PipelineAbstract<any>, R extends {}> {
    constructor(private pipeline: P, private promise: Promise<R>) {
    }

    readRelated(name: string, query: {} = null, options: {} = null) {
        let rel = this.pipeline.relations[name];
        if (rel) {
            return new Do(rel.pipeline, this.promise.then(result =>
                this.pipeline.do.read(
                    { ...QueryTemplate.hydrate(rel.query, result) as any, ...query || {} },
                    { ...rel.options as any || {}, ...options || {} })
            ));
        }
    }

    createRelated(name: string, resources: {}[], options: {} = null) {
        let rel = this.pipeline.relations[name];
        if (rel) {
            return new Do(rel.pipeline, this.promise.then(result => {
                let relValues = QueryTemplate.hydrate(rel.query, _.pick(result, rel.query.keys()));
                return rel.pipeline.do.create(_.map(resources, (r) => ({ ...r, ...relValues })),
                    { ...rel.options as any || {}, ...options || {} });
            }));
        }
    }

    get data() {
        return this.promise;
    }
}

export class Do<P extends PipelineAbstract<any, any, any>> {
    private method: "create" | "read" | "patch" | "replace" | "delete";
    private id;
    private resources: {}[];
    private query: {};
    private options: {};
    private values: {};

    constructor(private pipeline: P, private promise: Promise<any> = null) {
    }

    create(resources: {}[], options = null) {
        this.method = "create";
        this.resources = resources;
        this.options = options;
        return this;
    }

    read(query = null, options = null) {
        this.method = "read";
        this.query = query;
        this.options = options;
        return this;
    }

    replace(id, values, options = null) {
        this.method = "replace";
        this.id = id;
        this.values = values;
        this.options = options;
        return this;
    }

    patch(query, values, options = null) {
        this.method = "patch";
        this.query = query;
        this.values = values;
        this.options = options;
        return this;
    }

    delete(query, options = null) {
        this.method = "delete";
        this.query = query;
        this.options = options;
        return this;
    }

    private async resolve() {
        if (this.promise instanceof Promise) {
            await this.promise;
        }

        let result = null;
        switch (this.method) {
            case "create":
                result = await this.pipeline.create(this.resources, this.options);
            case "read":
                result = await this.pipeline.read(this.query, this.options);
            case "replace":
                result = await this.pipeline.replace(this.id, this.values, this.options);
            case "patch":
                result = await this.pipeline.patch(this.query, this.values, this.options);
            case "delete":
                result = await this.pipeline.delete(this.query, this.options);
        }

        return result;
    }

    get first() {
        return new DoResult(this.pipeline, this.resolve().then(r => r.data[0] ? r.data[0] : null));
    }

    index(index: number) {
        return new DoResult(this.pipeline, this.resolve().then(r => r.data[index] ? r.data[index] : null));
    }

    get all() {
        return this.resolve().then(r => r.data.map(result => new DoResult(this.pipeline, result)));
    }

    get result() {
        return this.resolve();
    }

    get data() {
        return this.resolve().then(r => r.data);
    }

    get meta() {
        return this.resolve().then(r => r.meta);
    }
}
