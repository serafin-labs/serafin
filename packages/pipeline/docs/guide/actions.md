# create, read, patch, delete

The four actions are the whole public surface of a pipeline. Each one cleans its inputs, validates
them against the pipeline's schemas, and then runs the pipe chain down to the implementation.

## create

```ts
create(resources: CV[], options?: CO, context?: CTX): Promise<Results<M, META & CM>>
```

Takes an **array**, always — creating one resource is an array of one. Each entry is validated
against `createValues`, which is the model with `id` made optional, so a pipeline can hand out ids
itself.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
const { data } = await users.create([{ firstName: "Nico" }, { firstName: "Seb", id: "chosen" }])

data[0].id // generated
data[1].id // "chosen"
```

An empty array is rejected: `create` with nothing to create is a mistake, not a no-op.

`options` is `create`'s query — parameters that alter what the action does rather than filter
anything. It starts empty, and pipes add to it. Relations put their `with<Name>` options here.

## read

```ts
read(query: RQ, context?: CTX): Promise<Results<M, META & RM>>
```

`readQuery` is derived as `model.transformPropertiesToArray().toOptionals()`, which means two things:

- **every property is optional**, so `read({})` matches everything;
- **every property also accepts an array**, which by convention means *any of these values*.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
await users.read({}) // everything
await users.read({ firstName: "Nico" }) // one value
await users.read({ firstName: ["Nico", "Seb"] }) // either value
```

::: warning An array means "any of", not "equals this array"
This is a deliberate divergence from mongodb, and it is what makes relation resolution able to read a
whole page in one call. A pipeline that wants literal array equality has to ask for it explicitly —
with `MemoryPipeline`, `{ $eq: [...] }`. See [Query Operators](./query-operators).
:::

What else a read query accepts is up to the implementation. `MemoryPipeline` adds `skip`, `limit`,
`sort` and `withCount`, deliberately under the names a mongodb source uses.

## patch

```ts
patch(query: PQ, values: PV, context?: CTX): Promise<Results<M, META & PM>>
```

`patchQuery` is derived as `model.pickProperties(["id"]).transformPropertiesToArray()` — selection is
by `id`, one or several, and `id` is **required**. A patch without a query would be a patch of
everything.

`patchValues` is `model.omitProperties(["id"]).toNullable().toDeepOptionals()`: every property
optional at every depth, and nullable.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), firstName: SB.stringSchema(), nickname: [SB.stringSchema(), undefined] },
)
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico", nickname: "nico" }] })
// ---cut---
await users.patch({ id: "1" }, { firstName: "Nicolas" }) // set it
await users.patch({ id: "1" }, { nickname: null }) // clear it
await users.patch({ id: ["1", "2"] }, { firstName: "same" }) // several at once
```

Those three lines are [JSON merge patch](https://tools.ietf.org/html/rfc7396), which is the semantics
`patch` is meant to follow: **absent leaves alone, `null` deletes**. That is why `patchValues` is
nullable — `null` has to be sayable.

::: tip `undefined` is not `null`
`{ nickname: undefined }` leaves `nickname` alone; `{ nickname: null }` removes it. Properties set to
`undefined` are stripped from every input before validation, so an in-process call behaves exactly
like one that arrived as JSON — where `undefined` cannot be expressed at all. See
[Undefined properties](./context#undefined-properties).
:::

## delete

```ts
delete(query: DQ, context?: CTX): Promise<Results<M, META & DM>>
```

`deleteQuery` is derived the same way as `patchQuery`: by `id`, required, one or several. The
resources that were deleted come back in `data`, which is what lets a pipe above see what it lost.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema, { initialData: [{ id: "1", firstName: "Nico" }] })
// ---cut---
const { data } = await users.delete({ id: "1" })
data[0].firstName // "Nico" -- what was there a moment ago
```

## No replace

The README of older versions mentioned five methods. There are four: `replace` is
`patch` with values that mention every property, and a pipeline that wants replace semantics can
expose them through `patchValues`.

## Standalone action functions

Each action can be extracted as a bound function, which is how a pipe takes a dependency on one
action of one pipeline without holding the pipeline itself:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), firstName: SB.stringSchema() })
const users = new MemoryPipeline(userSchema)
// ---cut---
const readUsers = users.getReadFunction()
//    ^?
```

`getCreateFunction`, `getReadFunction`, `getPatchFunction` and `getDeleteFunction` all work this way.

## What's next

- [Schema Builders](./schema-builders) — where those derived schemas come from
- [Results & Meta](./results) — the shape every action returns
- [Context](./context) — the other argument, and what belongs in it
