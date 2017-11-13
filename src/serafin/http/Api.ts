import * as Swagger from 'swagger-schema-official';
import * as express from 'express';
import * as _ from 'lodash';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import { JSONSchema4 } from "json-schema"
import { PipelineAbstract } from "../pipeline/Abstract"

/**
 * Get a schema sub part from the pipeline schema.
 * 
 * @param schema 
 * @param method 
 * @param target 
 */
function extractSchema(schema: JSONSchema4, method: "create" | "update" | "read" | "patch" | "delete", target: "query" | "options" | "resources" | "values") {
    if (schema.properties.methods.properties[method] && schema.properties.methods.properties[method].properties && schema.properties.methods.properties[method].properties[target]) {
        return schema.properties.methods.properties[method] && schema.properties.methods.properties[method].properties[target]
    }
    return null
}

/**
 * Find the schema pointed out by `path` in the given defnitions structure
 * 
 * @param path 
 * @param definitions 
 */
function locateSchema(path: string, definitions: { [definitionsName: string]: Swagger.Schema }): JSONSchema4 {
    if (path.startsWith("#/definitions/")) {
        var currentTarget: any = definitions;
        path.substr("#/definitions/".length).split("/").forEach(nextTarget => {
            currentTarget = currentTarget[nextTarget]
        })
        return currentTarget
    }
    // only local schema in definitions are supported
    return null
}

/**
 * Deduce parameters to set in Open API spec from the JSON Schema provided.
 * /!\ This function doesn't support the full spectrum of JSON Schema.
 * Things like pattern properties are for example impossible to convert to Open API Parameter format.
 * 
 * @param schema 
 * @param definitions 
 */
function schemaToSwaggerParameter(schema: JSONSchema4, definitions: { [definitionsName: string]: Swagger.Schema }): Swagger.Parameter[] {
    if (schema && schema.$ref) {
        // the schema is a reference. Let's try to locate the schema
        return schemaToSwaggerParameter(locateSchema(schema.$ref, definitions), definitions)
    }
    if (schema && schema.type === "object") {
        let results = []
        for (let property in schema.properties) {
            let propertySchema = schema.properties[property]
            if (["string", "number", "boolean", "integer"].indexOf(propertySchema.type as string) !== -1) {
                // we have a primitive type
                let parameter: Swagger.Parameter = {
                    in: "query",
                    name: property,
                    type: propertySchema.type as any,
                    description: propertySchema.description,
                    required: schema.required && schema.required.indexOf(property) !== -1,

                }
                if (propertySchema.minimum) {
                    parameter.minimum = propertySchema.minimum
                }
                if (propertySchema.maximum) {
                    parameter.maximum = propertySchema.maximum
                }
                if (propertySchema.default) {
                    parameter.default = propertySchema.default
                }
                results.push(parameter)
            }
            if (propertySchema.type === "array" && ["string", "number", "boolean", "integer"].indexOf(propertySchema.items["type"] as string) !== -1) {
                // if the array contains a primitive type
                let parameter: Swagger.Parameter = {
                    in: "query",
                    name: property,
                    type: "array",
                    description: propertySchema.description,
                    required: schema.required && schema.required.indexOf(property) !== -1,
                    collectionFormat: "multi",
                    items: {
                        type: propertySchema.items["type"] as any
                    }
                }
                if (propertySchema.default) {
                    parameter.default = propertySchema.default
                }
                results.push(parameter)
            }
        }
        if (schema.oneOf) {
            results = results.concat(schema.oneOf.map(subSchema => schemaToSwaggerParameter(subSchema, definitions)).reduce((p, c) => p.concat(c), []))
        }
        if (schema.anyOf) {
            results = results.concat(schema.anyOf.map(subSchema => schemaToSwaggerParameter(subSchema, definitions)).reduce((p, c) => p.concat(c), []))
        }
        if (schema.allOf) {
            results = results.concat(schema.allOf.map(subSchema => schemaToSwaggerParameter(subSchema, definitions)).reduce((p, c) => p.concat(c), []))
        }
        return results
    }
    return []
}

/**
 * Filter a paramater array to remove duplicates. The first occurance is kept and the others are discarded.
 * 
 * @param parameters 
 */
function removeDuplicatedParameters(parameters: Swagger.Parameter[]): Swagger.Parameter[] {
    // filter duplicated params (in case allOf, oneOf or anyOf contains multiple schemas with the same property)
    return parameters.filter((value: Swagger.Parameter, index, array) => {
        for (var i = 0; i < index; ++i) {
            if (array[i].name === value.name) {
                return false
            }
        }
        return true
    })
}

/**
 * Go through the given schema and remove properties not supported by Open API
 * @param schema 
 */
function jsonSchemaToOpenApiSchema(schema: JSONSchema4) {
    delete schema.id;
    delete schema.$id;
    delete schema.$schema;
    if (schema.properties) {
        for (let property in schema.properties) {
            jsonSchemaToOpenApiSchema(schema.properties[property])
        }
    }
    if (schema.definitions) {
        for (let property in schema.definitions) {
            jsonSchemaToOpenApiSchema(schema.definitions[property])
        }
    }
    if (schema.oneOf) {
        schema.oneOf.forEach(s => jsonSchemaToOpenApiSchema(s))
    }
    if (schema.allOf) {
        schema.allOf.forEach(s => jsonSchemaToOpenApiSchema(s))
    }
    if (schema.anyOf) {
        schema.anyOf.forEach(s => jsonSchemaToOpenApiSchema(s))
    }
    return schema
}
/**
 * go through the whole schema and modify refs that points to a local schema and prepend the basepath
 */
function remapRefs(schema: JSONSchema4, basePath: string) {
    if (schema.$ref && schema.$ref.startsWith("#")) {
        let $ref = schema.$ref.substr(1);
        schema.$ref = `${basePath}${$ref}`
    }
    if (schema.properties) {
        for (let property in schema.properties) {
            remapRefs(schema.properties[property], basePath)
        }
    }
    if (schema.definitions) {
        for (let property in schema.definitions) {
            remapRefs(schema.definitions[property], basePath)
        }
    }
    if (schema.oneOf) {
        schema.oneOf.forEach(s => remapRefs(s, basePath))
    }
    if (schema.allOf) {
        schema.allOf.forEach(s => remapRefs(s, basePath))
    }
    if (schema.anyOf) {
        schema.anyOf.forEach(s => remapRefs(s, basePath))
    }
    return schema
}

/**
 * flatten the given schema definitions, so any sub-schema is moved back to the top and refs are moved accordingly
 * @param schema 
 */
function flatten(definitions: { [name: string]: JSONSchema4 }) {
    // recursive function that remap ref to a the flatten architecture
    let remap = (schema: JSONSchema4 | JSONSchema4[], originalPath: string, newPath: string) => {
        if (Array.isArray(schema)) {
            schema.forEach(e => remap(e, originalPath, newPath))
        } else {
            if (schema.$ref && schema.$ref === originalPath) {
                schema.$ref = newPath
            }
            if (schema.properties) {
                for (let property in schema.properties) {
                    remap(schema.properties[property], originalPath, newPath)
                }
            }
            if (schema.definitions) {
                for (let property in schema.definitions) {
                    remap(schema.definitions[property], originalPath, newPath)
                }
            }
            if (schema.oneOf) {
                schema.oneOf.forEach(s => remap(s, originalPath, newPath))
            }
            if (schema.allOf) {
                schema.allOf.forEach(s => remap(s, originalPath, newPath))
            }
            if (schema.anyOf) {
                schema.anyOf.forEach(s => remap(s, originalPath, newPath))
            }
        }
    }
    // determine schemas that needs to be moved
    let definitionsToMove = []
    for (let name in definitions) {
        let schema = definitions[name]
        if (schema.definitions) {
            for (let subSchemaName in schema.definitions) {
                let newSchemaName = `${name}${_.upperFirst(subSchemaName)}`
                definitionsToMove.push([newSchemaName, schema.definitions[subSchemaName]])
                remap(definitions, `#/definitions/${name}/definitions/${subSchemaName}`, `#/definitions/${newSchemaName}`)
            }
            delete schema.definitions
        }
    }
    // move the definitions to the top
    definitionsToMove.forEach((def) => {
        let [name, schema] = def;
        definitions[name] = schema;
    })
    // if definitions were moved, call recursively flatten to process other 'definitions' that have emerged
    if (definitionsToMove.length > 0) {
        flatten(definitions)
    }
}

/**
 * Parse the given paramters array and move the specified ones to `path`
 * 
 * @param parameters 
 */
function pathParameters(parameters: Swagger.Parameter[], inPath: string[]): Swagger.Parameter[] {
    parameters.forEach(parameter => {
        if (inPath.indexOf(parameter.name) !== -1) {
            parameter.in = "path"
        }
    })
    return parameters
}

/**
 * Api class represents a set of endpoints based on pipelines.
 * It will register all routes for the endpoints and for metadata (swagger / open API).
 */
export class Api {

    /**
     * Map of all exposed pipelines
     */
    protected pipelineByName: { [name: string]: PipelineAbstract } = {}

    /**
     * Base path of the API
     */
    protected get basePath(): string {
        return this.openApi.basePath || ""
    }

    /**
     * @param application the express app the Api will rely on to register endpoints
     * @param openApi Base open api document. To be used to provide general information about the api.
     */
    constructor(protected application: express.Application, protected openApi: Swagger.Spec = <any>{}) {
        // init open Api specs
        this.openApi.paths = this.openApi.paths || {};
        this.openApi.definitions = this.openApi.definitions || {};
        this.openApi.definitions.Error = {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        }

        // setup endpoints for api metadata
        this.application.get(this.basePath + "/api.json", (req, res) => {
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
        return new Promise<this>((resolve, reject) => {
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
     * @param name The singular name of the underlying resource. It is used to generate the url of the endpoint.
     * @param pluralName The plural name the underlying resource. It is used to generate the url of the endpoint. If not provided, it defaults to `${name}s`
     */
    use(pipeline: PipelineAbstract, name: string, pluralName: string = `${name}s`): this {
        // register the pipeline
        this.pipelineByName[name] = pipeline;

        // setup the router
        var endpointPath = `${this.basePath}/${pluralName}`;
        var resourcesPath = `/${pluralName}`;
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
            });
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
            });
        })

        // create a new resource
        router.post("", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var data = req.body

            // run the query
            pipeline.create([data], options).then(createdResources => {
                if (createdResources.length !== 1) {
                    throw new Error(`Api Error: unexpected create result for endpoint ${resourcesPath}`)
                }
                res.status(201).json(createdResources[0])
            }).catch(error => {
                handleError(error, res)
            });
        })

        // patch an existing resource
        router.patch("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var patch = req.body
            var id = req.params.id

            // run the query
            pipeline.patch({
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
            });
        })

        // put an existing resource
        router.put("/:id", (req: express.Request, res: express.Response, next: (err?: any) => void) => {
            // extract parameters
            var options = req.query
            var data = req.body
            var id = req.params.id

            // run the query
            pipeline.update(id, data, options).then(updatedResource => {
                if (!updatedResource) {
                    res.status(404)
                } else {
                    res.status(200).json(updatedResource)
                }
                res.end()
            }).catch(error => {
                handleError(error, res)
            });
        })

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
            });
        })

        // attach the router to the express app
        this.application.use(endpointPath, router);

        // import pipeline schemas to openApi definitions
        var modelSchema = pipeline.modelSchema;
        var optionsSchema = pipeline.flatOptionsSchemas;
        this.openApi.definitions[name] = remapRefs(jsonSchemaToOpenApiSchema(_.cloneDeep(modelSchema.schemaObject)), `#/definitions/${name}`) as any
        flatten(this.openApi.definitions as any)

        // prepare open API metadata for each endpoint
        var resourcesPathWithId = `${resourcesPath}/{id}`;
        this.openApi.paths[resourcesPath] = this.openApi.paths[resourcesPath] || {};
        this.openApi.paths[resourcesPathWithId] = this.openApi.paths[resourcesPathWithId] || {};

        // general get
        this.openApi.paths[resourcesPath]["get"] = {
            description: `Find ${_.upperFirst(pluralName)}`,
            operationId: `find${_.upperFirst(pluralName)}`,
            parameters: removeDuplicatedParameters(schemaToSwaggerParameter(modelSchema.readQuery, this.openApi.definitions).concat(schemaToSwaggerParameter(optionsSchema.read ? optionsSchema.read.schemaObject : null, this.openApi.definitions))),
            responses: {
                200: {
                    description: `${_.upperFirst(pluralName)} corresponding to the query`,
                    schema: {
                        type: 'object',
                        properties: {
                            results: {
                                type: 'array',
                                items: { "$ref": `#/definitions/${name}` },
                            }
                        }
                    }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // post a new resource
        this.openApi.paths[resourcesPath]["post"] = {
            description: `Create a new ${_.upperFirst(name)}`,
            operationId: `add${_.upperFirst(name)}`,
            parameters: removeDuplicatedParameters(schemaToSwaggerParameter(optionsSchema.create ? optionsSchema.create.schemaObject : null, this.openApi.definitions)).concat([{
                in: "body",
                name: name,
                description: `The ${_.upperFirst(name)} to be created.`,
                schema: { $ref: `#/definitions/${name}CreateValues` }
            }]),
            responses: {
                201: {
                    description: `${_.upperFirst(name)} created`,
                    schema: { $ref: `#/definitions/${name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                409: {
                    description: "Conflict",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // get by id
        this.openApi.paths[resourcesPathWithId]["get"] = {
            description: `Get one ${_.upperFirst(name)} by its id`,
            operationId: `get${_.upperFirst(name)}ById`,
            parameters: [{
                in: "path",
                name: "id",
                type: "string",
                required: true
            }],
            responses: {
                200: {
                    description: `${_.upperFirst(name)} corresponding to the provided id`,
                    schema: { $ref: `#/definitions/${name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // put by id
        this.openApi.paths[resourcesPathWithId]["put"] = {
            description: `Put a ${_.upperFirst(name)} using its id`,
            operationId: `put${_.upperFirst(name)}`,
            parameters: removeDuplicatedParameters(schemaToSwaggerParameter(optionsSchema.update ? optionsSchema.update.schemaObject : null, this.openApi.definitions)).concat([
                {
                    in: "body",
                    name: name,
                    description: `The ${_.upperFirst(name)} to be updated.`,
                    schema: { $ref: `#/definitions/${name}UpdateValues` }
                }, {
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Updated ${_.upperFirst(name)}`,
                    schema: { $ref: `#/definitions/${name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // patch by id
        this.openApi.paths[resourcesPathWithId]["patch"] = {
            description: `Patch a ${_.upperFirst(name)} using its id`,
            operationId: `patch${_.upperFirst(name)}`,
            parameters: removeDuplicatedParameters(schemaToSwaggerParameter(modelSchema.patchQuery, this.openApi.definitions).concat(schemaToSwaggerParameter(optionsSchema.patch ? optionsSchema.patch.schemaObject : null, this.openApi.definitions))).concat([
                {
                    in: "body",
                    name: name,
                    description: `The patch of ${_.upperFirst(name)}.`,
                    schema: { $ref: `#/definitions/${name}PatchValues` }
                }, {
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Updated ${_.upperFirst(name)}`,
                    schema: { $ref: `#/definitions/${name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // delete by id
        this.openApi.paths[resourcesPathWithId]["delete"] = {
            description: `Delete a ${_.upperFirst(name)} using its id`,
            operationId: `delete${_.upperFirst(name)}`,
            parameters: removeDuplicatedParameters(schemaToSwaggerParameter(optionsSchema.delete ? optionsSchema.delete.schemaObject : null, this.openApi.definitions)).concat([
                {
                    in: "path",
                    name: "id",
                    type: "string",
                    required: true
                }
            ]),
            responses: {
                200: {
                    description: `Deleted ${_.upperFirst(name)}`,
                    schema: { $ref: `#/definitions/${name}` }
                },
                400: {
                    description: "Bad request",
                    schema: { $ref: '#/definitions/Error' }
                },
                404: {
                    description: "Not Found",
                    schema: { $ref: '#/definitions/Error' }
                },
                default: {
                    description: "Unexpected error",
                    schema: { $ref: '#/definitions/Error' }
                }
            }
        }

        // return this for easy chaining of operations
        return this;
    }
}
