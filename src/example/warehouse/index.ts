import { fail } from 'assert';
import * as _ from 'lodash';
import * as express from 'express';
import { PipelineInMemory } from '../../pipeline/InMemory';

import { Api, RestTransport, GraphQLTransport } from '../../serafin/api';
import { categorySchemaBuilder } from './model/Category';
import { itemSchemaBuilder } from './model/Item';
import * as bodyParser from 'body-parser';
import { Paginate, UpdateTime } from '../../pipe';
import { setTimeout } from 'timers';

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
            "title": "Sample warehouse Api",
            "description": "A sample focusing on resources relations",
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

    let categoryPipelineBase = (new PipelineInMemory(categorySchemaBuilder))
        .pipe(new Paginate());

    let itemPipeline = (new PipelineInMemory(itemSchemaBuilder))
        .pipe(new Paginate())
        .addRelation('category', () => categoryPipelineBase, { id: ':categoryId' });

    let categoryPipeline = categoryPipelineBase
        .addRelation('subCategories', () => categoryPipelineBase, { parentCategory: ':id' })
        .addRelation('items', () => itemPipeline, { categoryId: ':id' });

    api.use(categoryPipeline, "category", "categories");
    api.use(itemPipeline, "item");

    await categoryPipeline.create([
        { id: "1", name: "Hardware", parentCategory: null },
        { id: "2", name: "Tools", parentCategory: null },
        { id: "3", name: "Screws", parentCategory: "1" },
        { id: "4", name: "Furniture and cabinets", parentCategory: "1" },
        { id: "5", name: "Anchors", parentCategory: "1" }
    ]);

    await itemPipeline.create([
        { id: "1", name: "Drywall screw", price: 0.1, "categoryId": "3" },
        { id: "2", name: "Wood screw", price: 0.1, "categoryId": "3" },
        { id: "3", name: "Desk screw", price: 0.2, "categoryId": "3" },
        { id: "4", name: "Latch", price: 3, "categoryId": "4" },
        { id: "5", name: "Shelf support", price: 5, "categoryId": "4" },
        { id: "6", name: "Drywall anchor", price: 0.2, "categoryId": "5" },
        { id: "7", name: "Wood anchor", price: 0.1, "categoryId": "5" },
        { id: "8", name: "Saw", price: 20, "categoryId": "2" },
        { id: "9", name: "Drill", price: 50, "categoryId": "2" }
    ]);

    setTimeout(async () => {
        // let next = await itemPipeline.relations.next.fetch({ id: "1", name: "Drywall screw", price: 0.1, "categoryId": "3" });

        // 10% items price increase
        await Promise.all(
            _.map((await itemPipeline.read()).data, (item) =>
                itemPipeline.patch({ id: item.id }, { price: (item.price * 110 / 100) }))
        );


        let truc = await itemPipeline.read({}, { offset: 2, count: 2 });
        console.log(truc);


        // let bidule = await itemPipeline.relations.self.fetchLink(truc['links']['prev']['query'], truc['links']['prev']['options']);
        // console.log(true);
        // let browseCategories = async (parentCategory: string = undefined, prefix: string = "") => {
        //     return _.map((await categoryPipeline.read({ parentCategory: parentCategory })).data, async (category) => {
        //         await Promise.all(_.map((await itemPipeline.read({ categoryId: category.id })).data, (item) => {
        //             console.log(`${prefix}${category.name}: ${item.name} ($${item.price})`);
        //         }));
        //         return await browseCategories(category.id, category.name + ">");
        //     });
        // };

        // let updatedItems = itemPipeline.do().read().patch((item) => item.price = (item.price * 110 / 100)).getData();

        // let browseCategories2 =  async (parentCategory: string = undefined, prefix: string = "") => {
        //     let categoryResult = categoryPipeline.do().read({ parentCategory: undefined });
        //     _.forEach(categoryResult.fetchLinks('item').getData(), (item) => {
        //         console.log(`${prefix}${categoryResult.one().name}: ${item.one().name} ($${item.one().price})`);
        //     });
        //     return await browseCategories2(categoryResult.one().id, categoryResult.one().name + ">");
        // }
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
