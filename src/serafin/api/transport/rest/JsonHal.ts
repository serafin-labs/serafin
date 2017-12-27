import * as _ from 'lodash';
import * as express from 'express';
import { PipelineRelations, PipelineRelationInterface } from "../../../pipeline/Relations";
import { Api } from '../../../../index';
import { QueryTemplate } from '../../../pipeline/QueryTemplate';
import { PipelineAbstract } from '../../../pipeline/Abstract';

export function JsonHalLink(api): (pipeline, query, options, type) => object {
    return (pipeline, query, options, type) => {
        let relationPath = _.findKey(api.pipelineByName, (apiPipeline) => apiPipeline.uuid === pipeline.uuid);
        if (relationPath === undefined) {
            return undefined;
        }

        return { href: url(relationPath, query, options, type) };
    }
}

function url(relationPath: string, query, options, type) {
    let url = "";

    if (query['id'] && type == 'one') {
        url = `/${query['id']}?`;
        delete (query['id']);
    } else {
        url = '?';
    }

    _.each({ ...query, ...options }, (value, key) => {
        if (Array.isArray(value)) {
            value.forEach((subValue) => {
                url += `${key}[]=${subValue}&`;
            })
        } else {
            url += `${key}=${value}&`;
        }
    });

    return `/${relationPath}${url}`.slice(0, -1);
}
