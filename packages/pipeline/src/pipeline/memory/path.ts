import _ from "lodash"
import { validationError } from "../../error.js"

/**
 * Segments that would reach the prototype chain instead of the resource. Property names in a path
 * come from a query or a patch, so a path is never walked blindly.
 */
const unsafeSegments = new Set(["__proto__", "constructor", "prototype"])

const hasOwn = (value: any, key: string) => Object.prototype.hasOwnProperty.call(value, key)

const isIndex = (segment: string) => /^(0|[1-9][0-9]*)$/.test(segment)

/**
 * Split a dotted path into segments, rejecting the ones that don't name a property.
 */
export function parsePath(path: string): string[] {
    const segments = path.split(".")
    for (const segment of segments) {
        if (segment === "" || unsafeSegments.has(segment)) {
            throw validationError(`'${path}' is not a valid property path`)
        }
    }
    return segments
}

/**
 * Every value found at `path`, mongo style: a segment applied to an array reaches into each of its
 * elements, so `{ "items.sku": "x" }` matches a resource whose `items` is an array of items. A
 * numeric segment is also tried as an index into the array itself.
 *
 * An empty result means the path is absent -- what `$exists: false` and a `null` comparison read.
 */
export function valuesAtPath(resource: any, path: string[]): any[] {
    let current: any[] = [resource]
    for (const segment of path) {
        const next: any[] = []
        for (const value of current) {
            if (Array.isArray(value)) {
                if (isIndex(segment) && Number(segment) < value.length) {
                    next.push(value[Number(segment)])
                }
                for (const entry of value) {
                    if (_.isPlainObject(entry) && hasOwn(entry, segment)) {
                        next.push(entry[segment])
                    }
                }
            } else if (_.isPlainObject(value) && hasOwn(value, segment)) {
                next.push(value[segment])
            }
        }
        current = next
    }
    return current
}

/**
 * The container the last segment of `path` lives in.
 *
 * With `create`, missing intermediate containers are added as plain objects -- `$set` on `a.b.c`
 * builds `a` and `b` -- and a path that runs through a value which cannot hold a property is an
 * error. Without it, an absent path answers `undefined`, so an operator that has nothing to change
 * can say so rather than growing the resource.
 */
function containerAtPath(resource: any, path: string[], create: boolean): any | undefined {
    const unreachable = (segment: string) => {
        if (create) {
            throw validationError(`'${path.join(".")}' cannot be created: '${segment}' does not hold properties`)
        }
        return undefined
    }
    let current = resource
    for (const segment of path.slice(0, -1)) {
        if (Array.isArray(current)) {
            if (!isIndex(segment)) {
                throw validationError(`'${segment}' is not an index of the array it is applied to`)
            }
            if (Number(segment) >= current.length) {
                return unreachable(segment)
            }
            current = current[Number(segment)]
            continue
        }
        if (!_.isPlainObject(current)) {
            return unreachable(segment)
        }
        if (!hasOwn(current, segment)) {
            if (!create) {
                return undefined
            }
            current[segment] = {}
        }
        current = current[segment]
    }
    return _.isPlainObject(current) || Array.isArray(current) ? current : unreachable(path[path.length - 1])
}

/** Assign into a container, treating a numeric segment on an array as an index. */
function assign(container: any, segment: string, value: any) {
    if (Array.isArray(container)) {
        if (!isIndex(segment)) {
            throw validationError(`'${segment}' is not an index of the array it is applied to`)
        }
        container[Number(segment)] = value
        return
    }
    container[segment] = value
}

export function getAtPath(resource: any, path: string[]): any {
    const container = containerAtPath(resource, path, false)
    if (container === undefined) {
        return undefined
    }
    const last = path[path.length - 1]
    if (Array.isArray(container)) {
        return isIndex(last) ? container[Number(last)] : undefined
    }
    return hasOwn(container, last) ? container[last] : undefined
}

export function hasAtPath(resource: any, path: string[]): boolean {
    const container = containerAtPath(resource, path, false)
    if (container === undefined) {
        return false
    }
    const last = path[path.length - 1]
    return Array.isArray(container) ? isIndex(last) && Number(last) < container.length : hasOwn(container, last)
}

export function setAtPath(resource: any, path: string[], value: any): void {
    assign(containerAtPath(resource, path, true), path[path.length - 1], value)
}

export function unsetAtPath(resource: any, path: string[]): void {
    const container = containerAtPath(resource, path, false)
    if (container === undefined) {
        return
    }
    const last = path[path.length - 1]
    if (Array.isArray(container)) {
        // mongo leaves a null behind rather than shifting the elements after it, since a index that
        // moved would make every other path in the same update mean something else.
        if (isIndex(last) && Number(last) < container.length) {
            container[Number(last)] = null
        }
        return
    }
    delete container[last]
}
