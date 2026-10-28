# SourceQuery & Capabilities

## Operators come from pipes

The public schemas describe plain values: `readQuery` says `age` is an integer, so a caller sending
`{ age: { $gte: 18 } }` is rejected before any pipe runs. Operators are an internal vocabulary. A pipe
exposes a public parameter and translates it into an operator condition, handed down through `next`
— and **nothing revalidates a `next` call**:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"

const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })

type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]

/** A public `minAge` parameter, handed down as the `$gt` condition it means. */
const MinAge = (p: { readQuery: SB<ReadQuery> }) => {
    const readQuery = p.readQuery.addNumber("minAge", { minimum: 0 }, false)
    return {
        requires: ["$gt"],
        readQuery,
        read: async (next: PipeReadNext<User, ReadQuery>, query: typeof readQuery.T, context: any) => {
            const { minAge, ...rest } = query
            // no cast: `{ age: { $gt: number } }` is a valid `SourceQuery<ReadQuery>`
            return next(minAge === undefined ? rest : { ...rest, age: { $gt: minAge } }, context)
        },
    }
}

const users = new MemoryPipeline(userSchema).pipe(MinAge)
await users.read({ minAge: 18 }) // public parameter in, operator down
```

The public schema stays a clean description of what callers may ask for. What travels down is a
**widening** of the read query, which raises two questions: is it well-formed (**`SourceQuery`**, in
the types), and does the implementation understand it (**capabilities**, checked by `.pipe()`)?

## SourceQuery and SourceValues

`PipeReadNext`, `PipePatchNext` and `PipeDeleteNext` accept `RQ | SourceQuery<RQ>` and
`PV | SourceValues<PV>`, so operators pass through `next` without a cast. Import the types to name a
widened query yourself:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { memorySchemaBuilders, SourceQuery } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<User>>["readQuery"]["T"]
// ---cut---
function ageBetween(low: number, high: number): SourceQuery<ReadQuery> {
    return { age: { $gte: low, $lte: high } }
}
```

`SourceQuery<RQ>` is not `any`: it keeps each property's type and rejects properties the model does
not declare.

```ts twoslash
// @errors: 2353 2322 2820
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { memorySchemaBuilders, SourceQuery } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<User>>["readQuery"]["T"]
// ---cut---
const ok: SourceQuery<ReadQuery> = { age: { $gt: 18 } }

const wrongOperand: SourceQuery<ReadQuery> = { age: { $gt: "18" } }

const notAProperty: SourceQuery<ReadQuery> = { minAge: 18 }

const regexOnANumber: SourceQuery<ReadQuery> = { age: /18/ }
```

`{ minAge: 18 }` is the one worth catching: a public parameter reaching the implementation
untranslated means the pipe meant to translate it is missing or misordered. **Dotted paths** cannot
be enumerated from the type, so they are accepted with an `unknown` value through a template-literal
index signature, `` { [path: `${string}.${string}`]: unknown } `` — which still rejects `minAge`.

`QueryOperators<V>` is what may stand in for a value of type `V`:

comparisons take the element type of an array (`$eq` and `$in` also accept the whole array),
`$regex` is string-only, `$elemMatch` takes a `SourceQuery` of an object element, and `null` is
allowed on `$eq`, `$ne`, `$in`, `$nin` and as a bare value.

`SourceValues<PV>` is a merge patch or an update document, never both, since an implementation tells
them apart by shape. The array operators only apply to array properties and keep the element type:

```ts twoslash
// @errors: 2322 2820 2418 2353
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { memorySchemaBuilders, SourceValues } from "@serafin/pipeline"
const widgetSchema = SB.objectSchema(
    { title: "Widget" },
    { id: SB.stringSchema(), name: SB.stringSchema(), size: [SB.numberSchema(), undefined], tags: [SB.arraySchema(SB.stringSchema()), undefined] },
)
type Widget = typeof widgetSchema.T
type PatchValues = ReturnType<typeof memorySchemaBuilders<Widget>>["patchValues"]["T"]
// ---cut---
const mergePatch: SourceValues<PatchValues> = { name: "screw", size: null }
const updateDocument: SourceValues<PatchValues> = { $inc: { size: 1 }, $push: { tags: "large" } }

const notAnArray: SourceValues<PatchValues> = { $push: { name: "x" } }
const wrongElement: SourceValues<PatchValues> = { $push: { tags: { $each: [4] } } }
```

## Capabilities

The types say a condition is well-formed, not that the implementation interprets it. Hand `$gt` to a
source that ignores what it does not recognise and you get every user; to one that compares it as a
value, none. Either way, **a plausible page of the wrong resources**, with nothing to point at.

A pipe declares what it hands down with `requires`, as `MinAge` does. A pipeline declares what it
understands with `capabilities`, and `.pipe()` compares the two **when the pipe is attached**:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { PipelineAbstract, defaultSchemaBuilders } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
const MinAge = (p: { readQuery: SB<any> }) => ({ requires: ["$gt"], readQuery: p.readQuery.addNumber("minAge", {}, false) })
// ---cut---
class ExactMatchSource extends PipelineAbstract<any, any, any, any, any, any, any, any, any, any, any, any, any> {
    constructor(model: SB<any>) {
        super(defaultSchemaBuilders(model) as any, {
            capabilities: ["$in", "$eq"], // matches values, cannot compare
        })
    }
    protected override async _read(query: any) {
        return { data: [], meta: {} }
    }
}

new ExactMatchSource(userSchema).pipe(MinAge)
// throws SerafinCapabilityError: MinAge needs '$gt', which ExactMatchSource does not declare
```

The error's `info` carries `{ missing, declared }`.

**Undeclared is not incapable.** The check only runs when the pipeline declared capabilities; one
that declares none accepts any pipe, and its `capabilities` is `undefined`. Adding `requires` to a
pipe is therefore always safe, and adding `capabilities` to a pipeline turns checking on for the pipes
attached to it.

**`provides`** lets a pipe implement something on behalf of the pipes attached after it, which are the
ones above it — sorting in memory for a source that cannot sort, say:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const SortHere = (p: Builders) => ({
    provides: ["sort"],
    read: async (next: PipeReadNext<User, ReadQuery>, query: ReadQuery, context: any) => {
        const { sort, ...rest } = query
        const result = await next(rest, context)
        return sort ? { ...result, data: [...result.data].sort((a, b) => a.age - b.age) } : result
    },
})

const NeedsSort = (p: Builders) => ({ requires: ["sort"] })

const users = new MemoryPipeline(userSchema).pipe(SortHere).pipe(NeedsSort) // satisfied by SortHere
```

**The names** are free-form strings both sides agree on: operator names, but also `dotted-paths`,
read options such as `limit` — a pipe emitting `{ limit: 20 }` depends on them as much as one emitting
`$gt` — or `"transactions"`. [`memoryCapabilities`](/api/memory-pipeline#read-options) is
`MemoryPipeline`'s list.

To declare these types and capabilities on a source of your own, see
[Writing a Pipeline](./writing-a-pipeline#declare-what-you-accept).
