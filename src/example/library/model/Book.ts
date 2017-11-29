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
  /**
   * Let's consider there's only one author
   */
  authorId?: string;
  /**
   * Book categories
   */
  categories?: string[];
}

export interface CreateValues {
  /**
   * Book identifier
   */
  id?: string;
  /**
   * Book title
   */
  title: string;
  /**
   * Book summary
   */
  summary?: string;
  /**
   * Let's consider there's only one author
   */
  authorId?: string;
  /**
   * Book categories
   */
  categories?: string[];
}

export interface UpdateValues {
  /**
   * Book identifier
   */
  id?: string;
  /**
   * Book title
   */
  title: string;
  /**
   * Book summary
   */
  summary?: string;
  /**
   * Let's consider there's only one author
   */
  authorId?: string;
  /**
   * Book categories
   */
  categories?: string[];
}

export interface ReadQuery {
  /**
   * Book identifier
   */
  id?: string;
  /**
   * Book title
   */
  title?: string;
  /**
   * Book summary
   */
  summary?: string;
  /**
   * Let's consider there's only one author
   */
  authorId?: string;
  /**
   * Book categories
   */
  categories?: string[];
}

export interface PatchQuery {
  /**
   * Book identifier
   */
  id: string;
  /**
   * Book title
   */
  title?: string;
  /**
   * Book summary
   */
  summary?: string;
  /**
   * Let's consider there's only one author
   */
  authorId?: string;
  /**
   * Book categories
   */
  categories?: string[];
}

export interface PatchValues {
  /**
   * Book title
   */
  title?: string;
  /**
   * Book summary
   */
  summary?: string;
  /**
   * Let's consider there's only one author
   */
  authorId?: string;
  /**
   * Book categories
   */
  categories?: string[];
}

export interface DeleteQuery {
  /**
   * Book identifier
   */
  id: string;
}


export var bookSchema = new PipelineSchemaModel<Book, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"$schema":"http://json-schema.org/draft-04/schema#","type":"object","id":"/Book","description":"Book object.","properties":{"id":{"type":"string","description":"Book identifier"},"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"},"authorId":{"description":"Let's consider there's only one author","type":"string"},"categories":{"description":"Book categories","type":"array","items":{"type":"string"}}},"required":["id","title"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","properties":{"id":{"type":"string","description":"Book identifier"},"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"},"authorId":{"description":"Let's consider there's only one author","type":"string"},"categories":{"description":"Book categories","type":"array","items":{"type":"string"}}},"additionalProperties":false,"required":["title"]},"updateValues":{"type":"object","properties":{"id":{"type":"string","description":"Book identifier"},"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"},"authorId":{"description":"Let's consider there's only one author","type":"string"},"categories":{"description":"Book categories","type":"array","items":{"type":"string"}}},"additionalProperties":false,"required":["title"]},"readQuery":{"type":"object","properties":{"id":{"type":"string","description":"Book identifier"},"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"},"authorId":{"description":"Let's consider there's only one author","type":"string"},"categories":{"description":"Book categories","type":"array","items":{"type":"string"}}},"additionalProperties":false},"patchQuery":{"type":"object","properties":{"id":{"type":"string","description":"Book identifier"},"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"},"authorId":{"description":"Let's consider there's only one author","type":"string"},"categories":{"description":"Book categories","type":"array","items":{"type":"string"}}},"additionalProperties":false,"required":["id"]},"patchValues":{"type":"object","properties":{"title":{"description":"Book title","type":"string"},"summary":{"description":"Book summary","type":"string"},"authorId":{"description":"Let's consider there's only one author","type":"string"},"categories":{"description":"Book categories","type":"array","items":{"type":"string"}}},"additionalProperties":false},"deleteQuery":{"type":"object","properties":{"id":{"type":"string","description":"Book identifier"}},"additionalProperties":false,"required":["id"]}}}, "/Book");
