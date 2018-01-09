import { SchemaBuilder } from "@serafin/schema-builder"

export var categorySchemaBuilder = SchemaBuilder.emptySchema()
  .addString("id", { description: "Category identifier" })
  .addString("name", { description: "Category name" })
  .addOptionalString("parentCategory", { description: "Parent category identifier" })
  .flatType();
