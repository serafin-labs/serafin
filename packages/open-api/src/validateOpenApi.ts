import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js"
import addFormats from "ajv-formats"
import { httpMethods, type OpenAPIObject, type OperationObject, type ParameterObject, type PathItemObject, type ReferenceObject } from "./OpenApi.js"
import { oas32Schema } from "./schemas/oas32Schema.js"
import { encodePointer, normalizePathTemplate, resolveLocalPointer, templateVariables } from "./utils.js"

/**
 * A problem found in an OpenAPI document.
 */
export interface OpenApiValidationIssue {
    /** JSON pointer to the faulty value, `""` for the document itself. */
    path: string
    message: string
}

export interface OpenApiValidationResult {
    valid: boolean
    issues: OpenApiValidationIssue[]
}

/**
 * Thrown by `OpenApiBuilder.validate()` when the document is not a valid OpenAPI 3.2 document.
 */
export class OpenApiValidationError extends Error {
    readonly name = "OpenApiValidationError"
    constructor(public readonly issues: OpenApiValidationIssue[]) {
        super(`Invalid OpenAPI document:\n${issues.map((i) => `  ${i.path || "/"}: ${i.message}`).join("\n")}`)
    }
}

let structureValidation: ValidateFunction | undefined

/** Compiled on first use, so importing the library does not pay for it. */
function validateStructure(document: unknown): ErrorObject[] {
    if (!structureValidation) {
        const ajv = new Ajv2020({ allErrors: true, strict: false })
        addFormats(ajv)
        // a media type with wildcards, such as `text/*`, used for the keys of content maps
        ajv.addFormat("media-range", /^[^\s/]+\/[^\s/]+$/)
        structureValidation = ajv.compile(oas32Schema)
    }
    return structureValidation(document) ? [] : structureValidation.errors!
}

/**
 * Validate a document against the OpenAPI 3.2 JSON Schema, then check the rules the schema cannot express:
 * - local references (`#/...`) resolve inside the document,
 * - `operationId` values are unique,
 * - templated paths are not equivalent to one another,
 * - every path template variable has a matching path parameter, and every path parameter appears in the template,
 * - the `parent` of a tag exists and tags do not nest in a cycle.
 */
export function validateOpenApi(document: OpenAPIObject): OpenApiValidationResult {
    const structureErrors = validateStructure(document)
    const issues: OpenApiValidationIssue[] = structureErrors.map((e) => ({
        path: e.instancePath,
        message: "unevaluatedProperty" in e.params ? `${e.message}: '${e.params.unevaluatedProperty}'` : `${e.message}`,
    }))
    if (issues.length === 0) {
        // the semantic checks rely on the structure being right
        issues.push(...checkReferences(document), ...checkOperationIds(document), ...checkPaths(document), ...checkTags(document))
    }
    const unique = new Map(issues.map((i) => [`${i.path}\u0000${i.message}`, i]))
    return { valid: unique.size === 0, issues: [...unique.values()] }
}

function checkReferences(document: OpenAPIObject): OpenApiValidationIssue[] {
    const issues: OpenApiValidationIssue[] = []
    const visit = (value: unknown, pointer: string[]) => {
        if (Array.isArray(value)) {
            value.forEach((item, index) => visit(item, [...pointer, `${index}`]))
        } else if (value !== null && typeof value === "object") {
            const object = value as Record<string, unknown>
            // a schema with its own `$id` is a separate resource: its local references are relative to it
            if (pointer.length > 0 && typeof object.$id === "string") {
                return
            }
            if (typeof object.$ref === "string" && object.$ref.startsWith("#") && resolveLocalPointer(document, object.$ref) === undefined) {
                issues.push({ path: encodePointer([...pointer, "$ref"]), message: `reference '${object.$ref}' does not resolve` })
            }
            for (const key of Object.keys(object)) {
                visit(object[key], [...pointer, key])
            }
        }
    }
    visit(document, [])
    return issues
}

/**
 * Every operation of the document with its location, the webhooks included.
 */
export function listOperations(document: OpenAPIObject): { pointer: string[]; operation: OperationObject; pathItem: PathItemObject }[] {
    const operations: { pointer: string[]; operation: OperationObject; pathItem: PathItemObject }[] = []
    const fromPathItems = (root: "paths" | "webhooks", items: Record<string, PathItemObject> | undefined) => {
        for (const key of Object.keys(items ?? {})) {
            if (key.startsWith("x-")) {
                continue
            }
            const pathItem = items![key]
            for (const method of httpMethods) {
                if (pathItem[method]) {
                    operations.push({ pointer: [root, key, method], operation: pathItem[method], pathItem })
                }
            }
            for (const method of Object.keys(pathItem.additionalOperations ?? {})) {
                operations.push({ pointer: [root, key, "additionalOperations", method], operation: pathItem.additionalOperations![method], pathItem })
            }
        }
    }
    fromPathItems("paths", document.paths as Record<string, PathItemObject> | undefined)
    fromPathItems("webhooks", document.webhooks)
    return operations
}

function checkOperationIds(document: OpenAPIObject): OpenApiValidationIssue[] {
    const seen = new Map<string, string>()
    const issues: OpenApiValidationIssue[] = []
    for (const { pointer, operation } of listOperations(document)) {
        if (operation.operationId === undefined) {
            continue
        }
        const path = encodePointer([...pointer, "operationId"])
        const first = seen.get(operation.operationId)
        if (first !== undefined) {
            issues.push({ path, message: `operationId '${operation.operationId}' is already used at ${first}` })
        } else {
            seen.set(operation.operationId, path)
        }
    }
    return issues
}

function checkPaths(document: OpenAPIObject): OpenApiValidationIssue[] {
    const issues: OpenApiValidationIssue[] = []
    const normalized = new Map<string, string>()
    for (const path of Object.keys(document.paths ?? {})) {
        if (path.startsWith("x-")) {
            continue
        }
        const equivalent = normalized.get(normalizePathTemplate(path))
        if (equivalent !== undefined) {
            issues.push({ path: encodePointer(["paths", path]), message: `path is equivalent to '${equivalent}'` })
        } else {
            normalized.set(normalizePathTemplate(path), path)
        }
    }
    for (const { pointer, operation, pathItem } of listOperations(document)) {
        if (pointer[0] !== "paths") {
            continue
        }
        const variables = templateVariables(pointer[1])
        // operation parameters override the path item ones with the same name and location
        const parameters = new Map<string, ParameterObject>()
        for (const parameter of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
            const resolved = resolveParameter(document, parameter)
            if (resolved) {
                parameters.set(`${resolved.in}:${resolved.name}`, resolved)
            }
        }
        const pathParameters = [...parameters.values()].filter((p) => p.in === "path").map((p) => p.name)
        for (const variable of variables) {
            if (!pathParameters.includes(variable)) {
                issues.push({ path: encodePointer(pointer), message: `path variable '${variable}' has no matching path parameter` })
            }
        }
        for (const name of pathParameters) {
            if (!variables.includes(name)) {
                issues.push({ path: encodePointer(pointer), message: `path parameter '${name}' does not appear in the path` })
            }
        }
    }
    return issues
}

function resolveParameter(document: OpenAPIObject, parameter: ParameterObject | ReferenceObject): ParameterObject | undefined {
    if ("$ref" in parameter) {
        // a dangling reference is already reported by checkReferences
        const target = parameter.$ref.startsWith("#") ? resolveLocalPointer(document, parameter.$ref) : undefined
        return target as ParameterObject | undefined
    }
    return parameter
}

function checkTags(document: OpenAPIObject): OpenApiValidationIssue[] {
    const issues: OpenApiValidationIssue[] = []
    const tags = document.tags ?? []
    const parents = new Map(tags.map((t) => [t.name, t.parent]))
    const seen = new Set<string>()
    tags.forEach((tag, index) => {
        const path = encodePointer(["tags", `${index}`])
        if (seen.has(tag.name)) {
            issues.push({ path, message: `tag '${tag.name}' is declared more than once` })
        }
        seen.add(tag.name)
        if (tag.parent !== undefined && !parents.has(tag.parent)) {
            issues.push({ path, message: `parent tag '${tag.parent}' is not declared` })
        }
        const chain = new Set<string>([tag.name])
        for (let parent = tag.parent; parent !== undefined; parent = parents.get(parent)) {
            if (chain.has(parent)) {
                issues.push({ path, message: `tag '${tag.name}' is nested in a cycle` })
                break
            }
            chain.add(parent)
        }
    })
    return issues
}
