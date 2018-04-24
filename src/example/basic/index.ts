import * as express from 'express';
import * as bodyParser from 'body-parser';

import { PipelineInMemory } from '../../pipeline/InMemory';
import { Api, RestTransport } from '@serafin/api';
import { SchemaBuilder } from '@serafin/schema-builder';

// express initialization
let app = express();
app.use(bodyParser.json());

// let's add CORS headers so we can open our api in swagger explorer even if it's local
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE,PUT,PATCH");
    res.header("Access-Control-Allow-Headers", "Access-Control-Request-Headers, Access-Control-Allow-Headers, Accept, Origin, X-Requested-With, Authorization, Content-Type, Content-length, Connection, If-None-Match, ETag, Cache-Control");
    next();
});

// Declare our Api with its general information
let api = new Api(app, {
    "openapi": "3.0.0",
    "info": {
        "version": "1.0.0",
        "title": "An API"
    },
    paths: {}
});
api.configure(new RestTransport())

// Declare a Schema for our "entity"
let aModelSchema = SchemaBuilder.emptySchema().addString("id").addString("data");

// Define the pipeline, it stores data into memory directly
let aPipeline = new PipelineInMemory(aModelSchema);
//.pipe(...) // Add a pipeline to extend the behavior

// Use the pipeline in the api. It will add all the routes and compute Open Api spec
api.use(aPipeline, "model");

// Start the server
app.listen(process.env.PORT || 80);
