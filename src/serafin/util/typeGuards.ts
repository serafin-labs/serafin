/**
 * Templated verison of Array.isArray type guard
 * 
 * @param value 
 */
export function isArray<T>(value: T[] | T): value is T[] {
    return Array.isArray(value)
}