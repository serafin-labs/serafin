import * as express from "express"
import * as P from "bluebird"
import * as bodyParser from "body-parser"
import * as compression from "compression"
import { PipelineAbstract } from "../pipeline/Abstract"
import { routerStore } from "./routerStore"
import { routerApi } from "./routerApi"

export class Api {
    private endpoints = [];

    constructor(public application: express.Application) {}

    prepareApplication() {
        this.application.use(bodyParser.json());
        this.application.use(compression());
        return this;
    }

    runApplication(port: number = 80) {
        return new P<this>((resolve, reject) => {
            var server = this.application.listen(port, (error: any) => {
                if (error) {
                    reject(error);
                } else {
                    let host = server.address().address;
                    let port = server.address().port;
                    console.log('Server listening on [%s]:%s', host, port);
                    resolve(this);
                }
            });
        });
    }

    expose (pipeline: PipelineAbstract, name: string, namePlural: string = null) {
        if (!namePlural) {
            namePlural = name + 's';
        }

        this.application.use('/' + namePlural, routerStore(pipeline, name, namePlural));
        this.endpoints.push(namePlural);
        return this;
    }
}
