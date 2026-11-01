import {
    httpMethods,
    type ComponentType,
    type ComponentTypes,
    type ExternalDocumentationObject,
    type HttpMethod,
    type InfoObject,
    type OpenAPIObject,
    type OperationObject,
    type PathItemObject,
    type ReferenceObject,
    type SecurityRequirementObject,
    type ServerObject,
    type TagObject,
} from "./OpenApi.js"
import { clone, deepFreeze, encodePointer, normalizePathTemplate, type DeepReadonly } from "./utils.js"
import { listOperations, OpenApiValidationError, validateOpenApi } from "./validateOpenApi.js"

/**
 * A new value, or a function computing it from a mutable copy of the current one.
 */
export type Update<T> = T | ((current: T) => T)

/**
 * The OpenAPI version of the documents created by `OpenApiBuilder.create`.
 */
export const defaultOpenApiVersion = "3.2.0"

/**
 * Thrown when a builder method would produce an inconsistent document: adding something that already
 * exists, replacing or removing something that does not, or referencing an unknown component.
 */
export class OpenApiBuilderError extends Error {
    readonly name = "OpenApiBuilderError"
}

/**
 * An operation of the document and its location.
 */
export interface OperationEntry {
    path: string
    method: string
    operation: DeepReadonly<OperationObject>
}

const componentNamePattern = /^[a-zA-Z0-9._-]+$/
const methodTokenPattern = /^[0-9A-Za-z!#$%&'*+.^_`|~-]+$/

/**
 * Immutable builder of OpenAPI 3.2 documents.
 *
 * Every method returns a new builder and leaves the current one untouched. The document is frozen and
 * shared between builders wherever it did not change, so keeping intermediate builders is cheap.
 *
 * Methods follow the same conventions for every kind of element:
 * - `add*` fails if the element already exists,
 * - `set*` adds the element or overwrites it,
 * - `replace*` fails if the element does not exist, and accepts a function of the current value,
 * - `remove*` fails if the element does not exist,
 * - `get*` returns the element or `undefined`, `has*` tells if it exists.
 *
 * ```ts
 * const document = OpenApiBuilder.create({ title: "Library", version: "1.0.0" })
 *     .addComponent("schemas", "Book", bookSchema)
 *     .addOperation("/books", "get", {
 *         operationId: "findBooks",
 *         responses: { 200: { description: "Books", content: { "application/json": { schema: builder.ref("schemas", "Book") } } } },
 *     })
 *     .validate().document
 * ```
 */
export class OpenApiBuilder {
    private constructor(private readonly doc: DeepReadonly<OpenAPIObject>) {}

    /**
     * Start a new document.
     *
     * @param info metadata of the API
     * @param fields any other root field of the document, `openapi` defaulting to `3.2.0`
     */
    static create(info: InfoObject, fields: Partial<Omit<OpenAPIObject, "info">> = {}): OpenApiBuilder {
        return OpenApiBuilder.from({ openapi: defaultOpenApiVersion, ...fields, info } as OpenAPIObject)
    }

    /**
     * Continue an existing OpenAPI 3.2 document. The document is copied, so the builder is not affected by later changes to it.
     */
    static from(document: OpenAPIObject | DeepReadonly<OpenAPIObject>): OpenApiBuilder {
        if (typeof document?.openapi !== "string" || !/^3\.2\.\d+(-.+)?$/.test(document.openapi)) {
            throw new OpenApiBuilderError(`Only OpenAPI 3.2 documents are supported, got '${document?.openapi}'`)
        }
        return new OpenApiBuilder(deepFreeze(clone(document as OpenAPIObject)))
    }

    /**
     * The document. It is frozen: use the builder methods, or `transform`, to change it.
     */
    get document(): DeepReadonly<OpenAPIObject> {
        return this.doc
    }

    toJSON(): DeepReadonly<OpenAPIObject> {
        return this.doc
    }

    /**
     * Throw an `OpenApiValidationError` listing every issue if the document is not a valid OpenAPI 3.2 document.
     *
     * @see validateOpenApi
     */
    validate(): this {
        const result = validateOpenApi(this.doc as OpenAPIObject)
        if (!result.valid) {
            throw new OpenApiValidationError(result.issues)
        }
        return this
    }

    /**
     * Change anything in the document. `transformation` receives a mutable copy, that it can modify or replace.
     * Prefer the dedicated methods, which check the consistency of each change.
     */
    transform(transformation: (document: OpenAPIObject) => OpenAPIObject | void): OpenApiBuilder {
        const copy = clone(this.doc) as OpenAPIObject
        return OpenApiBuilder.from(transformation(copy) ?? copy)
    }

    // ---- root fields ----

    setInfo(info: Update<InfoObject>): OpenApiBuilder {
        return this.with(["info"], apply(info, this.doc.info))
    }

    setExternalDocs(externalDocs: Update<ExternalDocumentationObject>): OpenApiBuilder {
        return this.with(["externalDocs"], apply(externalDocs, this.doc.externalDocs))
    }

    removeExternalDocs(): OpenApiBuilder {
        this.expect(this.doc.externalDocs !== undefined, "externalDocs is not set")
        return this.with(["externalDocs"], undefined)
    }

    /**
     * Set a specification extension of the document, such as `x-logo`.
     */
    setExtension(name: `x-${string}`, value: unknown): OpenApiBuilder {
        this.expect(name.startsWith("x-"), `'${name}' is not an extension name, it must start with 'x-'`)
        return this.with([name], value)
    }

    removeExtension(name: `x-${string}`): OpenApiBuilder {
        this.expect(name in this.doc, `extension '${name}' is not set`)
        return this.with([name], undefined)
    }

    // ---- servers, identified by their url ----

    getServer(url: string): DeepReadonly<ServerObject> | undefined {
        return this.doc.servers?.find((s) => s.url === url)
    }

    hasServer(url: string): boolean {
        return this.getServer(url) !== undefined
    }

    addServer(server: ServerObject): OpenApiBuilder {
        this.expect(!this.hasServer(server.url), `server '${server.url}' already exists`)
        return this.with(["servers"], [...(this.doc.servers ?? []), server])
    }

    setServer(server: ServerObject): OpenApiBuilder {
        return this.hasServer(server.url) ? this.replaceServer(server.url, server) : this.addServer(server)
    }

    replaceServer(url: string, server: Update<ServerObject>): OpenApiBuilder {
        const current = this.getServer(url)
        this.expect(current !== undefined, `server '${url}' does not exist`)
        const next = apply(server, current)
        this.expect(next.url === url || !this.hasServer(next.url), `server '${next.url}' already exists`)
        return this.with(
            ["servers"],
            this.doc.servers!.map((s) => (s.url === url ? next : s)),
        )
    }

    removeServer(url: string): OpenApiBuilder {
        this.expect(this.hasServer(url), `server '${url}' does not exist`)
        const servers = this.doc.servers!.filter((s) => s.url !== url)
        return this.with(["servers"], servers.length > 0 ? servers : undefined)
    }

    // ---- tags, identified by their name ----

    getTag(name: string): DeepReadonly<TagObject> | undefined {
        return this.doc.tags?.find((t) => t.name === name)
    }

    hasTag(name: string): boolean {
        return this.getTag(name) !== undefined
    }

    addTag(tag: TagObject): OpenApiBuilder {
        this.expect(!this.hasTag(tag.name), `tag '${tag.name}' already exists`)
        this.expectParentTag(tag)
        return this.with(["tags"], [...(this.doc.tags ?? []), tag])
    }

    setTag(tag: TagObject): OpenApiBuilder {
        return this.hasTag(tag.name) ? this.replaceTag(tag.name, tag) : this.addTag(tag)
    }

    /**
     * Replace a tag. Renaming it renames it in every operation and nested tag that uses it.
     */
    replaceTag(name: string, tag: Update<TagObject>): OpenApiBuilder {
        const current = this.getTag(name)
        this.expect(current !== undefined, `tag '${name}' does not exist`)
        const next = apply(tag, current)
        if (next.name === name) {
            this.expectParentTag(next)
            return this.with(
                ["tags"],
                this.doc.tags!.map((t) => (t.name === name ? next : t)),
            )
        }
        this.expect(!this.hasTag(next.name), `tag '${next.name}' already exists`)
        const renamed = this.with(
            ["tags"],
            this.doc.tags!.map((t) => (t.name === name ? next : t.parent === name ? { ...t, parent: next.name } : t)),
        )
        renamed.expectParentTag(next)
        return renamed.mapAllOperations((operation) =>
            operation.tags?.includes(name) ? { ...operation, tags: operation.tags.map((t) => (t === name ? next.name : t)) } : operation,
        )
    }

    /**
     * Remove a tag, and remove it from the operations that use it. Fails if other tags are nested under it.
     */
    removeTag(name: string): OpenApiBuilder {
        this.expect(this.hasTag(name), `tag '${name}' does not exist`)
        const children = this.doc.tags!.filter((t) => t.parent === name).map((t) => t.name)
        this.expect(children.length === 0, `tag '${name}' cannot be removed, tags ${children.map((c) => `'${c}'`).join(", ")} are nested under it`)
        const tags = this.doc.tags!.filter((t) => t.name !== name)
        return this.with(["tags"], tags.length > 0 ? tags : undefined).mapAllOperations((operation) => {
            if (!operation.tags?.includes(name)) {
                return operation
            }
            const { tags, ...rest } = operation
            const remaining = tags.filter((t) => t !== name)
            return remaining.length > 0 ? { ...rest, tags: remaining } : rest
        })
    }

    // ---- security requirements of the whole API ----

    /**
     * Add a requirement to the alternatives of the whole API. The schemes must be declared in `components.securitySchemes`.
     */
    addSecurityRequirement(requirement: SecurityRequirementObject): OpenApiBuilder {
        return this.setSecurity([...((this.doc.security as SecurityRequirementObject[]) ?? []), requirement])
    }

    /**
     * Set the security requirements of the whole API, or remove them with `undefined`. The schemes must be declared in `components.securitySchemes`.
     */
    setSecurity(security: SecurityRequirementObject[] | undefined): OpenApiBuilder {
        security?.forEach((requirement) => this.expectSecuritySchemes(requirement))
        return this.with(["security"], security)
    }

    // ---- paths ----

    getPath(path: string): DeepReadonly<PathItemObject> | undefined {
        return (this.doc.paths as Record<string, DeepReadonly<PathItemObject>> | undefined)?.[path]
    }

    hasPath(path: string): boolean {
        return this.getPath(path) !== undefined
    }

    /**
     * Add a path. Fails if the path, or an equivalent templated path such as `/items/{key}` for `/items/{id}`, exists.
     */
    addPath(path: string, pathItem: PathItemObject = {}): OpenApiBuilder {
        this.expectNewPath(path)
        this.expectUniqueOperationIds(pathItem)
        return this.with(["paths", path], pathItem)
    }

    setPath(path: string, pathItem: PathItemObject): OpenApiBuilder {
        return this.hasPath(path) ? this.replacePath(path, pathItem) : this.addPath(path, pathItem)
    }

    replacePath(path: string, pathItem: Update<PathItemObject>): OpenApiBuilder {
        const current = this.getPath(path)
        this.expect(current !== undefined, `path '${path}' does not exist`)
        const next = apply(pathItem, current)
        this.expectUniqueOperationIds(next, path)
        return this.with(["paths", path], next)
    }

    removePath(path: string): OpenApiBuilder {
        this.expect(this.hasPath(path), `path '${path}' does not exist`)
        return this.with(["paths", path], undefined)
    }

    // ---- operations ----

    getOperation(path: string, method: HttpMethod | (string & {})): DeepReadonly<OperationObject> | undefined {
        const pathItem = this.getPath(path) as Record<string, any> | undefined
        return operationKey(method).reduce((value, key) => value?.[key], pathItem)
    }

    hasOperation(path: string, method: HttpMethod | (string & {})): boolean {
        return this.getOperation(path, method) !== undefined
    }

    /**
     * Add an operation, creating its path if needed.
     *
     * @param method one of the HTTP methods with a fixed field (`get`, `post`, ..., `query`), case insensitive,
     * or any other method name, which is stored in `additionalOperations` as given.
     */
    addOperation(path: string, method: HttpMethod | (string & {}), operation: OperationObject): OpenApiBuilder {
        this.expect(!this.hasOperation(path, method), `operation ${method.toUpperCase()} ${path} already exists`)
        return this.setOperation(path, method, operation)
    }

    setOperation(path: string, method: HttpMethod | (string & {}), operation: OperationObject): OpenApiBuilder {
        const key = operationKey(method)
        const builder = this.hasPath(path) ? this : this.addPath(path)
        builder.expectUniqueOperationId(operation.operationId, [path, ...key])
        return builder.with(["paths", path, ...key], operation)
    }

    replaceOperation(path: string, method: HttpMethod | (string & {}), operation: Update<OperationObject>): OpenApiBuilder {
        const current = this.getOperation(path, method)
        this.expect(current !== undefined, `operation ${method.toUpperCase()} ${path} does not exist`)
        return this.setOperation(path, method, apply(operation, current))
    }

    /**
     * Remove an operation, and its path if nothing else is left on it.
     */
    removeOperation(path: string, method: HttpMethod | (string & {})): OpenApiBuilder {
        this.expect(this.hasOperation(path, method), `operation ${method.toUpperCase()} ${path} does not exist`)
        const builder = this.with(["paths", path, ...operationKey(method)], undefined)
        return builder.hasPath(path) ? builder : builder.with(["paths", path], undefined)
    }

    /**
     * The operations of `paths`, in document order.
     */
    get operations(): OperationEntry[] {
        return listOperations(this.doc as OpenAPIObject)
            .filter(({ pointer }) => pointer[0] === "paths")
            .map(({ pointer, operation }) => ({ path: pointer[1], method: pointer[pointer.length - 1], operation }))
    }

    /**
     * Apply a function to every operation of `paths`, e.g. to add a security requirement or a common response to all of them.
     */
    mapOperations(transformation: (operation: OperationObject, location: { path: string; method: string }) => OperationObject): OpenApiBuilder {
        return this.operations.reduce<OpenApiBuilder>(
            (builder, { path, method }) => builder.replaceOperation(path, method, (operation) => transformation(operation, { path, method })),
            this,
        )
    }

    // ---- webhooks ----

    getWebhook(name: string): DeepReadonly<PathItemObject> | undefined {
        return this.doc.webhooks?.[name]
    }

    hasWebhook(name: string): boolean {
        return this.getWebhook(name) !== undefined
    }

    addWebhook(name: string, pathItem: PathItemObject): OpenApiBuilder {
        this.expect(!this.hasWebhook(name), `webhook '${name}' already exists`)
        this.expectUniqueOperationIds(pathItem)
        return this.with(["webhooks", name], pathItem)
    }

    setWebhook(name: string, pathItem: PathItemObject): OpenApiBuilder {
        return this.hasWebhook(name) ? this.replaceWebhook(name, pathItem) : this.addWebhook(name, pathItem)
    }

    replaceWebhook(name: string, pathItem: Update<PathItemObject>): OpenApiBuilder {
        const current = this.getWebhook(name)
        this.expect(current !== undefined, `webhook '${name}' does not exist`)
        const next = apply(pathItem, current)
        this.expectUniqueOperationIds(next, undefined, name)
        return this.with(["webhooks", name], next)
    }

    removeWebhook(name: string): OpenApiBuilder {
        this.expect(this.hasWebhook(name), `webhook '${name}' does not exist`)
        return this.with(["webhooks", name], undefined)
    }

    // ---- components ----

    getComponent<T extends ComponentType>(type: T, name: string): DeepReadonly<ComponentTypes[T]> | undefined {
        return (this.doc.components?.[type] as Record<string, any> | undefined)?.[name]
    }

    hasComponent(type: ComponentType, name: string): boolean {
        return this.getComponent(type, name) !== undefined
    }

    /**
     * Add a reusable component, such as a schema or a response. Its name must match `^[a-zA-Z0-9._-]+$`.
     */
    addComponent<T extends ComponentType>(type: T, name: string, component: ComponentTypes[T]): OpenApiBuilder {
        this.expect(componentNamePattern.test(name), `'${name}' is not a valid component name, it must match ${componentNamePattern}`)
        this.expect(!this.hasComponent(type, name), `component '${name}' already exists in ${type}`)
        return this.with(["components", type, name], component)
    }

    setComponent<T extends ComponentType>(type: T, name: string, component: ComponentTypes[T]): OpenApiBuilder {
        return this.hasComponent(type, name) ? this.replaceComponent(type, name, component) : this.addComponent(type, name, component)
    }

    replaceComponent<T extends ComponentType>(type: T, name: string, component: Update<ComponentTypes[T]>): OpenApiBuilder {
        const current = this.getComponent(type, name)
        this.expect(current !== undefined, `component '${name}' does not exist in ${type}`)
        return this.with(["components", type, name], apply(component, current as ComponentTypes[T]))
    }

    /**
     * Remove a component. Fails if the document still references it.
     */
    removeComponent(type: ComponentType, name: string): OpenApiBuilder {
        this.expect(this.hasComponent(type, name), `component '${name}' does not exist in ${type}`)
        const without = this.with(["components", type, name], undefined)
        const target = `#${encodePointer(["components", type, name])}`
        const referrer = findReference(without.doc, (ref) => ref === target || ref.startsWith(`${target}/`))
        this.expect(referrer === undefined, `component '${name}' of ${type} cannot be removed, it is referenced at ${referrer}`)
        return without
    }

    /**
     * A Reference Object pointing to a component. Fails if the component does not exist, so a reference
     * obtained from the builder never dangles.
     */
    ref(type: ComponentType, name: string, overrides: { summary?: string; description?: string } = {}): ReferenceObject {
        this.expect(this.hasComponent(type, name), `component '${name}' does not exist in ${type}`)
        return { $ref: `#${encodePointer(["components", type, name])}`, ...overrides }
    }

    // ---- internals ----

    /**
     * A builder whose document has `value` at `path`, or no value there when `value` is `undefined`.
     * Objects left empty by a removal are removed too, the document itself excepted.
     */
    private with(path: string[], value: unknown): OpenApiBuilder {
        return new OpenApiBuilder(setIn(this.doc, path, value === undefined ? undefined : deepFreeze(clone(value))) as DeepReadonly<OpenAPIObject>)
    }

    private mapAllOperations(transformation: (operation: OperationObject) => OperationObject): OpenApiBuilder {
        let document: unknown = this.doc
        for (const { pointer, operation } of listOperations(this.doc as OpenAPIObject)) {
            const next = transformation(operation)
            if (next !== operation) {
                document = setIn(document, pointer, deepFreeze(clone(next)))
            }
        }
        return new OpenApiBuilder(document as DeepReadonly<OpenAPIObject>)
    }

    private expect(condition: boolean, message: string): asserts condition {
        if (!condition) {
            throw new OpenApiBuilderError(message)
        }
    }

    private expectNewPath(path: string) {
        this.expect(path.startsWith("/"), `path '${path}' must start with '/'`)
        const equivalent = Object.keys(this.doc.paths ?? {}).find((p) => normalizePathTemplate(p) === normalizePathTemplate(path))
        this.expect(
            equivalent === undefined,
            equivalent === path ? `path '${path}' already exists` : `path '${path}' is equivalent to the existing path '${equivalent}'`,
        )
    }

    private expectParentTag(tag: TagObject) {
        if (tag.parent === undefined) {
            return
        }
        this.expect(tag.parent !== tag.name, `tag '${tag.name}' cannot be its own parent`)
        this.expect(this.hasTag(tag.parent), `parent tag '${tag.parent}' of '${tag.name}' does not exist`)
        const chain = new Set([tag.name])
        for (let parent: string | undefined = tag.parent; parent !== undefined; parent = this.getTag(parent)?.parent) {
            this.expect(!chain.has(parent), `tag '${tag.name}' would be nested in a cycle`)
            chain.add(parent)
        }
    }

    private expectSecuritySchemes(requirement: SecurityRequirementObject) {
        for (const scheme of Object.keys(requirement)) {
            this.expect(this.hasComponent("securitySchemes", scheme), `security scheme '${scheme}' is not declared in components.securitySchemes`)
        }
    }

    /**
     * Check that `operationId` is not used by another operation than the one at `location` (path and method key).
     */
    private expectUniqueOperationId(operationId: string | undefined, location: string[]) {
        if (operationId === undefined) {
            return
        }
        const owner = listOperations(this.doc as OpenAPIObject).find(
            ({ pointer, operation }) => operation.operationId === operationId && encodePointer(pointer) !== encodePointer(["paths", ...location]),
        )
        this.expect(owner === undefined, `operationId '${operationId}' is already used by ${owner && encodePointer(owner.pointer)}`)
    }

    /**
     * Check the operation ids of a path item that replaces the path item at `path` or the webhook `webhook`, if any.
     */
    private expectUniqueOperationIds(pathItem: PathItemObject, path?: string, webhook?: string) {
        const own = pathItemOperationIds(pathItem)
        const duplicates = own.filter((id, index) => own.indexOf(id) !== index)
        this.expect(duplicates.length === 0, `operationId '${duplicates[0]}' is used twice in the path item`)
        const others = listOperations(this.doc as OpenAPIObject).filter(
            ({ pointer }) => !(pointer[0] === "paths" && pointer[1] === path) && !(pointer[0] === "webhooks" && pointer[1] === webhook),
        )
        for (const { pointer, operation } of others) {
            this.expect(
                operation.operationId === undefined || !own.includes(operation.operationId),
                `operationId '${operation.operationId}' is already used by ${encodePointer(pointer)}`,
            )
        }
    }
}

/**
 * The keys of an operation in a Path Item Object, e.g. `["get"]` or `["additionalOperations", "COPY"]`.
 */
function operationKey(method: string): string[] {
    const lower = method.toLowerCase()
    if ((httpMethods as readonly string[]).includes(lower)) {
        return [lower]
    }
    if (!methodTokenPattern.test(method)) {
        throw new OpenApiBuilderError(`'${method}' is not a valid HTTP method name`)
    }
    return ["additionalOperations", method]
}

function pathItemOperationIds(pathItem: PathItemObject): string[] {
    return [...httpMethods.map((m) => pathItem[m]), ...Object.values(pathItem.additionalOperations ?? {})]
        .map((operation) => operation?.operationId)
        .filter((id): id is string => id !== undefined)
}

function apply<T>(update: Update<T>, current: unknown): T {
    return typeof update === "function" ? (update as (current: T) => T)(clone(current) as T) : update
}

/**
 * A copy of `root` with `value` at `path`, sharing everything off the path. Removing a value (`undefined`)
 * also removes the objects it leaves empty, except `root` and its direct children (`paths`, `components`...).
 */
function setIn(root: unknown, path: string[], value: unknown, depth = 0): unknown {
    const [key, ...rest] = path
    const object = (root ?? {}) as Record<string, unknown>
    const child = rest.length === 0 ? value : setIn(object[key], rest, value, depth + 1)
    const copy = { ...object }
    if (child === undefined || (depth > 0 && rest.length > 0 && value === undefined && Object.keys(child as object).length === 0)) {
        delete copy[key]
    } else {
        copy[key] = child
    }
    return Object.freeze(copy)
}

/**
 * The JSON pointer of the first `$ref` of the document matching `predicate`.
 */
function findReference(document: unknown, predicate: (ref: string) => boolean): string | undefined {
    const visit = (value: unknown, pointer: string[]): string | undefined => {
        if (value === null || typeof value !== "object") {
            return undefined
        }
        const object = value as Record<string, unknown>
        if (typeof object.$ref === "string" && predicate(object.$ref)) {
            return encodePointer([...pointer, "$ref"])
        }
        for (const key of Object.keys(object)) {
            const found = visit(object[key], [...pointer, key])
            if (found !== undefined) {
                return found
            }
        }
        return undefined
    }
    return visit(document, [])
}
