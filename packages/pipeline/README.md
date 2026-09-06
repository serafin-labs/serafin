<p align="center"><img src="https://serafin-labs.github.io/images/logo-serafin-with-text-1080.png" width="300"/></p>

[**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) is a [**Typescript**](https://www.typescriptlang.org/) CRUD data access library with a functional approach.

# Concepts

[**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) is a library that allow access to data through the **CRUD methods** (_create_, _read_, _patch_, _replace_ and _delete_) of a data **pipeline**.

A **pipeline** is an element that performs operations over a data source through these 5 methods. Its behavior can be extended in a functional way, by adding **pipes**, elements that perform data processing or transformation over any of these 5 methods.

The [**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) library is designed to take advantage of the [**Typescript**](https://www.typescriptlang.org/) language, thus providing compilation-time checks and auto-completion.

## Methods

**Serafin Pipeline** provides data access through 4 methods: **create**, **read**, **patch** and **delete**.

### Entry parameters

These methods take different entry parameters, according to their nature.

They almost all accept **query** and **context** parameters. **query** (or **options**) represent model-related parameters, that filter the result set or alter the action behavior, while **context** represent **pipeline** related parameters that influence the behavior of any action.

The parameters are:

-   **create**:
    -   _values_: an array of resources to create
    -   _options_: parameters affecting the create behavior
    -   _context_: parameters affecting the pipeline behavior
-   **read**:
    -   _query_: filtering parameters
    -   _context_: parameters affecting the pipeline behavior
-   **patch**:
    -   _query_: filtering parameters
    -   _values_: the resources values to set
    -   _context_: parameters affecting the pipeline behavior
-   **delete**:
    -   _query_: filtering parameters
    -   _context_: parameters affecting the pipeline behavior

### Return value

All methods return a **Results** object with

-   **meta**: an object containing metadata fields
-   **data**: an array containing the returned resources

```
{
    data: [{
            id: "1",
            firstName: "Nico"
            lastName: "Degardin"
        }, {
            id: "2",
            firstName: "Seb"
            lastName: "De Saint-Florent"
        }],
    meta: {
        count: 2
    }
}
```

## Pipelines and Pipes

A **pipeline** is an object that handles these four methods, operates over a data source, and whose behavior and model can be extended by plugging **pipes** to it.

### Pipeline

At instantiation, the **pipeline** constructor takes a model argument.

The model is defined by passing a [**SchemaBuilder**](https://github.com/serafin-labs/schema-builder) object. Thanks to this library, the model can be defined by providing a [**JSON Schema**](http://json-schema.org/) representation object, or by building the schema using the [**SchemaBuilder**](https://github.com/serafin-labs/schema-builder) functional syntax.

```Example
let myPipeline = new PipelineInMemory(
    SchemaBuilder.objectSchema({
        id: SchemaBuilder.stringSchema({ description: "id" }),
        firstName: SchemaBuilder.stringSchema({ description: "user first name" }),
        lastName: SchemaBuilder.stringSchema({ description: "user last name" })
    })
)
```

### Pipe

A **pipe** is a generic element that can be plugged to a **pipeline** by using the **.pipe** method, to extend its behavior.

A **pipe** can alter the **pipeline** model and do virtually anything as long as it returns the expected **result** structure (or an error): it can filter or transform data, add parameters to the query, perform checks, etc...

```Example
let userSchema = ...
let myPipeline = new PipelineInMemory(userSchema)
    .pipe(new PipeUpdateTime())
    .pipe(new PipeMemcached())
    .pipe(new PipeSomeSecurity())
```

### Conventions

Inside **pipes** and **pipelines**, the **context** properties that begin by a `_` are considered as _private_: any remote API that rely on [**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) must trim them from the \*user-provided values\*. These **context** properties correspond to security parameters or other \*internal **options\*** that would be supplied internally by the transport.

### Data access

A **pipeline**, wether it has been extended or not, can be called by using one of the _CRUD operations_ it owns.

All _CRUD operations_ are _asynchronous_ (and return **Promises**). Also, all operations return an array of results.

```Example
let userSchema = ...
let myPipeline = new PipelineInMemory(userSchema)
    .pipe(new PipeUpdateTime())
    .pipe(new PipeMemcached())
    .pipe(new PipeSomeSecurity())
    ;

let user = await myPipeline.read({"id":"1"});
console.log(user.data[0] ? `User ${user.data[0].firstName} ${user.data[0].lastName}` : "User with id '1' not found");
```

### Relations

**Relations** between **pipelines** can be defined using the **pipeline .addRelationWithOne** and **.addRelationWithMany** methods.

```Example
let addressPipeline = new PipelineInMemory(addressSchema);
let userPipeline = new PipelineInMemory(userSchema)
    .addRelationWithOne("address", addressPipeline, { "id": ":addressId" });
```

**Relations** are one-direction links resolved at runtime.

The arguments are the **relation name**, a pipeline, and a **query**. The query can be **templated**: a value beginning with `:` is replaced at runtime by the value of that field on the resource. A literal value starting with `:` can be escaped as `\:`.

#### Requesting a relation

Declaring a relation adds a `with<Name>` option to _read_, _create_, _patch_ and _delete_. Relations are **only** resolved when asked for:

```Example
await userPipeline.read({});                        // no address is fetched
await userPipeline.read({ withAddress: true });     // address is fetched
```

The option also accepts a query for the related pipeline, which narrows the related read and can carry the target's own `with<Name>` options to nest a level deeper:

```Example
await userPipeline.read({ withAddress: { country: "FR", withCity: true } });
```

Nesting is bounded by `maximumRelationDepth` (10).

#### Where the result goes

Related resources are returned **normalized, in `meta.relations`** — not inlined into each resource:

```
{
    data: [
        { id: "1", addressId: "a1" },
        { id: "2", addressId: "a1" }
    ],
    meta: {
        relations: {
            address: {
                type: "one",
                data:  { a1: { id: "a1", city: "Paris" } },
                index: { "1": "a1", "2": "a1" }
            }
        }
    }
}
```

`data` holds each related resource **once**, keyed by its own id. `index` maps a holding resource's id to the related id — an array of ids for a _many_ relation. This keeps a shared target from being repeated per resource, lets cyclic graphs be represented at all, and makes the result straightforward to merge into a client-side cache.

A whole page is resolved in a **single read** when the relation is keyed on one templated field that the target declares on its model and accepts as an array on its read query. Otherwise it falls back to one read per distinct target, still de-duplicated.

To get the previous shape, with each related resource hanging off the resource that points at it, apply `inlineRelations`. It is a pure function over the result — no reads — so it can be used at the edge and skipped on hot paths:

```Example
import { inlineRelations } from "@serafin/pipeline";

const users = inlineRelations(await userPipeline.read({ withAddress: true }));
console.log(users.data[0].address.city);
```

#### Shared meta

`meta` is declared by a dedicated `meta` schema builder shared by all four actions, so the meta an action returns is `META & CM | RM | PM | DM`. Anything cross-cutting — relations, timings, request identifiers — is declared once rather than four times. Relations are namespaced under the reserved `relations` key.
