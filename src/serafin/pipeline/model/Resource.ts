import { SchemaInterface } from './SchemaInterface'
/**
 * Base interface of a resource. It must at least have a string identifier to be used with pipelines
 */
export interface ResourceIdentityInterface { id: string }

/**
 * Wrapper used for read queries. The results array may not be the only thing returned.
 */
export interface ReadWrapperInterface<T = {}> {
    results: T[]
}