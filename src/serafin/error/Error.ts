import * as VError from "verror"

function serafinError(name: string, message: string, info?: any, cause?: any) {
    let opt: any = {
        name: name
    }
    if (cause) {
        opt.cause = cause
    }
    if (info) {
        opt.info = info
    }
    return new VError(opt, message)
}

export const NotFoundErrorName = "SerafinNotFoundError";
export function notFoundError(id: string, info?: any, cause?: Error) { 
    return serafinError(NotFoundErrorName, `The entity ${id} does not exist.`, info, cause)
}

export const ValidationErrorName = "SerafinValidationError";
export function validtionError(validationError: string, info?: any, cause?: Error) {
    return serafinError(ValidationErrorName, `Invalid parameters: ${validationError}`, info, cause)
}

export const ConflictErrorName = "SerafinConflictError";
export function conflictError(id: string, info?: any, cause?: Error) {
    return serafinError(ConflictErrorName, `The modifications to the entity ${id} failed because of a conflict.`, info, cause)
}

export const NotImplementedErrorName = "SerafinNotImplementedError";
export function notImplementedError(method: string, sourceName: string, info?: any, cause?: Error) {
    return serafinError(NotImplementedErrorName, `The method '${method}' can't be called because it's not implemented by ${sourceName}`, info, cause)
}

export const UnauthorizedErrorName = "SerafinUnauthorizedError";
export function unauthorizedError(reason: string, info?: any, cause?: Error) {
    return serafinError(UnauthorizedErrorName, `Action not authorized : ${reason}`, info, cause)
}