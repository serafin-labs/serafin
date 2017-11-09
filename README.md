# Serafin

## Concepts
**Serafin** is an *API framework* designed to quickly set up a **self-descriptive REST API**, based upon a functional approach, and written in *nodeJS/Typescript*.

Since **Serafin** relies on standards both in terms of architecture and of data representation, it allows generic tools to go along and ease the process of developing or integrating the API.

**Serafin** puts at the disposal of the developer a framework environment that ease API building, testing, and integration, both through adapted tools, and through the abstraction of common concepts (error handling, authorization, cache...), to focus only on the added value of the API.

The development approach of **Serafin** is to build potentially complex endpoints by defining a standard schema and by altering the endpoints behavior with a set of generic and simple modifiers, that we call **pipelines**.

### What is a REST API

A remote *API* is a set of web-service endpoints that answer to client requests: web or smartphone applications, subsystems, or even other APIs.

The *REST* architecture ensures that it is built in a conventional way, associating endpoints to resources, and putting at disposal a set of actions on each of these resources.

It also takes advantage of the HTTP concepts: URLs, cache handling, status codes, compression, authorization etc... Therefore, it makes it friendly with any system intended for HTTP, such as browsers, proxies, routers etc...

### Motivation 
Among the ways a developer can set up an REST API, we mainly identified the following tendencies.

#### From scratch
Some developers prefer to build a REST application from scratch. In this case, they have full control over what they create, but need to reinvent the wheel. They will usually end up reusing components that have already been aggregated by a lot of REST frameworks, and time/money constraints will often push them to implement the minimum to fit their specific needs, consequently a partial or erreoneous implementation.

#### Declarative-based frameworks
Some API frameworks expect endpoints definitions through declarative files such as *Yaml* or *JSON*. It provides a synthetic view of the endpoints, and these files are generally compiled into actual code.

This approach typically shows its limitations when a complex behavior that exceeds what's expected in a declarative file has to be implemented, and attaching some programmatic extended behavior can then become tricky.

Moreover, such declarative files rarely follow a standard and are specific to each framework.

Our point is that if a declarative file allows to represent clearly an API, there's no reason why a clear programmatic interface wouldn't.

#### Scaffolding-based frameworks
Some API frameworks use scaffolding technics to generate the code of your endpoints. They provide a good boost at the beginning but once you have to add your own logic to the generated endpoints, it becomes close to an API from scratch if not worse.

If a framework can generate the API code for you, there's no reason why a clear programmatic interface wouldn't be able to provide same default behaviours easily.

#### UI-based API builders
New tools are appearing, allowing to design an API through a user interface. The objective is usually to provide assistance to people with limited knowledge of how to do so. It can be seen as a Content Management System for APIs, with the same advantages and drawbacks.

With limited possibilities offered by the UI, and limited to no access to the underlying code, these tools are generally a good fit only for very simple and straightforward cases.

For these cases, **Serafin** is a good fit too! 

#### API frameworks
Our vision is that to build completely, in an accessible, mantainable and evolutive way an API, there's no such thing as a fully programmatic framework.

What differentiates **Serafin** from many other frameworks is its set of features, allowing backend developers to focus on the business value of what they build:

- its self-descriptive nature featuring Open API and JSON Schema
- it is based on typescript and provide advanced way to check types and data
- its pipeline architecture provides an advanced way to cutomize behaviour

## Features
Here are some of the features making **Serafin** the solution of choice when it comes to build an API:

### Pipelines
Any endpoint is linked to a *pipeline*, with a set of REST actions possible on it.

A *source pipeline* is a generic access to a data source, wether it is a file, an in-memory storage, a *MongoDB*, *dynamoDB*. or even *MySQL* database. **Serafin** handles all the operations on these sources itself, wether it is reading, writing, or even creating the adapted storage structure. It also maps all these actions to the corresponding *HTTP methods*, in a *RESTful* way.

A **pipeline** is a modifier that enhances an other *pipeline* capacities. This way, it is possible to easily add many common behaviors such as filtering, sorting, caching, rate limiting, computed fields, logging... or, of course, custom behaviors to any *pipeline*.

### self-descriptive API

The resulting API is self-descriptive, without a lot of efforts from the developer. By self-descriptive, we mean that the API provides its own metadata about what it is capable of. We rely on standards like Open API (formerly Swagger) and JSON Schema to provide this metadata.

This description can be used as documentation for the developers who implement calls to this API into their application, but is also targeted at technical tools than can generate code or behaviour based on it.

### ready to run project

If you need a ready to run project to get you on the right path, you can use the yeoman generator we provide. It provides a fully configured project with debugger and code coverage configured for *Visual Studio* users, *Typescript* and *gulp* tasks, and a *Docker* configuration to run your project as a *Docker* container.

TODO: move our test project configuration to yeoman

## Technical description

### Project organization

Currently, being a prototype, the project is not separated into different modules. The sources are inside the *src* directoy. All the libraries names and directories are subject to change. Also the different components are ultimatley meant to be separated in smaller packages.

- *pipeline* folder contains the core definition of pipelines (abstract classes) and utils method
- *http* folder contains the Api class that is used to provide the REST HTTP API and the Open Api definition

### Running the project

To run the project or participate to its development, install *Docker* (along with its *docker-compose* tool), and run `docker-compose up` inside the project main directory. It will start a compilation task and an example API.

The project contains a *.vscode* directory with parameters set to run the debugger, and proposes a set of adapted extensions along with their configuration. If using the *Docker* extension, the project can be run by pressing `CMD + SHIFT + P`, and then by selecting **Docker: Compose Up**.

## Contribute to the project

It's a community project, so if you want to help, do not hesitate =)

If you want to contribute to the core modules, please fork the repository and submit us a *Pull Request* with a lot of explanations. We will review it as soon as possible. Don't forget to cover your code with unit tests.

If you want to create a new plugin module like a *Pipeline* or a *Pipeline Source*, please follow our guidelines:

* If possible, do it in *Typescript* so you can generate proper .d.ts files.
* Create a plugin only if it accomplishes something unique and special.
* Follow this naming convention for your package name : *serafin-pipeline-[name]*.
* Don't forget it's not yet a stable version, core modules can still change drastically.

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