import { fail } from 'assert';
import * as VError from 'VError';
import * as express from 'express';
import { Api } from '../../serafin/http';
import { bookSchema } from './model/Book';
import { authorSchema } from './model/Author';
import * as bodyParser from 'body-parser';
import { PipelineSourceInMemory, Paginate, UpdateTime } from '../../pipeline';
import { PipelineSchemaModel } from '../../serafin/pipeline';

import { Relation } from '../../pipeline/Relation';

async function main() {
    let app = express();
    app.use(bodyParser.json()); // this is the only required middleware of express.
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE,PUT,PATCH");
        res.header("Access-Control-Allow-Headers", "Access-Control-Request-Headers, Access-Control-Allow-Headers, Accept, Origin, X-Requested-With, Authorization, Content-Type, Content-length, Connection, If-None-Match, ETag, Cache-Control");
        next();
    });

    let api = new Api(app, {
        "swagger": "2.0",
        "info": {
            "version": "1.0.0",
            "title": "Sample library Api",
            "description": "Sample library Api",
            "termsOfService": "None",
            "contact": {
                "name": "no one"
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

    // Timeout to ease debugging
    setTimeout(async () => {
        let authorPipeline = (new PipelineSourceInMemory(authorSchema))
            .pipe(new Paginate());

        let bookPipeline = (new PipelineSourceInMemory(bookSchema))
            .pipe(new Paginate());

        await authorPipeline.create([{ firstName: 'Jules', lastName: 'Vernes' }]);
        await bookPipeline.create([{ title: 'Nemo', summary: "A story involving a little clownfish and maybe some submarine. Don't know, I've just seen the movie." }]);

        console.log(await bookPipeline.read({}, { count: 5 }));

        api.use(bookPipeline, "book")
    }, 1000);

    // start the server
    let server = app.listen(process.env.PORT || 80, (error: any) => {
        if (error) {
            throw error
        } else {
            let host = server.address().address;
            let port = server.address().port;
            console.log('Server listening on [%s]:%s', host, port);
        }
    });
}

main().catch((err) => { console.error(err) });
