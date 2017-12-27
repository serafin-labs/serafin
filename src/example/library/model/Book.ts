/**
 * This file was automatically generated. DO NOT MODIFY.
 */

import { PipelineSchemaBuilderModel } from "../../../serafin/pipeline";

/**
 * Book object.
 */
export interface Book {
  id: string;
  title: string;
  summary?: string;
  authorId?: string;
  categoryIds?: string[];
}
/**
 * This interface was referenced by `Book`'s JSON-Schema
 * via the `definition` "createValues".
 */
export interface CreateValues {
  id?: string;
  title: string;
  summary?: string;
  authorId?: string;
  categoryIds?: string[];
}
/**
 * This interface was referenced by `Book`'s JSON-Schema
 * via the `definition` "updateValues".
 */
export interface UpdateValues {
  id?: string;
  title: string;
  summary?: string;
  authorId?: string;
  categoryIds?: string[];
}
/**
 * This interface was referenced by `Book`'s JSON-Schema
 * via the `definition` "readQuery".
 */
export interface ReadQuery {
  /**
   * Book identifier
   */
  id?: string | string[];
  /**
   * Book title
   */
  title?: string | string[];
  /**
   * Book summary
   */
  summary?: string | string[];
  /**
   * Let's consider there's only one author
   */
  authorId?: string | string[];
  /**
   * Book categories
   */
  categoryIds?: string | string[];
}
/**
 * This interface was referenced by `Book`'s JSON-Schema
 * via the `definition` "patchQuery".
 */
export interface PatchQuery {
  id: string | string[];
  title?: string | string[];
  summary?: string | string[];
  authorId?: string | string[];
  categoryIds?: string | string[];
}
/**
 * This interface was referenced by `Book`'s JSON-Schema
 * via the `definition` "patchValues".
 */
export interface PatchValues {
  title?: string;
  summary?: string;
  authorId?: string;
  categoryIds?: string[];
}
/**
 * This interface was referenced by `Book`'s JSON-Schema
 * via the `definition` "deleteQuery".
 */
export interface DeleteQuery {
  id: string | string[];
}


export var bookSchema = new PipelineSchemaBuilderModel<Book, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"type":"object","title":"Book","description":"Book object.","properties":{"id":{"type":"string"},"title":{"type":"string"},"summary":{"type":"string"},"authorId":{"type":"string"},"categoryIds":{"type":"array","items":{"type":"string"}}},"required":["id","title"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"summary":{"type":"string"},"authorId":{"type":"string"},"categoryIds":{"type":"array","items":{"type":"string"}}},"additionalProperties":false,"required":["title"]},"updateValues":{"type":"object","properties":{"id":{"type":"string"},"title":{"type":"string"},"summary":{"type":"string"},"authorId":{"type":"string"},"categoryIds":{"type":"array","items":{"type":"string"}}},"additionalProperties":false,"required":["title"]},"readQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Book identifier"},"title":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Book title"},"summary":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Book summary"},"authorId":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Let's consider there's only one author"},"categoryIds":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Book categories"}},"additionalProperties":false},"patchQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"title":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"summary":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"authorId":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"categoryIds":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]}},"additionalProperties":false,"required":["id"]},"patchValues":{"type":"object","properties":{"title":{"type":"string"},"summary":{"type":"string"},"authorId":{"type":"string"},"categoryIds":{"type":"array","items":{"type":"string"}}},"additionalProperties":false},"deleteQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]}},"additionalProperties":false,"required":["id"]}}}, "Book");
