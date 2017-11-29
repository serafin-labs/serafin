import { PipelineSchemaModel } from "../../../serafin/pipeline/schema/Model";

/**
 * Category object.
 */
export interface Category {
  /**
   * Category identifier
   */
  id: string;
  /**
   * Category name
   */
  name: string;
}

export interface CreateValues {
  /**
   * Category identifier
   */
  id?: string;
  /**
   * Category name
   */
  name: string;
}

export interface UpdateValues {
  /**
   * Category identifier
   */
  id?: string;
  /**
   * Category name
   */
  name: string;
}

export interface ReadQuery {
  /**
   * Category identifier
   */
  id?: string;
  /**
   * Category name
   */
  name?: string;
}

export interface PatchQuery {
  /**
   * Category identifier
   */
  id: string;
  /**
   * Category name
   */
  name?: string;
}

export interface PatchValues {
  /**
   * Category name
   */
  name?: string;
}

export interface DeleteQuery {
  /**
   * Category identifier
   */
  id: string;
}


export var categorySchema = new PipelineSchemaModel<Category, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Category","description":"Category object.","properties":{"id":{"type":"string","description":"Category identifier"},"name":{"description":"Category name","type":"string"}},"required":["id","name"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","properties":{"id":{"type":"string","description":"Category identifier"},"name":{"description":"Category name","type":"string"}},"additionalProperties":false,"required":["name"]},"updateValues":{"type":"object","properties":{"id":{"type":"string","description":"Category identifier"},"name":{"description":"Category name","type":"string"}},"additionalProperties":false,"required":["name"]},"readQuery":{"type":"object","properties":{"id":{"type":"string","description":"Category identifier"},"name":{"description":"Category name","type":"string"}},"additionalProperties":false},"patchQuery":{"type":"object","properties":{"id":{"type":"string","description":"Category identifier"},"name":{"description":"Category name","type":"string"}},"additionalProperties":false,"required":["id"]},"patchValues":{"type":"object","properties":{"name":{"description":"Category name","type":"string"}},"additionalProperties":false},"deleteQuery":{"type":"object","properties":{"id":{"type":"string","description":"Category identifier"}},"additionalProperties":false,"required":["id"]}}}, "/Category");
