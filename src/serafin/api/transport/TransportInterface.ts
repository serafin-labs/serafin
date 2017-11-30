import { PipelineAbstract } from "../../pipeline/Abstract"
import { Api } from "../Api"

/**
 * Transport represent a way to expose pipelines to an external interface. 
 * It can be REST HTTP services, web sockets, graphql queries, etc.
 */
export interface TransportInterface {
    /**
     * Init this transport
     */
    init(api: Api)

    /**
     * The 'use' method is called by the Api class to pass the pipeline to register
     */
    use(pipeline: PipelineAbstract, name: string, pluralName: string)
}