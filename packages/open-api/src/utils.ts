/**
 * A type whose every nested property is read-only, as the documents held by `OpenApiBuilder` are frozen.
 */
export type DeepReadonly<T> = T extends (infer I)[] ? ReadonlyArray<DeepReadonly<I>> : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T

/**
 * Freeze a value and everything it contains.
 */
export function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value)
        for (const key of Object.keys(value)) {
            deepFreeze((value as Record<string, unknown>)[key])
        }
    }
    return value
}

// Available in every supported runtime, but not part of the ES2021 lib the CJS build compiles against.
declare function structuredClone<T>(value: T): T

/**
 * A mutable deep copy of a JSON value.
 */
export function clone<T>(value: T): T {
    return structuredClone(value)
}

/**
 * Encode path segments as a JSON pointer (RFC 6901), e.g. `["paths", "/items"]` gives `/paths/~1items`.
 */
export function encodePointer(segments: string[]): string {
    return segments.map((s) => `/${s.replace(/~/g, "~0").replace(/\//g, "~1")}`).join("")
}

/**
 * Decode a local reference (`#/...`) into its path segments.
 */
function decodeLocalReference(reference: string): string[] {
    const pointer = decodeURIComponent(reference.slice(1))
    return pointer === "" ? [] : pointer.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))
}

/**
 * The value a local reference (`#/...`) points to in the document, or `undefined`.
 */
export function resolveLocalPointer(document: unknown, reference: string): unknown {
    let value = document
    for (const segment of decodeLocalReference(reference)) {
        if (value === null || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, segment)) {
            return undefined
        }
        value = (value as Record<string, unknown>)[segment]
    }
    return value
}

/**
 * The variable names of a templated path, e.g. `["id"]` for `/items/{id}`.
 */
export function templateVariables(path: string): string[] {
    return [...path.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1])
}

/**
 * A templated path with its variable names erased: paths with the same normalized form are equivalent.
 */
export function normalizePathTemplate(path: string): string {
    return path.replace(/\{[^{}]+\}/g, "{}")
}
