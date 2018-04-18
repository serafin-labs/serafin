import { SchemaBuilder } from "@serafin/schema-builder"

export var bookSchemaBuilder = SchemaBuilder.emptySchema({ title: "Book", description: "Book object." })
  .addString("id", { description: "Book identifier" })
  .addString("title", { description: "Book title" })
  .addString("summary", { description: "Book summary" }, false)
  .addString("authorId", { description: "The id of the associated author" }, false)
  .addArray("categoryIds", SchemaBuilder.stringSchema(), { description: "Book categories" }, false)
