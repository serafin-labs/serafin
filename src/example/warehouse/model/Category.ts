import { SchemaBuilder } from "@serafin/schema-builder"

export var categorySchemaBuilder = SchemaBuilder.emptySchema()
  .addString("id", { description: "Category identifier" })
  .addString("name", { description: "Category name" })
  .addOptionalStringArray("itemIds", { description: "Category items" })
  .addOptionalString("parentCategory", { description: "Parent category identifier" })
  .flatType();
