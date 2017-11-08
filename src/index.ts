import * as express from 'express';
import { Api } from './serafin/http/Api';
import { User } from './model/model';
import { PipelineSourceObject } from './pipeline/source/Object';
import { Paginate } from './pipeline/Paginate';
import { UpdateTime } from './pipeline/UpdateTime';

var userSchema = require('./model/user.model.json');

const util = require('util')

async function main() {
    let api = new Api(express(), {
        "swagger": "2.0",
        "info": {
            "version": "1.0.0",
            "title": "Sample Api",
            "description": "A sample API ",
            "termsOfService": "None",
            "contact": {
                "name": "bob",
                "email": "bob@example.com"
            },
            "license": {
                "name": "MIT",
                "url": "http://github.com/gruntjs/grunt/blob/master/LICENSE-MIT"
            }
        },
        "host": "127.0.0.1",
        "schemes": [
            "http"
        ],
        "consumes": [
            "application/json"
        ],
        "produces": [
            "application/json"
        ],
        paths: {}
    });
    api.prepareApplication();

    let pipeline = (new PipelineSourceObject<User>(userSchema))
        .pipe(new Paginate)
        .pipe(new UpdateTime);

    let results = await pipeline.create([{ email: "test" }]);

    console.log(await pipeline.read({}, {count: 3}));

    //console.log(pipeline.toString());

    api.use(pipeline, 'user');
    //console.log(JSON.stringify(api["openApi"], null, 4));

    await api.runApplication();

    setTimeout(async () => {
        let pipeline2 = new PipelineSourceObject<User>(userSchema)
            //.pipe(new UpdateTime())
            // .pipe(new Paginate())
            ;

        await pipeline2.create([{
            email: 'toto',
            type: 'hop'
        }], {truc: 'machin'});

        let trucs = await pipeline2.read({});
        let pipeline3 = await pipeline2.pipe(new Paginate)
        let bidule = await pipeline3.read({});

        let pipeline4 = await pipeline3.pipe(new UpdateTime);
        pipeline4.create([{
            email: 'toto2',
            type: 'hop2'
        }]);

        let bidule2 = await pipeline4.read({});

        let pipeline5 = new PipelineSourceObject<User>(userSchema);
        pipeline5.read();

    }, 1000);


    return new Promise(() => null);
}

main().catch((err) => { console.error(err) });
