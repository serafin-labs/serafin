import { fail } from 'assert';
import * as express from 'express';
import { Api, RestTransport, GraphQLTransport } from '../../serafin/api';
import { categorySchema } from './model/Category';
import { itemSchema } from './model/Item';
import * as bodyParser from 'body-parser';
import { PipelineSourceInMemory, Paginate, UpdateTime } from '../../pipeline';

async function main() {
    // create an express app and add some basic middlewares
    let app = express();
    app.use(bodyParser.json()); // this is the only required middleware of express.

    // let's add CORS headers so we can open our api in swagger explorer even if it's local
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE,PUT,PATCH");
        res.header("Access-Control-Allow-Headers", "Access-Control-Request-Headers, Access-Control-Allow-Headers, Accept, Origin, X-Requested-With, Authorization, Content-Type, Content-length, Connection, If-None-Match, ETag, Cache-Control");
        next();
    });

    // create the Api class from Serafin, with the general information about the Api
    // it will create the route /api.json to provide the Open Api Spec
    let api = new Api(app, {
        "openapi": "3.0.0",
        "info": {
            "version": "1.0.0",
            "title": "Sample Petstore Api",
            "description": "Sample Petstore Api",
            "termsOfService": "None",
            "license": {
                "name": "MIT"
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

    let categoryPipeline = (new PipelineSourceInMemory(categorySchema))
        .pipe(new Paginate());

    let itemPipeline = (new PipelineSourceInMemory(itemSchema))
        .pipe(new Paginate());

    api.use(categoryPipeline, "category", "categories");
    api.use(itemPipeline, "item");

    await itemPipeline.create([
        { id: "1", name: "Drywall screw" },
        { id: "2", name: "Wood screw" },
        { id: "3", name: "Desk screw" },
        { id: "4", name: "Latch" },
        { id: "5", name: "Shelf support" },
        { id: "6", name: "Drywall anchor" },
        { id: "7", name: "Wood anchor" },
        { id: "8", name: "Saw" },
        { id: "9", name: "Drill" }
    ]);

    await categoryPipeline.create([
        { id: "1", name: "Hardware" },
        { id: "2", name: "Tools" },
        { id: "3", name: "Screws", parentCategory: "2" },
        { id: "4", name: "Furniture and cabinets", parentCategory: "2" },
        { id: "5", name: "Anchors", parentCategory: "2" }
    ]);


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
