# Concepts

**Serafin** relies on standards both in terms of architecture and of data representation, it allows generic tools to ease the process of developing and integrating the API. It is based mainly on **Open Api 3** (formerly Swagger) and **JSON Schema**.

**Serafin** puts at the disposal of the developer a framework environment that ease API building, testing, and integration, both through adapted tools, and through the abstraction of common concepts, to focus only on the added value of the API.

The development approach of **Serafin** is to build potentially complex endpoints by defining standard Schemas and then altering the endpoints behavior with a set of generic and simple modifiers, that we call **pipelines**. This way you define your REST API in a similar way you would define a **Stream**.


## Why Serafin? 
Among the ways a developer can set up a REST API, we have identified the following options:

### From scratch
Some developers prefer to build a REST application from scratch. In this case, they have full control over what they create, but need to reinvent the wheel. They will usually end up reusing components that have already been aggregated by a lot of REST frameworks, and time/money constraints will often push them to implement the minimum to fit their specific needs, consequently a partial or erroneous implementation.

### Declarative frameworks
Some API frameworks expect endpoints definitions through declarative files such as **Yaml** or **JSON**. It provides a synthetic view of the endpoints, and these files are generally compiled into actual code.

This approach typically shows its limitations when a complex behavior that exceeds what's expected in a declarative file has to be implemented. Attaching some programmatic extended behavior can then become tricky.

Moreover, such declarative files rarely follow a standard and are specific to each framework.

Our point is that if a declarative file allows to represent clearly an API, there's no reason why a clear programmatic interface wouldn't.

### Scaffolding frameworks
Some API frameworks use **scaffolding** technics to generate the code of your endpoints. They provide a good boost at the beginning but once you have to add your own logic to the generated endpoints, it becomes close to an API from scratch if not worse.

If a framework can generate the API code for you, there's no reason why a clear programmatic interface wouldn't be able to provide same default behaviours easily.

### UI API builders
New tools are appearing, allowing to design an API through a user interface. The objective is usually to provide assistance to people with limited knowledge of how to do so. It can be seen as a Content Management System for APIs, with the same advantages and drawbacks.

With limited possibilities offered by the UI, and limited to no access to the underlying code, these tools are generally a good fit only for very simple and straightforward cases.

### Programmatic frameworks
Our vision is that to build completely, in an efficient, maintainable and evolutive way an API, there's no such thing as a fully programmatic framework.

What differentiates **Serafin** from other frameworks is its set of features, allowing backend developers to focus on the business value of what they build:

- its self-descriptive nature featuring **Open API**, **JSON Schema** and **GraphQL**
- it is based on **Typescript** and provide advanced way to check types and data
- its **pipeline** architecture provides an advanced way to cutomize behaviour


# Features
Here are some of the features making **Serafin** the solution of choice when it comes to build an API:


## Database agnostic

The **source pipeline** classes provide an abstraction layer on top of databases. It could be anything: a file, a **MongoDB**, **DynamoDB**, or even **MySQL** database.

```typescript
let inMemoryPipeline = new PipelineSourceInMemory(aModelSchema);
```

## Schema Builder

The JSON schema and its associated Typescript type can be built at the same time using our schema builder library.

Check out [serafin-labs/schema-builder](https://github.com/serafin-labs/schema-builder)

## Pipelines

Each endpoint is linked to a **pipeline**, with a set of **REST** actions possible on it.

A **source pipeline** is a generic access to a data source. 
A **pipeline** is a modifier that enhances an other **pipeline** capacities. This way, it is possible to easily add many common behaviors such as logs, events, cache, api rate limiting, user acl, generated properties, relations, result filters, property filters, custom type checking... or, of course, custom behaviors to any **pipeline**.

```typescript
let petPipeline = (new PipelineSourceInMemory(petSchema)) 
    .pipe(new Paginate())
    .pipe(new DefaultPetName("Snowball", 1))
```

## Relations

You can define relations on a pipeline. It's basicaly a way to declare how your model relates to other entities. This info is then used by pipelines or transports to provide additional capabilities.

```typescript
bookPipeline.addRelation({ name: 'author', pipeline: authorPipeline, query: { id: ':authorId' } })
```

## Transports

**Pipelines** are a programmatic way to access your data and business logic. **Transports**, on the other side, make pipelines available externally.

The REST transport will create RESTfull endpoints for each one of your pipelines.

The GraphQL transport will create a graphql endpoint so you can access your pipelines with graphql queries.

You can also define your own transport that suits your specfic needs.

```typescript
api.configure(new RestTransport())
    .configure(new GraphQLTransport({
        graphiql: true,
        schema: true
    }));
```

## self-descriptive API

The resulting API is self-descriptive, without a lot of effort. By self-descriptive, we mean that the API provides its own metadata about what it is capable of. We rely on the **Open API 3** standard (formerly **Swagger**) and on **JSON Schema** to provide this metadata.

This description can be used as documentation for the developers who implement calls to this API, but is also targeted at technical tools than can generate code or behaviour based on it.

## Async/Await by default

Pipelines use the latest ```async / await``` feature. No more **callback hell** or complicated **Promise** chain.

```typescript
let newPets = await petPipeline.create([...])
```

## Programmatic API

The **pipeline** is fully seperated from the **request / response** life cycle. This means you can call it programmaticaly to do operations on your data and still run your business logic.

```typescript
let newEntities = await pipeline.create([...]);
```

## Advanced typings

The pipeline does not only combine behaviors. It also combines types.
This means that the schema modifications and the options you add endup beeing part of the type signature of the pipeline.

![](https://media.giphy.com/media/l2QE7DJSSgkg0I812/giphy.gif)

## Data checking

The schemas provided to the **pipelines** are used to validate the input data. If not valid, a detailed error is thrown.

## Type coercion

Thanks to **Ajv**, **Serafin** provides type coercion out of the box. This means, for example, that a query parameter declared as ```type: "integer"``` will be converted automatically to this type if possible.

## Based on express

**Serafin** uses the well known **expressjs** and can be integrated to an exsiting projet easily.

```typescript
let app = express();
let api = new Api(app, {
    "openapi": "3.0.0",
    "info": {
        "version": "1.0.0",
        "title": "An API"
    },
    paths: {}
});
```


# What's next?

It's a good time to read our [walkthrough document](./WALKTHROUGH.md) and get started.