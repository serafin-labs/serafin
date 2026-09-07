# Caching

Two pipes in one chain often read the same resource from the same pipeline, with nothing modifying it
in between. A permission check reads the owner; a validation pipe reads it again; a relation resolves
it a third time. `Cache` makes that one read.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] }).pipe(Cache())

const context = openCacheScope({})

await users.read({ id: "1" }, context)
await users.read({ id: "1" }, context) // served from the scope; the store is not touched
```

## Attach it first

`Cache()` goes **first** in the chain. `.pipe()` prepends, so the first pipe attached is the last to
run — which puts the cache immediately above the implementation.

```ts twoslash
// @noErrors
const users = new MemoryPipeline(userSchema)
    .pipe(Cache())          // innermost
    .pipe(SoftDelete())
    .pipe(OnlyVisibleTo())  // outermost
```

Two consequences, both of them the point:

- **It sees the final query.** Defaults have been applied and relation options stripped, so two calls
  written differently but meaning the same thing land on one entry.
- **Everything above it still runs on a hit.** Permission checks still check, meta still gets
  stamped, the audit trail still records. Only the store is skipped.

## Nothing is cached until a scope is open

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema() })
const users = new MemoryPipeline(userSchema).pipe(Cache())
// ---cut---
await users.read({ id: "1" }) // no scope -> straight through, every time
await users.read({ id: "1" }, openCacheScope({})) // scoped -> cached
```

So adding `Cache()` to a pipeline changes nothing until a caller asks for it. **Open one per
request**, and leave it out of anything that must see fresh data.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema() })
const users = new MemoryPipeline(userSchema).pipe(Cache())
declare function handle(context: any): Promise<void>
declare const session: { userId: string }
// ---cut---
// in a request handler
const context = openCacheScope({ _userId: session.userId })
await handle(context) // every read below shares one scope
```

The scope lives on the context under a symbol, so it is invisible to context validation and to
pipeline implementations. **Every pipeline and every nested relation read below it shares the one
scope** — so a relation resolving through a target pipeline that also carries `Cache()` is
deduplicated against everything else in the request.

Opening a scope on a context that already has one **nests** it: the inner scope starts empty and is
discarded with the context that carries it.

## Overlapping reads share one call

A scope holds the read **promises**, not their results. Two calls that overlap in time therefore
share a single read rather than racing:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema() })
const users = new MemoryPipeline(userSchema).pipe(Cache())
// ---cut---
const context = openCacheScope({})
await Promise.all([users.read({ id: "1" }, context), users.read({ id: "1" }, context)]) // one read
```

A read that **throws** is removed from the scope, so a failure is not pinned there for the life of
the request.

## Invalidation

Any write going through a `Cache()` pipe **empties the whole scope** — not just that pipeline's
entries.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, Cache, openCacheScope } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] }).pipe(Cache())
// ---cut---
const context = openCacheScope({})
await users.read({}, context) // cached
await users.patch({ id: "1" }, { firstName: "Nicolas" }, context) // scope emptied
await users.read({}, context) // read again, and correct
```

That is blunt on purpose. Which cached queries a written resource would have matched cannot be known
here: a read query means whatever the concrete implementation makes it mean, so there is no sound way
to invalidate selectively. Keeping nothing is the only answer that cannot be wrong.

A write that **throws** empties the scope too — it may still have changed something.

For data changed some other way — a raw query, a bulk import — flush by hand:

```ts twoslash
import { flushCacheScope } from "@serafin/pipeline"
declare const context: any
// ---cut---
flushCacheScope(context)
```

## What it does not do

**Only structurally identical queries share an entry.** `{ id: "1" }` and `{ id: ["1"] }` are two
reads. Property order does not matter; nesting does. A property set to `undefined` is already gone by
the time the cache sees the query.

**Results are shared.** Each caller gets its own `data` array and `meta` object — so pushing to one
or stamping the other stays local — but **the resources inside are the same objects for everyone**.
Deep-copying a whole page on every hit routinely costs more than the read it saved. Treat resources
from a cached read as immutable.

**A scope grows until it is dropped.** Request-scoped use bounds itself. A scope held open by a
worker or a long-lived connection does not.

**A deep-copied context loses the caching.** A duplicated scope would diverge — a write flushing one
would leave the other serving what it just invalidated — so a copy that arrived that way is treated
as *no* scope. Safe, but it costs you the deduplication. Spread the context; don't clone it.

## Sharing entries between pipelines

Each `Cache()` gets its own id, so two pipelines over the same store keep separate entries. Give them
the same id when they are deliberately interchangeable:

```ts twoslash
import { Cache } from "@serafin/pipeline"
// ---cut---
Cache({ id: "users" })
```

## What's next

- [Order & Composition](./pipe-order) — why "first" means "innermost"
- [Context](./context) — what else rides on the context
