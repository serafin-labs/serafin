import * as VError from 'VError';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { PipelineInMemory } from '../../pipeline/InMemory';

import { Api, RestTransport, GraphQLTransport } from '../../serafin/api';
import { bookSchemaBuilder } from './model/Book';
import { authorSchemaBuilder } from './model/Author';
import { categorySchemaBuilder } from './model/Category';
import { Paginate, UpdateTime } from '../../pipe';

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
        "openapi": "3.0.0",
        "info": {
            "version": "1.0.0",
            "title": "Sample library Api",
            "description": "Sample library Api",
            "termsOfService": "None",
            "license": {
                "name": "MIT",
                "url": "http://github.com/gruntjs/grunt/blob/master/LICENSE-MIT"
            }
        },
        "servers": [{
            "url": "http://127.0.0.1",
            "description": "development server"
        }],
        paths: {}
    });

    api.configure(new RestTransport())
        .configure(new GraphQLTransport({
            graphiql: true,
            schema: true
        }));

    let bookPipelineRef;

    let authorPipeline = (new PipelineInMemory(authorSchemaBuilder))
        .pipe(new Paginate())
        .addRelation('book', () => bookPipelineRef, { authorId: ':id' })
        .addRelation('adventureBooks', () => bookPipelineRef, { authorId: ':id', categoryIds: ['1'] });

    let categoryPipeline = new PipelineInMemory(categorySchemaBuilder);

    let bookPipeline = (new PipelineInMemory(bookSchemaBuilder))
        .pipe(new Paginate())
        .addRelation('author', () => authorPipeline, { id: ':authorId' })
        .addRelation('category', () => categoryPipeline, { id: ':categoryIds' });

    bookPipelineRef = bookPipeline

    // await authorPipeline.create([
    //     { id: '1', firstName: 'Jules', lastName: 'Vernes' },
    //     { id: '2', firstName: 'Nico & Seb' },
    //     { id: '3', firstName: 'Nicolas Degardin' }
    // ]);

    // await categoryPipeline.create([
    //     { id: '1', name: 'adventure' },
    //     { id: '2', name: 'introspection' },
    //     { id: '3', name: 'relaxation' },
    //     { id: '4', name: 'religion' },
    //     { id: '5', name: 'must-have' },
    //     { id: '6', name: 'comedy' }
    // ]);

    // setTimeout(() => {
    //     let truc = authorPipeline.read();
    //     console.log(authorPipeline.read());
    // }, 1000);
    // await bookPipeline.create([
    //     { title: '20.000 Leagues under the Sea', summary: "A story involving a clownfish and maybe some submarine", authorId: '1', categoryIds: ['1'] },
    //     { title: 'The Mysterious Island', summary: "A story about, well, a mysterious island", authorId: '1', categoryIds: ['1'] },
    //     { title: 'Clovis Dardentor', summary: "A comedic novel", authorId: '1', categoryIds: ['6'] },
    //     { title: 'How to be like me', summary: "A guide to become someone better", authorId: '3', categoryIds: ['2', '4'] },
    //     { title: 'Serafin: the Dark Secret', summary: "The first part from then epic trilogy of the framework that cured the world", authorId: '2', categoryIds: ['5', '4', '2'] },
    //     { title: 'Serafin: the Framework from the Abyss', summary: "The second part from the legendary trilogy of the framework that revolutionated the universe", authorId: '2', categoryIds: ['5', '4', '2'] },
    //     { title: 'Serafin: Origins', summary: "The third part which is in fact before the first part from the divine trilogy of the framework that gave a sense to your pitiful mortal life", authorId: '2', categoryIds: ['5', '4', '2'] },
    // ]);

    /*
        let [cAdventure, cIntrospection, cRelaxation, cReligion, cMustHave, cComedy] = (await categoryPipeline.create([
            { name: 'adventure' },
            { name: 'introspection' },
            { name: 'relaxation' },
            { name: 'religion' },
            { name: 'must-have' },
            { name: 'comedy' }
        ])).data;

        await authorPipeline.do.create([{ firstName: 'Jules', lastName: 'Vernes' }]).first.createRelated('book', [
            { title: '20.000 Leagues under the Sea', summary: "A story involving a clownfish and maybe some submarine", categoryIds: [cAdventure.id] },
            { title: 'The Mysterious Island', summary: "A story about, well, a mysterious island", categoryIds: [cAdventure.id] },
            { title: 'Clovis Dardentor', summary: "A comedic novel", categoryIds: [cComedy.id] }
        ]);

        await authorPipeline.do.create([{ firstName: 'Nico & Seb' }, { id: '3', firstName: 'Nicolas Degardin' }]).first
            .createRelated('book', [{ title: 'Serafin: the Dark Secret', summary: "The first part from then epic trilogy of the framework that cured the world", categoryIds: [cIntrospection.id, cReligion.id, cMustHave.id] }]).first
            .readRelated('author').first
            .createRelated('book', [{ title: 'Serafin: the Framework from the Abyss', summary: "The second part from the legendary trilogy of the framework that revolutionated the universe", categoryIds: [cIntrospection.id, cReligion.id, cMustHave.id] }]).first
            .readRelated('author').first
            .createRelated('book', [{ title: 'Serafin: Origins', summary: "The third part which is in fact before the first part from the divine trilogy of the framework that gave a sense to your pitiful mortal life", categoryIds: [cIntrospection.id, cReligion.id, cMustHave.id] }])
            ;

        await bookPipeline.create(
            [{ title: 'How to be like me', summary: "A guide to become someone better", authorId: '3', categoryIds: [cIntrospection.id, cMustHave.id] }]);

        console.log(await authorPipeline.read({ firstName: 'Jules' }));
        console.log(await bookPipeline.read({}, { count: 5 }));

        api.use(bookPipeline, "book");
        api.use(authorPipeline, "author");
        api.use(categoryPipeline, "category", "categories");
    */
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
