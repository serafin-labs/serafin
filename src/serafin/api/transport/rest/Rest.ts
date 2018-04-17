import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import { JSONSchema, metaSchema } from "@serafin/open-api"
import { TransportInterface } from "../TransportInterface"
import { PipelineAbstract } from "../../../pipeline/PipelineAbstract"
import { OpenApi } from "./OpenApi"
import { Api } from "../../Api"
import { serafinError, validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../../../error/Error"
import { SchemaBuilder } from '@serafin/schema-builder';
import { restMiddlewareJson, restRootMiddlewareJson } from './RestMiddlewareJson';
import { restMiddlewareJsonApi, restRootMiddlewareJsonApi } from './RestMiddlewareJsonApi';

export interface RestOptions {
    /**
     * If provided, the Api will use this function to gather internal options for this request.
     * It can be used for example to pass _user or _role to the underlying pipeline.
     */
    internalOptions?: (req: express.Request) => Object
}

export class RestTransport implements TransportInterface {
    public api: Api
    constructor(protected options: RestOptions = {}) {
    }

    init(api: Api) {
        this.api = api;
        this.api.application.use(this.api.basePath, restRootMiddlewareJson(this.api));
        this.api.application.use(this.api.basePath, restRootMiddlewareJsonApi(this.api));
    }

    /**
     * Use the given pipeline.
     *
     * @param pipeline
     * @param name
     * @param pluralName
     */
    use(pipeline: PipelineAbstract<any, any>, name: string, pluralName: string) {
        // setup the router
        let endpointPath = `${this.api.basePath}/${pluralName}`;
        let resourcesPath = `/${pluralName}`;

        let openApi = new OpenApi(this.api, pipeline, resourcesPath, name, pluralName);

        this.testOptionsAndQueryConflict(pipeline.schemaBuilders.readQuery.schema, pipeline.schemaBuilders.readOptions.schema);
        this.testOptionsAndQueryConflict(pipeline.schemaBuilders.patchQuery.schema, pipeline.schemaBuilders.patchOptions.schema);
        this.testOptionsAndQueryConflict(pipeline.schemaBuilders.deleteQuery.schema, pipeline.schemaBuilders.deleteOptions.schema);

        // attach the routers to the express app
        this.api.application.use(endpointPath, restMiddlewareJson(this, pipeline, openApi, endpointPath, resourcesPath, name));
        this.api.application.use(endpointPath, restMiddlewareJsonApi(this, pipeline, openApi, endpointPath, resourcesPath, name));

    }

    // error handling closure for this endpoint
    public handleError(error, res: express.Response, next: (err?: any) => void) {
        // handle known errors
        if (![[ValidationErrorName, 400], [NotFoundErrorName, 404], [ConflictErrorName, 409], [NotImplementedErrorName, 405], [UnauthorizedErrorName, 401]].some((p: [string, number]) => {
            let [errorName, code] = p;
            if (VError.findCauseByName(error, errorName)) {
                res.status(code).json({
                    code: code,
                    message: error.message
                })
                return true
            }
            return false
        })) {
            // or pass the error down the chain
            console.error(VError.fullStack(error));
            next(error)
        }
    }

    public handleOptionsAndQuery(req: express.Request, res: express.Response, next: () => any, optionsSchemaBuilder: SchemaBuilder<any>, querySchemaBuilder: SchemaBuilder<any> = null): { options: object, query: object } {
        try {
            let pipelineOptions = this.api.filterInternalOptions(_.cloneDeep(req.query));
            if (this.options.internalOptions) {
                _.merge(pipelineOptions, this.options.internalOptions(req));
            }
            optionsSchemaBuilder.validate(pipelineOptions);

            let pipelineQuery = {};
            if (querySchemaBuilder !== null) {
                pipelineQuery = _.cloneDeep(req.query)
                querySchemaBuilder.validate(pipelineQuery);
            }
            return { options: pipelineOptions, query: pipelineQuery }
        } catch (e) {
            this.handleError(Api.apiError(e, req), res, next)
        }
        return null
    }

    private testOptionsAndQueryConflict(optionsSchema: JSONSchema, querySchema: JSONSchema): void {
        if (optionsSchema && querySchema) {
            let intersection = _.intersection(Object.keys(optionsSchema.properties || {}), Object.keys(querySchema.properties || {}));
            if (intersection.length > 0) {
                throw serafinError('SerafinRestParamsNameConflict', `Name conflict between options and query (${intersection.toString()})`,
                    { conflict: intersection, optionsSchema: optionsSchema, querySchema: querySchema });
            }
        }
    }

    public static availableMethods(pipeline: PipelineAbstract<any, any>) {
        return {
            canRead: !!pipeline.schemaBuilders.readQuery,
            canCreate: !!pipeline.schemaBuilders.createValues,
            canReplace: !!pipeline.schemaBuilders.replaceValues,
            canPatch: !!pipeline.schemaBuilders.patchValues,
            canDelete: !!pipeline.schemaBuilders.deleteQuery
        };
    }
}
