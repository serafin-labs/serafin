import { SchemaBuilder } from '@serafin/schema-builder';

/**
 * Class and method decorator associating a description to it
 * 
 * @param text 
 */
export function description(text: string) {
    return function (targetOrCtor: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
        if (typeof (descriptor) === 'undefined') {
            // Class
            targetOrCtor['description'] = text;
        } else {
            // Method
            let optionsSchemaBuilder: SchemaBuilder<{}>;
            let schemaBuilderName = `${propertyKey}OptionsSchemaBuilder`;
            if (!targetOrCtor.hasOwnProperty(schemaBuilderName)) {
                targetOrCtor[schemaBuilderName] = SchemaBuilder.emptySchema()
            }
            optionsSchemaBuilder = targetOrCtor[schemaBuilderName];
            optionsSchemaBuilder.schema.description = text;
        }
    };
}