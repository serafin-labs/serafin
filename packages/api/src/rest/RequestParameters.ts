import type { SchemaBuilder } from "@serafin/schema-builder"
import type { Request } from "express"
import qs from "qs"
import { HttpError } from "./errors.js"
import { onlyAllowsArray, schemaProperties, type Schema } from "./schemas.js"

/**
 * Reads the query string parameters of a request into a pipeline query (or create options) and a context.
 *
 * The query string is parsed here rather than by express, so the result does not depend on the `query parser`
 * setting of the application: `id=1&id=2` and `id[]=1&id[]=2` are arrays, `sort[name]=1` is an object.
 * Values are then coerced to the types of their schema, e.g. `limit=10` to a number, and a single value
 * of an array property becomes a one element array.
 *
 * Parameters that are neither in the query schema nor in the context schema are rejected by default rather than
 * ignored, so a typo in a filter cannot silently widen a read, a patch or a delete.
 */
export class RequestParameters {
    private readonly queryProperties: Record<string, Schema>
    private readonly contextProperties: Record<string, Schema>
    private readonly queryCoercion: SchemaBuilder<any>
    private readonly contextCoercion: SchemaBuilder<any>

    constructor(
        querySchema: SchemaBuilder<any>,
        contextSchema: SchemaBuilder<any>,
        isInternal: (name: string) => boolean,
        private readonly rejectUnknown: boolean,
    ) {
        this.queryProperties = schemaProperties(querySchema.schema).properties
        this.contextProperties = Object.fromEntries(Object.entries(schemaProperties(contextSchema.schema).properties).filter(([name]) => !isInternal(name)))
        this.queryCoercion = querySchema.configureValidation({ coerceTypes: true })
        this.contextCoercion = contextSchema.configureValidation({ coerceTypes: true })
    }

    /**
     * @param id the id given in the path, if any. It is added to the query, and cannot be given in the query string too,
     * unless unknown parameters are ignored: the id of the path then wins.
     */
    parse(req: Request, id?: string): { query: Record<string, unknown>; context: Record<string, unknown>; ignored: string[] } {
        const queryIndex = req.originalUrl.indexOf("?")
        const parameters = qs.parse(queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex + 1), {
            depth: 10,
            arrayLimit: 1000,
            parameterLimit: 1000,
        })
        const query: Record<string, unknown> = {}
        const context: Record<string, unknown> = {}
        const unknown: string[] = []
        for (const [name, value] of Object.entries(parameters)) {
            if (id !== undefined && name === "id") {
                if (this.rejectUnknown) {
                    throw new HttpError(400, "The id is given by the path, it cannot be a query parameter too")
                }
                unknown.push(name)
            } else if (name in this.queryProperties) {
                query[name] = value
            } else if (name in this.contextProperties) {
                context[name] = value
            } else {
                unknown.push(name)
            }
        }
        if (unknown.length > 0 && this.rejectUnknown) {
            throw new HttpError(400, `Unknown query parameter${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}`)
        }
        if (id !== undefined) {
            query.id = id
        }
        return {
            query: coerce(this.queryCoercion, this.queryProperties, query),
            context: coerce(this.contextCoercion, this.contextProperties, context),
            ignored: unknown,
        }
    }
}

/**
 * Coerce the values to the types of their schema. Validation itself is left to the pipeline, which reports
 * every problem at once and with the same messages whatever the transport.
 */
function coerce(coercion: SchemaBuilder<any>, properties: Record<string, Schema>, values: Record<string, unknown>): Record<string, unknown> {
    for (const [name, value] of Object.entries(values)) {
        if (!Array.isArray(value) && onlyAllowsArray(properties[name])) {
            values[name] = [value]
        }
    }
    try {
        // ajv coerces in place, all the values it can, even when some are invalid
        coercion.validate(values)
    } catch {
        // reported by the pipeline
    }
    return values
}
