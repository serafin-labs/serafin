import * as graphql from "graphql"
import * as _ from "lodash"
import * as jsonpointer from 'jsonpointer';
import * as GraphQLJSON from 'graphql-type-json';
import { JSONSchema4 } from "json-schema"

const jsonSchemaToGraphQLTypes = {
    boolean: graphql.GraphQLBoolean,
    number: graphql.GraphQLFloat,
    integer: graphql.GraphQLInt,
    string: graphql.GraphQLString
}

function pathToSchemaName(path: string) {
    return _.upperFirst(path.split("#").pop().split("/").pop())
}

/**
 * This function expect a schema with only local references.
 * allOf, anyOf, oneOf, not, additionalProperties, null type, any type are not supported.
 * If you use any of this functionality in your schema, you may not ba able to plug graphql transport.
 * 
 * @param schema 
 */
export function jsonSchemaToGraphQL(rootSchema: JSONSchema4, rootName: string): { [name: string]: { schema: graphql.GraphQLObjectType, fields: () => any } } {
    let schemaByNames: { [name: string]: { schema: graphql.GraphQLObjectType, fields: any } } = {};
    let _jsonSchemaToGraphQL = (schema: JSONSchema4, name: string) => {
        let isInputType = name.endsWith("Query") || name.endsWith("Options");
        if (name in schemaByNames) {
            return schemaByNames[name]
        }
        if (schema.type === "object" || (!schema.hasOwnProperty("type") && schema.properties)) {
            // create the corresponding GraphQLObjectType
            let fields = _.mapValues(schema.properties, (propertySchema, propertyName) => {
                return {
                    type: _jsonSchemaToGraphQL(propertySchema, `${name}${_.upperFirst(propertyName)}`)
                }
            });
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

            if (schema.definitions) {
                for (let definition in schema.definitions) {
                    _jsonSchemaToGraphQL(schema.definitions[definition], `${name}${_.upperFirst(definition)}`)
                }
            }
            return schemaObject.schema
        }
        if (schema.type === "array") {
            return new graphql.GraphQLList(_jsonSchemaToGraphQL(schema.items, `${name}Element`))
        }
        if (["integer", "number", "boolean", "string"].indexOf(schema.type as string) !== -1) {
            return jsonSchemaToGraphQLTypes[schema.type as string];
        }
        if (schema.$ref) {
            if (!schema.$ref.startsWith("#")) {
                throw Error(`$ref is only supported for local references`)
            }
            return _jsonSchemaToGraphQL(jsonpointer.get(rootSchema, schema.$ref.substr(1)), `${rootName}${pathToSchemaName(schema.$ref)}`)
        }
        if (schema.oneOf || schema.anyOf) {
            return GraphQLJSON
        }
        if (schema.allOf) {
            return GraphQLJSON
        }
        if (schema.type) {
            throw new Error(`'${schema.type}' type is not supported with GraphQL transport.`)
        }
        throw Error(`The input JSON schema contains fields that can't be converted to GraphQL Schema: ${JSON.stringify(schema)}`)
    }
    _jsonSchemaToGraphQL(rootSchema, rootName)
    return schemaByNames
}



