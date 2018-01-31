import { PipeAbstract } from './PipeAbstract';
import { PipelineAbstract } from './PipelineAbstract';
import { SchemaBuilder, DeepPartial, Overwrite, Resolve } from '@serafin/schema-builder';
import { IdentityInterface } from './IdentityInterface';
import { SchemaBuildersInterface, SchemaBuildersInterfaceMerger, PartialSchemaBuilders, MergedSchema } from './SchemaBuildersInterface';

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





let schemaBuilders = {
    model: SchemaBuilder.emptySchema().addString("proptest"),
    readQuery: SchemaBuilder.emptySchema().addBoolean("rest"),
    createValues: SchemaBuilder.emptySchema(),
    updateValues: SchemaBuilder.emptySchema(),
    patchQuery: SchemaBuilder.emptySchema(),
    patchValues: SchemaBuilder.emptySchema(),
    deleteQuery: SchemaBuilder.emptySchema(),
    readOptions: SchemaBuilder.emptySchema(),
    readWrapper: SchemaBuilder.emptySchema(),
    createOptions: SchemaBuilder.emptySchema(),
    createWrapper: SchemaBuilder.emptySchema(),
    updateOptions: SchemaBuilder.emptySchema(),
    updateWrapper: SchemaBuilder.emptySchema(),
    patchOptions: SchemaBuilder.emptySchema(),
    patchWrapper: SchemaBuilder.emptySchema(),
    deleteOptions: SchemaBuilder.emptySchema(),
    deleteWrapper: SchemaBuilder.emptySchema(),
};


export class MyPipe extends PipeAbstract {
    // schemaBuildersResolver = (s) => ({
    //     readQuery: s.readQuery.addString("addedByPipe")
    // });

    schemaBuildersResolver = <S extends SchemaBuildersInterface["schemaBuilders"]>(s: S) => ({
        readQuery: s.readQuery.addString("addedByPipe")
    });

}

let extCB = <S extends SchemaBuildersInterface["schemaBuilders"]>(s: S) => ({
    readQuery: s.readQuery.addString("addedByPipe")
});
let mypipe = new MyPipe();
let sbr = mypipe.schemaBuilders;
let mergeTest = SchemaBuildersInterfaceMerger.merge(schemaBuilders, sbr);
let mergeTestType = mergeTest.readQuery.T;
let r = mypipe.resolveSchemaBuilders(schemaBuilders);
let rq = r.readQuery;

export class MyPipeline<M extends IdentityInterface> extends PipelineAbstract<M> {

    constructor(public modelSchemaBuilder: SchemaBuilder<M>) {
        super(modelSchemaBuilder, (s) => ({
            readQuery: s.readQuery.addString("pouyoupouyou")
        })
        );
    }
}

export class MyPipeline2<M extends IdentityInterface> extends MyPipeline<M> {

    schemaBuilders = this.extendsSchemaBuilders((s) => ({
        readQuery: s.readQuery.addString("pouyoupouyou"),
    }));

    // extends = (s) => ({
    //     readQuery: s.readQuery.addString("pouyoupouyou"),
    // });
}





let p2 = new MyPipeline2(SchemaBuilder.emptySchema().addString('id').addBoolean('prop1'));
p2.read();
let a = p2.alterSchemaBuilders((s) => ({
    readQuery: s.readQuery.addInteger("addedByAlter")
}));

let r2 = a.read();
r2.then((r) => r.data);






let empty = SchemaBuilder.emptySchema().addBoolean("hop");
const mergeSchemaBuilder = <S extends SchemaBuilder<{}>, R extends {}>(s: S, m: (s: S) => SchemaBuilder<R>) => {
    return m(s as S);
}
let truc3 = <S extends SchemaBuilder<{}>>(s: S) => { let truc = s.addBoolean("ha"); return truc; }


// const mergeSchemaBuildersType = (false as true) && mergeSchemaBuilders();

class aa<T> {
    constructor(public val: T) {
    }
    getVal() {
        return this.val;
    }
}

let aaa = new aa(true);

class bb<T extends aa<any>> {
    constructor(public val: T) {
    }
    show() {
        return this.val.getVal() as this["val"]["getVal"];
    }
}

let bbb = new bb(aaa).show();

const cc = <T>(val: T) => { return val };
const dd = <A, R>(arg: A, callback: (param: A) => R) => {
    //let callBackResult = (false as true) && callback(arg);
    return callback(arg)
    //as typeof callBackResult 
}

let test = dd(true, cc);


class SchemaBuilderMerger<S> {
    constructor(public schema: S) { }
    mergeSchema<R extends {}>(callback: (schema: this["schema"]) => SchemaBuilder<R>) {
        return callback(this.schema);
    }

    static merge<T, R>(schema: SchemaBuilder<T>, callback: (schema: SchemaBuilder<T>) => SchemaBuilder<R>) {
        let merger = new SchemaBuilderMerger(schema);
        return merger.mergeSchema(callback);
    }
}

let schema = SchemaBuilder.emptySchema().addBoolean("hop");
let testMerge = new SchemaBuilderMerger(schema);
let resultMerge = testMerge.mergeSchema((s) => (s.addInteger("addedByAlter")));

const cb = <S>(s: SchemaBuilder<S>) => (s.addInteger("addedByAlter"))
let resultMerge2 = SchemaBuilderMerger.merge(schema, cb);

// class SchemaBuildersInterfaceMerger<S extends SchemaBuildersInterface["schemaBuilders"]> {
//     constructor(public schema: S) { }
//     mergeSchema<R extends Partial<SchemaBuildersInterface["schemaBuilders"]>>(callback: (schema: this["schema"]) => R) {
//         let callbackType = (false as true) && callback(this.schema);

//         let mergedSchema = Object.assign(this.schema, callback(this.schema));
//         return mergedSchema as any as Overwrite<this["schema"], typeof callbackType>;
//     }

//     static merge<T extends SchemaBuildersInterface["schemaBuilders"], R extends Partial<SchemaBuildersInterface["schemaBuilders"]>>
//         (schema: T, callback: (schema: T) => R) {
//         let merger = new SchemaBuildersInterfaceMerger(schema);
//         return merger.mergeSchema(callback);
//     }
// }


let sb1 = {
    model: SchemaBuilder.emptySchema(),
    readQuery: SchemaBuilder.emptySchema().addBoolean("rest"),
    createValues: SchemaBuilder.emptySchema(),
    updateValues: SchemaBuilder.emptySchema(),
    patchQuery: SchemaBuilder.emptySchema(),
    patchValues: SchemaBuilder.emptySchema(),
    deleteQuery: SchemaBuilder.emptySchema(),
    readOptions: SchemaBuilder.emptySchema(),
    readWrapper: SchemaBuilder.emptySchema(),
    createOptions: SchemaBuilder.emptySchema(),
    createWrapper: SchemaBuilder.emptySchema(),
    updateOptions: SchemaBuilder.emptySchema(),
    updateWrapper: SchemaBuilder.emptySchema(),
    patchOptions: SchemaBuilder.emptySchema(),
    patchWrapper: SchemaBuilder.emptySchema(),
    deleteOptions: SchemaBuilder.emptySchema(),
    deleteWrapper: SchemaBuilder.emptySchema(),
};


let sbim = SchemaBuildersInterfaceMerger.merge(sb1, (s) => ({
    readQuery: s.readQuery.addNumber('hop')
}));





type fdsah = Partial<(keyof typeof sb1)>




class egjaiop<A extends SchemaBuildersInterface["schemaBuilders"]> {
    constructor(test: () => A) {

    }
}




class pipeTest<S extends SchemaBuildersInterface["schemaBuilders"]= null> {

    extendsSchemaBuilders(schemaBuilders: S) {
        return SchemaBuildersInterfaceMerger.merge(schemaBuilders, this.a) as this["typea"];
    }


    resolver() {
        return this.a as this["a"];
    }

    a = (truc: S) => ({ readQuery: truc.readQuery });
    typea = (false as true) && this.a({} as S);
}

let ptest = new pipeTest<typeof sb1>();
let atest = ptest.a;

let btest = ptest.extendsSchemaBuilders(sb1);







class SchemaBuildersInterfaceMerger2<S extends SchemaBuildersInterface["schemaBuilders"], R extends PartialSchemaBuilders> {
    constructor(public schema: S, public callback: (schema: S) => R) { }

    mergeSchema() {
        let callbackType = (false as true) && this.callback(this.schema);
        let mergedSchema = Object.assign(this.schema, this.callback(this.schema));
        return mergedSchema as any as MergedSchema<this["schema"], typeof callbackType>;
    }


}


class toto<S extends SchemaBuildersInterface["schemaBuilders"]> {
    constructor(public schema: S) {

    }

    get schemas() {
        return this.schema as S;
    }

    addString() {
        return ((this.schema as S).readQuery);
    }

    cback = (schema: this["schema"]) => ({ readQuery: schema.readQuery.addString("hop") });
    cbackType = (false as true) && this.cback(this.schema);
}

let cback = (new toto(sb1)).cback;
let addStr = (new toto<typeof sb1>(sb1)).addString();
let merge = SchemaBuildersInterfaceMerger.merge(sb1, cback);
type mergetype = typeof merge.readQuery
let mergeOneLiner = SchemaBuildersInterfaceMerger.merge(sb1, (truc) => ({ readQuery: truc.readQuery.addString("hop") }));

protected extendsSchemaBuilders < newS extends Partial < SchemaBuildersInterface["schemaBuilders"] >> (func: (sch: S) => newS) {
    return SchemaBuildersInterfaceMerger.merge(this.schemaBuilders, func);
}