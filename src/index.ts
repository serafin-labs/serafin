import * as express from 'express';
import { Api } from './serafin/http/Api';
import * as Models from './model/Models';
import { PipelineSourceObject } from './pipeline/source/Object';
import { Paginate } from './pipeline/Paginate';
import { UpdateTime } from './pipeline/UpdateTime';

const util = require('util')

async function main() {
    let api = new Api(express());
    api.prepareApplication();

    let pipeline = (new PipelineSourceObject(Models.User))
        .pipe(new UpdateTime)
        .pipe(new Paginate);

    let results = pipeline.read();

    console.log(pipeline.toString());

    api.expose(pipeline, 'user');

    await api.runApplication();

    setTimeout(() => {
        let pipeline2 = new PipelineSourceObject(Models.User)
            //.pipe(new UpdateTime())
            // .pipe(new Paginate())
            ;

        pipeline2.create([{
            email: 'toto',
            type: 'hop'
        }]);

        let trucs = pipeline2.read();
        let pipeline3 = pipeline2.pipe(new Paginate)
        let desc = pipeline3.describe();
        let bidule = pipeline3.read();

        let pipeline4 = pipeline3.pipe(new UpdateTime);
        pipeline4.create([{
            email: 'toto2',
            type: 'hop2'
        }]);

        let bidule2 = pipeline4.read();

    }, 1000);


    return new Promise(() => null);
}

main().catch((err) => { console.error(err) });


// SEB TEST
/*
import { PipelineAbstract, PipelineProjectionAbstract, PipelineSourceAbstract } from "./pipeline/PipelineAbstract"

// let's imagine a source pipeline of a theoric Person table
let sourcePipeline: PipelineSourceAbstract<{ id: number, name: string, createdAt: number, updatedAt: number }>;
// we could use a pipeline that complete createdAt and updatedAt automatically
let datePipeline: PipelineAbstract<{ createdAt: number, updatedAt: number }>;
// and add a cache to boost performance
let memcachedPipeline: PipelineAbstract<{}, {}, { noCache?: boolean }>
// and finally add way to paginate the result because our table doesn't support it
let paginationPipeline: PipelineAbstract<{}, {}, { offset?: number, count?: number }, { count: number, results: {}[] }>
// Here is a pipeline that can't be added to the chain. It expects a property that does not exist in the source.
let badPipeline: PipelineAbstract<{ test: number }>;

// the pipeline definition would look like this
let p = sourcePipeline
    .pipe(datePipeline)
    .pipe(memcachedPipeline)
    .pipe(paginationPipeline)
//.pipe(badPipeline)

p.create([{ name: "test" }]).then(resources => {
    let resource = resources.pop();
    return p.read({ id: resource.id }, { offset: 10, noCache: true }).then(resultWrapper => {
        let count = resultWrapper.count;
        let results = resultWrapper.results;
    });
});

*/
