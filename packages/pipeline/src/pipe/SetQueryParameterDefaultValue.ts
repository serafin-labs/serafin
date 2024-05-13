import { PropertyAccessorResolver, createPropertyAccessor } from "@serafin/schema-builder"
import { IdentityInterface } from "../IdentityInterface"
import { PipeReadNext } from "../PipeInterface"

/**
 * Pipe that set the given read query parameter default value
 * The schema will not be modified.
 */
export function SetReadQueryParameterDefaultValue<M extends IdentityInterface, RQ, RM, CTX, V extends object | boolean | number | string>(
    queryParameterAccessor: PropertyAccessorResolver<RQ, V | undefined>,
    value: V | ((query: RQ, context: CTX) => Promise<V>),
) {
    const queryParameter = queryParameterAccessor(createPropertyAccessor())
    return () => {
        return {
            read: async (next: PipeReadNext<M, RQ, RM, CTX>, query: RQ, context: CTX) => {
                const existingValue = queryParameter.get(query)
                if (existingValue === undefined) {
                    const defaultValue = typeof value === "function" ? await value(query, context) : value
                    query = queryParameter.set(query, defaultValue)
                }
                return next(query, context)
            },
        }
    }
}
