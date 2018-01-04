import { PipelineAbstract, description } from '../../serafin/pipeline';

@description("Pipeline used to generate pet names if you don't have an idea.")
export class DefaultPetName extends PipelineAbstract {
    constructor(private baseName: string, private currentCount: number = 0) {
        super();
    }

    private generatePetName() {
        return `${this.baseName} ${++this.currentCount}`
    }

    @description("Generate pet names for new Pets if they were not provided.")
    protected async _create(resources: { name: string }[], options?: {}) {
        resources.forEach(resource => {
            if (!resource.name) {
                resource.name = this.generatePetName()
            }
        });
        return this.parent.create(resources, options);
    }

    @description("Generate a new Pet name for the updated Pet if it was not provided.")
    protected async _update(id: string, values: { name: string }, options?: {}) {
        if (!values.name) {
            values.name = this.generatePetName()
        }
        return this.parent.update(id, values, options);
    }
}