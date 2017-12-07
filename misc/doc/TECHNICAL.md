
# Technical description

## Project organization

Currently, being a prototype, the project is not separated into different modules. The sources are inside the *src* directoy. All the libraries names and directories are subject to change. Also the different components are ultimatley meant to be separated in smaller packages.

- *pipeline* folder contains the core definition of pipelines (abstract classes) and utils method
- *api* folder contains the Api class and the default transports (Rest & GraphQL)
- *openApi* folder contains type definitions for OpenApi spec 3.0.0 & also a custom meta schema for JSON Schema validation

## Running the project

To run the project or participate to its development, install *Docker* (along with its *docker-compose* tool), and run `docker-compose up` inside the project main directory. It will start a compilation task and an example API.

The project contains a *.vscode* directory with parameters set to run the debugger, and proposes a set of adapted extensions along with their configuration. If using the *Docker* extension, the project can be run by pressing `CMD + SHIFT + P`, and then by selecting **Docker: Compose Up**.

## Resources:

JSON Schema: 

  - https://spacetelescope.github.io/understanding-json-schema/index.html
  - http://json-schema.org/documentation.html

REST:

  - http://www.restapitutorial.com/lessons/httpmethods.html
  - https://www.openapis.org/

GRAPHQL:

  - http://graphql.org/

Links representation:

  - http://stateless.co/hal_specification.html
  - https://tools.ietf.org/html/draft-kelly-json-hal-08
  - https://tools.ietf.org/html/draft-nottingham-link-hint-00
  - https://tools.ietf.org/html/draft-nottingham-json-home-06#section-5.1
  - https://rwcbook.github.io/hal-forms/ (if necesary)
  - http://jsonapi.org/
  - https://groups.google.com/forum/#!topic/hal-discuss/kqiF3EdobTU (thread about the method inclusion)