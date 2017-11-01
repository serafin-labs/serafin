import * as express from "express"
import * as bodyParser from "body-parser"
import { PipelineAbstract } from "../../serafin/pipeline/Abstract"


/**
 * TODO: WIP 
 */
export function routerStore(store: PipelineAbstract, name: string, namePlural: string = null): express.Router {
    if (!namePlural) {
        namePlural = name + 's';
    }

    let router = express.Router();

    router.get('/:id', (req, res, next) => {
        let params = { 'item': null as any };
        if (req.params['id']) {
            params.item = { 'id': req.params['id'] };
        }

        let item = store.read(params);
        res.status(200).json(item);
    });
    /*
        router.get('/', (req, res, next) => {
            let items = store.readMany(req.params);
            res.status(200).json(items);
            next();
        });
    
        router.post('/', (req, res, next) => {
            let item = store.create({ item: req.body });
            res.status(201).json(item);
        });
    
        router.put('/:id', (req, res, next) => {
            res.send(store.update({ item: req.body.id, values: req.body }));
        });
    
        router.patch('/:id', (req, res, next) => {
            res.send(store.update({ item: req.body.id, values: req.body }));
        });
    
        router.delete('/:id', (req, res, next) => {
            if (req.params['id']) {
                req.params['item'] = { 'id': req.params['id'] };
            }
            res.send(store.delete(req.params));
        });*/

    router.options('/', (req, res, next) => {
        let storeDescription = store.describe();
        let response = {
            'base': req.protocol + '://' + req.hostname + '/' + namePlural,
            links: [],
            actions: [],
            schema: storeDescription['schema'],
            pipelines: storeDescription['pipelines']
        };


        res.status(200).json(response);
    });

    return router;
};