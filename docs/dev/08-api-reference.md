# API Reference

Complete reference for every class, method, and type in `@mujarrad/sdk`.

---

## `Mujarrad` (Main Client)

### Constructor

```typescript
new Mujarrad(config: MujarradConfig)
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | — | Public API key (`pk_live_...`) |
| `secretKey` | `string` | Yes | — | Secret API key (`sk_live_...`) |
| `space` | `string` | Yes | — | Space slug for node operations |
| `baseUrl` | `string` | No | `https://mujarrad.onrender.com/api` | API base URL |
| `timeout` | `number` | No | `30000` | Request timeout (ms) |
| `retryOptions` | `RetryOptions` | No | `{ maxAttempts: 3, baseDelay: 1000 }` | Retry configuration |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `nodes` | `NodesResource` | Node CRUD + traversal |
| `attributes` | `AttributesResource` | Attribute CRUD + promote/demote |
| `spaces` | `SpacesResource` | Space CRUD |
| `apiKeys` | `ApiKeysResource` | API key management |
| `batch` | `BatchResource` | Bulk operations |

### Methods

#### `withSchema(schema: SchemaConfig): this`

Attach a schema for validation. Returns `this` for chaining.

```typescript
const client = new Mujarrad({ ... }).withSchema(schema);
```

#### `createEntity<T>(entityName: string, data: T): Promise<MujarradNode<T>>`

Create a node with schema validation. If a schema is attached, validates `data` against the entity definition before making the API call.

- Throws `ValidationError` if validation fails
- Uses the entity's `nodeType` from the schema (defaults to `REGULAR`)
- Uses `data.title` as the node title if present, otherwise uses `entityName`

```typescript
const task = await client.createEntity('Task', {
  title: 'My task',
  status: 'todo',
});
```

#### `link(sourceId: string, targetId: string, verb: string, metadata?: Record<string, string>): Promise<MujarradAttribute>`

Create an attribute between two nodes.

```typescript
const attr = await client.link(userId, taskId, 'assigned_to', {
  role: 'primary',
});
```

---

## `NodesResource`

All methods are scoped to the client's space.

### `create<T>(input: CreateNodeInput<T>): Promise<MujarradNode<T>>`

Create a new node.

```typescript
const node = await client.nodes.create({
  title: 'My Node',
  nodeType: 'REGULAR',
  content: 'Optional long text',
  nodeDetails: { key: 'value' },
});
```

### `get<T>(nodeId: string): Promise<MujarradNode<T>>`

Get a node by ID.

```typescript
const node = await client.nodes.get('uuid-...');
```

### `update<T>(nodeId: string, input: UpdateNodeInput<T>): Promise<MujarradNode<T>>`

Update a node. Only pass fields you want to change.

```typescript
const updated = await client.nodes.update('uuid-...', {
  title: 'New Title',
});
```

### `delete(nodeId: string): Promise<void>`

Delete a node.

```typescript
await client.nodes.delete('uuid-...');
```

### `list<T>(options?: ListNodesOptions): Promise<MujarradNode<T>[]>`

List nodes in the space.

| Option | Type | Description |
|--------|------|-------------|
| `page` | `number` | Page number (0-based) |
| `size` | `number` | Items per page |
| `nodeType` | `MujarradNodeType` | Filter by type |

```typescript
const nodes = await client.nodes.list({ page: 0, size: 20, nodeType: 'REGULAR' });
```

### `ancestors<T>(nodeId: string): Promise<MujarradNode<T>[]>`

Get all ancestor nodes (nodes that point to this node).

```typescript
const parents = await client.nodes.ancestors('uuid-...');
```

### `descendants<T>(nodeId: string): Promise<MujarradNode<T>[]>`

Get all descendant nodes (nodes this node points to, recursively).

```typescript
const children = await client.nodes.descendants('uuid-...');
```

---

## `AttributesResource`

### `create(nodeId: string, input: CreateAttributeInput): Promise<MujarradAttribute>`

Create an attribute from `nodeId` (source) to `input.targetNodeId` (target).

```typescript
const attr = await client.attributes.create(sourceId, {
  targetNodeId: targetId,
  attributeName: 'contains',
  attributeType: 'project_task',
  attributeTypeMode: 'TYPED',
  attributeValue: '{"priority": "high"}',
});
```

### `list(nodeId: string): Promise<MujarradAttribute[]>`

List all attributes from a node.

```typescript
const attrs = await client.attributes.list(nodeId);
```

### `update(attributeId: string, input: UpdateAttributeInput): Promise<MujarradAttribute>`

Update an attribute.

```typescript
const updated = await client.attributes.update(attrId, {
  attributeName: 'managed_by',
});
```

### `delete(attributeId: string): Promise<void>`

Delete an attribute.

```typescript
await client.attributes.delete(attrId);
```

### `promote(attributeId: string): Promise<MujarradAttribute>`

Promote an attribute within the space.

```typescript
const promoted = await client.attributes.promote(attrId);
```

### `demote(attributeId: string): Promise<void>`

Demote an attribute back to normal.

```typescript
await client.attributes.demote(attrId);
```

---

## `SpacesResource`

### `create(input: CreateSpaceInput): Promise<MujarradSpace>`

```typescript
const space = await client.spaces.create({ name: 'My Space', slug: 'my-space' });
```

### `get(spaceId: string): Promise<MujarradSpace>`

```typescript
const space = await client.spaces.get('uuid-...');
```

### `getBySlug(slug: string): Promise<MujarradSpace>`

```typescript
const space = await client.spaces.getBySlug('my-space');
```

### `list(): Promise<MujarradSpace[]>`

```typescript
const spaces = await client.spaces.list();
```

### `delete(spaceId: string): Promise<void>`

```typescript
await client.spaces.delete('uuid-...');
```

---

## `ApiKeysResource`

### `create(name?: string): Promise<MujarradApiKey>`

Create a new API key pair. The `secretKey` is only returned on creation.

```typescript
const key = await client.apiKeys.create('production');
// key.publicKey: 'pk_live_...'
// key.secretKey: 'sk_live_...'  (only available now!)
```

### `list(): Promise<MujarradApiKey[]>`

```typescript
const keys = await client.apiKeys.list();
```

### `delete(keyId: string): Promise<void>`

```typescript
await client.apiKeys.delete('key-uuid-...');
```

### `rotate(keyId: string): Promise<MujarradApiKey>`

Generate a new secret for an existing key.

```typescript
const rotated = await client.apiKeys.rotate('key-uuid-...');
```

---

## `BatchResource`

### `upload<T>(nodes: CreateNodeInput<T>[]): Promise<BatchUploadResult>`

Upload multiple nodes in one request.

```typescript
const result = await client.batch.upload([
  { title: 'Node 1', nodeDetails: { type: 'a' } },
  { title: 'Node 2', nodeDetails: { type: 'b' } },
]);
// result: { totalProcessed: 2, successful: 2, failed: 0 }
```

---

## Schema API

### `defineSchema(): SchemaBuilder`

Entry point for the fluent schema builder.

### `SchemaBuilder`

| Method | Returns | Description |
|--------|---------|-------------|
| `entity(name)` | `EntityBuilder` | Start defining an entity |
| `relationship(name, config)` | `SchemaBuilder` | Add a relationship definition |
| `build()` | `SchemaConfig` | Finalize and return the schema |

### `EntityBuilder`

| Method | Returns | Description |
|--------|---------|-------------|
| `type(nodeType)` | `EntityBuilder` | Set node type (default: `REGULAR`) |
| `string(name, options?)` | `EntityBuilder` | Add string field |
| `number(name, options?)` | `EntityBuilder` | Add number field |
| `boolean(name, options?)` | `EntityBuilder` | Add boolean field |
| `date(name, options?)` | `EntityBuilder` | Add date field |
| `json(name, options?)` | `EntityBuilder` | Add JSON object field |
| `enum(name, values, options?)` | `EntityBuilder` | Add enum field |
| `done()` | `SchemaBuilder` | Finish entity, return to schema |

### `SchemaValidator`

| Method | Returns | Description |
|--------|---------|-------------|
| `validateNode(entityName, content)` | `string[]` | Returns validation error messages (empty if valid) |
| `validateRelationship(source, target, verb)` | `boolean` | Check if relationship is defined |
| `getEntity(name)` | `EntityDefinition \| undefined` | Look up entity definition |

---

## Types

### `MujarradConfig`

```typescript
interface MujarradConfig {
  apiKey: string;
  secretKey: string;
  space: string;
  baseUrl?: string;           // default: 'https://mujarrad.onrender.com/api'
  timeout?: number;           // default: 30000
  retryOptions?: RetryOptions;
}
```

### `RetryOptions`

```typescript
interface RetryOptions {
  maxAttempts?: number;       // default: 3
  baseDelay?: number;         // default: 1000 (ms)
}
```

### `MujarradNode<T>`

```typescript
interface MujarradNode<T = Record<string, unknown>> {
  id: string;
  spaceId: string;
  nodeType: MujarradNodeType;
  title: string;
  slug: string;
  content?: string;
  nodeDetails: T;
  createdAt: string;
  updatedAt: string;
}
```

### `MujarradAttribute`

```typescript
interface MujarradAttribute {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  attributeName: string;
  attributeType: string;
  attributeTypeMode: AttributeTypeMode;
  attributeValue?: string;
  createdAt: string;
  updatedAt: string;
}
```

### `MujarradSpace`

```typescript
interface MujarradSpace {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### `MujarradApiKey`

```typescript
interface MujarradApiKey {
  id: string;
  name: string;
  publicKey: string;
  secretKey?: string;         // Only returned on create/rotate
  createdAt: string;
}
```

### `CreateNodeInput<T>`

```typescript
interface CreateNodeInput<T = Record<string, unknown>> {
  title: string;
  nodeType?: MujarradNodeType;
  content?: string;
  nodeDetails?: T;
}
```

### `UpdateNodeInput<T>`

```typescript
interface UpdateNodeInput<T = Record<string, unknown>> {
  title?: string;
  nodeType?: MujarradNodeType;
  content?: string;
  nodeDetails?: T;
}
```

### `ListNodesOptions`

```typescript
interface ListNodesOptions {
  page?: number;
  size?: number;
  nodeType?: MujarradNodeType;
}
```

### `CreateAttributeInput`

```typescript
interface CreateAttributeInput {
  targetNodeId: string;
  attributeName: string;
  attributeType?: string;
  attributeTypeMode?: AttributeTypeMode;
  attributeValue?: string;
}
```

### `UpdateAttributeInput`

```typescript
interface UpdateAttributeInput {
  attributeName?: string;
  attributeType?: string;
  attributeTypeMode?: AttributeTypeMode;
  attributeValue?: string;
}
```

### `CreateSpaceInput`

```typescript
interface CreateSpaceInput {
  name: string;
  slug?: string;
}
```

### `BatchUploadResult`

```typescript
interface BatchUploadResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors?: string[];
}
```

### Enum Types

```typescript
type MujarradNodeType = 'REGULAR' | 'CONTEXT' | 'ASSUMPTION' | 'TEMPLATE';
type AttributeTypeMode = 'TYPED' | 'SCHEMALESS';
type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';
```

### Schema Types

```typescript
interface SchemaConfig {
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
}

interface EntityDefinition {
  name: string;
  nodeType: MujarradNodeType;
  fields: FieldDefinition[];
}

interface FieldDefinition {
  name: string;
  type: FieldType;
  required?: boolean;
  enumValues?: string[];
  defaultValue?: unknown;
}

interface RelationshipDefinition {
  name: string;
  source: string;
  target: string;
  verb: string;
}
```

---

## Error Classes

| Class | Status Code | `canRetry` | Extra Properties |
|-------|------------|------------|-----------------|
| `MujarradError` | varies | varies | — |
| `AuthenticationError` | 401 | `false` | — |
| `ValidationError` | 400 | `false` | `errors: string[]` |
| `NotFoundError` | 404 | `false` | — |
| `RateLimitError` | 429 | `true` | `retryAfter?: number` |
| `ServerError` | 5xx | `true` | — |
| `NetworkError` | `undefined` | `true` | — |

All errors extend `MujarradError` which extends `Error`.
