import { fail } from 'assert';
import * as VError from 'VError';
import * as express from 'express';
import { Api, RestTransport, GraphQLTransport } from '../../serafin/api';
import { bookSchema } from './model/Book';
import { authorSchema } from './model/Author';
import { categorySchema } from './model/Category';
import * as bodyParser from 'body-parser';
import { PipelineSourceInMemory, Paginate, UpdateTime } from '../../pipeline';
import { Links } from '../../pipeline/Links';
import { PipelineRelations } from '../../serafin/pipeline/Relations';

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

    api.configure(new RestTransport());

    // Timeout to ease debugging
    setTimeout(async () => {
        let authorPipeline = (new PipelineSourceInMemory(authorSchema))
            .pipe(new Paginate())
            .pipe(new Links());

        let categoryPipeline = (new PipelineSourceInMemory(categorySchema))
            .pipe(new Links());

        let bookPipeline = (new PipelineSourceInMemory(bookSchema))
            .pipe(new Paginate())
            .pipe(new Links());

        await authorPipeline.create([
            { id: '1', firstName: 'Jules', lastName: 'Vernes' },
            { id: '2', firstName: 'Nico & Seb' },
            { id: '3', firstName: 'Nicolas Degardin' }
        ]);

        await categoryPipeline.create([
            { id: '1', name: 'adventure' },
            { id: '2', name: 'introspection' },
            { id: '3', name: 'relaxation' },
            { id: '4', name: 'religion' },
            { id: '5', name: 'must-have' },
            { id: '6', name: 'comedy' }
        ]);

        await bookPipeline.create([
            { title: '20.000 Leagues under the Sea', summary: "A story involving a clownfish and maybe some submarine", authorId: '1', categoryIds: ['1'] },
            { title: 'The Mysterious Island', summary: "A story about, well, a mysterious island", authorId: '1', categoryIds: ['1'] },
            { title: 'Clovis Dardentor', summary: "A comedic novel", authorId: '1', categoryIds: ['6'] },
            { title: 'How to be like me', summary: "A guide to become someone better", authorId: '3', categoryIds: ['2', '4'] },
            { title: 'Serafin: the Dark Secret', summary: "The first part from then epic trilogy of the framework that cured the world", authorId: '2', categoryIds: ['5', '4', '2'] },
            { title: 'Serafin: the Framework from the Abyss', summary: "The second part from the legendary trilogy of the framework that revolutionated the universe", authorId: '2', categoryIds: ['5', '4', '2'] },
            { title: 'Serafin: Origins', summary: "The third part which is in fact before the first part from the divine trilogy of the framework that gave a sense to your pitiful mortal life", authorId: '2', categoryIds: ['5', '4', '2'] },
        ]);

        bookPipeline = bookPipeline.addRelation({ name: 'author', pipeline: authorPipeline, query: { id: ':authorId' } })
            .addRelation({ name: 'category', pipeline: categoryPipeline, query: { id: ':categoryIds' } })
        authorPipeline = authorPipeline.addRelation({ name: 'book', pipeline: bookPipeline, query: { authorId: ':id' } })
            .addRelation({ name: 'adventureBooks', pipeline: bookPipeline, query: { authorId: ':id', categoryIds: '1' } });;

        console.log(await authorPipeline.read({ firstName: 'Jules' }));

        console.log(await bookPipeline.read({}, { count: 5 }));

        api.use(bookPipeline, "book");
        api.use(authorPipeline, "author");
        api.use(categoryPipeline, "category", "categories");
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
