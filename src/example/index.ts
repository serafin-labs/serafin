import { fail } from 'assert';
import * as express from 'express';
import { Api } from '../serafin/http';
import { User } from './model/model';
import { PipelineSourceInMemory, Paginate, UpdateTime } from '../pipeline';
import { PipelineSchemaModel } from '../serafin/pipeline';

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

    await api.runApplication();

    setTimeout(async () => {
        console.log("start");

        let userSchema = (new PipelineSchemaModel<User>(require('./model/user.model.json'), "user"))
            .addSchema({
                type: "object",
                properties: {
                    email: { "type": "string" }
                },
                required: ["email"],
                additionalProperties: false
            }, "createValues")
            .addSchema({
                type: "object",
                properties: {
                    id: { type: "string" },
                    email: { type: "string" }
                },
                additionalProperties: false
            }, "readQuery");

        let pipeline = (new PipelineSourceInMemory(userSchema))
            //.pipe(new UpdateTime())
            .pipe(new Paginate());

        console.log(pipeline.toString());

        api.use(pipeline, 'user');

        let results = await pipeline.create([{ email: "test" }]);

        console.log(await pipeline.read({} as any, { count: "toto" }));

        // console.log(JSON.stringify(api["openApi"], null, 4));
    }, 2000);


    return new Promise(() => null);
}

main().catch((err) => { console.error(err) });
