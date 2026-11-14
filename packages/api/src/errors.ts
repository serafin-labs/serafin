import {
    ConflictErrorName,
    ForbiddenErrorName,
    MovedPermanentlyErrorName,
    NotFoundErrorName,
    NotImplementedErrorName,
    UnauthorizedErrorName,
    ValidationErrorName,
} from "@serafin/pipeline"
import { STATUS_CODES } from "node:http"
import VError from "verror"

/**
 * A problem with a single value of a request.
 */
export interface ErrorDetail {
    /** JSON pointer to the faulty value, relative to the request part it belongs to. */
    path: string
    message: string
}

/**
 * The body of every error response.
 */
export interface ErrorResponse {
    /** The HTTP status code. */
    code: number
    /** The HTTP status in PascalCase, e.g. `NotFound`, stable to test against. */
    name: string
    /** A description meant for developers. */
    message: string
    /** What is wrong with the request, value by value, when it is known. */
    errors?: ErrorDetail[]
}

/**
 * An error the transport itself raises about a request, such as an unknown query parameter.
 */
export class HttpError extends Error {
    readonly name = "HttpError"
    constructor(
        readonly status: number,
        message: string,
        readonly headers: Record<string, string> = {},
    ) {
        super(message)
    }
}

/**
 * The pipeline errors a client can act on, and their HTTP status.
 */
const pipelineErrorStatuses: [name: string, status: number][] = [
    [ValidationErrorName, 400],
    [NotFoundErrorName, 404],
    [ConflictErrorName, 409],
    [UnauthorizedErrorName, 401],
    [ForbiddenErrorName, 403],
    [MovedPermanentlyErrorName, 301],
    [NotImplementedErrorName, 501],
]

export function statusName(status: number): string {
    return STATUS_CODES[status]!.replace(/[^A-Za-z]/g, "")
}

function response(status: number, message: string, errors?: ErrorDetail[]): ErrorResponse {
    return { code: status, name: statusName(status), message, ...(errors && errors.length > 0 ? { errors } : {}) }
}

/**
 * The response to send for an error, and whether it is unexpected, i.e. a server error to be logged.
 *
 * Errors that are not listed above, not an `HttpError` and not a client error from body parsing are answered
 * with a 500 that still carries their message. Hide it with the `formatError` option of the transport.
 */
export function errorResponse(error: unknown): { response: ErrorResponse; headers: Record<string, string>; unexpected: boolean } {
    if (error instanceof HttpError) {
        return { response: response(error.status, error.message), headers: error.headers, unexpected: false }
    }
    if (error instanceof Error) {
        for (const [name, status] of pipelineErrorStatuses) {
            const cause = VError.findCauseByName(error, name)
            if (cause) {
                const info = VError.info(cause)
                const headers: Record<string, string> = status === 301 && typeof info.location === "string" ? { Location: info.location } : {}
                return { response: response(status, cause.message, validationDetails(info)), headers, unexpected: false }
            }
        }
        // client errors raised while reading the body, such as malformed JSON or a body too large
        const { status, expose } = error as { status?: unknown; expose?: unknown }
        if (expose === true && typeof status === "number" && status >= 400 && status < 500) {
            return { response: response(status, error.message), headers: {}, unexpected: false }
        }
    }
    return { response: response(500, error instanceof Error ? error.message : String(error)), headers: {}, unexpected: true }
}

/**
 * The ajv errors of a schema-builder validation error, and the index of the faulty resource of a list.
 */
function validationDetails(info: Record<string, any>): ErrorDetail[] | undefined {
    if (!Array.isArray(info.ajvErrors)) {
        return undefined
    }
    const prefix = typeof info.index === "number" ? `/${info.index}` : ""
    return info.ajvErrors.map((e: { instancePath: string; message: string; params?: Record<string, unknown> }) => ({
        path: `${prefix}${e.instancePath}`,
        message: e.params && "additionalProperty" in e.params ? `${e.message}: '${e.params.additionalProperty}'` : e.message,
    }))
}
