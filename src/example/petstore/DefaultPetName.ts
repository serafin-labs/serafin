import { PipeAbstract } from '../../serafin/pipeline';
import { PipeInterface } from '../../serafin/pipeline/PipeInterface';
import { SchemaBuilder } from '@serafin/schema-builder';

export class DefaultPetName extends PipeAbstract implements PipeInterface {
    constructor(private baseName: string, private currentCount: number = 0) {
        super();
    }

    schemaBuilderModel = <T>(s: SchemaBuilder<T>) => s

    private generatePetName() {
        return `${this.baseName} ${++this.currentCount}`
    }

    async create(next, resources: { name: string }[], options?: {}) {
        resources.forEach(resource => {
            if (!resource.name) {
                resource.name = this.generatePetName()
            }
        });
        return next(resources, options);
    }

    async update(next, id: string, values: { name: string }, options?: {}) {
        if (!values.name) {
            values.name = this.generatePetName()
        }
        return next(id, values, options);
    }
}