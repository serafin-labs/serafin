import { PipelineAbstract } from "./Abstract";

export class Link {
    private static renderingFunction = (pipeline, query, options, type) => undefined;

    constructor(public pipeline: PipelineAbstract, public query: object, public options: object, public type: 'one' | 'many') {
    }

    public static setRendering(renderingFunction: (pipeline: PipelineAbstract, query: object, options: object, type: 'one' | 'many') => object) {
        this.renderingFunction = renderingFunction;
    }

    public static assign(target: object, name: string, pipeline: PipelineAbstract, query: object, options: object, type: 'one' | 'many' = 'many'): void {
        if (!target['links']) {
            target['links'] = {};
        }

        target['links'][name] = new Link(pipeline, query, options, type);
    }

    public read(): Promise<{ data: {}[] }> {
        return this.pipeline.read(this.query, this.options);
    }

    toJSON(): object {
        return Link.renderingFunction(this.pipeline, this.query, this.options, this.type);
    }
}
