import * as Ajv from "ajv";
import * as express from 'express';
import * as _ from 'lodash';
import * as VError from 'verror';
import * as ExpressGraphQL from 'express-graphql'
import * as graphql from "graphql"
import { jsonSchemaToGraphQL } from "./jsonSchemaToGraphQL"
import { TransportInterface } from "../TransportInterface"
import { PipelineAbstract } from "../../../pipeline/Abstract"
import { Api } from "../../Api"
import { validationError, notFoundError, ValidationErrorName, NotFoundErrorName, ConflictErrorName, NotImplementedErrorName, UnauthorizedErrorName } from "../../../error/Error"
import { flattenSchemas, jsonSchemaToOpenApiSchema, pathParameters, remapRefs, removeDuplicatedParameters, schemaToOpenApiParameter } from "../../openApiUtils"
import { metaSchema } from "../../../openApi"
import { PipelineRelations } from "../../../pipeline/Relations";

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
        let pipelineSchemaBuilder = pipeline.schemaBuilder;
        let relations = pipeline.relations;

        // prepare Ajv filters
        let ajv = new Ajv({ coerceTypes: true, removeAdditional: true, useDefaults: true, meta: metaSchema });
        ajv.addSchema(pipelineSchemaBuilder.schema, "pipelineSchema");
        let readQueryFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readQuery' });
        let readOptionsFilter = ajv.compile({ "$ref": 'pipelineSchema#/definitions/readOptions' });

        // let's add the root resolver for this pipeline
        this.graphQlRoot[pluralName] = async (params, request: express.Request) => {
            let options = this.api.filterInternalOptions(_.cloneDeep(params.options || {}));
            if (this.options.internalOptions) {
                _.merge(options, this.options.internalOptions(request))
            }
            let query = _.cloneDeep(params.query || {});
            let optionsValid = readOptionsFilter(options);
            let queryValid = readQueryFilter(query);

            if (!optionsValid || !queryValid) {
                let error = Api.apiError(validationError(ajv.errorsText(optionsValid ? readQueryFilter.errors : readOptionsFilter.errors)), request)
                throw error;
            }

            return await pipeline.read(query, options)
        }

        // let's create the graphql query schema from the pipeline metadata
        // name of the schema
        let schemaName = _.upperFirst(name)

        // transform json schema to graphql objects
        let graphQLSchemas = jsonSchemaToGraphQL(pipelineSchemaBuilder.schema, schemaName, this.api.isNotAnInternalOption);

        // get the schema of the model
        let modelSchema = graphQLSchemas[schemaName];
        // and keep a reference to it for other pipelines that may reference it
        this.graphQlModelTypes.push({
            pipeline: pipeline,
            schema: modelSchema.schema
        });

        // add relations of this model as sub fields of the graphql schema
        if (relations) {
            for (let relation of relations.list) {
                let existingFieldsFunction = modelSchema.fields;
                modelSchema.fields = ((relation, existingFieldsFunction) => () => {
                    // get the existing fields of the unerlying function
                    let existingFields = existingFieldsFunction();
                    // resolve the pipeline reference
                    let pipeline = typeof relation.pipeline === "function" ? relation.pipeline() : relation.pipeline
                    // find the model graphql type of this relation
                    let relationType = _.find(this.graphQlModelTypes, m => m.pipeline === pipeline)
                    if (!relationType) {
                        // if the relation type does not exist, this means the pipeline was never added to the api
                        // we have to convert it on the fly
                        let relationModelName = `${schemaName}${_.upperFirst(relation.name)}`;
                        let relationGraphQLSchemas = jsonSchemaToGraphQL(pipeline.schemaBuilder.schema, relationModelName, this.api.isNotAnInternalOption);
                        relationType = {
                            schema: relationGraphQLSchemas[relationModelName].schema,
                            pipeline: pipeline
                        }
                    }
                    // add the field for this relation
                    if (relation.type === "one") {
                        existingFields[relation.name] = {
                            type: relationType.schema,
                            resolve: async (entity) => {
                                if (entity[relation.name]) {
                                    return entity[relation.name]
                                }
                                let data = await PipelineRelations.fetchForResource(relation, entity)
                                return data[0];
                            }
                        }
                    } else {
                        existingFields[relation.name] = {
                            type: new graphql.GraphQLList(relationType.schema),
                            resolve: async (entity) => {
                                if (entity[relation.name]) {
                                    return entity[relation.name]
                                }
                                let data = await PipelineRelations.fetchForResource(relation, entity)
                                return data;
                            }
                        }
                    }
                    return existingFields
                })(relation, existingFieldsFunction)
            }
        }

        // extend the readData schemas as it only contains extra fields
        let readDataSchema = graphQLSchemas[`${schemaName}ReadData`];
        let existingFieldsFunction = readDataSchema.fields
        readDataSchema.fields = () => {
            let existingFields = existingFieldsFunction();
            existingFields.data = { type: new graphql.GraphQLList(modelSchema.schema) };
            return existingFields
        }

        // create the main query function for this pipeline
        this.graphQlSchemaQueries[pluralName] = {
            type: readDataSchema.schema,
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