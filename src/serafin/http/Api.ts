import * as Swagger from 'swagger-schema-official';
import * as express from "express"
import * as _ from "lodash"
import * as P from "bluebird"
import * as bodyParser from "body-parser"
import * as compression from "compression"
import { PipelineAbstract } from "../pipeline/Abstract"


/**
 * Api class represents a set of endpoint based on pipelines.
 * It will register all routes for the endpoints and for metadata (swagger / open API).
 */
export class Api {

    /**
     * Map of all exposed pipelines
     */
    protected pipelineByName: { [name: string]: PipelineAbstract } = {}

    /**
     * Generated open api document
     */
    protected openApi: Swagger.Spec = <any>{}

    /**
     * @param application the express app the Api will rely on to register endpoints
     * @param apiPath the base path of the api. For example "/api".
     */
    constructor(protected application: express.Application, protected apiPath: string = "") {
        // setup endpoints for api metadata
        this.application.get(apiPath + "/api.json", (req, res) => {
            res.json(this.openApi);
            res.end();
        });
    }

    /**
     * Add the default middlewares to express to make the Api work
     * Override with your own middleware needs
     */
    prepareApplication() {
        this.application.use(bodyParser.json());
        this.application.use(compression());
        return this;
    }

    runApplication(port: number = 80) {
        return new P<this>((resolve, reject) => {
            var server = this.application.listen(port, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    let host = server.address().address;
                    let port = server.address().port;
                    console.log('Server listening on [%s]:%s', host, port);
                    resolve(this);
                }
            });
        });
    }

    /**
     * Expose a pipeline on this API. All implemented methods are automatically binded to the corrsponding actions and urls.
     * 
     * @param pipeline The pipeline to expose on the API
     * @param name The singular name of the underlying resource. It is used to generated the url of the endpoint.
     * @param pluralName The plural name the underlying resource. It is used to generated the url of the endpoint. If not provided, it defaults to `${name}s`
     */
    expose(pipeline: PipelineAbstract, name: string, pluralName: string = `${name}s`): this {
        // register the pipeline
        this.pipelineByName[name] = pipeline;

        // setup the router
        var resourcesPath = `${this.apiPath}/${pluralName}`;
        var router = express.Router();

        // error handling closure for this endpoint
        var handleError = (error, res: express.Response) => {
            res.status(500).end();
        };

        // create the routes for this endpoint

        // get many resources
        router.get("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // separate options from query based on pipeline metadata
            //var options = _.pickBy(req.query, pipeline.isAnOption)
            //var query = _.pickBy(req.query, pipeline.isAQuery)

            // run the query
            pipeline.read(req.query, {}).then(wrapper => {
                res.status(200).json(wrapper);
                res.end();
            }).catch(error => {
                handleError(error, res)
            }).done();
        })

        // get a resource by its id
        router.get("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var id = req.params.id

            // run the query
            pipeline.read({
                id: id
            }, options).then(wrapper => {
                if (wrapper.results.length > 0) {
                    res.status(200).json(wrapper.results[0])
                } else {
                    res.status(404)
                }
                res.end();
            }).catch(error => {
                handleError(error, res)
            }).done();
        })

        // create a new resource
        router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var data = req.body

            // run the query
            pipeline.create([data], options).then(createdResources => {
                if (createdResources.length !== 1) {
                    throw new Error(`Api error: unexpected create result for endpoint ${resourcesPath}`)
                }
                res.status(201).json(createdResources[0])
            }).catch(error => {
                handleError(error, res)
            }).done();
        })

        // patch an existing resource
        router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var patch = req.body
            var id = req.params.id

            // run the query
            pipeline.update({
                id: id
            }, patch, options).then(updatedResources => {
                if (updatedResources.length === 0) {
                    res.status(404)
                } else {
                    res.status(200).json(updatedResources[0])
                }
                res.end()
            }).catch(error => {
                handleError(error, res)
            }).done();
        })

        // put is not supported for now... There's no way to 'replace' an entity using pipelines

        // delete an existing resource
        router.delete("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var id = req.params.id

            // run the query
            pipeline.delete({
                id: id
            }, options).then(deletedResources => {
                if (deletedResources.length === 0) {
                    res.status(404)
                } else {
                    res.status(200).json(deletedResources[0])
                }
                res.end()
            }).catch(error => {
                handleError(error, res)
            }).done();
        })

        // attach the router to the express app
        this.application.use(resourcesPath, router);

        // prepare open API metadata for each endpoint
        // TODO


        // return this for easy chaining of operations
        return this;
    }
}
