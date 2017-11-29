import { PipelineSchemaModel } from "../../../serafin/pipeline/schema/Model";

/**
 * Author object.
 */
export interface Author {
  /**
   * Author identifier
   */
  id: string;
  /**
   * Author first name
   */
  firstName: string;
  /**
   * Author last name
   */
  lastName?: string;
}

export interface CreateValues {
  /**
   * Author identifier
   */
  id?: string;
  /**
   * Author first name
   */
  firstName: string;
  /**
   * Author last name
   */
  lastName?: string;
}

export interface UpdateValues {
  /**
   * Author identifier
   */
  id?: string;
  /**
   * Author first name
   */
  firstName: string;
  /**
   * Author last name
   */
  lastName?: string;
}

export interface ReadQuery {
  /**
   * Author identifier
   */
  id?: string;
  /**
   * Author first name
   */
  firstName?: string;
  /**
   * Author last name
   */
  lastName?: string;
}

export interface PatchQuery {
  /**
   * Author identifier
   */
  id: string;
  /**
   * Author first name
   */
  firstName?: string;
  /**
   * Author last name
   */
  lastName?: string;
}

export interface PatchValues {
  /**
   * Author first name
   */
  firstName?: string;
  /**
   * Author last name
   */
  lastName?: string;
}

export interface DeleteQuery {
  /**
   * Author identifier
   */
  id: string;
}


export var authorSchema = new PipelineSchemaModel<Author, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Author","description":"Author object.","properties":{"id":{"type":"string","description":"Author identifier"},"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"required":["id","firstName"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","properties":{"id":{"type":"string","description":"Author identifier"},"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"additionalProperties":false,"required":["firstName"]},"updateValues":{"type":"object","properties":{"id":{"type":"string","description":"Author identifier"},"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"additionalProperties":false,"required":["firstName"]},"readQuery":{"type":"object","properties":{"id":{"type":"string","description":"Author identifier"},"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"additionalProperties":false},"patchQuery":{"type":"object","properties":{"id":{"type":"string","description":"Author identifier"},"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"additionalProperties":false,"required":["id"]},"patchValues":{"type":"object","properties":{"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"additionalProperties":false},"deleteQuery":{"type":"object","properties":{"id":{"type":"string","description":"Author identifier"}},"additionalProperties":false,"required":["id"]}}}, "/Author");
