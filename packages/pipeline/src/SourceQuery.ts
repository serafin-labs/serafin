/**
 * The shape of what a pipe hands down to a pipeline implementation.
 *
 * Nothing revalidates a `next` call, which is how a pipe turns a public query parameter into an
 * operator the implementation below understands without declaring that operator on its own schemas.
 * The cost is that the value passed down is no longer of the schema's type `RQ` but a widening of it,
 * and with no name for that widening every such pipe types `next` loosely and casts -- which also
 * hides every other mistake in the call.
 *
 * `SourceQuery<RQ>` and `SourceValues<PV>` are that name. A pipe types `next` with them and passes
 * operators without a cast; an implementation declares them on `_read`, `_patch` and `_delete` to
 * say, in the type, that it accepts more than its schemas promise. They describe the vocabulary in
 * `queryOperators`, `logicalQueryOperators` and `updateOperators` -- the operators a pipeline built
 * on this library's query matcher interprets, and the ones a mongodb-backed pipeline passes to the
 * database. `MemoryPipeline` is the worked example.
 *
 * What they do not describe is which of those operators a given implementation actually understands;
 * that is what a pipe's `requires` and a pipeline's `capabilities` are for. @see PipeCapabilitiesInterface
 */

/** The type names `$type` accepts. These are JavaScript types, not BSON type numbers. */
export type QueryTypeName = "string" | "number" | "boolean" | "array" | "object" | "date" | "regex" | "null"

/** The element type of an array property, or the property's own type when it is not one. */
type ElementOf<V> = V extends readonly (infer E)[] ? E : V

/** Only a string property can be matched against a regular expression. */
type RegExpFor<V> = ElementOf<V> extends string ? RegExp : never

/**
 * Any dotted path, for the parts of a query or an update a model type cannot enumerate.
 *
 * A template-literal index signature rather than a plain one: it accepts `"owner.company"` while
 * still rejecting an undeclared property like `"minSize"`, which is the mistake worth catching --
 * the signature of a pipe that was meant to translate it and didn't.
 */
type DottedPaths = { [path: `${string}.${string}`]: unknown }

/** A map from any property of `T`, or any dotted path, to a single value type. */
type PathMap<T, V> = { [K in keyof T]?: V } & DottedPaths

/** A map from any property of `T`, or any dotted path, to a value of that property's own type. */
type PropertyMap<T> = { [K in keyof T]?: NonNullable<T[K]> } & DottedPaths

/** The properties of `T` that hold an array, which are the only ones the array operators apply to. */
type ArrayKeys<T> = keyof { [K in keyof T as NonNullable<T[K]> extends readonly any[] ? K : never]: true }

/** A map from any array property of `T`, or any dotted path, to a single value type. */
type ArrayPathMap<T, V> = { [K in ArrayKeys<T>]?: V } & DottedPaths

/** The element type of an array property of `T`. */
type ArrayElementOf<T, K extends keyof T> = ElementOf<NonNullable<T[K]>>

/** What `$push` and `$addToSet` take: one element of the array, or several of them under `$each`. */
type ArrayAdditions<T> = {
    [K in ArrayKeys<T>]?: ArrayElementOf<T, K> | { $each: readonly ArrayElementOf<T, K>[] }
} & DottedPaths

/** What `$pull` takes: one element, or a condition selecting the elements to remove. */
type ArrayPulls<T> = { [K in ArrayKeys<T>]?: ElementCondition<ArrayElementOf<T, K>> } & DottedPaths

/** What `$pullAll` takes: the elements to remove, matched by equality. */
type ArrayRemovals<T> = { [K in ArrayKeys<T>]?: readonly ArrayElementOf<T, K>[] } & DottedPaths

/** What selects the elements of an array: one of them, or a condition on them. */
type ElementCondition<E> = E | QueryOperators<E> | (E extends object ? SourceQuery<E> : never)

/**
 * The operators that can stand in for a value of type `V` in one property's condition.
 *
 * Comparisons take the element type of an array property, since that is what they are applied to,
 * while equality accepts the whole array as well.
 */
export interface QueryOperators<V> {
    $eq?: V | ElementOf<V> | null
    $ne?: V | ElementOf<V> | null
    $gt?: ElementOf<V>
    $gte?: ElementOf<V>
    $lt?: ElementOf<V>
    $lte?: ElementOf<V>
    $in?: readonly (V | ElementOf<V> | null)[]
    $nin?: readonly (V | ElementOf<V> | null)[]
    $exists?: boolean
    $regex?: string | RegExpFor<V>
    /** Flags for `$regex`, which is the only operator it qualifies. */
    $options?: string
    $mod?: readonly [divisor: number, remainder: number]
    $size?: number
    $all?: readonly ElementOf<V>[]
    /** One element of the array has to satisfy all of this, rather than one condition each. */
    $elemMatch?: ElementOf<V> extends object ? SourceQuery<ElementOf<V>> : QueryOperators<ElementOf<V>>
    $type?: QueryTypeName
    $not?: QueryOperators<V> | RegExpFor<V>
}

/**
 * A read, patch or delete query as the implementation below the pipes receives it: every property of
 * `RQ` may carry an operator condition instead of a value, dotted paths are allowed, and the logical
 * operators may appear at the top level.
 */
export type SourceQuery<RQ> = {
    [K in keyof RQ]?: RQ[K] | QueryOperators<NonNullable<RQ[K]>> | RegExpFor<NonNullable<RQ[K]>> | null
} & {
    $and?: readonly SourceQuery<RQ>[]
    $or?: readonly SourceQuery<RQ>[]
    $nor?: readonly SourceQuery<RQ>[]
} & DottedPaths

/**
 * The update operators that can replace a merge patch. Mixing them with plain properties is not
 * allowed, which is why this is a separate half of `SourceValues` rather than merged into it.
 */
export interface UpdateOperators<PV> {
    $set?: PropertyMap<PV>
    $unset?: PathMap<PV, "" | 1 | true>
    $rename?: PathMap<PV, string>
    $inc?: PathMap<PV, number>
    $mul?: PathMap<PV, number>
    $min?: PropertyMap<PV>
    $max?: PropertyMap<PV>
    $push?: ArrayAdditions<PV>
    $addToSet?: ArrayAdditions<PV>
    $pull?: ArrayPulls<PV>
    $pullAll?: ArrayRemovals<PV>
    $pop?: ArrayPathMap<PV, 1 | -1>
}

/**
 * Patch values as the implementation below the pipes receives them: either a merge patch, or an
 * update document. Never both -- an implementation decides which it was given by its shape, so a
 * document carrying one plain property and one operator has no meaning.
 */
export type SourceValues<PV> = (PV & DottedPaths) | UpdateOperators<PV>
