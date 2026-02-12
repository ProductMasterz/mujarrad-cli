# @mujarrad/sdk

> Graph-based data platform SDK for developers. Use Mujarrad as a backend for your apps.

[![npm version](https://img.shields.io/npm/v/@mujarrad/sdk.svg)](https://www.npmjs.com/package/@mujarrad/sdk)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Installation

```bash
npm install @mujarrad/sdk
```

## Quick Start

```typescript
import { Mujarrad, defineSchema } from '@mujarrad/sdk';

// 1. Define your schema
const schema = defineSchema()
  .entity('User').type('CONTEXT').string('email', { required: true }).done()
  .entity('Task').string('title', { required: true }).enum('status', ['todo', 'done']).done()
  .relationship('user_tasks', { source: 'User', target: 'Task', verb: 'contains' })
  .build();

// 2. Initialize the client
const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: 'my-space',
}).withSchema(schema);

// 3. Create entities
const user = await client.createEntity('User', { email: 'dev@example.com' });
const task = await client.createEntity('Task', { title: 'Ship it', status: 'todo' });

// 4. Link them
await client.link(user.id, task.id, 'contains');
```

## Authentication

Mujarrad uses API key pairs for authentication. Generate keys via:

```bash
npx mujarrad sdk keygen
```

Or scaffold a complete project:

```bash
npx mujarrad sdk init my-app
```

The SDK sends `X-API-Key` and `X-API-Secret` headers with every request.

## API Reference

### Client

```typescript
const client = new Mujarrad({
  apiKey: 'pk_live_...',
  secretKey: 'sk_live_...',
  space: 'my-space',
  baseUrl: 'https://mujarrad.onrender.com/api', // optional
  timeout: 30000,                                 // optional
  retryOptions: { maxAttempts: 3, baseDelay: 1000 }, // optional
});
```

### Nodes

```typescript
// Create
const node = await client.nodes.create({ title: 'My Node', nodeType: 'REGULAR' });

// Read
const fetched = await client.nodes.get(node.id);

// Update
const updated = await client.nodes.update(node.id, { title: 'Updated' });

// Delete
await client.nodes.delete(node.id);

// List
const nodes = await client.nodes.list({ page: 0, size: 20 });

// Graph traversal
const ancestors = await client.nodes.ancestors(node.id);
const descendants = await client.nodes.descendants(node.id);
```

### Attributes (Relationships)

```typescript
// Create
const attr = await client.attributes.create(sourceNodeId, {
  targetNodeId: targetId,
  attributeName: 'contains',
});

// List for a node
const attrs = await client.attributes.list(nodeId);

// Update
await client.attributes.update(attrId, { attributeName: 'owns' });

// Delete
await client.attributes.delete(attrId);

// Promote/Demote
await client.attributes.promote(attrId);
await client.attributes.demote(attrId);
```

### Spaces

```typescript
const space = await client.spaces.create({ name: 'My Space' });
const spaces = await client.spaces.list();
const bySlug = await client.spaces.getBySlug('my-space');
await client.spaces.delete(space.id);
```

### Batch Operations

```typescript
const result = await client.batch.upload([
  { title: 'Node 1' },
  { title: 'Node 2' },
  { title: 'Node 3' },
]);
console.log(`Processed: ${result.totalProcessed}, Failed: ${result.failed}`);
```

## Schema Definition

Define entity shapes and relationships for validation:

```typescript
import { defineSchema } from '@mujarrad/sdk';

const schema = defineSchema()
  // Entities
  .entity('User')
    .type('CONTEXT')
    .string('email', { required: true })
    .string('name')
    .number('age')
    .boolean('active', { defaultValue: true })
    .done()
  .entity('Task')
    .string('title', { required: true })
    .enum('status', ['todo', 'in_progress', 'done'])
    .date('dueDate')
    .json('metadata')
    .done()
  // Relationships
  .relationship('user_tasks', {
    source: 'User',
    target: 'Task',
    verb: 'contains',
  })
  .build();
```

### Validation

When a schema is applied via `withSchema()`, `createEntity()` validates data before sending to the API:

```typescript
const client = new Mujarrad(config).withSchema(schema);

// Throws ValidationError if email is missing
await client.createEntity('User', { name: 'Test' });
```

You can also validate manually:

```typescript
import { SchemaValidator } from '@mujarrad/sdk';

const validator = new SchemaValidator(schema);
const errors = validator.validateNode('User', { name: 123 });
// ['User.email is required', 'User.name must be a string']
```

## Error Handling

All errors extend `MujarradError`:

```typescript
import { AuthenticationError, NotFoundError, ValidationError } from '@mujarrad/sdk';

try {
  await client.nodes.get('nonexistent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Node not found');
  } else if (err instanceof AuthenticationError) {
    console.log('Check your API keys');
  } else if (err instanceof ValidationError) {
    console.log('Errors:', err.errors);
  }
}
```

| Error Class | HTTP Status | Retryable |
|---|---|---|
| `ValidationError` | 400 | No |
| `AuthenticationError` | 401 | No |
| `NotFoundError` | 404 | No |
| `RateLimitError` | 429 | Yes |
| `ServerError` | 5xx | Yes |
| `NetworkError` | — | Yes |

Retryable errors are automatically retried with exponential backoff (configurable via `retryOptions`).

## Documentation

For comprehensive guides, see the [Developer Documentation](../../docs/dev/):

| Guide | What You'll Learn |
|-------|-------------------|
| [Getting Started](../../docs/dev/01-getting-started.md) | Install, authenticate, scaffold your first project |
| [Core Concepts](../../docs/dev/02-core-concepts.md) | Nodes, Attributes, Spaces, and the graph model |
| [Schema Definition](../../docs/dev/03-schema-definition.md) | Define entity shapes and relationships with the fluent builder |
| [CRUD Operations](../../docs/dev/04-crud-operations.md) | Create, read, update, delete nodes and attributes |
| [Graph Traversal](../../docs/dev/05-graph-traversal.md) | Walk the graph with ancestors, descendants, and links |
| [Error Handling](../../docs/dev/06-error-handling.md) | Handle errors, retries, and edge cases |
| [Building a Todo App](../../docs/dev/07-tutorial-todo-app.md) | End-to-end tutorial building a real application |
| [API Reference](../../docs/dev/08-api-reference.md) | Complete reference for every class, method, and type |
| [CLI Commands](../../docs/dev/09-cli-commands.md) | `mujarrad sdk init`, `mujarrad sdk keygen`, and workflow |
| [Architecture](../../docs/dev/10-architecture.md) | How the SDK works internally, contributing guide |

## License

Apache-2.0
