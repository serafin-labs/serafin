/**
 * This file was automatically generated. DO NOT MODIFY.
 */
import { PipelineSchemaModel } from "../../../serafin/pipeline/schema/Model";

/**
 * Book object.
 */
export interface Book {
  /**
   * Book identifier
   */
  id: string;
  /**
   * Book title
   */
  title: string;
  /**
   * Book summary
   */
  summary?: string;
}


export var bookSchema = new PipelineSchemaModel<Book, any, any, any, any, any, any>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Book","description":"Book object.","properties":{"id":{"type":"string","description":"Book identifier"},"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"}},"required":["id","title"],"additionalProperties":false,"definitions":{}}, "/Book");
