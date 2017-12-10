import { SchemaBuilder } from "@serafin/schema-builder"

export var itemSchemaBuilder = SchemaBuilder.emptySchema()
  .addString("id", { description: "Item identifier" })
  .addString("name", { description: "Item name" })
  .flatType();
