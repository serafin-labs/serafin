<p align="center"><img src="https://serafin-labs.github.io/images/logo-serafin-with-text-1080.png" width="300"/></p>

[**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) is a [**Typescript**](https://www.typescriptlang.org/) CRUD data access library with a functional approach.

#  Concepts

[**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) is a library that allow access to data through the **CRUD methods** (*create*, *read*, *patch*, *replace* and *delete*) of a data **pipeline**.

A **pipeline** is an element that performs operations over a data source through these 5 methods. Its behavior can be extended in a functional way, by adding **pipes**, elements that perform data processing or transformation over any of these 5 methods.

The [**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) library is designed to take advantage of the [**Typescript**](https://www.typescriptlang.org/) language, thus providing compilation-time checks and auto-completion.

## Methods

**Serafin Pipeline** provides data access through 5 methods: **create**, **read**, **patch**, **replace** and **delete**.

### Entry parameters

These methods take different entry parameters, according to their nature.

They almost all accept **query** and **options** parameters. **query** represent resource(or model)-related parameters, that filter the result set, while **options** represent **pipeline** related parameters, that influence the behavior of the **pipeline**.

The parameters are:

- **create**:
    - *values*: an array of resources to create
    - *options*: parameters affecting the pipeline behavior
- **read**:
    - *query*: optional filtering parameters
    - *options*: parameters affecting the pipeline behavior
- **patch**:
    - *query*: filtering parameters
    - *values*: the resources values to set
    - *options*: parameters affecting the pipeline behavior
- **replace**:
    - *id*: the identifier of the resource to replace
    - *values*: the resource values to set
    - *options*: parameters affecting the pipeline behavior
- **delete**:
    - *query*: optional filtering parameters
    - *options*: parameters affecting the pipeline behavior

### Return value

All methods return a **Results** object with

* **meta**: an object containing metadata fields
* **data**: an array containing the returned resources

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

A **pipeline** is an object that handles these five methods, operates over a data source, and whose behavior and model can be extended by plugging **pipes** to it.

### Pipeline

At instanciation, the **pipeline** constructor takes a model argument.

The model is defined by passing a [**SchemaBuilder**](https://github.com/serafin-labs/schema-builder) object. Thanks to this library, the model can be defined by providing a [**JSON Schema**](http://json-schema.org/) representation object, or by building the schema using the [**SchemaBuilder**](https://github.com/serafin-labs/schema-builder) functional syntax.

```Example
let myPipeline = new PipelineInMemory(
    SchemaBuilder.emptySchema()
        .addString("id", { description: "id" })
        .addString("firstName", { description: "user first name" }))
        .addString("lastName", { description: "user last name" }));
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
    ;
```

### Conventions

Inside **pipes** and **pipelines**, the **options** that begin by a `_` are considered as *private*: any remote API that rely on [**Serafin Pipeline**](https://github.com/serafin-labs/pipeline) must trim them from the *user-provided **options***. These **options** correspond to security parameters or other *internal **options*** that would be supplied internally.

### Data access

A **pipeline**, wether it has been extended or not, can be called by using one of the *CRUD operations* it owns.

All *CRUD operations* are *asynchronous* (and return **Promises**). Also, all operations return an array of results.

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

**Relations** between **pipelines** can be defined using the **pipeline .addRelation** method.

```Example
let addressPipeline = new PipelineInMemory(addressSchema);
let userPipeline = new PipelineInMemory(userSchema);
    .addRelation("address", () => addressPipeline, { "id": ":addressId" });
```

**Relations** are simply one-direction links resolved at runtime.

The **.addRelation** arguments are the **relation name**, a **resolver** that returns a pipeline, and an optional **query**.

The provided query can be a **templated query**: if a query value begins by `:`, its value will be replaced at runtime by the *resource value* correspond to this *model field*.