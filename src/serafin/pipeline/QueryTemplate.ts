import * as _ from 'lodash'

export class QueryTemplate {
    constructor(public queryTemplate: object) {
    }

    hydrate(resource: object): object {
        let query = _.clone(this.queryTemplate);

        for (let key in query) {
            // resource parameter beginning with :
            if (typeof query[key] === 'string' && query[key].substring(0, 1) === ':') {
                if (!resource[query[key].substring(1)]) {
                    throw new Error(`Resource field ${resource[query[key]].substring(1)} not found`);
                } else {
                    query[key] = resource[query[key].substring(1)];
                }
                // : are escaped
            } else if (typeof query[key] === 'string' && query[key].substring(0, 2) === '\:') {
                query[key] = query[key].substring(1);
            }
        }

        return query;
    }
}