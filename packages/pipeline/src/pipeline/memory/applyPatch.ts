import _ from "lodash"
import { validationError } from "../../error.js"
import { compareValues, matchQuery, matchValue } from "./matchQuery.js"
import { getAtPath, hasAtPath, parsePath, setAtPath, unsetAtPath } from "./path.js"

/**
 * The update operators `applyPatch` understands, in the order they are applied. Mongo leaves the
 * order between different operators unspecified; fixing it here makes an update reproducible.
 */
export const updateOperators = ["$rename", "$unset", "$set", "$inc", "$mul", "$min", "$max", "$push", "$addToSet", "$pull", "$pullAll", "$pop"] as const

const operatorSet: Set<string> = new Set(updateOperators)

/**
 * Values are either an update document -- every key an operator -- or a merge patch. Mixing the two
 * is rejected, as it is in mongo.
 */
export function isUpdateDocument(values: any): boolean {
    if (!_.isPlainObject(values)) {
        return false
    }
    const keys = Object.keys(values)
    const operators = keys.filter((key) => key.startsWith("$"))
    if (operators.length === 0) {
        return false
    }
    if (operators.length !== keys.length) {
        throw validationError(`Patch values cannot mix update operators and properties: '${keys.join("', '")}'`)
    }
    return true
}

/**
 * JSON merge patch, per RFC 7396: an absent property is left alone, `null` deletes, and anything
 * that is not a plain object -- an array included -- replaces what was there.
 */
function mergePatch(target: any, patch: any): any {
    if (!_.isPlainObject(patch)) {
        return _.cloneDeep(patch)
    }
    const result: any = _.isPlainObject(target) ? { ...target } : {}
    for (const key of Object.keys(patch)) {
        const value = patch[key]
        if (value === null) {
            delete result[key]
        } else {
            result[key] = mergePatch(result[key], value)
        }
    }
    return result
}

function operandEntries(operator: string, operand: any): [string[], any][] {
    if (!_.isPlainObject(operand)) {
        throw validationError(`'${operator}' expects an object of property paths`)
    }
    return Object.keys(operand).map((path) => [parsePath(path), operand[path]])
}

function numberAt(resource: any, path: string[], operator: string): number {
    const current = getAtPath(resource, path)
    if (current === undefined) {
        return 0
    }
    if (typeof current !== "number") {
        throw validationError(`'${operator}' cannot be applied to '${path.join(".")}', which is not a number`)
    }
    return current
}

function arrayAt(resource: any, path: string[], operator: string): any[] | undefined {
    const current = getAtPath(resource, path)
    if (current === undefined) {
        return undefined
    }
    if (!Array.isArray(current)) {
        throw validationError(`'${operator}' cannot be applied to '${path.join(".")}', which is not an array`)
    }
    return current
}

/** `$push` and `$addToSet` take either a single element or `{ $each: [...] }`. */
function elementsToAdd(operator: string, operand: any): any[] {
    if (_.isPlainObject(operand) && Object.keys(operand).some((key) => key.startsWith("$"))) {
        const modifiers = Object.keys(operand).filter((key) => key !== "$each")
        if (modifiers.length > 0) {
            throw validationError(`'${operator}' does not support the '${modifiers.join("', '")}' modifier`)
        }
        if (!Array.isArray(operand.$each)) {
            throw validationError(`'$each' expects an array`)
        }
        return operand.$each
    }
    return [operand]
}

const applyOperator: { [operator: string]: (resource: any, operand: any) => void } = {
    $rename: (resource, operand) => {
        for (const [path, target] of operandEntries("$rename", operand)) {
            if (typeof target !== "string") {
                throw validationError("'$rename' expects a property path as its value")
            }
            if (hasAtPath(resource, path)) {
                const value = getAtPath(resource, path)
                unsetAtPath(resource, path)
                setAtPath(resource, parsePath(target), value)
            }
        }
    },
    $unset: (resource, operand) => {
        for (const [path] of operandEntries("$unset", operand)) {
            unsetAtPath(resource, path)
        }
    },
    $set: (resource, operand) => {
        for (const [path, value] of operandEntries("$set", operand)) {
            setAtPath(resource, path, _.cloneDeep(value))
        }
    },
    $inc: (resource, operand) => {
        for (const [path, value] of operandEntries("$inc", operand)) {
            if (typeof value !== "number") {
                throw validationError("'$inc' expects a number")
            }
            setAtPath(resource, path, numberAt(resource, path, "$inc") + value)
        }
    },
    $mul: (resource, operand) => {
        for (const [path, value] of operandEntries("$mul", operand)) {
            if (typeof value !== "number") {
                throw validationError("'$mul' expects a number")
            }
            setAtPath(resource, path, numberAt(resource, path, "$mul") * value)
        }
    },
    $min: (resource, operand) => {
        for (const [path, value] of operandEntries("$min", operand)) {
            const current = getAtPath(resource, path)
            if (current === undefined || (compareValues(value, current) ?? 0) < 0) {
                setAtPath(resource, path, _.cloneDeep(value))
            }
        }
    },
    $max: (resource, operand) => {
        for (const [path, value] of operandEntries("$max", operand)) {
            const current = getAtPath(resource, path)
            if (current === undefined || (compareValues(value, current) ?? 0) > 0) {
                setAtPath(resource, path, _.cloneDeep(value))
            }
        }
    },
    $push: (resource, operand) => {
        for (const [path, value] of operandEntries("$push", operand)) {
            const current = arrayAt(resource, path, "$push") ?? []
            setAtPath(resource, path, [...current, ..._.cloneDeep(elementsToAdd("$push", value))])
        }
    },
    $addToSet: (resource, operand) => {
        for (const [path, value] of operandEntries("$addToSet", operand)) {
            const current = arrayAt(resource, path, "$addToSet") ?? []
            const added = elementsToAdd("$addToSet", value).filter((entry) => !current.some((existing: any) => _.isEqual(existing, entry)))
            setAtPath(resource, path, [...current, ..._.cloneDeep(added)])
        }
    },
    $pull: (resource, operand) => {
        for (const [path, condition] of operandEntries("$pull", operand)) {
            const current = arrayAt(resource, path, "$pull")
            if (current) {
                // A plain object selects the elements that match it as a query, so an array of
                // resources can be pulled from on a few of their properties.
                const matches = (entry: any) =>
                    _.isPlainObject(condition) && !Object.keys(condition).some((key) => key.startsWith("$"))
                        ? matchQuery(condition, entry)
                        : matchValue(condition, entry)
                setAtPath(
                    resource,
                    path,
                    current.filter((entry) => !matches(entry)),
                )
            }
        }
    },
    $pullAll: (resource, operand) => {
        for (const [path, value] of operandEntries("$pullAll", operand)) {
            const current = arrayAt(resource, path, "$pullAll")
            if (current) {
                if (!Array.isArray(value)) {
                    throw validationError("'$pullAll' expects an array")
                }
                setAtPath(
                    resource,
                    path,
                    current.filter((entry) => !value.some((removed: any) => _.isEqual(entry, removed))),
                )
            }
        }
    },
    $pop: (resource, operand) => {
        for (const [path, value] of operandEntries("$pop", operand)) {
            if (value !== 1 && value !== -1) {
                throw validationError("'$pop' expects 1 to remove the last element or -1 to remove the first")
            }
            const current = arrayAt(resource, path, "$pop")
            if (current?.length) {
                setAtPath(resource, path, value === 1 ? current.slice(0, -1) : current.slice(1))
            }
        }
    },
}

/**
 * Apply `values` to a copy of `resource`.
 *
 * `values` is either an update document -- `{ $set: ... }`, `{ $push: ... }` -- or a JSON merge
 * patch. Which one it is comes from its shape, the same way a mongo source decides.
 */
export function applyPatch<T>(resource: T, values: any): T {
    if (!isUpdateDocument(values)) {
        return mergePatch(resource, values)
    }
    const patched = _.cloneDeep(resource) as any
    for (const operator of Object.keys(values)) {
        if (!operatorSet.has(operator)) {
            throw validationError(`'${operator}' is not an update operator this pipeline understands`)
        }
    }
    for (const operator of updateOperators) {
        if (operator in values) {
            applyOperator[operator](patched, values[operator])
        }
    }
    return patched
}
