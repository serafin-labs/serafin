import { SchemaBuilder } from '@serafin/schema-builder';
import { JSONSchema } from '@serafin/open-api';

/**
 * Method decorator used to declare an action option, along with its JSONSchema definition.
 * 
 * @param option Name of the option
 * @param schema JSONSchema definition for the property
 * @param required true or false
 */
export function option(option: string, schema: JSONSchema, required: boolean = true) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        let optionsSchemaBuilder: SchemaBuilder<{}>;
        let schemaBuilderName = `_${propertyKey}OptionsSchemaBuilder`;
        if (!target.hasOwnProperty(schemaBuilderName)) {
            target[schemaBuilderName] = SchemaBuilder.emptySchema()
        }
        optionsSchemaBuilder = target[schemaBuilderName];
        if (required) {
            optionsSchemaBuilder.addProperty(option, new SchemaBuilder<any>(schema));
        } else {
            optionsSchemaBuilder.addOptionalProperty(option, new SchemaBuilder<any>(schema));
        }
    }
}