import { PipeAbstract } from './PipeAbstract';
import { PipelineAbstract } from './PipelineAbstract';
import { SchemaBuilder, DeepPartial } from '@serafin/schema-builder';
import { IdentityInterface } from './IdentityInterface';

class Toto extends PipeAbstract {
    async read(next, query) {
        return null;
    }
}

class Tutu extends PipeAbstract {
    // constructor() {
    //     super(model: SchemaBuilder.emptySchema().addBoolean('trucdebile'));
    // }

    async read(next, query) {
        return { 'trucdebile': false };
    }
}


let bidule: PipelineAbstract<{ id: string, hop: string }>;
let truc = bidule.pipe(new Toto())
    .pipe(new Tutu());


let hop = truc.read();







export class MyPipeline<M extends IdentityInterface> extends PipelineAbstract<M> {
    constructor(public modelSchemaBuilder: SchemaBuilder<M>) {
        super(modelSchemaBuilder);
    }


}

export class MyPipeline2<M extends IdentityInterface> extends MyPipeline<M> {
    constructor(public modelSchemaBuilder: SchemaBuilder<M>) {
        super(modelSchemaBuilder);
    }

    schemaBuilders = this.extend((m) => ({

        readWrapper: SchemaBuilder.emptySchema().addString("youhou").addString("hop")
    }));

}
export class MyPipe extends PipeAbstract {
}



let p2 = new MyPipeline2(SchemaBuilder.emptySchema().addString('id').addBoolean('prop1'));

let a = p2.alterSchemaBuilders((m, s) => ({
    readQuery: s.readQuery.addInteger("addedByAlter"),

}));


let r2 = a.read();
r2.then((r) => r.data);

