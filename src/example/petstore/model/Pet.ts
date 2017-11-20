/**
 * This file was automatically generated. DO NOT MODIFY.
 */
import { PipelineSchemaModel } from "../../../serafin/pipeline/schema/Model";

/**
 * Represents fields that can be used to update an existing Pet
 */
export type UpdateValues = CreateValues;

/**
 * Schema of a Pet object.
 */
export interface Pet {
  id: string;
  name: string;
  category: string;
  photoUrls?: string[];
  tags?: string[];
}
/**
 * Represents fields that can be used to create a new Pet
 */
export interface CreateValues {
  name: string;
  category: string;
  photoUrls?: string[];
  tags?: string[];
}
/**
 * Represents fields that can be used to patch an existing Pet
 */
export interface PatchValues {
  name?: string;
  category?: string;
  photoUrls?: string[];
  tags?: string[];
}
/**
 * Represents fields that can be used to select Pets to patch
 */
export interface PatchQuery {
  id: string;
  name?: string;
}
/**
 * Represents fields that can be used to select Pets to delete
 */
export interface DeleteQuery {
  id: string;
}
/**
 * Represents fields that can be used to find Pets
 */
export interface ReadQuery {
  id?: string;
  name?: string;
  category?: string;
  tags?: string[];
}


export var petSchema = new PipelineSchemaModel<Pet, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Pet","description":"Schema of a Pet object.","properties":{"id":{"type":"string"},"name":{"type":"string"},"category":{"type":"string"},"photoUrls":{"type":"array","items":{"type":"string"}},"tags":{"type":"array","items":{"type":"string"}}},"required":["id","name","category"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","description":"Represents fields that can be used to create a new Pet","properties":{"name":{"type":"string"},"category":{"type":"string"},"photoUrls":{"type":"array","items":{"type":"string"}},"tags":{"type":"array","items":{"type":"string"}}},"required":["name","category"],"additionalProperties":false},"updateValues":{"description":"Represents fields that can be used to update an existing Pet","allOf":[{"$ref":"#/definitions/createValues"}]},"patchValues":{"description":"Represents fields that can be used to patch an existing Pet","properties":{"name":{"type":"string"},"category":{"type":"string"},"photoUrls":{"type":"array","items":{"type":"string"}},"tags":{"type":"array","items":{"type":"string"}}},"additionalProperties":false},"patchQuery":{"description":"Represents fields that can be used to select Pets to patch","type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"}},"required":["id"],"additionalProperties":false},"deleteQuery":{"description":"Represents fields that can be used to select Pets to delete","type":"object","properties":{"id":{"type":"string"}},"required":["id"],"additionalProperties":false},"readQuery":{"type":"object","description":"Represents fields that can be used to find Pets","properties":{"id":{"type":"string"},"name":{"type":"string"},"category":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}},"additionalProperties":false}}}, "/Pet");
