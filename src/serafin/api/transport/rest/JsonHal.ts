import * as _ from 'lodash';
import * as express from 'express';
import { Api } from '../../../../index';
import { QueryTemplate } from '../../../pipeline/QueryTemplate';
import { PipelineRelation } from '../../../pipeline/Relation';

export class JsonHal {
    constructor(private selfUrl, private api: Api, private relations: { [k: string]: PipelineRelation }) {
    }

    links(resource: object = null) {
        let links = {};

        if (this.relations) {
            for (let relName in this.relations) {
                let rel = this.relations[relName]
                let link: object = null;
                if (resource) {
                    link = this.createNonTemplatedLink(rel, resource);
                } else {
                    link = this.createTemplatedLink(rel);
                }

                if (link) {
                    links[rel.name] = link;
                }
            }
        }

        return links;
    }

    private createNonTemplatedLink(rel: PipelineRelation, resource: object) {
        let relationPath = _.findKey(this.api.pipelineByName, rel.pipeline() as any);
        if (relationPath !== undefined) {
            console.log(rel.pipeline)
            let url = "";
            let query = QueryTemplate.hydrate(rel.query, resource);

            if (query['id'] && rel.type == 'one') {
                url = `/${query['id']}?`;
                delete (query['id']);
            } else {
                url = '?';
            }

            _.each(query, (value, key) => {
                if (Array.isArray(value)) {
                    value.forEach((subValue) => {
                        url += `${key}[]=${subValue}&`;
                    })
                } else {
                    url += `${key}=${value}&`;
                }
            });


            return { href: `/${relationPath}${url}`.slice(0, -1) };
        }

        return null;
    }

    private createTemplatedLink(rel: PipelineRelation): object {
        let relationPath = _.findKey(this.api.pipelineByName, rel.pipeline);
        if (relationPath !== undefined) {
            let idUrl = "";
            let url = "?";

            let templatedParts = QueryTemplate.getTemplatedParts(rel.query);
            let nonTemplatedParts = QueryTemplate.getNonTemplatedParts(rel.query);

            _.each(nonTemplatedParts, (value, key) => {
                if (key == 'id' && rel.type == 'one') {
                    idUrl = `/${value}`;
                } else if (Array.isArray(value)) {
                    value.forEach((subValue) => {
                        url += `${key}[]=${QueryTemplate.escape(subValue)}&`;
                    })
                } else {
                    url += `${key}=${QueryTemplate.escape(value)}&`;
                }
            });

            let templatedParams: string[] = [];
            _.each(templatedParts, (value, key) => {
                if (key == 'id' && rel.type == 'one') {
                    idUrl = `/{id}`;
                } else {
                    templatedParams.push(key + "*");
                }
            });

            if (templatedParams.length > 0) {
                url = idUrl + `{${url.slice(-1)}${templatedParams.join(',')}}`;
            }
            else {
                url = idUrl + url.slice(0, -1);
            }

            return { href: `/${relationPath}${url}`, templated: true };
        }

        return null;
    }
}
