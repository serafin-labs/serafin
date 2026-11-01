import type { SchemaObject } from "./SchemaObject.js"

/**
 * Type definitions for OpenAPI 3.2.
 *
 * @see https://spec.openapis.org/oas/v3.2.html
 */

/**
 * Specification extensions. Only `x-` prefixed fields are accepted, so a typo in a regular field is
 * still reported by the compiler.
 */
export type Extensions = { [extension: `x-${string}`]: unknown }

/**
 * The root object of an OpenAPI document.
 */
export interface OpenAPIObject extends Extensions {
    /** REQUIRED. The version of the OpenAPI Specification used by the document, e.g. `3.2.0`. */
    openapi: string
    /** The self-assigned URI of this document, used as its base URI. It MUST NOT contain a fragment. */
    $self?: string
    /** REQUIRED. Metadata about the API. */
    info: InfoObject
    /** The default `$schema` of the Schema Objects of this document. */
    jsonSchemaDialect?: string
    /** Connectivity information to the target servers. Defaults to a single server with a `url` of `/`. */
    servers?: ServerObject[]
    /** The available paths and operations of the API. */
    paths?: PathsObject
    /** Incoming webhooks that MAY be received as part of this API. */
    webhooks?: { [name: string]: PathItemObject }
    /** Reusable objects of the document. */
    components?: ComponentsObject
    /** Security mechanisms applying to the whole API, as alternatives. */
    security?: SecurityRequirementObject[]
    /** Tags used by the document, with additional metadata. */
    tags?: TagObject[]
    /** Additional external documentation. */
    externalDocs?: ExternalDocumentationObject
}

/**
 * Metadata about the API.
 */
export interface InfoObject extends Extensions {
    /** REQUIRED. The title of the API. */
    title: string
    /** A short summary of the API. */
    summary?: string
    /** A description of the API. CommonMark syntax MAY be used. */
    description?: string
    /** A URI for the Terms of Service of the API. */
    termsOfService?: string
    /** Contact information for the exposed API. */
    contact?: ContactObject
    /** License information for the exposed API. */
    license?: LicenseObject
    /** REQUIRED. The version of the API document, distinct from the OpenAPI Specification version. */
    version: string
}

export interface ContactObject extends Extensions {
    name?: string
    url?: string
    email?: string
}

/**
 * License information. `identifier` and `url` are mutually exclusive.
 */
export interface LicenseObject extends Extensions {
    /** REQUIRED. The license name used for the API. */
    name: string
    /** An SPDX license expression. */
    identifier?: string
    /** A URI for the license used for the API. */
    url?: string
}

export interface ServerObject extends Extensions {
    /** REQUIRED. A URL to the target host. It MAY be relative and MAY contain `{variable}` templates. */
    url: string
    /** A description of the host designated by the URL. */
    description?: string
    /** A unique name to refer to the host designated by the URL. */
    name?: string
    /** The variables used in the `url` template. */
    variables?: { [variable: string]: ServerVariableObject }
}

export interface ServerVariableObject extends Extensions {
    /** The allowed values. The array MUST NOT be empty. */
    enum?: string[]
    /** REQUIRED. The value used when no other value is supplied. */
    default: string
    description?: string
}

/**
 * The types of reusable objects held by the Components Object, mapped to the object they hold.
 */
export interface ComponentTypes {
    schemas: SchemaObject | boolean
    responses: ResponseObject | ReferenceObject
    parameters: ParameterObject | ReferenceObject
    examples: ExampleObject | ReferenceObject
    requestBodies: RequestBodyObject | ReferenceObject
    headers: HeaderObject | ReferenceObject
    securitySchemes: SecuritySchemeObject | ReferenceObject
    links: LinkObject | ReferenceObject
    callbacks: CallbackObject | ReferenceObject
    pathItems: PathItemObject
    mediaTypes: MediaTypeObject | ReferenceObject
}

export type ComponentType = keyof ComponentTypes

/**
 * Reusable objects. Component names MUST match `^[a-zA-Z0-9._-]+$`.
 */
export type ComponentsObject = { [T in ComponentType]?: { [name: string]: ComponentTypes[T] } } & Extensions

/**
 * The relative paths to the endpoints. Each path MUST begin with a `/`.
 */
export type PathsObject = { [path: `/${string}`]: PathItemObject } & Extensions

/**
 * The HTTP methods with a fixed field on the Path Item Object. Any other method is described in
 * `additionalOperations`.
 */
export const httpMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace", "query"] as const
export type HttpMethod = (typeof httpMethods)[number]

/**
 * The operations available on a single path.
 */
export interface PathItemObject extends Extensions {
    /** A reference to a Path Item Object defined elsewhere. */
    $ref?: string
    summary?: string
    description?: string
    get?: OperationObject
    put?: OperationObject
    post?: OperationObject
    delete?: OperationObject
    options?: OperationObject
    head?: OperationObject
    patch?: OperationObject
    trace?: OperationObject
    query?: OperationObject
    /** Operations for HTTP methods that have no fixed field, keyed by their exact method name. */
    additionalOperations?: { [method: string]: OperationObject }
    /** An alternative servers array to service all operations of this path. */
    servers?: ServerObject[]
    /** Parameters applicable to all the operations of this path. */
    parameters?: (ParameterObject | ReferenceObject)[]
}

/**
 * A single API operation on a path.
 */
export interface OperationObject extends Extensions {
    tags?: string[]
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    /** A unique string used to identify the operation, among all operations of the API. */
    operationId?: string
    parameters?: (ParameterObject | ReferenceObject)[]
    requestBody?: RequestBodyObject | ReferenceObject
    /** The possible responses as they are returned from executing this operation. */
    responses?: ResponsesObject
    callbacks?: { [name: string]: CallbackObject | ReferenceObject }
    deprecated?: boolean
    security?: SecurityRequirementObject[]
    servers?: ServerObject[]
}

export interface ExternalDocumentationObject extends Extensions {
    description?: string
    /** REQUIRED. The URI of the target documentation. */
    url: string
}

/**
 * Fields shared by Parameter Objects whatever their location.
 */
interface ParameterBase extends Extensions {
    /** REQUIRED. The name of the parameter. Parameter names are case sensitive. */
    name: string
    description?: string
    required?: boolean
    deprecated?: boolean
    /** Exclusive with `content`. */
    schema?: SchemaObject | boolean
    /** Exclusive with `schema`. The map MUST only contain one entry. */
    content?: ContentObject
    explode?: boolean
    example?: unknown
    examples?: { [name: string]: ExampleObject | ReferenceObject }
}

export interface PathParameterObject extends ParameterBase {
    in: "path"
    /** Path parameters are always required. */
    required: true
    style?: "matrix" | "label" | "simple"
    allowReserved?: boolean
}

export interface QueryParameterObject extends ParameterBase {
    in: "query"
    style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject"
    allowEmptyValue?: boolean
    allowReserved?: boolean
}

/**
 * The entire query string, described as a single media type.
 */
export interface QueryStringParameterObject extends ParameterBase {
    in: "querystring"
    content: ContentObject
}

export interface HeaderParameterObject extends ParameterBase {
    in: "header"
    style?: "simple"
}

export interface CookieParameterObject extends ParameterBase {
    in: "cookie"
    style?: "form" | "cookie"
    allowReserved?: boolean
}

/**
 * A single operation parameter, identified by the combination of its `name` and `in`.
 */
export type ParameterObject = PathParameterObject | QueryParameterObject | QueryStringParameterObject | HeaderParameterObject | CookieParameterObject

export type ParameterLocation = ParameterObject["in"]

/**
 * Media types mapped to their description, e.g. `application/json`.
 */
export type ContentObject = { [mediaType: string]: MediaTypeObject | ReferenceObject }

export interface RequestBodyObject extends Extensions {
    description?: string
    /** REQUIRED. The content of the request body. */
    content: ContentObject
    required?: boolean
}

export interface MediaTypeObject extends Extensions {
    description?: string
    /** The schema of the complete content. */
    schema?: SchemaObject | boolean
    /** The schema of each item of a sequential media type, such as `application/jsonl` or `text/event-stream`. */
    itemSchema?: SchemaObject | boolean
    example?: unknown
    examples?: { [name: string]: ExampleObject | ReferenceObject }
    /** Exclusive with `prefixEncoding` and `itemEncoding`. */
    encoding?: { [property: string]: EncodingObject }
    prefixEncoding?: EncodingObject[]
    itemEncoding?: EncodingObject
}

export interface EncodingObject extends Extensions {
    contentType?: string
    headers?: { [name: string]: HeaderObject | ReferenceObject }
    style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject"
    explode?: boolean
    allowReserved?: boolean
    encoding?: { [property: string]: EncodingObject }
    prefixEncoding?: EncodingObject[]
    itemEncoding?: EncodingObject
}

/**
 * The HTTP status codes a Responses Object accepts, as an exact code or a range such as `4XX`.
 */
export type ResponseStatusCode = `${1 | 2 | 3 | 4 | 5}${string}`

/**
 * The expected responses of an operation, by HTTP status code.
 */
export type ResponsesObject = {
    default?: ResponseObject | ReferenceObject
} & { [status: ResponseStatusCode]: ResponseObject | ReferenceObject } & Extensions

export interface ResponseObject extends Extensions {
    summary?: string
    description?: string
    headers?: { [name: string]: HeaderObject | ReferenceObject }
    content?: ContentObject
    links?: { [name: string]: LinkObject | ReferenceObject }
}

/**
 * Out-of-band callbacks, keyed by a runtime expression evaluated to the callback URL.
 */
export type CallbackObject = { [expression: string]: PathItemObject } & Extensions

/**
 * An example. `value`, `dataValue`, `serializedValue` and `externalValue` have exclusivity rules
 * described by the specification.
 */
export interface ExampleObject extends Extensions {
    summary?: string
    description?: string
    /** The example in its data form, as it would be validated by a schema. */
    dataValue?: unknown
    /** The example serialized as it appears on the wire. */
    serializedValue?: string
    value?: unknown
    externalValue?: string
}

/**
 * A design-time link from a response to another operation. Exactly one of `operationRef` and
 * `operationId` MUST be set.
 */
export interface LinkObject extends Extensions {
    operationRef?: string
    operationId?: string
    parameters?: { [name: string]: unknown }
    requestBody?: unknown
    description?: string
    server?: ServerObject
}

export interface HeaderObject extends Extensions {
    description?: string
    required?: boolean
    deprecated?: boolean
    style?: "simple"
    explode?: boolean
    /** Exclusive with `content`. */
    schema?: SchemaObject | boolean
    /** Exclusive with `schema`. The map MUST only contain one entry. */
    content?: ContentObject
    example?: unknown
    examples?: { [name: string]: ExampleObject | ReferenceObject }
}

export interface TagObject extends Extensions {
    /** REQUIRED. The name of the tag. */
    name: string
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    /** The name of the tag this tag is nested under. */
    parent?: string
    /** A machine-readable category of the tag, such as `nav`, `badge` or `audience`. */
    kind?: string
}

/**
 * A reference to another component. `summary` and `description` override those of the target.
 *
 * A type alias rather than an interface, so a reference to a schema is also a valid Schema Object.
 */
export type ReferenceObject = {
    /** REQUIRED. The URI of the reference. */
    $ref: string
    summary?: string
    description?: string
}

interface SecuritySchemeBase extends Extensions {
    description?: string
    deprecated?: boolean
}

export interface ApiKeySecuritySchemeObject extends SecuritySchemeBase {
    type: "apiKey"
    /** REQUIRED. The name of the header, query or cookie parameter. */
    name: string
    in: "query" | "header" | "cookie"
}

export interface HttpSecuritySchemeObject extends SecuritySchemeBase {
    type: "http"
    /** REQUIRED. The HTTP Authentication scheme, e.g. `basic` or `bearer`. */
    scheme: string
    /** A hint of how a bearer token is formatted. */
    bearerFormat?: string
}

export interface MutualTLSSecuritySchemeObject extends SecuritySchemeBase {
    type: "mutualTLS"
}

export interface OAuth2SecuritySchemeObject extends SecuritySchemeBase {
    type: "oauth2"
    flows: OAuthFlowsObject
    /** The URL of the OAuth2 authorization server metadata (RFC 8414). */
    oauth2MetadataUrl?: string
}

export interface OpenIdConnectSecuritySchemeObject extends SecuritySchemeBase {
    type: "openIdConnect"
    openIdConnectUrl: string
}

export type SecuritySchemeObject =
    | ApiKeySecuritySchemeObject
    | HttpSecuritySchemeObject
    | MutualTLSSecuritySchemeObject
    | OAuth2SecuritySchemeObject
    | OpenIdConnectSecuritySchemeObject

export interface OAuthFlowsObject extends Extensions {
    implicit?: OAuthImplicitFlowObject
    password?: OAuthPasswordFlowObject
    clientCredentials?: OAuthClientCredentialsFlowObject
    authorizationCode?: OAuthAuthorizationCodeFlowObject
    deviceAuthorization?: OAuthDeviceAuthorizationFlowObject
}

interface OAuthFlowBase extends Extensions {
    refreshUrl?: string
    /** REQUIRED. The available scopes, mapped to a short description. The map MAY be empty. */
    scopes: { [scope: string]: string }
}

export interface OAuthImplicitFlowObject extends OAuthFlowBase {
    authorizationUrl: string
}

export interface OAuthPasswordFlowObject extends OAuthFlowBase {
    tokenUrl: string
}

export interface OAuthClientCredentialsFlowObject extends OAuthFlowBase {
    tokenUrl: string
}

export interface OAuthAuthorizationCodeFlowObject extends OAuthFlowBase {
    authorizationUrl: string
    tokenUrl: string
}

export interface OAuthDeviceAuthorizationFlowObject extends OAuthFlowBase {
    deviceAuthorizationUrl: string
    tokenUrl: string
}

/**
 * Security schemes required to execute an operation, mapped to the scopes or roles they need.
 * All the schemes of a single requirement must be satisfied.
 */
export type SecurityRequirementObject = { [scheme: string]: string[] }
