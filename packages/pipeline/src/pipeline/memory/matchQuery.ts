import _ from "lodash"
import { validationError } from "../../error.js"
import { parsePath, valuesAtPath } from "./path.js"

/**
 * The operators `matchQuery` understands. Anything else starting with `$` is rejected rather than
 * ignored: a query operator a source silently drops returns a plausible page of wrong resources,
 * which is far worse than a failure.
 */
export const queryOperators = [
    "$eq",
    "$ne",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$in",
    "$nin",
    "$exists",
    "$regex",
    "$options",
    "$mod",
    "$size",
    "$all",
    "$elemMatch",
    "$type",
    "$not",
] as const

export const logicalQueryOperators = ["$and", "$or", "$nor"] as const

/**
 * Type names `$type` accepts. These are JavaScript types, not BSON type numbers -- nothing here
 * stores BSON.
 */
const typeTests: { [name: string]: (value: any) => boolean } = {
    string: (value) => typeof value === "string",
    number: (value) => typeof value === "number",
    boolean: (value) => typeof value === "boolean",
    array: (value) => Array.isArray(value),
    object: (value) => _.isPlainObject(value),
    date: (value) => value instanceof Date,
    regex: (value) => value instanceof RegExp,
    null: (value) => value === null,
}

/**
 * Order between values of different types, so `sort` is total instead of throwing on mixed data.
 * It is *not* BSON order -- a source that has to agree with mongo on this cannot be this one.
 */
const typeRanks: [(value: any) => boolean, number][] = [
    [(value) => value === null || value === undefined, 0],
    [(value) => typeof value === "number", 1],
    [(value) => typeof value === "string", 2],
    [(value) => typeof value === "boolean", 3],
    [(value) => value instanceof Date, 4],
]

function typeRank(value: any) {
    return typeRanks.find(([test]) => test(value))?.[1] ?? 5
}

/**
 * Compare two values of the same type, or answer `undefined` when they aren't comparable.
 *
 * `$gt` and friends are defined for same-type comparisons only. A comparison across types answers
 * no match rather than guessing an order, which keeps `{ age: { $gt: 5 } }` from matching a resource
 * whose `age` someone stored as a string.
 */
export function compareValues(a: any, b: any): number | undefined {
    if (typeof a === "number" && typeof b === "number") {
        return a - b
    }
    if (typeof a === "string" && typeof b === "string") {
        return a < b ? -1 : a > b ? 1 : 0
    }
    if (typeof a === "boolean" && typeof b === "boolean") {
        return Number(a) - Number(b)
    }
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime()
    }
    return undefined
}

/** Order used by `sort`: by type first, then by value within a type, ties left in place. */
export function compareForSort(a: any, b: any): number {
    const rankDifference = typeRank(a) - typeRank(b)
    return rankDifference !== 0 ? rankDifference : (compareValues(a, b) ?? 0)
}

/**
 * A condition is an operator document when at least one of its keys starts with `$`. Mixing
 * operators and plain properties is rejected, as it is in mongo: `{ $gt: 1, name: "a" }` reads as
 * a comparison to some and as a subdocument to others.
 */
function isOperatorDocument(condition: any): boolean {
    if (!_.isPlainObject(condition)) {
        return false
    }
    const keys = Object.keys(condition)
    const operators = keys.filter((key) => key.startsWith("$"))
    if (operators.length === 0) {
        return false
    }
    if (operators.length !== keys.length) {
        throw validationError(`A condition cannot mix operators and properties: '${keys.join("', '")}'`)
    }
    return true
}

/** `null` matches a property that is absent as well as one set to null, as it does in mongo. */
function equals(value: any, operand: any): boolean {
    if (operand instanceof RegExp) {
        return typeof value === "string" && operand.test(value)
    }
    if (_.isEqual(value, operand)) {
        return true
    }
    // A scalar compared against an array property matches when the array contains it. This is what
    // makes `{ tags: "urgent" }` work on a resource whose `tags` is a list.
    return Array.isArray(value) && !Array.isArray(operand) && value.some((entry) => _.isEqual(entry, operand))
}

function someValue(values: any[], test: (value: any) => boolean): boolean {
    // A condition applies to the property and, when the property is an array, to each of its
    // elements. Conditions in the same operator document may therefore be satisfied by different
    // elements -- `$elemMatch` is how you ask for one element to satisfy all of them.
    return values.some((value) => test(value) || (Array.isArray(value) && value.some(test)))
}

function comparison(values: any[], operand: any, accept: (order: number) => boolean): boolean {
    return someValue(values, (value) => {
        const order = compareValues(value, operand)
        return order !== undefined && accept(order)
    })
}

function operandArray(operator: string, operand: any): any[] {
    if (!Array.isArray(operand)) {
        throw validationError(`'${operator}' expects an array`)
    }
    return operand
}

function regExpOf(operand: any, options: any): RegExp {
    if (operand instanceof RegExp) {
        return options === undefined ? operand : new RegExp(operand.source, String(options))
    }
    if (typeof operand !== "string") {
        throw validationError("'$regex' expects a string or a regular expression")
    }
    return new RegExp(operand, options === undefined ? undefined : String(options))
}

function matchOperator(operator: string, operand: any, values: any[], condition: any): boolean {
    switch (operator) {
        case "$eq":
            // An absent property compares equal to null, so `{ deletedAt: null }` finds the
            // resources that never had one.
            return operand === null ? values.length === 0 || values.some((value) => value === null) : someValue(values, (value) => equals(value, operand))
        case "$ne":
            return !matchOperator("$eq", operand, values, condition)
        case "$gt":
            return comparison(values, operand, (order) => order > 0)
        case "$gte":
            return comparison(values, operand, (order) => order >= 0)
        case "$lt":
            return comparison(values, operand, (order) => order < 0)
        case "$lte":
            return comparison(values, operand, (order) => order <= 0)
        case "$in":
            return operandArray(operator, operand).some((entry) => matchOperator("$eq", entry, values, condition))
        case "$nin":
            return !matchOperator("$in", operand, values, condition)
        case "$exists":
            return operand ? values.length > 0 : values.length === 0
        case "$regex":
            return someValue(values, (value) => typeof value === "string" && regExpOf(operand, condition?.$options).test(value))
        case "$options":
            // Consumed by `$regex`, which is the only operator it qualifies.
            if (!_.isPlainObject(condition) || !("$regex" in condition)) {
                throw validationError("'$options' is only valid next to '$regex'")
            }
            return true
        case "$mod": {
            const [divisor, remainder] = operandArray(operator, operand)
            if (typeof divisor !== "number" || typeof remainder !== "number") {
                throw validationError("'$mod' expects [divisor, remainder]")
            }
            return someValue(values, (value) => typeof value === "number" && value % divisor === remainder)
        }
        case "$size":
            return values.some((value) => Array.isArray(value) && value.length === operand)
        case "$all":
            return values.some((value) => operandArray(operator, operand).every((entry) => equals(value, entry)))
        case "$elemMatch":
            return values.some(
                (value) =>
                    Array.isArray(value) &&
                    // An operator document constrains each element; anything else is a query
                    // matched against elements that are themselves resources.
                    value.some((entry) => (isOperatorDocument(operand) ? matchCondition(operand, [entry]) : matchQuery(operand, entry))),
            )
        case "$type": {
            const test = typeTests[operand]
            if (!test) {
                throw validationError(`'${operand}' is not a type '$type' knows: '${Object.keys(typeTests).join("', '")}'`)
            }
            return someValue(values, test)
        }
        case "$not":
            return !matchCondition(operand instanceof RegExp ? { $regex: operand } : operand, values)
        default:
            throw validationError(`'${operator}' is not an operator this pipeline understands`)
    }
}

/**
 * Match one property's condition against every value found at its path.
 */
function matchCondition(condition: any, values: any[]): boolean {
    if (isOperatorDocument(condition)) {
        return Object.keys(condition).every((operator) => matchOperator(operator, condition[operator], values, condition))
    }
    if (Array.isArray(condition)) {
        // The serafin convention: an array on a model property means "any of these values", which
        // is what `transformPropertiesToArray` builds the read query out of. Mongo would read it as
        // equality with that exact array -- ask for that with `{ $eq: [...] }`.
        return matchOperator("$in", condition, values, condition)
    }
    return matchOperator("$eq", condition, values, condition)
}

/**
 * Does `resource` match `query`?
 *
 * The query is a map of property paths to conditions, plus the `$and` / `$or` / `$nor` operators at
 * the top level. An empty query matches everything.
 */
export function matchQuery(query: any, resource: any): boolean {
    if (query === undefined || query === null) {
        return true
    }
    if (!_.isPlainObject(query)) {
        throw validationError("A query must be an object")
    }
    return Object.keys(query).every((key) => {
        const value = query[key]
        if (key === "$and" || key === "$or" || key === "$nor") {
            const clauses = operandArray(key, value)
            if (clauses.length === 0) {
                throw validationError(`'${key}' expects at least one clause`)
            }
            if (key === "$and") {
                return clauses.every((clause) => matchQuery(clause, resource))
            }
            const some = clauses.some((clause) => matchQuery(clause, resource))
            return key === "$or" ? some : !some
        }
        if (key.startsWith("$")) {
            throw validationError(`'${key}' is not valid at the top level of a query`)
        }
        return matchCondition(value, valuesAtPath(resource, parsePath(key)))
    })
}

/**
 * Match a single value against one property condition. Used by `$pull`, which selects the array
 * elements to remove with the same conditions a query selects resources with.
 */
export function matchValue(condition: any, value: any): boolean {
    return matchCondition(condition, [value])
}
