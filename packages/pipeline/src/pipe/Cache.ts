import { IdentityInterface } from "../IdentityInterface.js"
import { PipeCreateNext, PipeDeleteNext, PipePatchNext, PipeReadNext } from "../PipeInterface.js"
import { ResultsInterface } from "../ResultsInterface.js"
import { stableKey } from "../stableKey.js"

/**
 * Where a cache scope hides on the context.
 *
 * A symbol keeps it out of `Object.keys`, so it is invisible to context validation and to concrete
 * pipeline implementations, exactly like the relation depth counter. `Symbol.for` rather than
 * `Symbol()` so an ESM and a CJS copy of this library loaded in the same process agree on the key.
 */
const cacheScope = Symbol.for("@serafin/pipeline.cacheScope")

/**
 * A scope holds the reads issued since it was opened, as the promises themselves rather than their
 * results -- which is what lets two calls that overlap in time share a single read.
 */
type CacheScope = Map<string, Promise<ResultsInterface<any, any>>>

/**
 * Scopes handed out by `openCacheScope`.
 *
 * Every pipeline entry point shallow-copies the context, and a shallow copy carries symbol keys by
 * reference, so one scope is shared by every pipeline and every nested relation read below it. A
 * *deep* copy is different: it duplicates the map, and two duplicates diverge -- a write flushing
 * one leaves the other serving what it just invalidated. A scope that isn't in here arrived through
 * such a copy, so it is treated as no scope at all rather than as a cache that can go stale.
 *
 * It lives in the global registry rather than in this module, so that two copies of this library in
 * one process -- the ESM build and the CJS build -- recognise each other's scopes, as they already
 * agree on the context key.
 */
const scopeRegistry = Symbol.for("@serafin/pipeline.cacheScopes")
function liveScopes(): WeakSet<CacheScope> {
    return ((globalThis as any)[scopeRegistry] ??= new WeakSet<CacheScope>())
}

/**
 * A context that deduplicates the reads made through it.
 *
 * Nothing is cached until a scope is open, so a pipeline carrying `Cache()` behaves exactly as it
 * did before until a caller asks for it. Open one per request, or around any sequence of reads that
 * should see a single consistent version of the data. Opening a scope on a context that already has
 * one nests it: the inner scope starts empty and is discarded with the context that carries it.
 */
export function openCacheScope<CTX extends object>(context?: CTX): CTX {
    const scope: CacheScope = new Map()
    liveScopes().add(scope)
    return { ...(context ?? ({} as CTX)), [cacheScope]: scope }
}

function scopeOf(context: any): CacheScope | undefined {
    // `WeakSet.has` answers `false` for anything that isn't an object, so an absent scope needs no
    // separate test here.
    const scope = context?.[cacheScope]
    return liveScopes().has(scope) ? scope : undefined
}

/**
 * Drop everything the context's scope has cached, if it has one.
 *
 * Every write going through a `Cache()` pipe does this already. Call it directly after changing the
 * data some other way -- a raw query, a bulk import -- so the rest of the scope doesn't keep serving
 * what was true before.
 */
export function flushCacheScope(context: any): void {
    scopeOf(context)?.clear()
}

/**
 * A copy of a result that can be handed to a second caller.
 *
 * The array and the meta object are the caller's own, so pushing to `data` or stamping a key on
 * `meta` stays local. The resources inside are shared: deep-copying a whole page on every hit
 * routinely costs more than the read it saved. Treat resources coming out of a cached read as
 * immutable.
 */
function envelope<M, META>(result: ResultsInterface<M, META>): ResultsInterface<M, META> {
    return { ...result, data: [...result.data], meta: { ...result.meta } }
}

/**
 * Ids are handed out from the global symbol registry rather than a module-level counter, so two
 * copies of this library in one process can't both hand out `cache1` and collide in a shared scope.
 */
const cacheIdCounter = Symbol.for("@serafin/pipeline.cacheIdCounter")
function nextCacheId() {
    const next = ((globalThis as any)[cacheIdCounter] ?? 0) + 1
    ;(globalThis as any)[cacheIdCounter] = next
    return `cache${next}`
}

export interface CacheOptions {
    /**
     * What separates this cache's entries from those of every other cache sharing the scope.
     * Defaults to a generated id, which is what you want unless you have two pipelines that are
     * deliberately interchangeable and should share entries.
     */
    id?: string
}

/**
 * Pipe that reads each distinct query once per cache scope.
 *
 * Add it as the *first* pipe of a pipeline. `pipe()` prepends, so the first pipe added is the last
 * to run, which puts the cache immediately above the concrete implementation: it sees the query
 * after defaults have been applied and after relation options have been stripped, so queries that
 * differ only in how they were written still land on one entry, and every pipe above it -- checking
 * permissions, stamping meta, writing an audit trail -- still runs on a cache hit.
 *
 * Any write going through the pipe empties the whole scope. Which cached queries a written resource
 * would have matched cannot be known here -- read queries mean whatever the concrete implementation
 * makes them mean -- so the only sound answer is to keep nothing.
 */
export function Cache<
    M extends IdentityInterface = IdentityInterface,
    CV = any,
    CO = any,
    RQ = any,
    PQ = any,
    PV = any,
    DQ = any,
    CM = any,
    RM = any,
    PM = any,
    DM = any,
    CTX = any,
    META = any,
>(options: CacheOptions = {}) {
    const id = options.id ?? nextCacheId()

    const write = async <T>(context: CTX, run: () => Promise<T>): Promise<T> => {
        // `finally`, not a success path: a write that throws may still have changed something.
        try {
            return await run()
        } finally {
            flushCacheScope(context)
        }
    }

    return () => ({
        read: async (next: PipeReadNext<M, RQ, RM, CTX, META>, query: RQ, context: CTX) => {
            const scope = scopeOf(context)
            if (!scope) {
                return next(query, context)
            }
            const key = `${id}:${stableKey(query)}`
            const pending = scope.get(key)
            if (pending) {
                return envelope(await pending) as ResultsInterface<M, META & RM>
            }
            // `next` returns its promise synchronously, so the entry is in place before anything can
            // await it. That is what makes two overlapping reads share one call rather than race.
            const issued = next(query, context)
            scope.set(key, issued)
            try {
                return envelope(await issued)
            } catch (e) {
                // Don't pin a failure for the life of the scope: let the next caller try again.
                scope.delete(key)
                throw e
            }
        },
        create: async (next: PipeCreateNext<M, CV, CO, CM, CTX, META>, resources: CV[], createOptions: CO, context: CTX) =>
            write(context, () => next(resources, createOptions, context)),
        patch: async (next: PipePatchNext<M, PQ, PV, PM, CTX, META>, query: PQ, values: PV, context: CTX) =>
            write(context, () => next(query, values, context)),
        delete: async (next: PipeDeleteNext<M, DQ, DM, CTX, META>, query: DQ, context: CTX) => write(context, () => next(query, context)),
    })
}
