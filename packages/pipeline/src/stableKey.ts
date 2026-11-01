/**
 * A stable string for any JSON value, so two structurally equal values collapse onto the same key.
 *
 * Object keys are sorted, so property order never changes the result, and the type is part of the
 * key, so `1` and `"1"` stay distinct. Strings are JSON-quoted, so no string can forge the `,` or
 * `]` that delimits an array -- the key is fed public input through the read cache. A `Date` and a
 * `RegExp` carry their value, rather than collapsing onto the key of an object with no own keys.
 * Used wherever a query has to be recognised as one already seen: relation grouping, and the read
 * cache.
 */
export function stableKey(value: any): string {
    if (typeof value === "string") {
        return `string:${JSON.stringify(value)}`
    }
    if (value === null || typeof value !== "object") {
        return `${typeof value}:${String(value)}`
    }
    if (value instanceof Date) {
        return `date:${value.getTime()}`
    }
    if (value instanceof RegExp) {
        return `regexp:${JSON.stringify(String(value))}`
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableKey).join(",")}]`
    }
    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`)
        .join(",")}}`
}
