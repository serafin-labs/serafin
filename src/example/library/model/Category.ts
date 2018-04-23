import { SchemaBuilder } from "@serafin/schema-builder"

export var categorySchemaBuilder = SchemaBuilder.emptySchema({ title: "Category", description: "Category object." })
  .addString("id", { description: "Category identifier" })
  .addString("name", { description: "Category name" })
