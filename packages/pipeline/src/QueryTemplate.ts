import _ from "lodash"

export class QueryTemplate {
    static hydrate(query: object, resource: any): object {
        return _.mapValues(query, (o: string, key) => {
            if (QueryTemplate.isTemplated(o)) {
                const field = o.substring(1)
                // Only an absent value is an error. `false`, `0`, `""` and `null` are legitimate
                // keys for a relation and must be forwarded as-is.
                if (resource[field] === undefined) {
                    throw new Error(`Resource field ${field} not found`)
                }
                return resource[field]
            } else {
                return QueryTemplate.escape(o)
            }
        })
    }

    static getTemplatedParts(queryTemplate: object) {
        return _.pickBy(queryTemplate, (o) => QueryTemplate.isTemplated(o))
    }

    static getNonTemplatedParts(queryTemplate: object) {
        return _.pickBy(queryTemplate, (o) => !QueryTemplate.isTemplated(o))
    }

    static escape(value: any) {
        if (typeof value === "string" && value.substring(0, 2) === "\\:") {
            return value.substring(1)
        }

        return value
    }

    private static isTemplated(value: any) {
        return typeof value === "string" && value.substring(0, 1) === ":"
    }
}
