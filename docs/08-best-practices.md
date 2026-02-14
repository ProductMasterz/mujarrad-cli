# Best Practices: Building with Mujarrad

This guide covers proven patterns and best practices for building production-ready applications with Mujarrad.

## Modeling Data as Nodes

### Choose the Right Node Type

| Use Case | Node Type | Why |
|----------|-----------|-----|
| Users, teams, organizations | CONTEXT | Represents identity and scope |
| Tasks, projects, documents | REGULAR | Standard data entities |
| Task templates, blueprints | TEMPLATE | Reusable patterns |
| Draft or hypothetical data | ASSUMPTION | Unverified information |

### Design Node Details Schema

Keep `nodeDetails` focused and consistent:

✅ **Good: Focused schema**
```javascript
const task = await client.createNode('Build login', 'REGULAR', {
  status: 'todo',
  priority: 'high',
  estimatedHours: 8,
  dueDate: '2026-03-15',
  tags: ['backend', 'auth']
});
```

❌ **Bad: Mixing concerns**
```javascript
const task = await client.createNode('Build login', 'REGULAR', {
  status: 'todo',
  priority: 'high',
  assignee: { name: 'Alice', email: '...' },  // Should be a relationship!
  project: { name: 'Website', ... },          // Should be a relationship!
  comments: [...]                              // Should be separate nodes!
});
```

**Rule:** Store **intrinsic properties** in `nodeDetails`. Store **relationships** as attributes.

### Use Consistent Field Names

Define a schema and stick to it:

```javascript
// Good: Consistent across all tasks
const taskSchema = {
  status: ['todo', 'in_progress', 'in_review', 'done', 'blocked'],
  priority: ['low', 'medium', 'high', 'critical'],
  estimatedHours: 'number',
  actualHours: 'number',
  dueDate: 'ISO8601 string',
  tags: 'array of strings'
};

// Bad: Inconsistent field names
// Task 1: { status: 'done' }
// Task 2: { state: 'completed' }  // Different field name!
// Task 3: { isComplete: true }    // Different representation!
```

## Designing Relationships

### Use Semantic Verbs

Choose meaningful relationship names that express **intent**:

✅ **Good: Clear semantic meaning**
```javascript
await client.createAttribute(projectId, taskId, 'contains');
await client.createAttribute(taskId, userId, 'assigned_to');
await client.createAttribute(task2Id, task1Id, 'depends_on');
await client.createAttribute(teamId, userId, 'has_member');
```

❌ **Bad: Generic or unclear verbs**
```javascript
await client.createAttribute(projectId, taskId, 'relates_to');  // How?
await client.createAttribute(taskId, userId, 'links');          // Links how?
await client.createAttribute(task2Id, task1Id, 'connects');     // What kind of connection?
```

### Avoid Redundant Relationships

Don't create inverse relationships unless necessary:

❌ **Bad: Redundant inverse**
```javascript
await client.createAttribute(projectId, taskId, 'contains');
await client.createAttribute(taskId, projectId, 'part_of');  // Redundant!
```

✅ **Good: Single direction**
```javascript
await client.createAttribute(projectId, taskId, 'contains');

// Query the inverse via graph traversal
const ancestors = await client.getAncestors(taskId);  // Includes project
```

### Keep Relationships Simple

Use relationships for connections, not data storage:

❌ **Bad: Complex metadata in relationship**
```javascript
await client.createAttribute(taskId, userId, 'assigned_to', {
  user: { name: 'Alice', email: '...', bio: '...' },
  taskDetails: { title: '...', description: '...' },
  history: [...]
});
```

✅ **Good: Minimal metadata**
```javascript
await client.createAttribute(taskId, userId, 'assigned_to', {
  assignedDate: '2026-02-14',
  role: 'lead'
});
```

### Enforce Containment Hierarchy Rules

Keep `contains` relationships acyclic:

✅ **Good: Acyclic hierarchy**
```javascript
Project --contains--> Task --contains--> Subtask
```

❌ **Bad: Cyclic containment**
```javascript
Task A --contains--> Task B --contains--> Task A  // ERROR!
```

## Performance Optimization

### Cache Frequently Accessed Nodes

```javascript
class NodeCache {
  constructor(client) {
    this.client = client;
    this.cache = new Map();
  }

  async get(nodeId) {
    if (!this.cache.has(nodeId)) {
      this.cache.set(nodeId, await this.client.getNode(nodeId));
    }
    return this.cache.get(nodeId);
  }

  invalidate(nodeId) {
    this.cache.delete(nodeId);
  }

  clear() {
    this.cache.clear();
  }
}

// Usage
const cache = new NodeCache(client);
const user = await cache.get(userId);  // Cached after first fetch
```

### Batch Operations with Promise.all

❌ **Bad: Sequential API calls**
```javascript
for (const item of items) {
  await client.createNode(item.title, 'REGULAR', item.details);
}
```

✅ **Good: Parallel API calls**
```javascript
const promises = items.map(item =>
  client.createNode(item.title, 'REGULAR', item.details)
);
const nodes = await Promise.all(promises);
```

### Limit Graph Traversal Depth

For deep hierarchies, consider limiting traversal:

```javascript
async function getLimitedDescendants(nodeId, maxDepth = 3) {
  const visited = new Set();
  const results = [];

  async function traverse(id, depth) {
    if (depth > maxDepth) return;
    if (visited.has(id)) return;

    visited.add(id);
    const descendants = await client.getDescendants(id);
    results.push(...descendants);
  }

  await traverse(nodeId, 0);
  return results;
}
```

### Minimize Attribute Lookups

Cache relationship lookups when possible:

```javascript
// Bad: Multiple lookups for same node
const attrs1 = await client.getAttributes(taskId);
const attrs2 = await client.getAttributes(taskId);  // Redundant!

// Good: Lookup once, reuse
const attrs = await client.getAttributes(taskId);
const assignment = attrs.find(a => a.attributeName === 'assigned_to');
const dependencies = attrs.filter(a => a.attributeName === 'depends_on');
```

## Error Handling

### Always Handle Errors

```javascript
try {
  const node = await client.getNode(nodeId);
  console.log('Found:', node.title);
} catch (error) {
  if (error.response?.status === 404) {
    console.error('Node not found:', nodeId);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Retry Failed Operations

```javascript
async function retryOperation(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Usage
const node = await retryOperation(() => client.getNode(nodeId));
```

### Validate Data Before Creating Nodes

```javascript
function validateTaskDetails(details) {
  const validStatuses = ['todo', 'in_progress', 'done', 'blocked'];
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  if (!validStatuses.includes(details.status)) {
    throw new Error(`Invalid status: ${details.status}`);
  }

  if (!validPriorities.includes(details.priority)) {
    throw new Error(`Invalid priority: ${details.priority}`);
  }

  if (details.estimatedHours && details.estimatedHours < 0) {
    throw new Error('Estimated hours must be positive');
  }

  return true;
}

// Usage
try {
  validateTaskDetails(taskData);
  const task = await client.createNode('Task', 'REGULAR', taskData);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

## Security Best Practices

### Never Expose API Keys

❌ **Bad: Hardcoded keys**
```javascript
const client = new MujarradClient('pk_live_...', 'sk_live_...', 'space');
```

✅ **Good: Environment variables**
```javascript
const client = new MujarradClient(
  process.env.MUJARRAD_API_PUBLIC_KEY!,
  process.env.MUJARRAD_API_SECRET_KEY!,
  process.env.MUJARRAD_SPACE_SLUG!
);
```

### Validate User Input

Never trust user input:

```javascript
function sanitizeTitle(title) {
  // Remove dangerous characters
  return title.trim().substring(0, 255);
}

function sanitizeNodeDetails(details) {
  // Validate and sanitize each field
  return {
    status: validateStatus(details.status),
    priority: validatePriority(details.priority),
    description: sanitizeString(details.description),
    // ...
  };
}

// Usage
const node = await client.createNode(
  sanitizeTitle(userInput.title),
  'REGULAR',
  sanitizeNodeDetails(userInput.details)
);
```

### Use Read-Only Keys for Client-Side

If you need client-side access:
1. Create separate read-only API keys
2. Use backend proxy for write operations
3. Never expose secret keys to the browser

## Testing

### Mock the Client for Unit Tests

```javascript
// Mock client
class MockMujarradClient {
  constructor() {
    this.nodes = new Map();
  }

  async createNode(title, nodeType, nodeDetails) {
    const id = `mock-${Date.now()}`;
    const node = { id, title, nodeType, nodeDetails };
    this.nodes.set(id, node);
    return node;
  }

  async getNode(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error('Not found');
    return node;
  }

  async listNodes() {
    return Array.from(this.nodes.values());
  }
}

// Test
describe('Task Manager', () => {
  let client;

  beforeEach(() => {
    client = new MockMujarradClient();
  });

  it('should create a task', async () => {
    const task = await client.createNode('Test Task', 'REGULAR', {
      status: 'todo'
    });

    expect(task.title).toBe('Test Task');
    expect(task.nodeDetails.status).toBe('todo');
  });
});
```

### Integration Tests

```javascript
describe('Mujarrad Integration', () => {
  let client;

  beforeAll(() => {
    client = new MujarradClient(
      process.env.TEST_API_PUBLIC_KEY!,
      process.env.TEST_API_SECRET_KEY!,
      'test-space'
    );
  });

  afterEach(async () => {
    // Clean up test data
    const nodes = await client.listNodes();
    for (const node of nodes) {
      await client.deleteNode(node.id);
    }
  });

  it('should create and retrieve a node', async () => {
    const created = await client.createNode('Test', 'REGULAR', {
      status: 'test'
    });

    const retrieved = await client.getNode(created.id);

    expect(retrieved.id).toBe(created.id);
    expect(retrieved.title).toBe('Test');
  });
});
```

## Code Organization

### Separate Concerns

```
src/
  ├── client/
  │   └── mujarrad.ts          # API client
  ├── models/
  │   ├── task.ts              # Task model
  │   ├── project.ts           # Project model
  │   └── user.ts              # User model
  ├── services/
  │   ├── task-service.ts      # Business logic for tasks
  │   └── project-service.ts   # Business logic for projects
  ├── utils/
  │   ├── validation.ts        # Data validation
  │   └── cache.ts             # Caching utilities
  └── index.ts                 # Entry point
```

### Use Type Definitions

```typescript
// types.ts
export interface TaskDetails {
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  tags?: string[];
}

export interface ProjectDetails {
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate?: string;
  endDate?: string;
  budget?: number;
}

// task-service.ts
import { MujarradNode } from './client';
import { TaskDetails } from './types';

export class TaskService {
  constructor(private client: MujarradClient) {}

  async createTask(
    title: string,
    details: TaskDetails
  ): Promise<MujarradNode<TaskDetails>> {
    return this.client.createNode(title, 'REGULAR', details);
  }

  async getTasksInProject(
    projectId: string
  ): Promise<MujarradNode<TaskDetails>[]> {
    const descendants = await this.client.getDescendants(projectId);
    return descendants.filter(n => n.nodeType === 'REGULAR');
  }
}
```

## Common Patterns

### Pattern 1: User Assignment

```javascript
async function assignTaskToUser(taskId, userId) {
  // Create assignment relationship
  await client.createAttribute(taskId, userId, 'assigned_to', {
    assignedDate: new Date().toISOString()
  });

  // Update task status
  await client.updateNode(taskId, {
    nodeDetails: { status: 'assigned' }
  });
}
```

### Pattern 2: Task Dependencies

```javascript
async function addTaskDependency(taskId, dependsOnTaskId) {
  // Create dependency
  await client.createAttribute(taskId, dependsOnTaskId, 'depends_on');

  // Check if task is now blocked
  const dependencies = await client.getAncestors(taskId);
  const incompleteDeps = dependencies.filter(d =>
    d.nodeDetails.status !== 'done'
  );

  if (incompleteDeps.length > 0) {
    await client.updateNode(taskId, {
      nodeDetails: { status: 'blocked' }
    });
  }
}
```

### Pattern 3: Template Instantiation

```javascript
async function createTaskFromTemplate(templateId, customizations = {}) {
  // Get template
  const template = await client.getNode(templateId);

  // Create new task from template
  const task = await client.createNode(
    customizations.title || template.title,
    'REGULAR',
    {
      ...template.nodeDetails,
      ...customizations,
      isTemplate: false  // Override template flag
    }
  );

  // Link to template
  await client.createAttribute(task.id, templateId, 'created_from');

  return task;
}
```

## What's Next

- **[CLI Reference](./09-cli-reference.md)** - Command-line tools
- **[Task Manager Tutorial](./05-task-manager-tutorial.md)** - See best practices in action
- **[API Basics](./06-api-basics.md)** - Full API reference
