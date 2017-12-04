import * as Ajv from "ajv";
import * as Swagger from 'swagger-schema-official';
import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import * as ExpressGraphQL from 'express-graphql'
import * as graphql from "graphql"
import { JSONSchema4 } from "json-schema"
import { jsonSchemaToGraphQL } from "./jsonSchemaToGraphQL"
import { TransportInterface } from "../TransportInterface"
import { PipelineAbstract } from "../../../pipeline/Abstract"
import { Api } from "../../Api"
import { validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../../../error/Error"
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToSwaggerParameter } from "../../openApiUtils"

export interface GraphQLOptions {
    /**
     * If provided, the Api will use this function to gather internal options for graphql queries.
     * It can be used for example to pass _user or _role to the underlying pipeline.
     */
    internalOptions?: (req: express.Request) => Object

    /**
     * If true, graphiql is automatically activated on '[apiPath]/graphql' when accessing with a browser.
     * @default false
     */
    graphiql?: boolean

    /**
     * If true, the schema of graphql queries is automatically exposed on '[apiPath]/graphqlSchema'.
     * @default false
     */
    schema?: boolean
}

/**
 * A Transport to expose pipelines as graphql queries.
 * It creates automatically a 'graphql' endpoint where you can send your requests.
 * /!\ The graphql transport supports only a subpart of pipelines capabilities currently. Only read is available and there are restrictions on the json schema features you can use.
 */
export class GraphQLTransport implements TransportInterface {
    private api: Api
    private graphQlModelTypes: { pipeline: PipelineAbstract, schema: graphql.GraphQLObjectType }[] = [];
    private graphQlSchemaQueries: any = {};
    private _graphQlSchema: graphql.GraphQLSchema;
    private get graphQlSchema() {
        if (!this._graphQlSchema) {
            this._graphQlSchema = new graphql.GraphQLSchema({
                query: new graphql.GraphQLObjectType({
                    name: "Query",
                    fields: this.graphQlSchemaQueries
                })
            });
        }
        return this._graphQlSchema;
    }
    protected graphQlRoot: any = {};
    constructor(protected options: GraphQLOptions = {}) {
    }

    /**
     * Attach this transport to the Api
     * 
     * @param api 
     */
    init(api: Api) {
        this.api = api;
        let graphqlPath = `${this.api.basePath}/graphql`;
        this.api.application.use(graphqlPath, ExpressGraphQL(() => {
            return {
                schema: this.graphQlSchema,
                rootValue: this.graphQlRoot,
                graphiql: this.options.hasOwnProperty("graphiql") ? this.options.graphiql : false,
            }
        }));
        if (this.options.schema === true) {
            let graphqlSchemaPath = `${this.api.basePath}/graphqlSchema`;
            this.api.application.get(graphqlSchemaPath, (req, res) => {
                res.send(graphql.printSchema(this.graphQlSchema)).status(200).end();
            })
        }
    }

    /**
     * Use the given pipeline.
     * 
     * @param pipeline 
     * @param name 
     * @param pluralName 
     */
    use(pipeline: PipelineAbstract, name: string, pluralName: string) {
        let pipelineSchema = pipeline.schema;
        let relations = pipeline.relations;

        // prepare Ajv filters
        let ajv = new Ajv({ coerceTypes: true, removeAdditional: true });
        ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
        ajv.addSchema(pipelineSchema.schema, "pipelineSchema");

        let readQueryFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readQuery' });
        let readOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readOptions' });
        // let's add the root resolver for this pipeline
        this.graphQlRoot[pluralName] = async (params, request: express.Request) => {
            let options = this.api.filterInternalOptions(_.cloneDeep(params.options || {}));
            if (this.options.internalOptions) {
                _.merge(options, this.options.internalOptions(request))
            }
            let internalOptions
            let query = _.cloneDeep(params.query || {});
            let optionsValid = readOptionsFilter(options);
            let queryValid = readQueryFilter(query);
            if (this.options.internalOptions) {
                _.merge(options, this.options.internalOptions(request))
            }

            if (!optionsValid || !queryValid) {
                let error = Api.apiError(validationError(ajv.errorsText(optionsValid ? readQueryFilter.errors : readOptionsFilter.errors)), request)
                throw error;
            }

            return await pipeline.read(query, options)
        }
        // create the graphql query schema from the pipeline metadata
        let schemaName = _.upperFirst(name)
        let graphQLSchemas = jsonSchemaToGraphQL(pipelineSchema.schema, schemaName);
        let modelSchema = graphQLSchemas[schemaName];
        this.graphQlModelTypes.push({
            pipeline: pipeline,
            schema: modelSchema.schema
        });
        for (let relation of relations.relations) {
            let existingFieldsFunction = modelSchema.fields;
            modelSchema.fields = ((relation, existingFieldsFunction) => () => {
                let existingFields = existingFieldsFunction();
                let pipeline = typeof relation.pipeline === "function" ? relation.pipeline() : relation.pipeline
                let relationType = _.find(this.graphQlModelTypes, m => m.pipeline === pipeline)
                if (relation.type === "one") {
                    existingFields[relation.name] = {
                        type: relationType.schema,
                        resolve: async (entity) => {
                            let results = await relations.fetchRelationForResource(relation, entity)
                            return results[0];
                        }
                    }
                } else {
                    existingFields[relation.name] = {
                        type: new graphql.GraphQLList(relationType.schema),
                        resolve: async (entity) => {
                            let results = await relations.fetchRelationForResource(relation, entity)
                            return results;
                        }
                    }
                }
                return existingFields
            })(relation, existingFieldsFunction)
        }
        let readResultSchema = graphQLSchemas[`${schemaName}ReadResults`];
        let existingFieldsFunction = readResultSchema.fields
        readResultSchema.fields = () => {
            let existingFields = existingFieldsFunction();
            existingFields.results = { type: new graphql.GraphQLList(modelSchema.schema) };
            return existingFields
        }
        this.graphQlSchemaQueries[pluralName] = {
            type: readResultSchema.schema,
            args: {
                query: {
                    type: graphQLSchemas[`${schemaName}ReadQuery`].schema
                },
                options: {
                    type: graphQLSchemas[`${schemaName}ReadOptions`].schema
                }
            }
        };
    }


}