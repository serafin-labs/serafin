import _ from "lodash"
import { IdentityInterface } from "./IdentityInterface.js"
import { RelationMeta } from "./Relation.js"
import { RelationType } from "./RelationType.js"
import { ResultsInterface } from "./ResultsInterface.js"

/**
 * The resource type a normalized result collapses to once its relations are joined back in.
 */
export type WithInlinedRelations<M, META> = META extends { relations?: infer REL }
    ? M & {
          [K in keyof REL]?: NonNullable<REL[K]> extends RelationMeta<infer R, infer Type, infer Nested>
              ? Type extends RelationType.many
                  ? WithInlinedRelations<R, { relations?: Nested }>[]
                  : WithInlinedRelations<R, { relations?: Nested }>
              : never
      }
    : M

/**
 * Join a normalized result back into the shape relations used to have, with each related resource
 * hanging off the resource that points at it.
 *
 * Pipelines return relations in `meta.relations` so a target shared by many resources is carried
 * once rather than once per resource. This is the inverse, for call sites that would rather read
 * `employee.company` than index into the store themselves. It is a pure function over the result --
 * no reads, no I/O -- so it can be applied at the edge and skipped on hot paths.
 *
 * `meta` is returned untouched, so applying this twice is harmless.
 */
export function inlineRelations<M extends IdentityInterface, META>(
    result: ResultsInterface<M, META>,
): ResultsInterface<WithInlinedRelations<M, META>, META> {
    const relations = (result.meta as any)?.relations as Record<string, RelationMeta<IdentityInterface, RelationType, any>> | undefined
    if (!relations || Object.keys(relations).length === 0) {
        return result as any
    }
    return { ...result, data: inlineAll(result.data, relations) as unknown as WithInlinedRelations<M, META>[] }
}

/**
 * Hang each relation's resources off the resources pointing at them, after joining the relations
 * those resources hold in turn.
 */
function inlineAll(resources: IdentityInterface[], relations: Record<string, RelationMeta<IdentityInterface, RelationType, any>>) {
    const joined = Object.keys(relations).map((name) => {
        const relation = relations[name]
        const data = relation.relations ? _.keyBy(inlineAll(Object.values(relation.data), relation.relations), "id") : relation.data
        return { name, relation, data }
    })
    return resources.map((resource) => {
        const inlined = { ...resource } as Record<string, unknown>
        for (const { name, relation, data } of joined) {
            const key = relation.index?.[resource.id]
            if (relation.type === RelationType.many) {
                inlined[name] = ((key as string[]) ?? []).map((id) => data[id]).filter((entry) => entry !== undefined)
            } else if (key !== undefined) {
                inlined[name] = data[key as string]
            }
        }
        return inlined
    })
}
