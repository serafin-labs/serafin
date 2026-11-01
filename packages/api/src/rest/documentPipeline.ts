import type { ComponentType, ComponentTypes, OpenApiBuilder, OperationObject, ParameterObject, ResponsesObject } from "@serafin/open-api"
import type { SchemaBuilder } from "@serafin/schema-builder"
import type { ExposedPipeline } from "../TransportInterface.js"
import { isObjectSchema, schemaDescription, schemaProperties, type Schema } from "./schemas.js"

/**
 * The routes registered for a pipeline.
 */
export interface Routes {
    /** `GET /books` */
    find: boolean
    /** `GET /books/{id}` */
    get: boolean
    /** `POST /books` */
    create: boolean
    /** `PATCH /books/{id}` */
    patchOne: boolean
    /** `PATCH /books`, when the patch query can select several resources */
    patchMany: boolean
    /** `DELETE /books/{id}` */
    deleteOne: boolean
    /** `DELETE /books`, when the delete query can select several resources */
    deleteMany: boolean
}

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The schemas and responses shared by every pipeline, added once.
 */
function withSharedComponents(openApi: OpenApiBuilder): OpenApiBuilder {
    const ensure = <T extends ComponentType>(b: OpenApiBuilder, type: T, name: string, component: ComponentTypes[T]) =>
        b.hasComponent(type, name) ? b : b.addComponent(type, name, component)
    let builder = ensure(openApi, "schemas", "Error", {
        type: "object",
        description: "The body of every error response",
        properties: {
            code: { type: "integer", description: "The HTTP status code" },
            name: { type: "string", description: "The HTTP status in PascalCase, e.g. NotFound" },
            message: { type: "string", description: "A description meant for developers" },
            errors: {
                type: "array",
                description: "What is wrong with the request, value by value, when it is known",
                items: {
                    type: "object",
                    properties: { path: { type: "string", description: "JSON pointer to the faulty value" }, message: { type: "string" } },
                    required: ["path", "message"],
                },
            },
        },
        required: ["code", "name", "message"],
    })
    const error = builder.ref("schemas", "Error")
    for (const [name, description] of [
        ["BadRequest", "The request is invalid"],
        ["NotFound", "The resource does not exist"],
        ["Conflict", "The request conflicts with the current state of the resources"],
        ["UnexpectedError", "An unexpected error"],
    ]) {
        builder = ensure(builder, "responses", name, { description, content: { "application/json": { schema: error } } })
    }
    return builder
}

/**
 * The query parameters of the properties of a query, options or context schema.
 */
function queryParameters(schema: Schema, include: (name: string) => boolean = () => true): ParameterObject[] {
    const { properties, required } = schemaProperties(schema)
    return Object.entries(properties)
        .filter(([name]) => include(name))
        .map(([name, property]) => ({
            in: "query",
            name,
            schema: property,
            ...(schemaDescription(property) !== undefined ? { description: schemaDescription(property) } : {}),
            ...(required.has(name) ? { required: true } : {}),
            ...(isObjectSchema(property) ? { style: "deepObject", explode: true } : {}),
        }))
}

/**
 * The meta of an action: the meta shared by every action, with the action's own meta.
 */
function metaSchema(meta: SchemaBuilder<any>, actionMeta: SchemaBuilder<any>): Schema {
    try {
        return meta.overwriteProperties(actionMeta).schema
    } catch {
        // not plain object schemas: combine them, and close the combination rather than each of them
        const open = ({ additionalProperties, ...schema }: Record<string, any>) => schema
        return { allOf: [open(meta.schema), open(actionMeta.schema)], unevaluatedProperties: false }
    }
}

/**
 * Add the operations of a pipeline to an OpenAPI document, with the schemas they rely on.
 *
 * For a `book` pipeline exposed as `books`, the schemas are `Book` (the model), `BookCreateValues`,
 * `BookPatchValues` and `Book<Action>Results`, and the operations are `findBooks`, `getBook`, `createBooks`,
 * `patchBook`, `patchBooks`, `deleteBook` and `deleteBooks`, tagged `books`.
 */
export function documentPipeline(openApi: OpenApiBuilder, exposed: ExposedPipeline, routes: Routes, isInternal: (name: string) => boolean): OpenApiBuilder {
    const { pipeline, name, pluralName } = exposed
    const schemas = pipeline.schemaBuilders
    const Name = upperFirst(name)
    // operations on several resources need a distinct id when both names are the same
    const Many = pluralName === name ? `Many${upperFirst(pluralName)}` : upperFirst(pluralName)
    const collectionPath = `/${pluralName}`
    const itemPath = `/${pluralName}/{id}`
    const tags = [pluralName]

    let builder = withSharedComponents(openApi).addComponent("schemas", Name, schemas.model.schema)
    if (!builder.hasTag(pluralName)) {
        builder = builder.addTag({ name: pluralName })
    }
    const model = builder.ref("schemas", Name)
    const contextParameters = queryParameters(schemas.context.schema, (n) => !isInternal(n))
    const modelId = schemaProperties(schemas.model.schema).properties.id
    const idParameter: ParameterObject = { in: "path", name: "id", required: true, description: `The id of the ${name}`, schema: modelId ?? { type: "string" } }
    const notId = (n: string) => n !== "id"
    const errors = (...responses: ("BadRequest" | "NotFound" | "Conflict")[]): ResponsesObject => ({
        ...Object.fromEntries(responses.map((r) => [{ BadRequest: 400, NotFound: 404, Conflict: 409 }[r], builder.ref("responses", r)])),
        default: builder.ref("responses", "UnexpectedError"),
    })
    const results = (action: "read" | "create" | "patch" | "delete", description: string) => {
        const component = `${Name}${upperFirst(action)}Results`
        builder = builder.addComponent("schemas", component, {
            type: "object",
            properties: { data: { type: "array", items: model }, meta: metaSchema(schemas.meta, schemas[`${action}Meta`]) },
            required: ["data", "meta"],
        })
        return { description, content: { "application/json": { schema: builder.ref("schemas", component) } } }
    }
    const operation = (path: string, method: string, op: OperationObject) => {
        builder = builder.addOperation(path, method, { tags, ...op })
    }

    if (routes.find || routes.get) {
        const ok = results("read", `The ${pluralName} found`)
        if (routes.find) {
            operation(collectionPath, "get", {
                operationId: `find${Many}`,
                summary: `Find ${pluralName}`,
                parameters: [...queryParameters(schemas.readQuery.schema), ...contextParameters],
                responses: { 200: ok, ...errors("BadRequest") },
            })
        }
        if (routes.get) {
            operation(itemPath, "get", {
                operationId: `get${Name}`,
                summary: `Get a ${name} by id`,
                parameters: [idParameter, ...queryParameters(schemas.readQuery.schema, notId), ...contextParameters],
                responses: { 200: ok, ...errors("BadRequest", "NotFound") },
            })
        }
    }

    if (routes.create) {
        builder = builder.addComponent("schemas", `${Name}CreateValues`, schemas.createValues.schema)
        const values = builder.ref("schemas", `${Name}CreateValues`)
        const created = results("create", `The ${pluralName} created`)
        operation(collectionPath, "post", {
            operationId: `create${Many}`,
            summary: `Create one or several ${pluralName}`,
            parameters: [...queryParameters(schemas.createOptions.schema), ...contextParameters],
            requestBody: {
                required: true,
                description: `The ${name} to create, or a list of ${pluralName} to create`,
                content: { "application/json": { schema: { oneOf: [values, { type: "array", items: values, minItems: 1 }] } } },
            },
            responses: {
                201: { ...created, headers: { Location: { description: `The path of the ${name}, when a single one is created`, schema: { type: "string" } } } },
                ...errors("BadRequest", "Conflict"),
            },
        })
    }

    if (routes.patchOne || routes.patchMany) {
        builder = builder.addComponent("schemas", `${Name}PatchValues`, schemas.patchValues.schema)
        const values = builder.ref("schemas", `${Name}PatchValues`)
        const requestBody = {
            required: true,
            description: `The changes, as a JSON merge patch (RFC 7396)`,
            content: { "application/json": { schema: values }, "application/merge-patch+json": { schema: values } },
        }
        const patched = results("patch", `The ${pluralName} patched`)
        if (routes.patchOne) {
            operation(itemPath, "patch", {
                operationId: `patch${Name}`,
                summary: `Patch a ${name} by id`,
                parameters: [idParameter, ...queryParameters(schemas.patchQuery.schema, notId), ...contextParameters],
                requestBody,
                responses: { 200: patched, ...errors("BadRequest", "NotFound", "Conflict") },
            })
        }
        if (routes.patchMany) {
            operation(collectionPath, "patch", {
                operationId: `patch${Many}`,
                summary: `Patch the ${pluralName} matching the query`,
                parameters: [...queryParameters(schemas.patchQuery.schema), ...contextParameters],
                requestBody,
                responses: { 200: patched, ...errors("BadRequest", "Conflict") },
            })
        }
    }

    if (routes.deleteOne || routes.deleteMany) {
        const deleted = results("delete", `The ${pluralName} deleted`)
        if (routes.deleteOne) {
            operation(itemPath, "delete", {
                operationId: `delete${Name}`,
                summary: `Delete a ${name} by id`,
                parameters: [idParameter, ...queryParameters(schemas.deleteQuery.schema, notId), ...contextParameters],
                responses: { 200: deleted, ...errors("BadRequest", "NotFound") },
            })
        }
        if (routes.deleteMany) {
            operation(collectionPath, "delete", {
                operationId: `delete${Many}`,
                summary: `Delete the ${pluralName} matching the query`,
                parameters: [...queryParameters(schemas.deleteQuery.schema), ...contextParameters],
                responses: { 200: deleted, ...errors("BadRequest") },
            })
        }
    }

    return builder
}
