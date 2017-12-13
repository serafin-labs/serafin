/**
 * This file was automatically generated. DO NOT MODIFY.
 */

import { PipelineSchemaBuilderModel } from "../../../serafin/pipeline";

/**
 * Author object.
 */
export interface Author {
  id: string;
  firstName: string;
  lastName?: string;
}
/**
 * This interface was referenced by `Author`'s JSON-Schema
 * via the `definition` "createValues".
 */
export interface CreateValues {
  id?: string;
  firstName: string;
  lastName?: string;
}
/**
 * This interface was referenced by `Author`'s JSON-Schema
 * via the `definition` "updateValues".
 */
export interface UpdateValues {
  id?: string;
  firstName: string;
  lastName?: string;
}
/**
 * This interface was referenced by `Author`'s JSON-Schema
 * via the `definition` "readQuery".
 */
export interface ReadQuery {
  /**
   * Author identifier
   */
  id?: string | string[];
  /**
   * Author first name
   */
  firstName?: string | string[];
  /**
   * Author last name
   */
  lastName?: string | string[];
}
/**
 * This interface was referenced by `Author`'s JSON-Schema
 * via the `definition` "patchQuery".
 */
export interface PatchQuery {
  id: string | string[];
  firstName?: string | string[];
  lastName?: string | string[];
}
/**
 * This interface was referenced by `Author`'s JSON-Schema
 * via the `definition` "patchValues".
 */
export interface PatchValues {
  firstName?: string;
  lastName?: string;
}
/**
 * This interface was referenced by `Author`'s JSON-Schema
 * via the `definition` "deleteQuery".
 */
export interface DeleteQuery {
  id: string | string[];
}


export var authorSchema = new PipelineSchemaBuilderModel<Author, ReadQuery, CreateValues, UpdateValues, PatchQuery, PatchValues, DeleteQuery>({"type":"object","title":"Author","description":"Author object.","properties":{"id":{"type":"string"},"firstName":{"type":"string"},"lastName":{"type":"string"}},"required":["id","firstName"],"additionalProperties":false,"definitions":{"createValues":{"type":"object","properties":{"id":{"type":"string"},"firstName":{"type":"string"},"lastName":{"type":"string"}},"additionalProperties":false,"required":["firstName"]},"updateValues":{"type":"object","properties":{"id":{"type":"string"},"firstName":{"type":"string"},"lastName":{"type":"string"}},"additionalProperties":false,"required":["firstName"]},"readQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Author identifier"},"firstName":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Author first name"},"lastName":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}],"description":"Author last name"}},"additionalProperties":false},"patchQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"firstName":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},"lastName":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]}},"additionalProperties":false,"required":["id"]},"patchValues":{"type":"object","properties":{"firstName":{"type":"string"},"lastName":{"type":"string"}},"additionalProperties":false},"deleteQuery":{"type":"object","properties":{"id":{"oneOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]}},"additionalProperties":false,"required":["id"]}}}, "Author");
