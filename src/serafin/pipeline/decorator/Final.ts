/**
 * Method decorator preventing extension
 */
export function final(target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
    descriptor.writable = false;
    descriptor.configurable = false;
}