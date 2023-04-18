import { PropertyAccessorResolver, createPropertyAccessor } from "@serafin/schema-builder"
import { IdentityInterface } from "../IdentityInterface"
import { PipeReadNext } from "../PipeInterface"

/**
 * Pipe that set the given read query parameter default value
 * The schema will not be modified.
 */
export function SetReadQueryParameterDefaultValue<M extends IdentityInterface, RQ, RM, V extends object | boolean | number | string>(
    par: PropertyAccessorResolver<RQ, V>,
    value: V | ((query: RQ) => Promise<V>),
) {
    const pa = par(createPropertyAccessor())
    return () => {
        return {
            read: async (next: PipeReadNext<M, RQ, RM>, query: RQ) => {
                const existingValue = pa.get(query)
                if (existingValue === undefined) {
                    const defaultValue = typeof value === "function" ? await value(query) : value
                    query = pa.set(query, defaultValue)
                }
                return next(query)
            },
        }
    }
}
