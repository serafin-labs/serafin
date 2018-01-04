import { SchemaBuilder } from "@serafin/schema-builder"

export var petSchemaBuilder = SchemaBuilder.emptySchema()
  .addString("id", { description: "The identifier of the Pet. It is generated by the API." })
  .addString("name", { description: "The name of the Pet. If not provided the API generate one automatically.", example: "Snowball" })
  .addEnum("category", ["cat", "dog", "tiger"], { description: "The category of the pet." })
  .addOptionalStringArray("tags", { description: "A list of tags to ease classification." })
  .addOptionalStringArray("photoUrls", { description: "Urls to photos of this Pet." })
  .flatType()
