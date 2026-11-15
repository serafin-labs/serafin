import { expect } from "chai"
import { SchemaBuilder, SB } from "../SchemaBuilder.js"
import { walkJsonSchema } from "../walkJsonSchema.js"

/**
 * The less travelled paths of the builder: schemas without properties, `required` or title,
 * boolean subschemas, and the options that are usually left out.
 */
describe("Schema Builder edge cases", function () {
    describe("object schemas without properties or required", function () {
        it("builds an object schema without properties", function () {
            expect(SB.objectSchema({}, {}).schema).to.deep.equal({ type: "object", additionalProperties: false })
        })

        it("makes properties optional or required when none is required yet", function () {
            const schema = SB.emptySchema().addString("a", {}, false)
            expect(schema.setOptionalProperties(["a"]).schema.required).to.equal(undefined)
            expect(schema.setRequiredProperties(["a"]).schema.required).to.deep.equal(["a"])
            expect(schema.replaceProperty("a", SB.numberSchema()).schema.required).to.deep.equal(["a"])
            expect(schema.requiredProperties).to.deep.equal([])
        })

        it("adds the discriminator to variants without properties", function () {
            const schema = SB.oneOfDiscriminated("kind", { empty: SB.emptySchema() })
            expect(schema.schema.oneOf).to.deep.equal([
                { type: "object", additionalProperties: false, properties: { kind: { const: "empty" } }, required: ["kind"] },
            ])
        })

        it("drops an empty required when intersecting, merging or overwriting optional properties", function () {
            const a = SB.emptySchema().addString("a", {}, false)
            const b = SB.emptySchema().addString("b", {}, false)
            expect(a.intersectProperties(b).schema.required).to.equal(undefined)
            expect(a.mergeProperties(b).schema.required).to.equal(undefined)
            expect(a.overwriteProperties(b).schema.required).to.equal(undefined)
        })

        it("keeps a merged property required only when both schemas require it", function () {
            const a = SB.emptySchema().addString("both").addString("first")
            const b = SB.emptySchema().addNumber("both").addNumber("first", {}, false)
            expect(a.mergeProperties(b).schema.required).to.deep.equal(["both"])
            const optional = SB.emptySchema().addNumber("first", {}, false)
            expect(SB.emptySchema().addString("first").mergeProperties(optional).schema.required).to.equal(undefined)
        })
    })

    describe("error messages", function () {
        it("name the schema by its title", function () {
            const titled = SB.emptySchema({ title: "User" }).addString("id")
            expect(() => titled.replaceProperty("missing" as any, SB.stringSchema())).to.throw("on User schema")
            expect(() => titled.addProperties({ id: SB.stringSchema() })).to.throw("'id' already exists in User schema")
        })
    })

    describe("properties", function () {
        it("adds pattern properties of any value by default", function () {
            expect(SB.emptySchema().addPatternProperty("x-", "").schema.patternProperties).to.deep.equal({ "^x-.*$": true })
        })

        it("adds null to the type list of an optional property", function () {
            const schema = SB.emptySchema()
                .addProperty("multi", SB.fromJsonSchema<any>({ type: ["string", "number"] }), false)
                .addProperty("nullable", SB.fromJsonSchema<any>({ type: ["string", "null"] }), false)
                .toNullable()
            expect(schema.schema.properties!.multi).to.deep.equal({ type: ["string", "number", "null"] })
            expect(schema.schema.properties!.nullable).to.deep.equal({ type: ["string", "null"] })
        })

        it("renames required properties, even those it does not know", function () {
            const schema = SB.fromJsonSchema<any>({ type: "object", properties: { a_b: {} }, required: ["a_b", "ghost"], additionalProperties: false })
            expect(schema.toCamelCaseKeys().schema.required).to.deep.equal(["aB", "ghost"])
        })

        it("suffixes every property by default", function () {
            const schema = SB.emptySchema().addString("a").addString("b").suffixProperties("Id")
            expect(Object.keys(schema.schema.properties!)).to.deep.equal(["aId", "bId"])
        })

        it("picks properties by type, among lists of types and boolean schemas", function () {
            const schema = SB.fromJsonSchema<any>({
                type: "object",
                properties: { name: { type: ["string", "null"] }, any: true, count: { type: "integer" } },
                additionalProperties: false,
            })
            expect(schema.pickByType("string").properties).to.deep.equal(["name"])
            expect(schema.pickByType("number").properties).to.deep.equal(["count"])
        })

        it("sets the attributes of nested properties with the deep option", function () {
            const schema = SB.objectSchema({}, { list: SB.arraySchema(SB.stringSchema()), nested: SB.objectSchema({}, { x: SB.stringSchema() }) })
            const described = schema.setPropertiesAttributes({ x: { description: "deep" } } as any, { deep: true })
            expect(described.schema.properties!.nested).to.deep.include({ properties: { x: { type: "string", description: "deep" } } })
        })
    })

    describe("dependencies", function () {
        const model = SB.emptySchema()
            .addString("a", {}, false)
            .addString("b", {}, false)
            .addString("c", {}, false)
            .addDependentRequired("a", ["b", "c"])
            .addDependentRequired("b", ["c"])
            .addDependentSchemas("c", SB.emptySchema())

        it("drop the properties that are left out", function () {
            expect(model.omitProperties(["c"]).schema).to.deep.include({ dependentRequired: { a: ["b"] } })
            expect(model.omitProperties(["c"]).schema).not.to.have.property("dependentSchemas")
            expect(model.pickProperties(["b", "c"]).schema).to.deep.include({
                dependentRequired: { b: ["c"] },
                dependentSchemas: { c: model.schema.dependentSchemas!.c },
            })
            expect(model.pickProperties(["a"]).schema).not.to.have.property("dependentRequired")
        })

        it("follow the properties that are renamed", function () {
            expect(model.renameProperty("c", "d").schema).to.deep.include({ dependentRequired: { a: ["b", "d"], b: ["d"] } })
            expect(Object.keys(model.renameProperty("c", "d").schema.dependentSchemas!)).to.deep.equal(["d"])
            expect(model.toSnakeCaseKeys().schema.dependentRequired).to.deep.equal({ a: ["b", "c"], b: ["c"] })
            const undeclared = SB.fromJsonSchema<any>({
                type: "object",
                properties: { aB: {} },
                dependentRequired: { aB: ["ghost"] },
                additionalProperties: false,
            })
            expect(undeclared.toSnakeCaseKeys().schema.dependentRequired).to.deep.equal({ a_b: ["ghost"] })
        })

        it("are dropped once every property is optional on its own", function () {
            expect(model.toOptionals().schema).not.to.have.property("dependentRequired")
            expect(SB.objectSchema({}, { nested: model }).toDeepOptionals().schema.properties!.nested).not.to.have.property("dependentRequired")
            expect(() => model.toOptionals().validate({ a: "x" })).not.to.throw()
        })
    })

    describe("toNullable", function () {
        it("turns a const into an enum of its value and null", function () {
            const schema = SB.emptySchema()
                .addProperty("kind", SB.fromJsonSchema<any>({ type: "string", const: "a" }), false)
                .toNullable()
            expect(schema.schema.properties!.kind).to.deep.equal({ type: ["string", "null"], enum: ["a", null] })
            expect(() => schema.validate({ kind: null })).not.to.throw()
            const alreadyNull = SB.emptySchema()
                .addProperty("kind", SB.fromJsonSchema<any>({ type: "null", const: null }), false)
                .toNullable()
            expect(alreadyNull.schema.properties!.kind).to.deep.equal({ type: "null", const: null })
        })
    })

    describe("pickAdditionalProperties", function () {
        it("keeps additionalProperties open when they were not set", function () {
            const schema = SB.fromJsonSchema<any>({ type: "object", properties: { a: { type: "string" }, b: { type: "string" } }, required: ["b"] })
            expect(schema.pickAdditionalProperties(["a"]).schema).to.deep.equal({
                type: "object",
                properties: { a: { type: "string" } },
                additionalProperties: true,
            })
        })

        it("requires the additional properties it captures, without other required properties", function () {
            const schema = SB.emptySchema().addString("a", {}, false).addAdditionalProperties(SB.numberSchema())
            expect(schema.pickAdditionalProperties(["a"], ["extra"]).schema).to.deep.equal({
                type: "object",
                properties: { a: { type: "string" }, extra: { type: "number" } },
                required: ["extra"],
                additionalProperties: false,
            })
        })
    })

    describe("expandEnumToProperties", function () {
        const kinds = SB.fromJsonSchema<any>({
            type: "object",
            properties: { kind: { enum: ["a", 1, "b"] }, flag: true, label: { type: "string" } },
            additionalProperties: false,
        })

        it("skips the values that are not strings, and requires the new properties", function () {
            const schema = kinds.expandEnumToProperties("kind", SB.booleanSchema())
            expect(Object.keys(schema.schema.properties!)).to.deep.equal(["kind", "flag", "label", "a", "b"])
            expect(schema.schema.required).to.deep.equal(["a", "b"])
        })

        it("refuses a property name it produces twice", function () {
            const schema = SB.emptySchema().addEnum("kind", ["a"]).addBoolean("kindA")
            expect(() => schema.expandEnumToProperties("kind", SB.booleanSchema(), { prefix: "kind" })).to.throw("duplicate property name 'kindA'")
        })

        it("refuses a path that goes through a schema without properties", function () {
            const through = (path: string[]) => (() => ({ path })) as any
            expect(() => kinds.expandEnumToProperties(through(["flag", "x"]), SB.booleanSchema())).to.throw("could not find an enum at path 'flag.x'")
            expect(() => kinds.expandEnumToProperties(through(["label", "x"]), SB.booleanSchema())).to.throw("could not find an enum at path 'label.x'")
        })
    })

    describe("enums", function () {
        it("types the values that are left", function () {
            const values = SB.fromJsonSchema<any>({ enum: ["a", null, true, 1] })
            expect(values.omitEnumValues(["a"]).schema).to.deep.equal({ enum: [null, true, 1], type: ["null", "boolean", "number"] })
            expect(values.pickEnumValues([]).schema).to.deep.equal({ enum: [] })
        })

        it("narrows to the branch whose single enum value matches", function () {
            const schema = SB.fromJsonSchema<any>({
                oneOf: [
                    true,
                    { type: "object" },
                    { type: "object", properties: { other: {} } },
                    { type: "object", properties: { kind: { enum: ["b"] } } },
                    { type: "object", properties: { kind: { const: "a" } } },
                ],
            })
            expect(schema.narrowDiscriminated("kind", "b").schema).to.deep.equal({ type: "object", properties: { kind: { enum: ["b"] } } })
        })
    })

    describe("objectProperties", function () {
        it("reads boolean properties and branches", function () {
            const schema = SB.fromJsonSchema<any>({ allOf: [true, { type: "object", properties: { any: true, none: false } }] })
            const properties = schema.objectProperties() as any
            expect(properties.any[0].schema).to.deep.equal({})
            expect(properties.none[0].schema).to.deep.equal({ not: {} })
        })

        it("has no properties for an object schema without properties", function () {
            expect(SB.fromJsonSchema<any>({ type: "object" }).objectProperties()).to.deep.equal({})
        })

        it("flattens the allOf of a property that several branches contribute", function () {
            const schema = SB.fromJsonSchema<any>({
                allOf: [
                    { type: "object", properties: { a: { allOf: [{ type: "string" }, { minLength: 1 }] } } },
                    { type: "object", properties: { a: { maxLength: 3 } } },
                ],
            })
            const properties = schema.objectProperties() as any
            expect(properties.a[0].schema).to.deep.equal({ allOf: [{ type: "string" }, { minLength: 1 }, { maxLength: 3 }] })
        })
    })

    describe("arrays and strings", function () {
        it("is an array schema with prefixItems and no type", function () {
            expect(SB.fromJsonSchema<any>({ prefixItems: [{ type: "string" }] }).isArraySchema).to.equal(true)
            expect(SB.fromJsonSchema<any>({}).isArraySchema).to.equal(false)
        })

        it("sets contains with either bound", function () {
            const list = SB.arraySchema(SB.stringSchema())
            expect(list.setContains(SB.stringSchema(), { maxContains: 2 }).schema).to.deep.include({ contains: { type: "string" }, maxContains: 2 })
            expect(list.setContains(SB.stringSchema(), { minContains: 1 }).schema).to.deep.include({ minContains: 1 })
        })

        it("sets the content encoding alone", function () {
            expect(SB.stringSchema().setContent({ encoding: "base64" }).schema).to.deep.equal({ type: "string", contentEncoding: "base64" })
        })
    })

    describe("toTypescript", function () {
        it("writes boolean and missing subschemas as any or never, and unknown types as they are", function () {
            const code = SB.fromJsonSchema<any>({ type: "object", properties: { any: true, none: false, list: { type: "array" } } }).toTypescript()[1]
            expect(code).to.include('"any": [SB.fromJsonSchema({} as const), undefined]')
            expect(code).to.include('"none": [SB.neverSchema(), undefined]')
            expect(code).to.include("SB.arraySchema(SB.fromJsonSchema({} as const))")
            expect(SB.fromJsonSchema<any>({ type: "date" }).toTypescript()[1]).to.equal('SB.fromJsonSchema({"type":"date"} as const)')
        })

        it("writes nullable tuples and objects, and open additional properties", function () {
            expect(SB.tupleSchema([SB.stringSchema()], {}, true).toTypescript()[1]).to.include(", true)")
            expect(SB.objectSchema({}, { a: SB.stringSchema() }, true).toTypescript()[1]).to.include(", true)")
            expect(SB.emptySchema().addAdditionalProperties().toTypescript()[1]).to.include(".addAdditionalProperties()")
        })

        it("writes contains without bounds, and unevaluatedProperties as a schema", function () {
            expect(SB.arraySchema(SB.stringSchema()).setContains(SB.stringSchema()).toTypescript()[1]).to.include(".setContains(SB.stringSchema())")
            expect(SB.emptySchema().setUnevaluatedProperties(SB.stringSchema()).toTypescript()[1]).to.include(".setUnevaluatedProperties(SB.stringSchema())")
        })

        it("writes any property name as a string literal", function () {
            const name = 'a": SB.stringSchema(), "b'
            const code = SB.fromJsonSchema<any>({ type: "object", properties: { [name]: { type: "string" } }, required: [name] }).toTypescript()[1]
            expect(code).to.equal(`SB.objectSchema({}, {${JSON.stringify(name)}: SB.stringSchema()})`)
        })

        it("writes the bounds of contains as literals", function () {
            const code = SB.fromJsonSchema<any>({ type: "array", contains: { type: "string" }, minContains: "1 }) + evil(" }).toTypescript()[1]
            expect(code).to.include('{ minContains: "1 }) + evil(" }')
        })

        it("names schemas with valid identifiers", function () {
            const named = (title: string) => SB.stringSchema({ title }).toTypescript()[0]
            expect(named("Book")).to.equal("bookSchema")
            expect(named("BookList")).to.equal("bookListSchema")
            expect(named("Book list")).to.equal("bookListSchema")
            expect(named("book-list (v2)")).to.equal("bookListV2Schema")
            expect(named("2 books")).to.equal("_2BooksSchema")
            expect(named("Livre été")).to.equal("livreÉtéSchema")
            expect(named("x = 1; evil()")).to.equal("x1EvilSchema")
            expect(named("!!")).to.equal("schema")
            const book = SB.stringSchema({ title: "Book list" })
            expect(SB.arraySchema(book).toTypescript()[1]).to.equal("SB.arraySchema(bookListSchema)")
        })

        it("keeps the setters of an enum", function () {
            expect(
                SB.enumSchema(["a"] as const)
                    .setId("letter")
                    .toTypescript()[1],
            ).to.equal('SB.enumSchema(["a"]).setId("letter")')
        })
    })

    describe("walkJsonSchema", function () {
        it("walks the $defs", function () {
            const keywords: (string | undefined)[] = []
            walkJsonSchema({ $defs: { a: { type: "string" } } }, (s, keyword) => keywords.push(keyword))
            expect(keywords).to.deep.equal([undefined, "$defs"])
        })
    })

    it("is still a SchemaBuilder after every transformation", function () {
        expect(SB.emptySchema().addString("a").toNullable()).to.be.instanceOf(SchemaBuilder)
    })
})
