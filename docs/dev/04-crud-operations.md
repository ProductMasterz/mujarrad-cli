# CRUD Operations

This guide covers all create, read, update, and delete operations for nodes, attributes, spaces, API keys, and batch uploads.

## Nodes

All node operations are scoped to the space specified when creating the client.

### Create a Node

```typescript
const node = await client.nodes.create({
  title: 'Weekly Report',
  nodeType: 'REGULAR',         // optional, defaults to REGULAR
  content: 'Report body...',   // optional long-form content
  nodeDetails: {               // optional custom data
    week: 6,
    status: 'draft',
  },
});

console.log(node.id);         // "550e8400-e29b-41d4-a716-..."
console.log(node.slug);       // "weekly-report"
console.log(node.nodeDetails); // { week: 6, status: "draft" }
```

**Input type:**

```typescript
interface CreateNodeInput<T> {
  title: string;               // required
  nodeType?: MujarradNodeType; // REGULAR | CONTEXT | ASSUMPTION | TEMPLATE
  content?: string;
  nodeDetails?: T;
}
```

### Create with Schema Validation

If you've attached a schema with `.withSchema()`, use `createEntity()` for validated creation:

```typescript
const task = await client.createEntity('Task', {
  title: 'Fix login bug',
  status: 'todo',
  priority: 'high',
});
```

This validates the data against your entity definition before making the API call. If validation fails, it throws a `ValidationError` without ever hitting the network.

### Read a Node

```typescript
const node = await client.nodes.get('550e8400-e29b-41d4-a716-...');

console.log(node.title);
console.log(node.nodeDetails);
console.log(node.createdAt);
```

### Update a Node

Pass only the fields you want to change:

```typescript
const updated = await client.nodes.update('550e8400-...', {
  title: 'Updated Title',
  nodeDetails: { status: 'published' },
});
```

**Input type:**

```typescript
interface UpdateNodeInput<T> {
  title?: string;
  nodeType?: MujarradNodeType;
  content?: string;
  nodeDetails?: T;
}
```

### Delete a Node

```typescript
await client.nodes.delete('550e8400-...');
```

### List Nodes

```typescript
// List all nodes in the space
const nodes = await client.nodes.list();

// With pagination
const page = await client.nodes.list({ page: 0, size: 20 });

// Filter by node type
const contexts = await client.nodes.list({ nodeType: 'CONTEXT' });

// Combine options
const result = await client.nodes.list({
  page: 0,
  size: 10,
  nodeType: 'REGULAR',
});
```

**Options:**

```typescript
interface ListNodesOptions {
  page?: number;              // Page number (0-based)
  size?: number;              // Items per page
  nodeType?: MujarradNodeType; // Filter by type
}
```

## Attributes (Relationships)

### Create an Attribute

Use the `link()` convenience method for the common case:

```typescript
// Simple link
const attr = await client.link(sourceId, targetId, 'contains');

// Link with metadata
const attr2 = await client.link(sourceId, targetId, 'assigned_to', {
  date: '2026-02-12',
  role: 'primary',
});
```

Or use the `attributes` resource directly for full control:

```typescript
const attr = await client.attributes.create(sourceNodeId, {
  targetNodeId: targetId,
  attributeName: 'depends_on',
  attributeType: 'task_dependency',
  attributeTypeMode: 'TYPED',
  attributeValue: '{"priority": "blocking"}',
});
```

**Input type:**

```typescript
interface CreateAttributeInput {
  targetNodeId: string;           // required
  attributeName: string;          // required — the relationship verb
  attributeType?: string;         // classification
  attributeTypeMode?: string;     // TYPED | SCHEMALESS
  attributeValue?: string;        // optional metadata (JSON string)
}
```

### List Attributes

```typescript
// Get all attributes from a specific node
const attributes = await client.attributes.list(nodeId);

for (const attr of attributes) {
  console.log(`${attr.sourceNodeId} --${attr.attributeName}--> ${attr.targetNodeId}`);
}
```

### Update an Attribute

```typescript
const updated = await client.attributes.update(attributeId, {
  attributeName: 'managed_by',    // rename the relationship
  attributeValue: '{"level": "senior"}',
});
```

**Input type:**

```typescript
interface UpdateAttributeInput {
  attributeName?: string;
  attributeType?: string;
  attributeTypeMode?: string;
  attributeValue?: string;
}
```

### Delete an Attribute

```typescript
await client.attributes.delete(attributeId);
```

### Promote / Demote

Promoting an attribute elevates its significance within the space. Demoting reverses this.

```typescript
const promoted = await client.attributes.promote(attributeId);
await client.attributes.demote(attributeId);
```

## Spaces

Space operations are not scoped — they manage spaces across your account.

### Create a Space

```typescript
const space = await client.spaces.create({
  name: 'Production App',
  slug: 'production-app',    // optional, auto-generated from name
});

console.log(space.id);
console.log(space.slug);     // "production-app"
```

### Get a Space

```typescript
// By ID
const space = await client.spaces.get('space-uuid-...');

// By slug
const space2 = await client.spaces.getBySlug('production-app');
```

### List Spaces

```typescript
const spaces = await client.spaces.list();

for (const space of spaces) {
  console.log(`${space.name} (${space.slug})`);
}
```

### Delete a Space

```typescript
await client.spaces.delete('space-uuid-...');
```

## API Keys

### Create an API Key

```typescript
const key = await client.apiKeys.create('staging');

console.log(key.publicKey);   // "pk_live_..."
console.log(key.secretKey);   // "sk_live_..." — shown only on creation
```

The `secretKey` is returned **only when the key is first created**. Store it securely.

### List API Keys

```typescript
const keys = await client.apiKeys.list();

for (const key of keys) {
  console.log(`${key.name}: ${key.publicKey}`);
  // secretKey is NOT returned on list
}
```

### Rotate a Key

Generate a new secret for an existing key:

```typescript
const rotated = await client.apiKeys.rotate('key-id-...');
console.log(rotated.secretKey); // new secret — save it
```

### Delete a Key

```typescript
await client.apiKeys.delete('key-id-...');
```

## Batch Operations

Upload multiple nodes in a single request:

```typescript
const result = await client.batch.upload([
  { title: 'Task 1', nodeDetails: { status: 'todo' } },
  { title: 'Task 2', nodeDetails: { status: 'todo' } },
  { title: 'Task 3', nodeDetails: { status: 'done' } },
]);

console.log(result.totalProcessed); // 3
console.log(result.successful);      // 3
console.log(result.failed);          // 0
console.log(result.errors);          // undefined or []
```

**Result type:**

```typescript
interface BatchUploadResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors?: string[];
}
```

Batch upload is useful for:
- Importing data from other systems
- Seeding a new space with initial data
- Bulk creating nodes from a file or spreadsheet

## TypeScript Generics

All node operations accept a generic type parameter for `nodeDetails`:

```typescript
interface TaskDetails {
  status: 'todo' | 'in_progress' | 'done';
  priority: string;
}

// Type-safe creation
const task = await client.nodes.create<TaskDetails>({
  title: 'My Task',
  nodeDetails: {
    status: 'todo',
    priority: 'high',
  },
});

// task.nodeDetails is typed as TaskDetails
console.log(task.nodeDetails.status); // autocomplete works
```

## What's Next

- [Graph Traversal](./05-graph-traversal.md) — Navigate node relationships
- [Error Handling](./06-error-handling.md) — Handle errors from any operation
- [Building a Todo App](./07-tutorial-todo-app.md) — Put it all together
