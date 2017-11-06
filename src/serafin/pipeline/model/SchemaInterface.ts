export interface SchemaInterface {
    $schema: string,
    id: string,
    title?: string,
    description?: string,
    type: string,
    properties: {
        [property: string]: any
    },
    required?: string[]
    definitions?: any
}