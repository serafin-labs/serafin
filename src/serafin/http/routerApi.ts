import * as express from "express"
import * as bodyParser from "body-parser"

export function routerApi(api: string[]): express.Router {
    let router = express.Router();

    router.options('/', (req, res, next) => {
        res.status(200).json({ 'links': api.map(resource => ({ rel: resource, href: req.protocol + '://' + req.hostname + '/' + resource })) });
    });

    return router;
};