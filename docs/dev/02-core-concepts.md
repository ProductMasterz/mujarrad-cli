# Core Concepts

This guide explains the fundamental building blocks of Mujarrad: **Nodes**, **Attributes**, **Spaces**, and **Node Types**.

## The Graph Model

Mujarrad is a graph-based data platform. Unlike traditional relational databases with rows and tables, Mujarrad stores everything as **nodes** connected by **attributes** (edges) in a graph.

```
  ┌───────────┐      "manages"       ┌───────────┐
  │   User    │ ───────────────────> │  Project   │
  │  (CONTEXT)│                      │ (REGULAR)  │
  └───────────┘                      └───────────┘
       │                                   │
       │ "assigned_to"                     │ "contains"
       ▼                                   ▼
  ┌───────────┐                      ┌───────────┐
  │   Task    │ <────────────────── │   Task     │
  │ (REGULAR) │    "subtask_of"      │ (REGULAR)  │
  └───────────┘                      └───────────┘
```

**Why graphs?** Graphs naturally model real-world relationships. Instead of writing complex SQL joins, you traverse connections directly. A user's projects, a project's tasks, a task's subtasks — each is a single hop in the graph.

## Nodes

A **node** is the fundamental unit of data in Mujarrad. Every piece of information — a user, a task, a document, a configuration — is a node.

### Node Structure

```typescript
interface MujarradNode<T> {
  id: string;           // UUID, auto-generated
  spaceId: string;      // Which space this node belongs to
  nodeType: string;     // REGULAR, CONTEXT, ASSUMPTION, or TEMPLATE
  title: string;        // Human-readable name
  slug: string;         // URL-safe identifier, auto-generated from title
  content?: string;     // Optional long-form text content
  nodeDetails: T;       // Your custom data (generic JSON)
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
}
```

### Working with Nodes

```typescript
// Create a node
const task = await client.nodes.create({
  title: 'Build login page',
  nodeType: 'REGULAR',
  nodeDetails: {
    status: 'todo',
    priority: 'high',
    estimatedHours: 8,
  },
});

// Read a node
const fetched = await client.nodes.get(task.id);

// Update a node
const updated = await client.nodes.update(task.id, {
  nodeDetails: { status: 'in_progress' },
});

// Delete a node
await client.nodes.delete(task.id);
```

### Node Details

`nodeDetails` is a flexible JSON field where you store your domain-specific data. It can hold any valid JSON — strings, numbers, booleans, arrays, nested objects. When using a schema, the SDK validates `nodeDetails` before sending it to the API.

```typescript
// Without schema — nodeDetails can be anything
await client.nodes.create({
  title: 'Meeting Notes',
  nodeDetails: {
    date: '2026-02-12',
    attendees: ['Alice', 'Bob'],
    actionItems: [
      { task: 'Review PR', assignee: 'Alice' },
    ],
  },
});

// With schema — nodeDetails is validated against your entity definition
const node = await client.createEntity('Task', {
  title: 'Build login page',
  status: 'todo',          // validated: must be one of ['todo', 'in_progress', 'done']
  priority: 'high',        // validated: must be a string
});
```

## Node Types

Every node has a `nodeType` that classifies its role in the graph:

| Type | Purpose | Example |
|------|---------|---------|
| **REGULAR** | Standard data entity (default) | Tasks, documents, items |
| **CONTEXT** | Contextual or identity node | Users, organizations, environments |
| **ASSUMPTION** | Hypothesis or draft data | Proposed changes, unverified data |
| **TEMPLATE** | Reusable blueprint | Task templates, document templates |

```typescript
// Create a user as a CONTEXT node
const user = await client.nodes.create({
  title: 'Alice',
  nodeType: 'CONTEXT',
  nodeDetails: { email: 'alice@example.com', role: 'admin' },
});

// Create a task template
const template = await client.nodes.create({
  title: 'Bug Report Template',
  nodeType: 'TEMPLATE',
  nodeDetails: {
    fields: ['severity', 'steps_to_reproduce', 'expected_behavior'],
  },
});
```

When using a schema, set the node type per entity:

```typescript
const schema = defineSchema()
  .entity('User')
    .type('CONTEXT')               // All Users are CONTEXT nodes
    .string('email', { required: true })
    .done()
  .entity('Task')                  // Defaults to REGULAR
    .string('title', { required: true })
    .done()
  .build();
```

## Attributes (Relationships)

An **attribute** is a directed edge connecting two nodes. It represents a relationship: "User **manages** Project", "Project **contains** Task", "Task **depends_on** Task".

### Attribute Structure

```typescript
interface MujarradAttribute {
  id: string;                // UUID, auto-generated
  sourceNodeId: string;      // The "from" node
  targetNodeId: string;      // The "to" node
  attributeName: string;     // The relationship verb (e.g., "contains")
  attributeType: string;     // Classification of the relationship
  attributeTypeMode: string; // TYPED or SCHEMALESS
  attributeValue?: string;   // Optional metadata on the relationship
  createdAt: string;
  updatedAt: string;
}
```

### Creating Relationships

Use the `link()` convenience method or the `attributes` resource directly:

```typescript
// Convenience method — link two nodes
const attr = await client.link(userId, projectId, 'manages');

// With metadata on the relationship
const attr2 = await client.link(userId, taskId, 'assigned_to', {
  assignedDate: '2026-02-12',
  role: 'lead',
});

// Low-level: attributes resource
const attr3 = await client.attributes.create(projectId, {
  targetNodeId: taskId,
  attributeName: 'contains',
  attributeType: 'project_task',
  attributeTypeMode: 'TYPED',
});
```

### Attribute Type Modes

| Mode | When to Use |
|------|------------|
| **TYPED** | Relationship follows a defined schema. Use for structured, validated relationships. |
| **SCHEMALESS** | Free-form relationship. Use for ad-hoc connections or exploratory data. |

### Promote and Demote

Attributes can be **promoted** (elevated to a higher significance in the space) or **demoted** (returned to normal):

```typescript
// Promote an attribute — makes it more prominent in the space
const promoted = await client.attributes.promote(attributeId);

// Demote an attribute — returns it to normal
await client.attributes.demote(attributeId);
```

## Spaces

A **space** is a workspace that groups related nodes. Think of it as a database or project container.

### Space Structure

```typescript
interface MujarradSpace {
  id: string;
  name: string;        // Human-readable name
  slug: string;        // URL-safe identifier (e.g., "my-project")
  createdAt?: string;
  updatedAt?: string;
}
```

### Working with Spaces

```typescript
// Create a space
const space = await client.spaces.create({
  name: 'My Project',
  slug: 'my-project',   // optional, auto-generated from name
});

// Look up a space by slug
const found = await client.spaces.getBySlug('my-project');

// List all spaces
const spaces = await client.spaces.list();
```

### Spaces and the SDK Client

When you initialize the SDK client, you specify which space to work in:

```typescript
const client = new Mujarrad({
  apiKey: 'pk_live_...',
  secretKey: 'sk_live_...',
  space: 'my-project',    // All node operations target this space
});
```

All `client.nodes.*` and `client.batch.*` calls are scoped to this space. To work with multiple spaces, create multiple client instances.

## Putting It Together

Here's a complete example that demonstrates all core concepts:

```typescript
import { Mujarrad, defineSchema } from '@mujarrad/sdk';

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: 'team-tracker',
});

// 1. Create nodes of different types
const user = await client.nodes.create({
  title: 'Alice',
  nodeType: 'CONTEXT',
  nodeDetails: { email: 'alice@example.com' },
});

const project = await client.nodes.create({
  title: 'Website Redesign',
  nodeDetails: { deadline: '2026-06-01' },
});

const task = await client.nodes.create({
  title: 'Create wireframes',
  nodeDetails: { status: 'todo', priority: 'high' },
});

// 2. Connect them with attributes
await client.link(user.id, project.id, 'manages');
await client.link(project.id, task.id, 'contains');
await client.link(user.id, task.id, 'assigned_to');

// 3. Traverse the graph
const projectTasks = await client.nodes.descendants(project.id);
console.log(`Project has ${projectTasks.length} tasks`);

const taskParents = await client.nodes.ancestors(task.id);
console.log(`Task belongs to ${taskParents.length} parents`);
```

## SQL vs Mujarrad Comparison

| Concept | SQL | Mujarrad |
|---------|-----|----------|
| Data entity | Row in a table | Node |
| Schema | Table definition + columns | Entity definition + fields |
| Relationship | Foreign key + JOIN | Attribute (direct edge) |
| Workspace | Database / Schema | Space |
| Identity | Table with constraints | Node with `CONTEXT` type |
| Query relationships | `SELECT ... JOIN ... JOIN ...` | `ancestors()` / `descendants()` |
| Flexible data | JSON columns | `nodeDetails` (always JSON) |

## What's Next

- [Schema Definition](./03-schema-definition.md) — Define typed entities and relationships
- [CRUD Operations](./04-crud-operations.md) — Full guide to data operations
- [Graph Traversal](./05-graph-traversal.md) — Navigate the graph
