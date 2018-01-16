import { SchemaBuilder } from "@serafin/schema-builder"

export var bookSchemaBuilder = SchemaBuilder.emptySchema({ title: "Book", description: "Book object." })
  .addString("id", { description: "Book identifier" })
  .addString("title", { description: "Book title" })
  .addOptionalString("summary", { description: "Book summary" })
  .addOptionalString("authorId", { description: "The id of the associated author" })
  .addOptionalStringArray("categoryIds", { description: "Book categories" })
