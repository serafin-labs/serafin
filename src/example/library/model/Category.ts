import { PipelineSchemaBuilderModel } from "../../../serafin/pipeline";

/**
 * Category object.
 */
export interface Category {
  id: string;
  name: string;
}

export interface CreateValues {
  id?: string;
  name: string;
}

export interface UpdateValues {
  id?: string;
  name: string;
}

export interface ReadQuery {
  /**
   * Category identifier
   */
  id?: (string | string[]);
  /**
   * Category name
   */
  name?: (string | string[]);
}

export interface PatchQuery {
  id: (string | string[]);
  name?: (string | string[]);
}

export interface PatchValues {
  name?: string;
}

export interface DeleteQuery {
  id: (string | string[]);
}


export var categorySchema = new PipelineSchemaBuilderModel<Category, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Category","description":"Category object.","properties":{"id":{"type":"string"},"name":{"type":"string"}},"required":["id","name"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"}},"additionalProperties":false,"required":["name"]},"updateValues":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"}},"additionalProperties":false,"required":["name"]},"readQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Category identifier"},"name":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Category name"}},"additionalProperties":false},"patchQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"name":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]}},"additionalProperties":false,"required":["id"]},"patchValues":{"type":"object","properties":{"name":{"type":"string"}},"additionalProperties":false},"deleteQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]}},"additionalProperties":false,"required":["id"]}}}, "/Category");
