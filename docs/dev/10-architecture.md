# Architecture & Internals

This guide explains how the Mujarrad SDK is built, how its layers fit together, and how to contribute.

## Package Structure

```
packages/sdk/
├── package.json              # @mujarrad/sdk, dependency: axios
├── tsconfig.json             # ES2022, strict, declarations
├── jest.config.cjs           # ts-jest ESM preset
├── src/
│   ├── index.ts              # Public barrel export
│   ├── client.ts             # Mujarrad main class
│   ├── http.ts               # HttpClient (axios wrapper)
│   ├── types.ts              # All TypeScript interfaces
│   ├── errors.ts             # Error class hierarchy
│   ├── schema.ts             # SchemaBuilder + EntityBuilder
│   ├── validation.ts         # SchemaValidator
│   └── resources/
│       ├── nodes.ts          # NodesResource
│       ├── attributes.ts     # AttributesResource
│       ├── spaces.ts         # SpacesResource
│       ├── apiKeys.ts        # ApiKeysResource
│       └── batch.ts          # BatchResource
└── tests/
    ├── client.test.ts
    ├── errors.test.ts
    ├── http.test.ts
    ├── schema.test.ts
    ├── validation.test.ts
    └── resources/
        ├── nodes.test.ts
        ├── attributes.test.ts
        └── spaces.test.ts
```

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                 Application Code                 │
│          (your app using @mujarrad/sdk)          │
├─────────────────────────────────────────────────┤
│                  Mujarrad Client                 │  client.ts
│        createEntity(), link(), withSchema()      │
├──────────────┬──────────────────────────────────┤
│   Schema     │        Resource Classes           │
│   Builder    │  NodesResource                    │  resources/*.ts
│   Validator  │  AttributesResource               │
│              │  SpacesResource                    │  schema.ts
│              │  ApiKeysResource                   │  validation.ts
│              │  BatchResource                     │
├──────────────┴──────────────────────────────────┤
│                  HTTP Client                     │  http.ts
│          Auth headers, retry, error mapping      │
├─────────────────────────────────────────────────┤
│                    axios                         │
├─────────────────────────────────────────────────┤
│              Mujarrad Backend API                │
└─────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | File(s) | Responsibility |
|-------|---------|---------------|
| **Client** | `client.ts` | High-level API, schema integration, convenience methods |
| **Resources** | `resources/*.ts` | One class per API domain (nodes, attributes, etc.), maps methods to endpoints |
| **Schema** | `schema.ts`, `validation.ts` | Fluent builder, content validation against entity definitions |
| **HTTP** | `http.ts` | Auth injection, retry logic, error mapping, axios abstraction |
| **Types** | `types.ts` | All interfaces and type aliases |
| **Errors** | `errors.ts` | Typed error hierarchy mapped from HTTP statuses |

## Request Lifecycle

Here's what happens when you call `client.createEntity('Task', { title: 'Hello', status: 'todo' })`:

```
1. Client.createEntity()
   ├── Looks up "Task" in the attached schema
   ├── Calls SchemaValidator.validateNode('Task', data)
   │   ├── Checks required fields (title is required ✓)
   │   ├── Checks field types (status is enum ✓)
   │   └── Returns [] (no errors)
   ├── Constructs CreateNodeInput: { title: 'Hello', nodeType: 'REGULAR', nodeDetails: data }
   └── Calls NodesResource.create(input)
       └── Calls HttpClient.post('/spaces/my-space/nodes', input)
           └── requestWithRetry()
               ├── Attempt 1: axios.post(url, data, { headers: { X-API-Key, X-API-Secret } })
               │   ├── Success → return response.data
               │   └── Error → mapError(axiosError)
               │       ├── 400 → ValidationError
               │       ├── 401 → AuthenticationError
               │       ├── 404 → NotFoundError
               │       ├── 429 → RateLimitError (canRetry: true)
               │       ├── 5xx → ServerError (canRetry: true)
               │       └── No response → NetworkError (canRetry: true)
               ├── If canRetry && attempts remaining:
               │   ├── Calculate delay: baseDelay * 2^attempt
               │   ├── Check Retry-After header
               │   └── Sleep, then retry
               └── If !canRetry || max attempts reached → throw
```

## HTTP Client Internals

### Authentication

The SDK uses API key authentication (not JWT). Every request includes:

```
X-API-Key: pk_live_...
X-API-Secret: sk_live_...
Content-Type: application/json
```

### Retry Strategy

The retry implementation uses exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | `baseDelay * 2^0` = 1000ms |
| 2nd retry | `baseDelay * 2^1` = 2000ms |
| 3rd retry | `baseDelay * 2^2` = 4000ms |

If the server sends a `Retry-After` header, that value takes precedence over the calculated delay.

**What gets retried:**
- 429 (Rate Limit) — always retried
- 5xx (Server Error) — always retried
- Network errors (no response) — always retried
- 4xx (except 429) — **never** retried

### Error Mapping

The `mapError()` method converts axios errors to typed SDK errors:

```typescript
switch (status) {
  case 400: → ValidationError (with errors array from response)
  case 401: → AuthenticationError
  case 404: → NotFoundError
  case 429: → RateLimitError (with retryAfter from header)
  default:
    if (status >= 500) → ServerError
    else → MujarradError (generic)
}
// No response → NetworkError
```

## Schema Internals

### Builder Pattern

The schema uses a builder pattern with two classes:

- `SchemaBuilder` — top-level, holds entities and relationships
- `EntityBuilder` — per-entity, holds fields and node type

`EntityBuilder` has a reference back to its parent `SchemaBuilder`. When you call `.done()`, it pushes the entity definition to the parent and returns it for chaining.

```typescript
// Internal flow:
defineSchema()                    // → new SchemaBuilder()
  .entity('Task')                 // → new EntityBuilder('Task', parentBuilder)
    .string('title', {required})  // → pushes FieldDefinition, returns this
    .done()                       // → calls parent.addEntity(entity), returns parent
  .build()                        // → returns { entities: [...], relationships: [...] }
```

### Validation Rules

`SchemaValidator` checks each field against its definition:

| Field Type | Validation |
|-----------|------------|
| `string` | `typeof value === 'string'` |
| `number` | `typeof value === 'number'` |
| `boolean` | `typeof value === 'boolean'` |
| `date` | `typeof value === 'string' && !isNaN(Date.parse(value))` |
| `enum` | `enumValues.includes(value)` |
| `json` | `typeof value === 'object'` |

Required fields fail validation if `undefined`, `null`, or `''` (empty string).

## Monorepo Structure

The SDK lives inside the mujarrad-cli monorepo using npm workspaces:

```
mujarrad-cli/                # Root
├── package.json             # "workspaces": ["packages/*"]
├── src/                     # CLI source code
│   ├── commands/sdk.ts      # `mujarrad sdk` command
│   └── services/SdkService.ts
├── packages/
│   └── sdk/                 # @mujarrad/sdk package
│       ├── package.json
│       └── src/
└── tests/
    └── unit/commands/sdk.test.ts
```

**Why monorepo?** Shared CI, single dev environment, the CLI already has all the tooling (TypeScript, Jest, axios). The SDK can be published independently to npm.

## CLI Integration

The CLI `sdk` commands (`src/commands/sdk.ts`) follow the same pattern as other CLI commands (e.g., `template.ts`):

1. **Lazy service init** — `getSdkService()` checks auth via `CredentialManager`, creates `SdkService`
2. **Commander.js** — Subcommands (`init`, `keygen`) registered via `sdkCmd.command()`
3. **UX** — `ora` spinners, `chalk` colored output
4. **Error handling** — Catches errors, shows user-friendly messages, logs details

The `SdkService` (`src/services/SdkService.ts`) handles:
- `ensureSpace(slug)` — GET-or-create pattern (try GET by slug, create on 404)
- `generateApiKeys(name)` — POST to `/api-keys`
- `scaffoldProject(name, slug, keys)` — Writes files to disk (package.json, tsconfig, .env, source files)

## Testing

### SDK Tests

All SDK tests are in `packages/sdk/tests/` using Jest + nock for HTTP mocking:

```bash
cd packages/sdk
npx jest --config jest.config.cjs
```

| Test File | Coverage |
|-----------|----------|
| `errors.test.ts` | All 6 error classes, properties, inheritance |
| `http.test.ts` | Auth headers, CRUD methods, error mapping, retry logic |
| `client.test.ts` | Constructor validation, withSchema, createEntity, link |
| `schema.test.ts` | Builder API, all field types, relationships |
| `validation.test.ts` | Required fields, type checking, relationships |
| `resources/nodes.test.ts` | CRUD + list + ancestors + descendants |
| `resources/attributes.test.ts` | CRUD + promote + demote |
| `resources/spaces.test.ts` | CRUD + getBySlug |

### CLI Tests

```bash
npm test -- --testPathPattern=sdk
```

Tests command registration, subcommands, options, and help text.

## API Endpoints

The SDK maps to these backend endpoints:

| SDK Method | HTTP | Endpoint |
|-----------|------|----------|
| `nodes.create()` | POST | `/spaces/{slug}/nodes` |
| `nodes.get()` | GET | `/spaces/{slug}/nodes/{id}` |
| `nodes.update()` | PUT | `/spaces/{slug}/nodes/{id}` |
| `nodes.delete()` | DELETE | `/spaces/{slug}/nodes/{id}` |
| `nodes.list()` | GET | `/spaces/{slug}/nodes` |
| `nodes.ancestors()` | GET | `/spaces/{slug}/nodes/{id}/ancestors` |
| `nodes.descendants()` | GET | `/spaces/{slug}/nodes/{id}/descendants` |
| `attributes.create()` | POST | `/nodes/{nodeId}/attributes` |
| `attributes.list()` | GET | `/nodes/{nodeId}/attributes` |
| `attributes.update()` | PUT | `/attributes/{attributeId}` |
| `attributes.delete()` | DELETE | `/attributes/{attributeId}` |
| `attributes.promote()` | POST | `/spaces/{slug}/attributes/{id}/promote` |
| `attributes.demote()` | DELETE | `/spaces/{slug}/attributes/{id}/promote` |
| `spaces.create()` | POST | `/spaces` |
| `spaces.get()` | GET | `/spaces/{id}` |
| `spaces.getBySlug()` | GET | `/spaces/slug/{slug}` |
| `spaces.list()` | GET | `/spaces` |
| `spaces.delete()` | DELETE | `/spaces/{id}` |
| `apiKeys.create()` | POST | `/api-keys` |
| `apiKeys.list()` | GET | `/api-keys` |
| `apiKeys.delete()` | DELETE | `/api-keys/{id}` |
| `apiKeys.rotate()` | POST | `/api-keys/{id}/rotate` |
| `batch.upload()` | POST | `/spaces/{slug}/upload/batch` |

## Contributing

### Development Setup

```bash
git clone <repo-url>
cd mujarrad-cli
npm install --install-strategy=nested
```

### Running Tests

```bash
# SDK tests
cd packages/sdk && npx jest --config jest.config.cjs

# CLI tests
cd /path/to/mujarrad-cli && npm test
```

### Building

```bash
# SDK
cd packages/sdk && npx tsc -p tsconfig.json

# CLI
cd /path/to/mujarrad-cli && npm run build
```

### Adding a New Resource

1. Create `packages/sdk/src/resources/myResource.ts`
2. Follow the pattern in `nodes.ts` — constructor takes `HttpClient`, methods return unwrapped `ApiResponse.data`
3. Add the resource as a property on `Mujarrad` in `client.ts`
4. Export from `index.ts`
5. Add tests in `packages/sdk/tests/resources/myResource.test.ts`

### Adding a New Field Type

1. Add the type to `FieldType` in `types.ts`
2. Add a builder method in `EntityBuilder` (in `schema.ts`)
3. Add validation logic in `SchemaValidator.validateFieldType()` (in `validation.ts`)
4. Add tests in `schema.test.ts` and `validation.test.ts`
