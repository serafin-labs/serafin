import * as _ from 'lodash';
import * as express from 'express';
import { PipelineRelations, PipelineRelationInterface } from "../../../pipeline/Relations";
import { Api } from '../../../../index';
import { QueryTemplate } from '../../../pipeline/QueryTemplate';
import { PipelineAbstract } from '../../../pipeline/Abstract';

export class JsonHal {
    constructor(private selfUrl, private api: Api, private relations: PipelineRelations) {
    }

    links(resource: object = null) {
        let links = { self: { href: this.selfUrl } };

        if (this.relations) {
            for (let rel of this.relations.list) {
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

    private createNonTemplatedLink(rel: PipelineRelationInterface, resource: object) {
        let relationPath = _.findKey(this.api.pipelineByName, rel.pipeline);
        if (relationPath !== undefined) {
            let queryTemplate = rel.query;
            if (queryTemplate instanceof QueryTemplate) {
                let url = "";
                let query = queryTemplate.hydrate(resource);

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
        }

        return null;
    }

    private createTemplatedLink(rel: PipelineRelationInterface): object {
        let relationPath = _.findKey(this.api.pipelineByName, rel.pipeline);
        if (relationPath !== undefined) {
            let queryTemplate = rel.query;
            if (queryTemplate instanceof QueryTemplate) {
                let idUrl = "";
                let url = "?";

                let templatedParts = queryTemplate.getTemplatedParts();

                _.each(queryTemplate.getNonTemplatedParts(), (value, key) => {
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
                _.each(queryTemplate.getTemplatedParts(), (value, key) => {
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
        }

        return null;
    }
}