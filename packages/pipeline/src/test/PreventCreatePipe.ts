import { SchemaBuilder } from "@serafin/schema-builder"
import { PipeAbstract } from "../PipeAbstract"

export class PreventCreatePipe<CV> extends PipeAbstract {
    schemaBuilderCreateValues = (s: SchemaBuilder<CV>) => null as SchemaBuilder<never>
}
