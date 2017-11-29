import { PipelineSchemaModel } from "../../../serafin/pipeline/schema/Model";

/**
 * Schema of a Pet object.
 */
export interface Pet {
  /**
   * The identifier of the Pet. It is generated by the API.
   */
  id: string;
  /**
   * The name of the Pet. If not provided the API generate one automatically.
   */
  name: string;
  /**
   * The category of the pet.
   */
  category: ("cat" | "dog" | "tiger");
  /**
   * A list of tags to ease classification.
   */
  tags?: string[];
  /**
   * Urls to photos of this Pet.
   */
  photoUrls?: string[];
}

/**
 * Represents fields that can be used to create a new Pet.
 */
export interface CreateValues {
  /**
   * The name of the Pet. If not provided the API generate one automatically.
   */
  name: string;
  /**
   * The category of the pet.
   */
  category: ("cat" | "dog" | "tiger");
  /**
   * A list of tags to ease classification.
   */
  tags?: string[];
  /**
   * Urls to photos of this Pet.
   */
  photoUrls?: string[];
}

/**
 * Represents fields that can be used to update an existing Pet.
 */
export type UpdateValues = CreateValues;

/**
 * Represents fields that can be used to create a new Pet.
 */
export interface CreateValues {
  /**
   * The name of the Pet. If not provided the API generate one automatically.
   */
  name: string;
  /**
   * The category of the pet.
   */
  category: ("cat" | "dog" | "tiger");
  /**
   * A list of tags to ease classification.
   */
  tags?: string[];
  /**
   * Urls to photos of this Pet.
   */
  photoUrls?: string[];
}

/**
 * Represents fields that can be used to patch an existing Pet.
 */
export interface PatchValues {
  /**
   * The name of the Pet. If not provided the API generate one automatically.
   */
  name?: string;
  /**
   * The category of the pet.
   */
  category?: ("cat" | "dog" | "tiger");
  /**
   * A list of tags to ease classification.
   */
  tags?: string[];
  /**
   * Urls to photos of this Pet.
   */
  photoUrls?: string[];
}

/**
 * Represents fields that can be used to select Pets to patch.
 */
export interface PatchQuery {
  /**
   * The identifier of the Pet. It is generated by the API.
   */
  id: string;
  /**
   * The name of the Pet. If not provided the API generate one automatically.
   */
  name?: string;
}

/**
 * Represents fields that can be used to select Pets to delete.
 */
export interface DeleteQuery {
  /**
   * The identifier of the Pet. It is generated by the API.
   */
  id: string;
}

/**
 * Represents fields that can be used to find Pets.
 */
export interface ReadQuery {
  /**
   * The identifier of the Pet. It is generated by the API.
   */
  id?: string;
  /**
   * The name of the Pet. If not provided the API generate one automatically.
   */
  name?: string;
  /**
   * The category of the pet.
   */
  category?: ("cat" | "dog" | "tiger");
  /**
   * A list of tags to ease classification.
   */
  tags?: string[];
}


export var petSchema = new PipelineSchemaModel<Pet, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Pet","description":"Schema of a Pet object.","properties":{"id":{"type":"string","description":"The identifier of the Pet. It is generated by the API."},"name":{"description":"The name of the Pet. If not provided the API generate one automatically.","type":"string","example":"Snowball"},"category":{"description":"The category of the pet.","type":"string","enum":["cat","dog","tiger"]},"tags":{"type":"array","description":"A list of tags to ease classification.","items":{"type":"string"}},"photoUrls":{"type":"array","description":"Urls to photos of this Pet.","items":{"type":"string"}}},"required":["id","name","category"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","description":"Represents fields that can be used to create a new Pet.","properties":{"name":{"description":"The name of the Pet. If not provided the API generate one automatically.","type":"string","example":"Snowball"},"category":{"description":"The category of the pet.","type":"string","enum":["cat","dog","tiger"]},"tags":{"type":"array","description":"A list of tags to ease classification.","items":{"type":"string"}},"photoUrls":{"type":"array","description":"Urls to photos of this Pet.","items":{"type":"string"}}},"required":["name","category"],"additionalProperties":false},"updateValues":{"description":"Represents fields that can be used to update an existing Pet.","allOf":[{"$ref":"#/definitions/createValues"}]},"patchValues":{"description":"Represents fields that can be used to patch an existing Pet.","properties":{"name":{"description":"The name of the Pet. If not provided the API generate one automatically.","type":"string","example":"Snowball"},"category":{"description":"The category of the pet.","type":"string","enum":["cat","dog","tiger"]},"tags":{"type":"array","description":"A list of tags to ease classification.","items":{"type":"string"}},"photoUrls":{"type":"array","description":"Urls to photos of this Pet.","items":{"type":"string"}}},"additionalProperties":false},"patchQuery":{"description":"Represents fields that can be used to select Pets to patch.","type":"object","properties":{"id":{"type":"string","description":"The identifier of the Pet. It is generated by the API."},"name":{"description":"The name of the Pet. If not provided the API generate one automatically.","type":"string","example":"Snowball"}},"required":["id"],"additionalProperties":false},"deleteQuery":{"description":"Represents fields that can be used to select Pets to delete.","type":"object","properties":{"id":{"type":"string","description":"The identifier of the Pet. It is generated by the API."}},"required":["id"],"additionalProperties":false},"readQuery":{"type":"object","description":"Represents fields that can be used to find Pets.","properties":{"id":{"type":"string","description":"The identifier of the Pet. It is generated by the API."},"name":{"description":"The name of the Pet. If not provided the API generate one automatically.","type":"string","example":"Snowball"},"category":{"description":"The category of the pet.","type":"string","enum":["cat","dog","tiger"]},"tags":{"type":"array","description":"A list of tags to ease classification.","items":{"type":"string"}}},"additionalProperties":false}}}, "/Pet");
