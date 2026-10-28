# Caching

Pipes in one chain often read the same resource from the same pipeline with nothing modifying it in
between: a permission check reads the owner, a validation pipe reads it again, a relation resolves it
a third time. `Cache` makes that one read.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] }).pipe(Cache())

await users.read({ id: "1" }) // no scope: straight through, every time

const context = openCacheScope({})
await users.read({ id: "1" }, context)
await users.read({ id: "1" }, context) // served from the scope; the store is not touched
```

## Attach it first

`.pipe()` prepends, so the pipe attached first is the last to run, immediately above the
implementation ([Order & Composition](./pipe-order)). There, the cache:

- **sees the final query**, after defaults are applied and relation options stripped, so two calls
  written differently but meaning the same land on one entry;
- **lets everything above it run on a hit.** Permission checks still check and meta is still stamped;
  only the store is skipped.

## Scopes

Nothing is cached until a scope is open, so adding `Cache()` changes nothing until a caller asks.
**Open one per request**, and leave it out of anything that must see fresh data:

```ts twoslash
import { openCacheScope } from "@serafin/pipeline"
declare function handle(context: any): Promise<void>
declare const session: { userId: string }
// ---cut---
const context = openCacheScope({ _userId: session.userId })
await handle(context) // every read below shares the scope
```

The scope rides on the context under a symbol ([Context](./context#what-travels-invisibly)), so
**every pipeline and every nested relation read below it shares it**: a relation resolving through a
target that also carries `Cache()` is deduplicated against the rest of the request. Opening a scope on
a context that has one **nests** it: the inner scope starts empty and is dropped with its context.

A scope holds read **promises**, so overlapping reads share one call. A read that throws is removed.

## Invalidation

Any write through a `Cache()` pipe **empties the whole scope**, not just that pipeline's entries — even
if the write throws, since it may have changed something.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope, flushCacheScope } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] }).pipe(Cache())
// ---cut---
const context = openCacheScope({})
await users.read({}, context) // cached
await users.patch({ id: "1" }, { firstName: "Nicolas" }, context) // scope emptied
await users.read({}, context) // read again, and correct

// for data changed some other way -- a raw query, a bulk import
flushCacheScope(context)
```

Blunt on purpose: a read query means what the implementation makes it mean, so which cached queries a
write affects cannot be known here.

## Limits

- **Only structurally identical queries share an entry.** `{ id: "1" }` and `{ id: ["1"] }` are two
  reads; property order does not matter.
- **Resources are shared.** Each caller gets its own `data` array and `meta` object, but the resources
  inside are the same objects for everyone — deep-copying a page on every hit routinely costs more than
  the read it saved. Treat them as immutable.
- **A scope grows until it is dropped.** Request-scoped use bounds itself; a scope held by a worker or
  a long-lived connection does not.
- **A deep-copied context loses the caching**, as described in [Context](./context#what-travels-invisibly).

Each `Cache()` has its own id, so two pipelines over one store keep separate entries. Give them the
same id, `Cache({ id: "users" })`, when they are deliberately interchangeable.
