import * as express from 'express';
import * as bodyParser from 'body-parser';
import { Api, RestTransport } from '@serafin/api';
import { SchemaBuilder } from '@serafin/schema-builder';
import { PipelineMongoDb } from '@serafin/pipeline-mongodb';
import { MongoClient } from 'mongodb';

async function configureMongo() {
    const connect = async (retries: number = 5, delay: number = 2000): Promise<MongoClient> => {
        try {
            return await MongoClient.connect(process.env.MONGOSERVER || "mongodb://mongo", {
                appname: "test",
                useNewUrlParser: true,
            })
        } catch (e) {
            if (retries < 1) {
                throw Error("Connection to mongodb failed, too many retries")
            } else {
                console.log(`Connection to mongodb failed, retry in ${delay}ms`)
                await new Promise(resolve => setTimeout(resolve, delay))
                return await connect(--retries)
            }
        }
    }

    let client = await connect()
    console.log("Connected to mongodb")
    return client.db(process.env.DB || "test")
}

async function main() {
    // create an express app and add some basic middlewares
    let app = express()
    app.use(bodyParser.json()) // this is the only required middleware of express.

    // let's add CORS headers so we can open our api in swagger explorer even if it's local
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,DELETE,PUT,PATCH");
        res.header("Access-Control-Allow-Headers", "Access-Control-Request-Headers, Access-Control-Allow-Headers, Accept, Origin, X-Requested-With, Authorization, Content-Type, Content-length, Connection, If-None-Match, ETag, Cache-Control");
        next();
    })

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
    })
    api.configure(new RestTransport())

    const schema = SchemaBuilder.emptySchema().addString("id", {}, false).addString("myString").addNumber("myNumber")
    const db = await configureMongo()
    const pipeline = new PipelineMongoDb(schema, "test", db)

    await pipeline.delete({})
    await pipeline.create([{id: "hop", myString: "test2", myNumber: 1}])
    await pipeline.create([{myString: "test3", myNumber: 2}])
    await pipeline.create([{myString: "toto", myNumber: 70}])
    await pipeline.patch({id: "hop"}, {myString: "test4"})
    console.log("READ id 'hop':", await pipeline.read({id: "hop"}))
    await pipeline.delete({id: "hop"})
    console.log("READ all:", await pipeline.read({}))

    api.use(pipeline, "test")

    // start the server
    let server = app.listen(process.env.PORT || 80, (error: any) => {
        if (error) {
            throw error
        } else {
            let host = server.address().address
            let port = server.address().port
            console.log('Server listening on [%s]:%s', host, port)
        }
    });
}

main().catch((err) => { console.error(err) });
