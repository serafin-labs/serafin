# SourceQuery & SourceValues

Nothing revalidates a `next` call. That is what lets a pipe hand an operator down without declaring
it on its own schemas — the public schema keeps saying `age` is a number, while the value travelling
down is `{ age: { $gt: 18 } }`.

The cost is that what goes down is no longer of type `RQ`. It is a **widening** of `RQ`, and before
these types existed that widening had no name, so every pipe doing it typed `next` loosely and cast
past the compiler — which hid its other mistakes along with the intended one.

`SourceQuery<RQ>` and `SourceValues<PV>` are that name.

## Using them

You mostly don't have to. `PipeReadNext`, `PipePatchNext` and `PipeDeleteNext` are already declared
as `RQ | SourceQuery<RQ>` and `PV | SourceValues<PV>`, so a pipe types `next` with the schema type it
had and passes operators through it without a cast:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { MemoryPipeline, memorySchemaBuilders, PipeReadNext } from "@serafin/pipeline"
const userSchema = SB.objectSchema({ title: "User" }, { id: SB.stringSchema(), age: SB.integerSchema() })
type User = typeof userSchema.T
type Builders = ReturnType<typeof memorySchemaBuilders<User>>
type ReadQuery = Builders["readQuery"]["T"]
// ---cut---
const MinAge = (p: Builders) => {
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
```

Import them directly when you want to name the widened query — passing one around, or building it in
a helper:

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

## The widening still bites

This is the part that matters. `SourceQuery<RQ>` is not `any` with extra steps — it keeps every
property's own type and rejects properties the model does not declare:

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

`{ minAge: 18 }` is the one worth catching. A public parameter reaching the implementation
untranslated is the signature of a pipe that was meant to translate it and didn't — or one attached
in the wrong order — and at runtime it matches nothing, so the request comes back looking like a
legitimate empty page.

## What it cannot check

**Dotted paths.** The set of paths a model allows cannot be enumerated from the query type, so a
dotted path is accepted with an unknown value type:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { memorySchemaBuilders, SourceQuery } from "@serafin/pipeline"
const userSchema = SB.objectSchema(
    { title: "User" },
    { id: SB.stringSchema(), address: SB.objectSchema({}, { city: SB.stringSchema() }) },
)
type User = typeof userSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<User>>["readQuery"]["T"]
// ---cut---
const fine: SourceQuery<ReadQuery> = { "address.city": "Paris" }
const alsoAccepted: SourceQuery<ReadQuery> = { "address.city": 42 } // not caught here
```

The second one is caught at runtime by an implementation that compares types — `MemoryPipeline`
answers no match rather than guessing an order across types.

It is a template-literal index signature, `` { [path: `${string}.${string}`]: unknown } ``, not a
plain one — which is precisely why `minAge` above is still rejected while `address.city` is not.

**Whether the operator is understood.** `SourceQuery` describes the vocabulary in `queryOperators`
and `logicalQueryOperators`. Whether the implementation below interprets `$gt` at all is
[capabilities](./capabilities), not types.

## Query operators, in types

`QueryOperators<V>` is what may stand in for a value of type `V`. A few of its choices are worth
calling out:

- **Comparisons take the element type.** For `tags: string[]`, `$gt` takes a `string`, because that
  is what a comparison is applied to. `$eq` and `$in` accept the whole array as well.
- **`$regex` and a regex `$not` are string-only.** A regular expression against a number does not
  compile.
- **`$elemMatch` resolves by element type.** For an array of objects it is a `SourceQuery` of the
  element; for an array of scalars it is `QueryOperators` of the element.
- **`null` is always allowed** on `$eq`, `$ne`, `$in` and `$nin`, and as a bare value — matching an
  absent property is a legitimate query.

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { memorySchemaBuilders, SourceQuery } from "@serafin/pipeline"
const widgetSchema = SB.objectSchema(
    { title: "Widget" },
    {
        id: SB.stringSchema(),
        size: [SB.numberSchema(), undefined],
        tags: [SB.arraySchema(SB.stringSchema()), undefined],
        parts: [SB.arraySchema(SB.objectSchema({}, { sku: SB.stringSchema(), qty: SB.numberSchema() })), undefined],
    },
)
type Widget = typeof widgetSchema.T
type ReadQuery = ReturnType<typeof memorySchemaBuilders<Widget>>["readQuery"]["T"]
// ---cut---
const queries: SourceQuery<ReadQuery>[] = [
    { size: { $gt: 2, $lte: 10 } },
    { size: null }, // absent, or explicitly null
    { tags: { $all: ["metal", "small"] } },
    { tags: { $size: 2 } },
    { parts: { $elemMatch: { sku: "b", qty: { $gt: 4 } } } },
    { $or: [{ size: { $gt: 5 } }, { tags: ["metal"] } ] },
]
```

## Update operators, in types

`SourceValues<PV>` is either a merge patch or an update document — never both, since an
implementation decides which it was given by its shape:

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

// the array operators only apply to array properties
const notAnArray: SourceValues<PatchValues> = { $push: { name: "x" } }

// and they keep the element type
const wrongElement: SourceValues<PatchValues> = { $push: { tags: { $each: [4] } } }
```

`$push` and `$addToSet` take one element or `{ $each: [...] }`; `$pull` takes an element or a
condition on elements; `$pullAll` takes elements matched by equality; `$pop` takes `1` or `-1`.

## On an implementation

The other side of the contract. A pipeline implementation declares these types on its protected
methods, which is how it states — in the type — that it accepts more than its schemas promise:

```ts twoslash
import { SchemaBuilder as SB } from "@serafin/schema-builder"
import { IdentityInterface, PipelineAbstract, ResultsInterface, SourceQuery, defaultSchemaBuilders } from "@serafin/pipeline"
// ---cut---
class MySource<M extends IdentityInterface> extends PipelineAbstract<M, any, any, any, any, any, any, any, any, any, any, any, any> {
    // widened: `SourceQuery<RQ>` rather than the schema's `RQ`
    protected override async _read(query: SourceQuery<any>, context: any): Promise<ResultsInterface<M, any>> {
        return { data: [], meta: {} }
    }
}
```

A widened parameter on an override is allowed — TypeScript's method parameters are bivariant.
`MemoryPipeline` is the worked example: its `_read`, `_patch` and `_delete` all declare these types.

::: info Why `next`'s type was widened in the library
The obvious alternative was for a pipe to type `next` as `PipeReadNext<M, SourceQuery<RQ>>`. That
cannot work: `next` is a function-typed parameter, so its own query parameter sits in a contravariant
position, and a widened one is rejected — method bivariance does not reach a nested function
parameter.

So the widening lives in `PipeReadNext` itself. Which is honest: the old type claimed a guarantee the
runtime never made, and pipes were already casting past it.
:::

## What's next

- [Capabilities](./capabilities) — the other half of the contract
- [Query Operators](./query-operators) — what `MemoryPipeline` does with these at runtime
