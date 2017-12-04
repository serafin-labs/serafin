import * as _ from 'lodash'
import { escape } from 'querystring';

export class QueryTemplate {
    constructor(public queryTemplate: object) {
    }

    hydrate(resource: object): object {
        return QueryTemplate.hydrateParts(this.queryTemplate, resource);
    }

    getTemplatedParts() {
        return _.pickBy(this.queryTemplate, (o) => QueryTemplate.isTemplated(o));
    }

    getNonTemplatedParts() {
        return _.pickBy(this.queryTemplate, (o) => !QueryTemplate.isTemplated(o));
    }

    static hydrateParts(query: object, resource: object) {
        return _.mapValues(query, (o, key) => {
            if (QueryTemplate.isTemplated(o)) {
                if (!resource[o.substring(1)]) {
                    throw new Error(`Resource field ${o.substring(1)} not found`);
                } else {
                    return resource[o.substring(1)];
                }
            } else {
                return QueryTemplate.escape(o);
            }
        });
    }

    static escape(value) {
        if (value === 'string' && value.substring(0, 2) === '\:') {
            return value.substring(1);
        }

        return value;
    }

    private static isTemplated(value) {
        return (typeof value === 'string' && value.substring(0, 1) === ':');
    }
}