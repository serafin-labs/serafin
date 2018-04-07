export class PipelineResult {

}

export class PipelineResults<T, META extends {} = {}> {
    public constructor(public data: Array<T> = new Array, public meta: META = null, public links = {}) {
        Object.setPrototypeOf(this, Object.create(PipelineResults.prototype));
        if (meta === null) {
            this.meta = {} as any;
        }
    }


}
