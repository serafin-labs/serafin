---
layout: home

hero:
    name: Serafin
    text: Self-descriptive APIs in TypeScript
    tagline: Describe your data once, as a schema. Get its type, a data access layer around it, REST endpoints on top, and their OpenAPI documentation.
    image:
        src: /logo.png
        alt: Serafin
    actions:
        - theme: brand
          text: Schema Builder
          link: /schema-builder/guide/getting-started
        - theme: alt
          text: Pipeline
          link: /pipeline/guide/getting-started
        - theme: alt
          text: View on GitHub
          link: https://github.com/serafin-labs/serafin

features:
    - icon: 🧬
      title: Schema Builder
      details: Build a JSON Schema and its TypeScript type at the same time, and derive new schemas from it.
      link: /schema-builder/
      linkText: "@serafin/schema-builder"
    - icon: 🔌
      title: Pipeline
      details: CRUD data access where a data source and the behaviour around it compose, schemas included.
      link: /pipeline/
      linkText: "@serafin/pipeline"
    - icon: 📘
      title: OpenAPI
      details: OpenAPI 3.2 types, and an immutable builder that keeps the document consistent.
      link: /open-api/
      linkText: "@serafin/open-api"
    - icon: 🌐
      title: API
      details: Expose pipelines as REST endpoints, documented by a generated OpenAPI document.
      link: /api/
      linkText: "@serafin/api"
---
