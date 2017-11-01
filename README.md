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
Some developers prefer to build a REST application from scratch. In this case, they have full control over what they create, but need to reinvent the wheel. They will usually end up reusing components that already have been aggregated by a lot of REST frameworks, and time/money constraints will often push them to implement the minimum to fit their specific needs, consequently a partial or erreoneous implementation.

#### Declarative-based frameworks
Some API frameworks expect endpoints definitions through declarative files such as *Yaml* or *JSON*. It provides a synthetic view of the endpoints, and these files are generally compiled into actual code.

This approach typically shows its limitations when a complex behavior that exceeds what's expected in a declarative file has to be implemented, and attaching some programmatic extended behavior can then become tricky.

Moreover, such declarative files rarely follow a standard and are specific to each framework.

Our point is that if a declarative file allows to represent clearly an API, there's no reason why a clear programmatic interface wouldn't.

#### UI-based API builders
New tools are appearing, allowing to design an API through a user interface. The objective is usually to provide assistance to people with limited knowledge of how to do so. It can be seen as a Content Management System for APIs, with the same advantages and drawbacks.

With limited possibilities offered by the UI, and limited to no access to the underlying code, these tools are generally a good fit only for very simple and straightforward cases.

For these cases, **Serafin** is a good fit too! 

#### API frameworks
Our vision is that to build completely, in an accessible, mantainable and evolutive way an API, there's now such thing as a fully programmatic framework.

What differentiates **Serafin** from many other frameworks is its set of features, allowing backend developers to focus on the business value of what they build, and frontend developers to have everything they need at disposal to call it from their web or mobile application.

## Features
Here are some of the features making **Serafin** the solution of choice when it comes to build an API:

### Pipelines
Any endpoint is linked to a *pipeline*, with a set of HTTP actions possible on it.

A *source pipeline* is a generic access to a data source, wether it is a file, an in-memory storage, a *MongoDB*, *dynamoDB*. or even *MySQL* database. **Serafin** handles all the operations on these sources itself, wether it is reading, writing, or even creating the adapted storage structure. It also maps all these actions to the corresponding *HTTP methods*, in a *RESTful* way.

A **pipeline** is a modifier that enhances an other *pipeline* capacities. This way, it is possible to easily add many common behaviors such as filtering, pagination, sorting, cache handling, or, of course, custom behaviors to any *pipeline*.

### self-descriptive API
The resulting API is self-descriptive, without particular efforts from the developer.

It means that **Serafin** provides both a summary of all the API endpoints, and a structured technical description of each endpoint: available methods, parameters, security, behavior etc...
This description can be used as documentation for the developers who implement calls to this API into their application, but is also targeted at technical tools, to generate functional tests, load tests, connect another API, run data exports and so on...

### developer tools
**Serafin** provides a few tools that make use of its API self-descriptive features.

Among the most useful ones, the *HTML UI* provides a convenient assistant when it comes to browse the API resources, to follow their relations, to create a set of data, to see each endpoint description etc...

Other tools such as the command runner, the functional and load testers, the Swagger or Postman exports, can prove useful to help the developer in creating a flawless API quickly and efficiently.

### ready to run project
While not forcing developers to rely on its recommended set of tools, **Serafin** comes as a ready to run project. Its debugger, code coverage, profiler are pre-configured for *Visual Studio Code* users.
Its *Typescript* parameters and *gulp* tasks are properly defined.
The project is ready to run as a *Docker* container.

## Technical description

### Project organization

Currently, being a prototype, the project is not separated into different modules. The sources are inside the *src* directoy. All the libraries names and directories are subject to change. Also the different components are ultimatley meant to be separated. 

    TODO

### Running the project

To run the project or participate to its development, install *Docker* (along with its *docker-compose* tool), and run `docker-compose up` inside the project main directory.

The project contains a *.vscode* directory with parameters set to run the debugger, and proposes a set of adapted extensions along with their configuration. If using the *Docker* extension, the project can be run by pressing `CMD + SHIFT + P`, and then by selecting **Docker: Compose Up**.

## Resources:

JSON Schema: 

  - https://spacetelescope.github.io/understanding-json-schema/index.html
  - http://json-schema.org/documentation.html

HTTP:

  - https://tools.ietf.org/html/rfc5988
  - http://www.restapitutorial.com/lessons/httpmethods.html
  - http://tools.ietf.org/html/7231#section-4.3.7

Links representation:

  - http://stateless.co/hal_specification.html
  - https://tools.ietf.org/html/draft-kelly-json-hal-08
  - https://tools.ietf.org/html/draft-nottingham-link-hint-00
  - https://tools.ietf.org/html/draft-nottingham-json-home-06#section-5.1
  - https://rwcbook.github.io/hal-forms/ (if necesary)
  - http://jsonapi.org/
  - https://groups.google.com/forum/#!topic/hal-discuss/kqiF3EdobTU (thread about the method inclusion)




## Appendix

### Resource representation

```
   OPTIONS /users HTTP/1.1
   Host: myhost.org
   Accept: application/hal+json

   HTTP/1.1 200 OK
   Content-Type: application/hal+json

   {
     "_links": {
       "self": { "href": "/users", "schema": ... },
       "get": { "href": "/users/{id}", "templated": true, "schema": ... },
       "post": { "href": "/users", "schema": ... },
       "put": { "href": "/users", "schema": ... },
       
     },
     "id": "a5k7b2",
     "email": "foo@bar.com",
     "name": "Toto"
   }

```