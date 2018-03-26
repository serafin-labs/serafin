import { PipelineAbstract } from "./PipelineAbstract";

export const PIPELINE = Symbol("Pipeline");

export interface PipeAbstract {
    create(next: (resources: any, options?: any) => Promise<any>, resources: any[], options?: any): Promise<any>;
    read(next: (query?: any, options?: any) => Promise<any>, query?: any, options?: any): Promise<any>;
    replace(next: (id: string, values: any, options?: any) => Promise<any>, id: string, values: any, options?: any): Promise<any>;
    patch(next: (query: any, values: any, options?: any) => Promise<any>, query: any, values: any, options?: any): Promise<any>;
    delete(next: (query: any, options?: any) => Promise<any>, query: any, options?: any): Promise<any>;
}

export abstract class PipeAbstract {
    get pipeline(): PipelineAbstract<any, any> {
        if (!this[PIPELINE]) {
            throw Error("No associated pipeline");
        }

        return this[PIPELINE];
    }
}
