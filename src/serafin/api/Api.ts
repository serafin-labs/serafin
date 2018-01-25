import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import { OpenAPIObject, ParameterObject } from "@serafin/open-api"
import { PipelineAbstract } from "../pipeline"
import { throughJsonSchema } from "../util/throughJsonSchema"
import { validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../error/Error"
import { TransportInterface } from "./transport/TransportInterface";

/**
 * Api class represents a set of endpoints based on pipelines.
 * It will register all routes for the endpoints and for metadata (swagger / open API).
 */
export class Api {

    /**
     * Map of all exposed pipelines
     */
    public pipelineByName: { [name: string]: PipelineAbstract<any, any> } = {}

    /**
     * Base path of the API
     */
    public get basePath(): string {
        return this.openApi.basePath || ""
    }

    /**
     * List of transports configured
     */
    private transports: TransportInterface[] = []

    /**
     * @param application the express app the Api will rely on to register endpoints
     * @param openApi Base open api document. To be used to provide general information about the api.
     */
    constructor(public application: express.Application, public openApi: OpenAPIObject = <any>{}) {
        // init open Api specs
        this.openApi.paths = this.openApi.paths || {};
        this.openApi.components = this.openApi.components || {};
        this.openApi.components.schemas = this.openApi.components.schemas || {};
        this.openApi.components.schemas.Error = {
            type: "object",
            properties: {
                code: { type: "number" },
                message: { type: "string" }
            }
        }

        // setup endpoints for api metadata
        this.application.get(this.basePath + "/api.json", (req, res) => {
            res.json(this.openApi).end();
        });
    }

    /**
     * Filter function used to test if an option name is internal or not
     */
    isNotAnInternalOption = (name: string) => !name.startsWith("_");

    /**
     * Filter used to remove input options that are not supposed to be set by the client.
     * By default all options starting with _ are reserved for internal use and cannot be set by the request
     */
    filterInternalOptions(options: Object) {
        return _.pickBy(options, (value, key) => this.isNotAnInternalOption(key));
    }

    /**
     * Filter used to remove options parameters that are not supposed to be exposed on the Open Api Spec.
     * By default all options starting with _ are reserved for internal use and cannot be set by the request
     */
    filterInternalParameters(parameters: ParameterObject[]) {
        return parameters.filter((parameter) => this.isNotAnInternalOption(parameter.name))
    }

    /**
     * Add the given transport to this api.
     * 
     * @param transport 
     */
    configure(transport: TransportInterface): this {
        transport.init(this);
        this.transports.push(transport);
        return this
    }

    /**
     * Expose a pipeline on this API. The pipeline is passed to the underlying transports.
     * 
     * @param pipeline The pipeline to expose on the API
     * @param name The singular name of the underlying resource.
     * @param pluralName The plural name the underlying resource. If not provided, it defaults to `${name}s`
     */
    use(pipeline: PipelineAbstract<any, any>, name: string, pluralName: string = `${name}s`): this {
        this.pipelineByName[pluralName] = pipeline
        for (let transport of this.transports) {
            transport.use(pipeline, name, pluralName)
        }
        return this
    }

    /**
     * Create an error object that contains info about the request context
     * 
     * @param cause 
     * @param req 
     */
    static apiError(cause: any, req: express.Request) {
        return new VError({
            name: "SerafinRequestError",
            cause: cause,
            info: {
                url: req.url,
                method: req.method,
                ip: req.ip
            }
        }, `Request ${req.method} ${req.baseUrl}${req.url} by ${req.ip} failed`)
    }
}