import { PipeAbstract } from './PipeAbstract';
import { PipelineAbstract } from './PipelineAbstract';
import { SchemaBuilder } from '@serafin/schema-builder';

class Toto extends PipeAbstract {
    async read(next, query) {
        return null;
    }
}

class Tutu extends PipeAbstract {
    constructor() {
        super({ model: SchemaBuilder.emptySchema().addBoolean('trucdebile') });
    }

    async read(next, query) {
        return { 'trucdebile': false };
    }
}


let bidule: PipelineAbstract<{ id: string, hop: string }>;
let truc = bidule.pipe(new Toto())
    .pipe(new Tutu());


let hop = truc.read();