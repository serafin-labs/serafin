import { SchemaBuilder } from "@serafin/schema-builder"

export var itemSchemaBuilder = SchemaBuilder.emptySchema()
  .addString("id", { description: "Item identifier" })
  .addString("name", { description: "Item name" })
  .addNumber("price", { description: "Item price" })
  .addString("categoryId", { description: "Item category identifier" })
