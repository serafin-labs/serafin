import { fail } from 'assert';
import * as express from 'express';
import { Api, RestTransport, GraphQLTransport } from '../../serafin/api';
import { petSchemaBuilder } from './model/Pet';
import * as bodyParser from 'body-parser';
import { PipeSourceInMemory, Paginate, UpdateTime } from '../../pipe';

import { DefaultPetName } from './DefaultPetName';

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

    let petPipeline = (new PipeSourceInMemory(petSchemaBuilder)) // Initialize an InMemory Pipepeline Source with the model schema
        .pipe(new Paginate()) // we don't have any offset/limit pagination implemented in the PipelineSourceInMemory, let's add it with a pipe
       
    //.pipe(...)  you can then add any pipeline. You can do pretty much anything, included but not limited to: custom buisness rules, logs, events, cache, api rate limiting, user acl, generated properties, fetch relations, result filters, property filters, custom type checking, etc. 

    // Print schemas of each part of the pipeline to the console
    console.log(petPipeline.toString());

    // register the pipeline to the api so it is exposed automatically
    // it will create the following routes : /pets (GET, POST) and /pets/:id (GET, PUT, PATCH, DELETE) and the graphql endpoints /graphql and /graphqlSchema
    api.use(petPipeline, "pet")

    // all the beauty of Serafin is that now, we have a programmatic api with typings that supports all the buissness features we have implemented
    // let's create some tests data before the server starts
    let pets = petPipeline.create([{ name: "Snowball", category: "cat", tags: ["dead"] }, { name: "", category: "cat", photoUrls: ["aCatUrl"] }])


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
