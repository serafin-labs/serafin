<p align="center"><img src="https://serafin-labs.github.io/images/logo-serafin-with-text-1080.png" width="300"/></p>

**Serafin** is an *API framework* designed to quickly set up a robust **self-descriptive REST API** written in *nodeJS/Typescript*.

It is based on **Open API 3**, **JSON Schema** and **GraphQL** standards.

[![Greenkeeper badge](https://badges.greenkeeper.io/serafin-labs/serafin.svg)](https://greenkeeper.io/)
[![Dependencies](https://img.shields.io/david/serafin-labs/serafin.svg)](https://david-dm.org/serafin-labs/serafin)
[![Maintainability](https://api.codeclimate.com/v1/badges/beba161ae0e5f4f69c79/maintainability)](https://codeclimate.com/github/serafin-labs/serafin/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/beba161ae0e5f4f69c79/test_coverage)](https://codeclimate.com/github/serafin-labs/serafin/test_coverage)

## Installation
There's no npm package yet! We are close to the alpha release and we will produce packages for this version.
If you want to test **serafin** you can clone the repo and run it locally or you can include a direct git reference to your ```package.json``` :

```json
"@serafin/api": "git+ssh://git@github.com/serafin-framework/serafin.git"
```

## Concepts

If you want to know more about Serafin concepts and features, go to our [overview document](./misc/doc/OVERVIEW.md)

## Getting started

If you just want to get started and write some code, go to our [walkthrough document](./misc/doc/WALKTHROUGH.md)

## What does it look like ?

A very simple example looks like that :

```typescript
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { SchemaBuilder } from '@serafin/schema-builder';
import { Api, PipelineSourceInMemory, RestTransport } from '@serafin/api';

// express initialization
let app = express();
app.use(bodyParser.json());

// Declare our Api with its general information
let api = new Api(app, {
    "openapi": "3.0.0",
    "info": {
        "version": "1.0.0",
        "title": "An API"
    },
    paths: {}
});
api.configure(new RestTransport());

// Declare a Schema for our "entity"
let aModelSchema = SchemaBuilder.emptySchema().addString("id").addString("data");

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

The important point is that the **Api** react to the **pipeline** behaviour. When you define new constraints on your **schema** or new options in a **pipeline**, the **Api** will react accordingly.

If you want to see more complex examples, take a look at the ```src/example``` folder.


## Contributing

The project interests you ? Read our [contributer guide](./CONTRIBUTING.md) so you can get involved.






