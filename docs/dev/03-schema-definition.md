# Schema Definition

Schemas let you define the shape of your data — which entities exist, what fields they have, and how they relate to each other. The SDK provides a fluent builder API that makes schema definition readable and type-safe.

## Why Use a Schema?

Schemas are **optional** but recommended. Without one, `nodeDetails` accepts any JSON. With a schema:

- **Validation** — The SDK validates data before sending it to the API, catching errors early
- **Documentation** — Your schema is a living specification of your data model
- **Type Safety** — `createEntity()` validates against your entity definitions
- **Relationships** — Define which entities can connect and how

## Basic Schema

```typescript
import { defineSchema } from '@mujarrad/sdk';

const schema = defineSchema()
  .entity('Task')
    .string('title', { required: true })
    .enum('status', ['todo', 'in_progress', 'done'])
    .string('description')
    .done()
  .build();
```

This defines a single entity, `Task`, with three fields:
- `title` — required string
- `status` — enum with three allowed values
- `description` — optional string

## The Fluent Builder API

### `defineSchema()`

Entry point. Returns a `SchemaBuilder`.

```typescript
const builder = defineSchema();
```

### `.entity(name)`

Start defining an entity. Returns an `EntityBuilder`.

```typescript
const builder = defineSchema()
  .entity('User')    // returns EntityBuilder
```

### `.type(nodeType)`

Set the node type for this entity. Defaults to `'REGULAR'` if not specified.

```typescript
.entity('User')
  .type('CONTEXT')   // REGULAR | CONTEXT | ASSUMPTION | TEMPLATE
```

### Field Methods

Each field method adds a field to the current entity and returns the `EntityBuilder` for chaining:

| Method | Field Type | Description |
|--------|-----------|-------------|
| `.string(name, options?)` | `string` | Text data |
| `.number(name, options?)` | `number` | Numeric data |
| `.boolean(name, options?)` | `boolean` | True/false |
| `.date(name, options?)` | `date` | ISO 8601 date string |
| `.json(name, options?)` | `json` | Arbitrary JSON object |
| `.enum(name, values, options?)` | `enum` | One of a fixed set of strings |

**Field options:**

```typescript
interface FieldOptions {
  required?: boolean;     // Validation fails if field is missing/empty
  defaultValue?: unknown; // Stored in schema, not auto-applied by SDK
}
```

### `.done()`

Finishes the entity definition and returns the `SchemaBuilder` so you can chain more entities.

```typescript
.entity('Task')
  .string('title', { required: true })
  .done()                 // returns SchemaBuilder
.entity('Note')           // start another entity
  ...
```

### `.relationship(name, config)`

Define a named relationship between two entities.

```typescript
.relationship('user_tasks', {
  source: 'User',         // Source entity name
  target: 'Task',         // Target entity name
  verb: 'owns',           // The attributeName used when linking
})
```

### `.build()`

Finalizes the schema and returns a `SchemaConfig` object.

```typescript
const schema = defineSchema()
  .entity('Task')
    .string('title', { required: true })
    .done()
  .build();

// schema is a SchemaConfig object
```

## Complete Example

Here's a full schema for a project management app:

```typescript
import { defineSchema } from '@mujarrad/sdk';

const schema = defineSchema()
  // Users are identity nodes
  .entity('User')
    .type('CONTEXT')
    .string('email', { required: true })
    .string('name', { required: true })
    .enum('role', ['admin', 'member', 'viewer'])
    .done()

  // Projects contain tasks
  .entity('Project')
    .string('name', { required: true })
    .string('description')
    .date('deadline')
    .enum('status', ['planning', 'active', 'completed', 'archived'])
    .done()

  // Tasks are the core work items
  .entity('Task')
    .string('title', { required: true })
    .string('description')
    .enum('status', ['todo', 'in_progress', 'review', 'done'])
    .enum('priority', ['low', 'medium', 'high', 'critical'])
    .number('estimatedHours')
    .date('dueDate')
    .boolean('isBlocked')
    .done()

  // Comments on tasks
  .entity('Comment')
    .string('body', { required: true })
    .date('postedAt', { required: true })
    .done()

  // Labels for categorization
  .entity('Label')
    .string('name', { required: true })
    .string('color')
    .done()

  // Relationships
  .relationship('user_projects', {
    source: 'User',
    target: 'Project',
    verb: 'manages',
  })
  .relationship('project_tasks', {
    source: 'Project',
    target: 'Task',
    verb: 'contains',
  })
  .relationship('task_assignee', {
    source: 'Task',
    target: 'User',
    verb: 'assigned_to',
  })
  .relationship('task_comments', {
    source: 'Task',
    target: 'Comment',
    verb: 'has_comment',
  })
  .relationship('task_labels', {
    source: 'Task',
    target: 'Label',
    verb: 'tagged_with',
  })
  .build();
```

## Using the Schema with the Client

Pass the schema to the client using `withSchema()`:

```typescript
import { Mujarrad } from '@mujarrad/sdk';

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: 'my-project',
}).withSchema(schema);
```

Now use `createEntity()` for validated node creation:

```typescript
// Validates against the Task entity definition
const task = await client.createEntity('Task', {
  title: 'Review PR #42',
  status: 'todo',
  priority: 'high',
});

// Throws ValidationError — 'title' is required
await client.createEntity('Task', {
  status: 'todo',
});
// Error: Validation failed for Task: Task.title is required

// Throws ValidationError — invalid enum value
await client.createEntity('Task', {
  title: 'Fix bug',
  status: 'pending',   // not in ['todo', 'in_progress', 'review', 'done']
});
// Error: Task.status must be one of: todo, in_progress, review, done

// Throws ValidationError — unknown entity
await client.createEntity('Unknown', { foo: 'bar' });
// Error: Unknown entity: "Unknown"
```

## Schema Validation

The `SchemaValidator` class provides programmatic validation:

```typescript
import { SchemaValidator } from '@mujarrad/sdk';

const validator = new SchemaValidator(schema);

// Validate node content
const errors = validator.validateNode('Task', {
  title: 'Build feature',
  status: 'todo',
});
console.log(errors); // [] — valid

const errors2 = validator.validateNode('Task', {
  status: 123,  // should be an enum string
});
console.log(errors2);
// ['Task.title is required', 'Task.status must be one of: todo, in_progress, review, done']

// Validate relationships
const valid = validator.validateRelationship('Project', 'Task', 'contains');
console.log(valid); // true

const invalid = validator.validateRelationship('Task', 'User', 'contains');
console.log(invalid); // false — no such relationship defined

// Look up entity definitions
const taskEntity = validator.getEntity('Task');
console.log(taskEntity?.fields.map(f => f.name));
// ['title', 'description', 'status', 'priority', 'estimatedHours', 'dueDate', 'isBlocked']
```

## Schema Output Structure

The `.build()` method returns a `SchemaConfig`:

```typescript
interface SchemaConfig {
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
}

interface EntityDefinition {
  name: string;                  // Entity name
  nodeType: MujarradNodeType;    // REGULAR, CONTEXT, etc.
  fields: FieldDefinition[];     // Field definitions
}

interface FieldDefinition {
  name: string;
  type: FieldType;               // 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json'
  required?: boolean;
  enumValues?: string[];         // Only for 'enum' type
  defaultValue?: unknown;
}

interface RelationshipDefinition {
  name: string;                  // Relationship identifier
  source: string;                // Source entity name
  target: string;                // Target entity name
  verb: string;                  // The attributeName
}
```

## Schema with and without `createEntity`

You can use a schema for validation but still use the low-level `nodes` resource:

```typescript
const client = new Mujarrad({ ... }).withSchema(schema);

// High-level: createEntity validates + creates
const task = await client.createEntity('Task', {
  title: 'My task',
  status: 'todo',
});

// Low-level: nodes.create bypasses schema validation
const rawNode = await client.nodes.create({
  title: 'Raw node',
  nodeDetails: { anything: 'goes' },
});
```

Both approaches work. Use `createEntity()` when you want validation. Use `nodes.create()` when you need full control.

## What's Next

- [CRUD Operations](./04-crud-operations.md) — Complete data operations guide
- [Graph Traversal](./05-graph-traversal.md) — Navigate relationships
- [Error Handling](./06-error-handling.md) — Handle validation errors
