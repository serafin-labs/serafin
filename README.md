# Serafin

**Serafin** is an *API framework* designed to quickly set up a **self-descriptive REST API**, based on a functional approach, and written in *nodeJS/Typescript*.

## Installation
There's no npm package yet! We are close to the alpha release and we will produce packages for this version.
If you want to test **serafin** you can clone the repo and run it locally or you can include a direct git reference to your ```package.json``` :

```json
"@serafin/api": "git+ssh://git@github.com/serafin-framework/serafin.git"
```
## Concepts

Since **Serafin** relies on standards both in terms of architecture and of data representation, it allows generic tools to ease the process of developing and integrating the API. It is based on **Open Api** (formerly swagger) and **JSON Schema**.

**Serafin** puts at the disposal of the developer a framework environment that ease API building, testing, and integration, both through adapted tools, and through the abstraction of common concepts, to focus only on the added value of the API.

The development approach of **Serafin** is to build potentially complex endpoints by defining a standard schema and by altering the endpoints behavior with a set of generic and simple modifiers, that we call **pipelines**. This way you define your rest API in a similar way you would define a **stream**.



### Why Serafin? 
Among the ways a developer can set up a REST API, we have identified the following options:

#### From scratch
Some developers prefer to build a REST application from scratch. In this case, they have full control over what they create, but need to reinvent the wheel. They will usually end up reusing components that have already been aggregated by a lot of REST frameworks, and time/money constraints will often push them to implement the minimum to fit their specific needs, consequently a partial or erroneous implementation.

#### Declarative frameworks
Some API frameworks expect endpoints definitions through declarative files such as **Yaml** or **JSON**. It provides a synthetic view of the endpoints, and these files are generally compiled into actual code.

This approach typically shows its limitations when a complex behavior that exceeds what's expected in a declarative file has to be implemented, and attaching some programmatic extended behavior can then become tricky.

Moreover, such declarative files rarely follow a standard and are specific to each framework.

Our point is that if a declarative file allows to represent clearly an API, there's no reason why a clear programmatic interface wouldn't.

#### Scaffolding frameworks
Some API frameworks use **scaffolding** technics to generate the code of your endpoints. They provide a good boost at the beginning but once you have to add your own logic to the generated endpoints, it becomes close to an API from scratch if not worse.

If a framework can generate the API code for you, there's no reason why a clear programmatic interface wouldn't be able to provide same default behaviours easily.

#### UI API builders
New tools are appearing, allowing to design an API through a user interface. The objective is usually to provide assistance to people with limited knowledge of how to do so. It can be seen as a Content Management System for APIs, with the same advantages and drawbacks.

With limited possibilities offered by the UI, and limited to no access to the underlying code, these tools are generally a good fit only for very simple and straightforward cases.

#### Programmatic frameworks
Our vision is that to build completely, in an efficient, maintainable and evolutive way an API, there's no such thing as a fully programmatic framework.

What differentiates **Serafin** from other frameworks is its set of features, allowing backend developers to focus on the business value of what they build:

- its self-descriptive nature featuring **Open API** and **JSON Schema**
- it is based on **Typescript** and provide advanced way to check types and data
- its **pipeline** architecture provides an advanced way to cutomize behaviour

## What does it look like ?

A very simple example looks like that :

```typescript
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { Api, PipelineSourceInMemory, PipelineSchemaModel } from '@serafin/api';

// express initialization
let app = express();
app.use(bodyParser.json());

// Declare our Api with its general information
let api = new Api(app, {
        "swagger": "2.0",
        "info": {
            "version": "1.0.0",
            "title": "An API"
        },
        paths: {}
    });

// Declare a Schema for our "entity"
let aModelSchema = new PipelineSchemaModel({ type: 'object' });

// Define the pipeline, it stores data into memory directly
let aPipeline = (new PipelineSourceInMemory(aModelSchema))
  //.pipe(...) // Add a pipeline to extend the behavior

// Use the pipeline in the api. It will add all the routes and compute Open Api spec
api.use(aPipeline, "model");

// Start the server
app.listen(process.env.PORT || 80);
```

With this basic example you now have the following endpoints:

- GET /api.json which contains Open Api spec for this API
- GET /models
- POST /models
- GET /models/:id
- PUT /models/:id
- PATCH /models/:id
- DELETE /models/:id

The model schema we have provided doesn't enforce anything and the pipeline doesn't do anything more than the default behaviour. So, obviously, the ```/api.json``` doesn't contain a lot of information. But the important point is that the **Api** react to the **pipeline** behaviour. When you define new constraints on your **schema** or new options in a **pipeline**, the **Api** will react accordingly.

If you want to see more complex examples see the ```src/example``` folder.


## Features
Here are some of the features making **Serafin** the solution of choice when it comes to build an API:


### Database agnostic

The **source pipeline** classes provide an abstraction layer on top of databases. It could be anything: a file, a **MongoDB**, **DynamoDB**, or even **MySQL** database.

### Pipelines
Each endpoint is linked to a **pipeline**, with a set of **REST** actions possible on it.

A **source pipeline** is a generic access to a data source. 
A **pipeline** is a modifier that enhances an other **pipeline** capacities. This way, it is possible to easily add many common behaviors such as logs, events, cache, api rate limiting, user acl, generated properties, relations, result filters, property filters, custom type checking... or, of course, custom behaviors to any **pipeline**.

### self-descriptive API

The resulting API is self-descriptive, without a lot of efforts from the developer. By self-descriptive, we mean that the API provides its own metadata about what it is capable of. We rely on standards like **Open API** (formerly **Swagger**) and **JSON Schema** to provide this metadata.

This description can be used as documentation for the developers who implement calls to this API, but is also targeted at technical tools than can generate code or behaviour based on it.

### Async/Await by default

Pipelines use the latest ```async / await``` feature. No more **callback hell** or complicated **Promise** chain.

### Programmatic API

The **pipeline** is fully seperated from the **request / response** life cycle. This means you can call it programmaticaly to do operations on your data and still run your business logic.

```typescript
let newEntities = await pipeline.create([...]);
```

### Advanced typings

The pipeline does not only combine behaviors. It also combines types.
This means that the schema modifications and the options you add endup beeing part of the type signature of the pipeline!

![](https://media.giphy.com/media/l2QE7DJSSgkg0I812/giphy.gif)


### Model Interfaces generation

The biggest part of the model relies on JSON Schema. But **Typescript** needs **Interfaces** to provide good type checking. To avoid you creating those **Interfaces** by hand, we created a gulp task based on **json-schema-to-typescript**.

Checkout [serafin-framework/gulp-serafin-json-schema-to-typescript](https://github.com/serafin-framework/gulp-serafin-json-schema-to-typescript)


### Data checking

The schemas provided to the **pipelines** are used to validate the input data. If not valid, a detailed error is thrown and trigger *400 Bad Request* response.

### Type coercion

Thanks to **Ajv**, **Serafin** provides type coercion out of the box. This means, for example, that a query parameter declared as ```type: "integer"``` will be converted automatically to this type if possible.

### Based on express

**Serafin** uses the well known **expressjs** and can be integrated to an exsiting projet easily.

## Ready to run project

TODO: create a yeoman from our test project configuration

If you need a ready to run project to get you on the right path, you can use the yeoman generator we provide. It provides a fully configured project with debugger and code coverage configured for *Visual Studio* users, *Typescript* and *gulp* tasks, and a *Docker* configuration to run your project as a *Docker* container.


## Technical description

### Project organization

Currently, being a prototype, the project is not separated into different modules. The sources are inside the *src* directoy. All the libraries names and directories are subject to change. Also the different components are ultimatley meant to be separated in smaller packages.

- *pipeline* folder contains the core definition of pipelines (abstract classes) and utils method
- *http* folder contains the Api class that is used to provide the REST HTTP API and the Open Api spec

### Running the project

To run the project or participate to its development, install *Docker* (along with its *docker-compose* tool), and run `docker-compose up` inside the project main directory. It will start a compilation task and an example API.

The project contains a *.vscode* directory with parameters set to run the debugger, and proposes a set of adapted extensions along with their configuration. If using the *Docker* extension, the project can be run by pressing `CMD + SHIFT + P`, and then by selecting **Docker: Compose Up**.

## Contribute to the project

It's a community project, so if you want to help, do not hesitate =)

If you want to contribute to the core modules, please fork the repository and submit us a **Pull Request** with a lot of explanations. We will review it as soon as possible. Don't forget to cover your code with unit tests.

If you want to create a new generic module like a **Pipeline** or a **Pipeline Source**, please follow our guidelines:

* If possible, do it in **Typescript** so you can generate proper .d.ts files.
* Create a plugin only if it accomplishes something unique and special.
* Follow this naming convention for your package name : *serafin-pipeline-[name]*.
* Don't forget that it's not yet a stable version, core modules can still change drastically.

## Resources:

JSON Schema: 

  - https://spacetelescope.github.io/understanding-json-schema/index.html
  - http://json-schema.org/documentation.html

REST:

  - http://www.restapitutorial.com/lessons/httpmethods.html
  - https://www.openapis.org/

Links representation:

  - http://stateless.co/hal_specification.html
  - https://tools.ietf.org/html/draft-kelly-json-hal-08
  - https://tools.ietf.org/html/draft-nottingham-link-hint-00
  - https://tools.ietf.org/html/draft-nottingham-json-home-06#section-5.1
  - https://rwcbook.github.io/hal-forms/ (if necesary)
  - http://jsonapi.org/
  - https://groups.google.com/forum/#!topic/hal-discuss/kqiF3EdobTU (thread about the method inclusion)