# Getting Started with Mujarrad SDK

Build graph-based applications with confidence. This guide will take you from zero to a fully functional task management system in under 30 minutes.

---

## 🚀 Quick Start

### Installation

```bash
npm install @mujarrad/sdk
# or
yarn add @mujarrad/sdk
# or
pnpm add @mujarrad/sdk
```

### Basic Setup

```typescript
import { Mujarrad, defineSchema } from '@mujarrad/sdk';

// Define your data model (schema)
const schema = defineSchema(builder => {
  builder.entity('Task', 'REGULAR')
    .field('description', 'string')
    .field('status', 'enum', ['backlog', 'todo', 'in_progress', 'done'])
    .field('priority', 'enum', ['low', 'medium', 'high', 'critical']);
  
  builder.entity('User', 'CONTEXT')
    .field('email', 'string', { required: true })
    .field('name', 'string', { required: true });
  
  builder.relationship('Task', 'User', 'assigned_to');
});

// Initialize the client
const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_API_KEY,
  secretKey: process.env.MUJARRAD_SECRET_KEY,
  space: 'my-project',
}).withSchema(schema);

// Create your first node!
const task = await client.createEntity('Task', {
  title: 'My First Task',
  description: 'Learn Mujarrad SDK',
  status: 'todo',
  priority: 'high',
});

console.log('Created task:', task.id);
```

---

## 📖 Core Concepts

### 1. Entities (Nodes)

Entities are the building blocks of your application. Each entity represents a node in the graph.

```typescript
// Define an entity
builder.entity('Task', 'REGULAR')
  .field('description', 'string')
  .field('status', 'enum', ['backlog', 'todo', 'done'])
  .field('priority', 'enum', ['low', 'medium', 'high'])
  .field('dueDate', 'date')
  .field('tags', 'json');  // For arrays or complex objects

// Create an entity instance
const task = await client.createEntity('Task', {
  title: 'Build API',
  description: 'Create REST API endpoints',
  status: 'todo',
  priority: 'high',
  dueDate: '2024-02-28',
  tags: ['backend', 'api'],
});

// Get an entity by ID
const retrieved = await client.nodes.get<Task>(task.id);

// List all entities of a type
const allTasks = await client.nodes.list({ nodeType: 'REGULAR' });

// Update an entity
const updated = await client.nodes.update(task.id, {
  title: 'Build REST API',
  nodeDetails: { status: 'in_progress' },
});

// Delete an entity
await client.nodes.delete(task.id);
```

### 2. Node Types

Mujarrad supports different node types for different use cases:

| Node Type | Purpose | Example |
|-----------|---------|---------|
| `REGULAR` | Standard data entities | Tasks, Projects, Documents |
| `CONTEXT` | Identity or reference entities | Users, Teams, Organizations |
| `ASSUMPTION` | Hypotheses or draft data | Draft tasks, Unconfirmed reports |
| `TEMPLATE` | Reusable templates | Task templates, Form templates |

```typescript
// CONTEXT: Identity nodes
builder.entity('User', 'CONTEXT')
  .field('email', 'string')
  .field('role', 'enum', ['admin', 'developer']);

// REGULAR: Standard data nodes
builder.entity('Task', 'REGULAR')
  .field('description', 'string')
  .field('status', 'enum', ['todo', 'done']);

// ASSUMPTION: Draft or tentative data
builder.entity('DraftIdea', 'ASSUMPTION')
  .field('hypothesis', 'string')
  .field('confidence', 'number');
```

### 3. Relationships (Attributes)

Relationships connect entities and define how they interact.

```typescript
// Define a relationship in your schema
builder.relationship('Task', 'User', 'assigned_to');
builder.relationship('Task', 'Project', 'belongs_to');
builder.relationship('Task', 'Task', 'depends_on');

// Create relationships
await client.link(taskId, userId, 'assigned_to');
await client.link(taskId, projectId, 'belongs_to');
await client.link(taskA.id, taskB.id, 'depends_on');

// Add metadata to relationships
await client.link(taskId, userId, 'assigned_to', {
  assignedAt: '2024-02-14T10:00:00Z',
  assignedBy: 'alice@example.com',
});

// Get relationships for a node
const attributes = await client.attributes.list(taskId);

// Filter by relationship type
const assignments = attributes.filter(a => a.attributeName === 'assigned_to');
```

### 4. Graph Traversal

One of the most powerful features of graph databases is traversing relationships.

```typescript
// Get all ancestors (what does this node depend on?)
const dependencies = await client.getAncestors(taskId);

// Get all descendants (what depends on this node?)
const dependents = await client.getDescendants(taskId);

// Example: Task dependency chain
// Task A → depends_on → Task B → depends_on → Task C
// getAncestors(Task A) returns [Task B, Task C]

// Example: Project hierarchy
// Project → contains → Sprint → contains → Task
// getDescendants(Project) returns [Sprint, Task]
```

---

## 🎯 Complete Example: Task Management System

Let's build a complete task management system from scratch.

### Step 1: Define the Schema

```typescript
import { defineSchema } from '@mujarrad/sdk';

const taskManagerSchema = defineSchema(builder => {
  // Users (Identity nodes)
  builder.entity('User', 'CONTEXT')
    .field('email', 'string', { required: true })
    .field('name', 'string', { required: true })
    .field('role', 'enum', ['admin', 'manager', 'developer', 'designer', 'qa']);

  // Teams (Identity nodes)
  builder.entity('Team', 'CONTEXT')
    .field('name', 'string', { required: true })
    .field('department', 'string');

  // Projects (Data nodes)
  builder.entity('Project', 'REGULAR')
    .field('description', 'string')
    .field('status', 'enum', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .field('priority', 'enum', ['low', 'medium', 'high', 'critical'])
    .field('startDate', 'date')
    .field('endDate', 'date')
    .field('budget', 'number');

  // Tasks (Data nodes)
  builder.entity('Task', 'REGULAR')
    .field('description', 'string')
    .field('status', 'enum', ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked'])
    .field('priority', 'enum', ['low', 'medium', 'high', 'critical'])
    .field('estimatedHours', 'number')
    .field('actualHours', 'number')
    .field('dueDate', 'date')
    .field('completedAt', 'date')
    .field('tags', 'json');

  // Milestones (Data nodes)
  builder.entity('Milestone', 'REGULAR')
    .field('description', 'string')
    .field('dueDate', 'date', { required: true })
    .field('status', 'enum', ['pending', 'in_progress', 'completed', 'overdue']);

  // Comments (Data nodes)
  builder.entity('Comment', 'REGULAR')
    .field('body', 'string', { required: true })
    .field('postedAt', 'date', { required: true });

  // Relationships
  builder.relationship('Team', 'User', 'has_member');
  builder.relationship('Project', 'User', 'owned_by');
  builder.relationship('Project', 'Task', 'contains');
  builder.relationship('Task', 'User', 'assigned_to');
  builder.relationship('Task', 'Task', 'depends_on');
  builder.relationship('Task', 'Task', 'blocks');
  builder.relationship('Project', 'Milestone', 'has_milestone');
  builder.relationship('Milestone', 'Task', 'contains');
  builder.relationship('Task', 'Comment', 'has_comment');
});
```

### Step 2: Initialize the Client

```typescript
import { Mujarrad } from '@mujarrad/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_API_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: 'task-manager',
}).withSchema(taskManagerSchema);
```

### Step 3: Create Users and Teams

```typescript
// Create users
const alice = await client.createEntity('User', {
  title: 'Alice',
  email: 'alice@example.com',
  name: 'Alice Johnson',
  role: 'developer',
});

const bob = await client.createEntity('User', {
  title: 'Bob',
  email: 'bob@example.com',
  name: 'Bob Smith',
  role: 'developer',
});

const carol = await client.createEntity('User', {
  title: 'Carol',
  email: 'carol@example.com',
  name: 'Carol Davis',
  role: 'designer',
});

// Create a team
const engineeringTeam = await client.createEntity('Team', {
  title: 'Engineering',
  name: 'Engineering Team',
  department: 'Engineering',
});

// Add members to the team
await client.link(engineeringTeam.id, alice.id, 'has_member');
await client.link(engineeringTeam.id, bob.id, 'has_member');
await client.link(engineeringTeam.id, carol.id, 'has_member');
```

### Step 4: Create a Project

```typescript
// Create a project
const websiteProject = await client.createEntity('Project', {
  title: 'Website Redesign',
  description: 'Redesign the company website with new branding',
  status: 'active',
  priority: 'high',
  startDate: '2024-02-01',
  endDate: '2024-03-31',
  budget: 50000,
});

// Assign project owner
await client.link(websiteProject.id, alice.id, 'owned_by');
```

### Step 5: Create Milestones

```typescript
// Create milestones
const designPhase = await client.createEntity('Milestone', {
  title: 'Design Phase',
  description: 'Complete all design work',
  dueDate: '2024-02-15',
  status: 'in_progress',
});

const developmentPhase = await client.createEntity('Milestone', {
  title: 'Development Phase',
  description: 'Complete all development work',
  dueDate: '2024-03-15',
  status: 'pending',
});

// Link milestones to project
await client.link(websiteProject.id, designPhase.id, 'has_milestone');
await client.link(websiteProject.id, developmentPhase.id, 'has_milestone');
```

### Step 6: Create Tasks

```typescript
// Create tasks
const designHomepage = await client.createEntity('Task', {
  title: 'Design Homepage',
  description: 'Create mockups for the new homepage',
  status: 'in_progress',
  priority: 'high',
  estimatedHours: 8,
  dueDate: '2024-02-10',
  tags: ['design', 'frontend'],
});

const implementHomepage = await client.createEntity('Task', {
  title: 'Implement Homepage',
  design: 'Build the homepage based on mockups',
  status: 'todo',
  priority: 'high',
  estimatedHours: 16,
  dueDate: '2024-02-20',
  tags: ['frontend', 'development'],
});

const writeTests = await client.createEntity('Task', {
  title: 'Write Tests',
  description: 'Write unit tests for the homepage',
  status: 'backlog',
  priority: 'medium',
  estimatedHours: 4,
  dueDate: '2024-02-22',
  tags: ['testing', 'quality'],
});

// Link tasks to project
await client.link(websiteProject.id, designHomepage.id, 'contains');
await client.link(websiteProject.id, implementHomepage.id, 'contains');
await client.link(websiteProject.id, writeTests.id, 'contains');

// Link tasks to milestones
await client.link(designPhase.id, designHomepage.id, 'contains');
await client.link(developmentPhase.id, implementHomepage.id, 'contains');
await client.link(developmentPhase.id, writeTests.id, 'contains');

// Assign tasks to users
await client.link(designHomepage.id, carol.id, 'assigned_to');
await client.link(implementHomepage.id, alice.id, 'assigned_to');
await client.link(writeTests.id, bob.id, 'assigned_to');

// Create task dependencies
await client.link(implementHomepage.id, designHomepage.id, 'depends_on');
await client.link(writeTests.id, implementHomepage.id, 'depends_on');
```

### Step 7: Query Your Data

```typescript
// Get all tasks in a project
async function getProjectTasks(projectId: string) {
  const tasks = await client.getDescendants(projectId);
  return tasks.filter(t => t.nodeType === 'REGULAR');
}

const projectTasks = await getProjectTasks(websiteProject.id);
console.log(`Project has ${projectTasks.length} tasks`);

// Get tasks assigned to a specific user
async function getUserTasks(userId: string) {
  const allTasks = await client.nodes.list({ nodeType: 'REGULAR' });
  const userTasks = [];

  for (const task of allTasks) {
    const attributes = await client.attributes.list(task.id);
    const assignment = attributes.find(a => 
      a.attributeName === 'assigned_to' && 
      a.targetNodeId === userId
    );
    if (assignment) {
      userTasks.push(task);
    }
  }

  return userTasks;
}

const aliceTasks = await getUserTasks(alice.id);
console.log(`Alice has ${aliceTasks.length} tasks`);

// Get task dependencies
async function getTaskDependencies(taskId: string) {
  return await client.getAncestors(taskId);
}

const writeTestsDependencies = await getTaskDependencies(writeTests.id);
console.log('Write Tests depends on:', writeTestsDependencies.map(t => t.title));

// Get all high-priority tasks
const allTasks = await client.nodes.list({ nodeType: 'REGULAR' });
const highPriorityTasks = allTasks.filter(t => 
  t.nodeDetails.priority === 'high' || 
  t.nodeDetails.priority === 'critical'
);

console.log(`Found ${highPriorityTasks.length} high-priority tasks`);

// Get incomplete tasks
const incompleteTasks = allTasks.filter(t => 
  t.nodeDetails.status !== 'done' && 
  t.nodeDetails.status !== 'completed'
);

console.log(`Found ${incompleteTasks.length} incomplete tasks`);
```

---

## 🔧 Advanced Features

### Batch Operations

```typescript
// Create multiple nodes in a single request
const tasks = await client.batch.create([
  {
    title: 'Task 1',
    nodeType: 'REGULAR',
    nodeDetails: { status: 'todo', priority: 'high' },
  },
  {
    title: 'Task 2',
    nodeType: 'REGULAR',
    nodeDetails: { status: 'todo', priority: 'medium' },
  },
  {
    title: 'Task 3',
    nodeType: 'REGULAR',
    nodeDetails: { status: 'todo', priority: 'low' },
  },
]);

console.log(`Created ${tasks.created.length} nodes`);
```

### Schema Validation

```typescript
// The SDK automatically validates data against your schema
try {
  const task = await client.createEntity('Task', {
    title: 'Invalid Task',
    status: 'invalid_status',  // ❌ Not in enum
    priority: 'super_high',     // ❌ Not in enum
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.details);
    // Output:
    // Validation failed: [
    //   { field: 'status', message: 'Invalid enum value' },
    //   { field: 'priority', message: 'Invalid enum value' }
    // ]
  }
}
```

### Error Handling

```typescript
import { 
  MujarradError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from '@mujarrad/sdk';

try {
  const task = await client.nodes.get('invalid-id');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API keys');
  } else if (error instanceof NotFoundError) {
    console.error('Node not found');
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', error.details);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter);
  } else if (error instanceof MujarradError) {
    console.error('Mujarrad error:', error.message);
  }
}
```

### Custom Field Types

```typescript
builder.entity('Task', 'REGULAR')
  .field('description', 'string')
  .field('status', 'enum', ['todo', 'done'])
  .field('priority', 'enum', ['low', 'medium', 'high'])
  .field('dueDate', 'date')
  .field('tags', 'json')           // Arrays or objects
  .field('metadata', 'json')       // Flexible metadata
  .field('progress', 'number')     // 0-100
  .field('completed', 'boolean');   // true/false
```

---

## 📚 Best Practices

### 1. Schema-First Development

Always define your schema before writing business logic. This ensures:
- Type safety
- Validation
- Clear data model

```typescript
// ✅ Good: Define schema first
const schema = defineSchema(builder => {
  builder.entity('Task', 'REGULAR')
    .field('status', 'enum', ['todo', 'done']);
});

const client = new Mujarrad(config).withSchema(schema);

// ❌ Bad: Write code without schema
const task = await client.nodes.create({ /* no validation */ });
```

### 2. Use Graph Traversal

Leverage the graph structure instead of manual joins.

```typescript
// ✅ Good: Use graph traversal
const dependencies = await client.getAncestors(taskId);

// ❌ Bad: Manual traversal
const attributes = await client.attributes.list(taskId);
const depIds = attributes.filter(a => a.attributeName === 'depends_on');
const deps = await Promise.all(depIds.map(id => client.nodes.get(id)));
```

### 3. Batch Operations

Use batch operations for creating or updating multiple nodes.

```typescript
// ✅ Good: Batch create
const result = await client.batch.create([...]);

// ❌ Bad: Sequential creates
for (const data of items) {
  await client.nodes.create(data);
}
```

### 4. Handle Errors Gracefully

Always handle errors appropriately.

```typescript
try {
  const task = await client.nodes.get(id);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Handle not found
  } else {
    // Handle other errors
  }
}
```

---

## 🎓 Next Steps

Now that you've mastered the basics, explore:

1. **Advanced Queries**: Learn complex graph queries and aggregations
2. **Real-time Updates**: Implement real-time data synchronization
3. **Authentication**: Set up proper authentication and authorization
4. **Testing**: Write tests for your graph-based applications
5. **Performance**: Optimize your queries and batch operations

## 📖 More Resources

- [API Reference](./api-reference.md)
- [Examples](../examples/)
- [Architecture Comparison](./ARCHITECTURE_COMPARISON.md)
- [Troubleshooting](./troubleshooting.md)

---

**Happy coding! 🚀**
