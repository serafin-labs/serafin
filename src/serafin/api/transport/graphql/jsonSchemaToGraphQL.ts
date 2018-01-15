import * as graphql from "graphql"
import * as _ from "lodash"
import * as jsonpointer from 'jsonpointer';
import * as GraphQLJSON from 'graphql-type-json';
import { JSONSchema } from "@serafin/open-api"

/**
 * Basic types that can be converted to JSON Schema directly
 */
const jsonSchemaToGraphQLTypes = {
    boolean: graphql.GraphQLBoolean,
    number: graphql.GraphQLFloat,
    integer: graphql.GraphQLInt,
    string: graphql.GraphQLString
}

/**
 * Utility function to create a name for a given path
 * @param path 
 */
function pathToSchemaName(path: string) {
    return path.split("#").pop().split("/").filter(v => v !== "definitions").map(v => _.upperFirst(v)).join("")
}

/**
 * This function expect a schema with only local references.
 * not, additionalProperties, patternProperties are not supported.
 * If you use any of this functionality in your schema, you may not be able to convert it to graphql format.
 * 
 * @param rootSchema the JSON schema to convert
 * @param rootName name of the main schema object
 * @param propertiesFilter filter function applied to 'options' objects. 'true' means that the property is kept.
 * @param schemaByNames the result schema objects for the given JSON schema
 */
export function jsonSchemaToGraphQL(rootSchema: JSONSchema, rootName: string, propertiesFilter: (name: string) => boolean, schemaByNames: { [name: string]: { schema: graphql.GraphQLObjectType, fields: () => any } } = {}): { [name: string]: { schema: graphql.GraphQLObjectType, fields: () => any } } {
    // let's define the recursive method to convert JSON schemas
    let _jsonSchemaToGraphQL = (schema: JSONSchema, name: string) => {
        // if this schema was already converted, let's use the existing reference
        if (name in schemaByNames) {
            return schemaByNames[name]
        }
        let result;
        // if our object name contains Query or Options, it means it's an input type for Serafin pipelines
        let isInputType = name.search("Query") !== -1 || name.search("Options") !== -1;

        // if the schema type is "object" and we have properties definied, we can convert it to GraphQLObjectType or GraphQLInputObjectType
        if (schema.type === "object" || (!schema.hasOwnProperty("type") && schema.properties)) {
            // filter internal options, so they don't appear in the schema
            let properties = _.pickBy(schema.properties, (v, n) => propertiesFilter(n));
            // map all properties to their graphql equivalent
            let fields = _.mapValues(properties, (propertySchema, propertyName) => {
                return {
                    type: _jsonSchemaToGraphQL(propertySchema, `${name}${_.upperFirst(propertyName)}`)
                }
            });
            // create the resulting object
            // here we keep fields as a function to be able to extend it before it is used
            let schemaObject = {
                schema: !isInputType ? new graphql.GraphQLObjectType({
                    name: name || schema.title,
                    description: schema.description,
                    fields: () => schemaObject.fields()
                }) : new graphql.GraphQLInputObjectType({
                    name: name || schema.title,
                    description: schema.description,
                    fields: () => schemaObject.fields()
                }),
                fields: () => fields
            }
            schemaByNames[name] = schemaObject; // keep a reference to reuse it

            result = schemaObject.schema
        } else if (schema.type === "array") {
            // convert 'array' to GraphQLList
            if (Array.isArray(schema.items)) {
                // if items is a list, we can't provide an accurate type for the list
                result = new graphql.GraphQLList(GraphQLJSON);
            } else {
                result = new graphql.GraphQLList(_jsonSchemaToGraphQL(schema.items, `${name}Element`))
            }
        } else if (["integer", "number", "boolean", "string"].indexOf(schema.type as string) !== -1) {
            // convert basic types
            result = jsonSchemaToGraphQLTypes[schema.type as string];
        } else if (schema.$ref) {
            // if we have an external ref, throw an error
            if (!schema.$ref.startsWith("#")) {
                throw Error(`$ref is only supported for local references`)
            }
            result = _jsonSchemaToGraphQL(jsonpointer.get(rootSchema, schema.$ref.substr(1)), `${rootName}${pathToSchemaName(schema.$ref)}`)
        } else if (schema.oneOf || schema.anyOf || schema.allOf) {
            // there is no way currently to handle Union for input in graphql, so GraphQLJSON is our best option. The pipeline will verify its format anyway
            result = GraphQLJSON
        } else {
            // if we endup here, the schema is empty or contains unexpected/unsupported fields. The only acceptable result is a JSON object.
            result = GraphQLJSON
        }

        // if definitions are included along with the schema, we convert them also
        if (schema.definitions) {
            for (let definition in schema.definitions) {
                _jsonSchemaToGraphQL(schema.definitions[definition], `${name}${_.upperFirst(definition)}`)
            }
        }

        return result
    }
    _jsonSchemaToGraphQL(rootSchema, rootName)
    return schemaByNames
}



