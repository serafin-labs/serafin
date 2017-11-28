/**
 * This file was automatically generated. DO NOT MODIFY.
 */
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


export var authorSchema = new PipelineSchemaModel<Author, any, any, any, any, any, any>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Author","description":"Author object.","properties":{"id":{"type":"string","description":"Author identifier"},"firstName":{"description":"Author first name","type":"string"},"lastName":{"description":"Author last name","type":"string"}},"required":["id","firstName"],"additionalProperties":false,"definitions":{}}, "/Author");
