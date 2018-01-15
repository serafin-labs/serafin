import { SchemaBuilder } from '@serafin/schema-builder';
import { JSONSchema } from '@serafin/open-api';


/**
 * method decorator used to declare an additional result property, along with its JSONSchema definition.
 * 
 * @param name Name of the property
 * @param schema JSONSchema definition. Can be an object or a function returning an object
 * @param required true or false
 */
export function result(name: string, schema: JSONSchema, required: boolean = true) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let schemaBuilder: SchemaBuilder<{}>;
        let schemaBuilderName = `_${propertyKey}WrapperSchemaBuilder`;
        if (!target.hasOwnProperty(schemaBuilderName)) {
            target[schemaBuilderName] = SchemaBuilder.emptySchema()
        }
        schemaBuilder = target[schemaBuilderName]
        if (required) {
            schemaBuilder.addProperty(name, new SchemaBuilder<any>(schema));
        } else {
            schemaBuilder.addOptionalProperty(name, new SchemaBuilder<any>(schema));
        }
    }
}