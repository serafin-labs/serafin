import { SchemaInterface } from './SchemaInterface'

export interface ResourceIdentityInterface { id: string }
export type Resource<T> = T & Partial<ResourceIdentityInterface>;
export type ResourceIdentified<T> = T & ResourceIdentityInterface;
export type ResourcePartial<T> = Partial<T> & Partial<ResourceIdentityInterface>;
export abstract class Definition { schema: SchemaInterface }