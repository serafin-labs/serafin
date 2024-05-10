import * as VError from "verror"

export function error(name: string, message: string, info?: any, cause?: any) {
    let opt: any = {
        name: name,
        constructorOpt: error,
    }
    if (cause) {
        opt.cause = cause
    }
    if (info) {
        opt.info = info
    }
    return new VError(opt, "%s", message)
}

export const NotFoundErrorName = "SerafinNotFoundError"
export function notFoundError(id: string, info?: any, cause?: Error) {
    return error(NotFoundErrorName, `The entity ${id} does not exist.`, info, cause)
}

export const ValidationErrorName = "SerafinSchemaValidationError"
export function validationError(validationError: string, info?: any, cause?: Error) {
    return error(ValidationErrorName, `Invalid parameters: ${validationError}`, info, cause)
}

export const ConflictErrorName = "SerafinConflictError"
export function conflictError(id: string, info?: any, cause?: Error) {
    return error(ConflictErrorName, `The modifications to the entity ${id} failed because of a conflict.`, info, cause)
}

export const NotImplementedErrorName = "SerafinNotImplementedError"
export function notImplementedError(method: string, sourceName: string, info?: any, cause?: Error) {
    return error(NotImplementedErrorName, `The method '${method}' can't be called because it's not implemented by ${sourceName}`, info, cause)
}

export const UnauthorizedErrorName = "SerafinUnauthorizedError"
export function unauthorizedError(reason: string, info?: any, cause?: Error) {
    return error(UnauthorizedErrorName, `Action not authorized : ${reason}`, info, cause)
}

export const ForbiddenErrorName = "SerafinForbiddenError"
export function forbiddenError(reason: string, info?: any, cause?: Error) {
    return error(ForbiddenErrorName, `Action forbidden : ${reason}`, info, cause)
}
