# The Three Core Principles

**Implementation Files:** [client.ts](../task-manager-tutorial/src/client.ts) | [demo.ts](../task-manager-tutorial/src/demo.ts) | [seed.ts](../task-manager-tutorial/src/seed.ts)

Mujarrad is built on three foundational principles that enable the ISAAT paradigm:

1. **Everything is a Node (EiaN)**
2. **Relationships Define Structure**
3. **Graph Traversal (Walking the Graph)**

## Principle 1: Everything is a Node (EiaN)

In Mujarrad, **everything** is represented as a node. Not just data—contexts, templates, users, documents, tasks, configurations, everything.

### The Unified Model

Traditional systems have separate concepts for different things:
- Tables (structure)
- Rows (data)
- Users (identity)
- Templates (blueprints)
- Config (settings)

**Mujarrad unifies all of this into a single concept: the node.**

```javascript
// A user is a node
const user = {
  id: 'uuid-1',
  nodeType: 'CONTEXT',
  title: 'Alice Johnson',
  nodeDetails: {
    email: 'alice@example.com',
    role: 'developer'
  }
};

// A task is a node
const task = {
  id: 'uuid-2',
  nodeType: 'REGULAR',
  title: 'Build login page',
  nodeDetails: {
    status: 'in_progress',
    priority: 'high'
  }
};

// A template is a node
const template = {
  id: 'uuid-3',
  nodeType: 'TEMPLATE',
  title: 'Bug Report Template',
  nodeDetails: {
    fields: ['severity', 'steps', 'expected_behavior']
  }
};

// Even a context like a team is a node
const team = {
  id: 'uuid-4',
  nodeType: 'CONTEXT',
  title: 'Engineering Team',
  nodeDetails: {
    department: 'Engineering'
  }
};
```

### Node Structure

Every node has the same core structure:

```typescript
// See: task-manager-tutorial/src/client.ts:10-20
interface MujarradNode<T> {
  id: string;           // UUID, auto-generated
  spaceId: string;      // Which workspace this belongs to
  nodeType: string;     // REGULAR, CONTEXT, ASSUMPTION, or TEMPLATE
  title: string;        // Human-readable name
  slug: string;         // URL-safe identifier (auto-generated from title)
  content?: string;     // Optional long-form text content
  nodeDetails: T;       // Your custom data (generic JSON)
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
}
```

See implementation: [`src/client.ts:10-20`](../task-manager-tutorial/src/client.ts#L10-L20)

### Why This Matters

**One core entity type, infinite flexibility.**

New "types" emerge from properties (`nodeType`, `nodeDetails`), not schema changes. The same CRUD operations work for everything:

```javascript
// See: task-manager-tutorial/src/client.ts:85-105
// Same API for all node types
await client.createNode('User', 'CONTEXT', { email, role });
await client.createNode('Task', 'REGULAR', { status, priority });
await client.createNode('Template', 'TEMPLATE', { fields });

// Same retrieval methods
await client.getNode(userId);
await client.getNode(taskId);
await client.getNode(templateId);

// Same update operations
await client.updateNode(userId, { nodeDetails: { role: 'admin' } });
await client.updateNode(taskId, { nodeDetails: { status: 'done' } });
```

No schema migrations. No new tables. Just nodes.

See implementation: [`src/client.ts:85-135`](../task-manager-tutorial/src/client.ts#L85-L135)

### The Three Node Types

Nodes are classified by their `nodeType`:

| Type | Purpose | Examples |
|------|---------|----------|
| **CONTEXT** | Identity, scope, or contextual nodes | Users, teams, organizations, environments |
| **REGULAR** | Standard data entities (default) | Tasks, projects, documents, items |
| **TEMPLATE** | Reusable blueprints | Task templates, document templates |

We'll explore these in detail in [Node Types](./03-node-types.md).

## Principle 2: Relationships Define Structure

In traditional databases, structure is defined upfront with schemas. In Mujarrad, **structure emerges from relationships**.

### Relationships are Attributes

In Mujarrad, relationships between nodes are called **attributes** (edges in graph theory).

An attribute connects two nodes with a typed semantic relationship:

```javascript
// See: task-manager-tutorial/src/client.ts:153-170
// Project contains Task
await client.createAttribute(projectId, taskId, 'contains');

// User assigned to Task
await client.createAttribute(taskId, userId, 'assigned_to');

// Task depends on another Task
await client.createAttribute(task2Id, task1Id, 'depends_on');

// Task blocks another Task
await client.createAttribute(task1Id, task2Id, 'blocks');
```

See implementation: [`src/client.ts:153-177`](../task-manager-tutorial/src/client.ts#L153-L177)

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

### Common Relationship Types

| Verb | Meaning | Example |
|------|---------|---------|
| `contains` | Hierarchical structure | Project contains Task |
| `depends_on` | Dependencies and prerequisites | Task depends_on Task |
| `blocks` | Inverse of depends_on | Task blocks Task |
| `triggers` | Cause and effect | Event triggers Action |
| `references` | Cross-references | Document references Document |
| `next` | Sequential ordering | Step next Step |
| `calls` | Function invocations | Function calls Function |
| `assigned_to` | Assignment | Task assigned_to User |
| `owned_by` | Ownership | Project owned_by User |
| `has_member` | Membership | Team has_member User |

**You can create any relationship type you need.** The graph is flexible.

### Structure Emerges from Relationships

Instead of defining structure upfront:

```sql
-- Traditional: Define structure first
CREATE TABLE projects (id, name);
CREATE TABLE tasks (id, project_id, name, assignee_id);
CREATE TABLE task_dependencies (task_id, depends_on_task_id);
```

You discover structure from relationships:

```javascript
// Mujarrad: Structure emerges from connections
Project --contains--> Task
Task --depends_on--> Task
Task --assigned_to--> User
Task --blocks--> Task
```

The graph reveals the structure:

```
Website Redesign (Project)
  |
  |--contains--> Design homepage (Task)
  |                   |--assigned_to--> Alice (User)
  |
  |--contains--> Implement login (Task)
  |                   |--assigned_to--> Bob (User)
  |                   |--depends_on--> Design homepage (Task)
  |
  |--contains--> Write tests (Task)
                      |--assigned_to--> Carol (User)
                      |--depends_on--> Implement login (Task)
```

### Why This Matters

1. **No Schema Migrations** - Add new relationship types instantly
2. **Natural Modeling** - Relationships match how we think
3. **Flexible Structure** - Same data, multiple interpretations
4. **Easy Evolution** - Add complexity without breaking existing structure

## Principle 3: Graph Traversal

Once you have nodes connected by relationships, you need to navigate the graph.

Mujarrad provides two core traversal operations:

### getAncestors() - Walk Upward

Get all nodes that **this node depends on or is connected to** by following relationships backward.

```javascript
// See: task-manager-tutorial/src/client.ts:138-143
// Get all dependencies of a task
const ancestors = await client.getAncestors(taskId);

// ancestors includes:
// - Tasks that this task depends_on
// - Projects that contain this task
// - Templates this task was created_from
// - Any other nodes connected via incoming relationships
```

**Use case:** "What does this task need before it can start?"

See implementation: [`src/client.ts:138-143`](../task-manager-tutorial/src/client.ts#L138-L143)

### getDescendants() - Walk Downward

Get all nodes that **depend on this node or are contained by it** by following relationships forward.

```javascript
// See: task-manager-tutorial/src/client.ts:145-150
// Get all tasks in a project
const descendants = await client.getDescendants(projectId);

// descendants includes:
// - All tasks contained in the project
// - All milestones in the project
// - Recursively, any sub-tasks or nested items
```

**Use case:** "What will be affected if I change this project?"

See implementation: [`src/client.ts:145-150`](../task-manager-tutorial/src/client.ts#L145-L150)

### Real-World Example: Task Dependencies

```javascript
// Create tasks
const task1 = await client.createNode('Design mockup', 'REGULAR', {
  status: 'done',
  priority: 'high'
});

const task2 = await client.createNode('Implement UI', 'REGULAR', {
  status: 'in_progress',
  priority: 'high'
});

const task3 = await client.createNode('Write tests', 'REGULAR', {
  status: 'todo',
  priority: 'medium'
});

// Create dependencies
await client.createAttribute(task2.id, task1.id, 'depends_on');
await client.createAttribute(task3.id, task2.id, 'depends_on');

// Query: What does "Write tests" depend on?
const dependencies = await client.getAncestors(task3.id);
// Returns: [task2, task1] (all dependencies, including transitive)

// Query: What's blocked if "Design mockup" isn't done?
const blocked = await client.getDescendants(task1.id);
// Returns: [task2, task3] (all tasks that transitively depend on task1)
```

### Filtering Results

You can filter traversal results by node type, attributes, or details:

```javascript
// Get all tasks in a project (not comments or milestones)
const tasks = (await client.getDescendants(projectId))
  .filter(node => node.nodeType === 'REGULAR')
  .filter(node => node.nodeDetails.status !== 'done');

// Get all users assigned to tasks in a project
const allDescendants = await client.getDescendants(projectId);
const assignedUserIds = new Set();

for (const node of allDescendants) {
  const attributes = await client.getAttributes(node.id);
  attributes
    .filter(attr => attr.attributeName === 'assigned_to')
    .forEach(attr => assignedUserIds.add(attr.targetNodeId));
}

const users = await Promise.all(
  Array.from(assignedUserIds).map(id => client.getNode(id))
);
```

## Cyclic vs Acyclic Relationships

Mujarrad supports **cyclic graphs** for most relationships, but enforces **acyclic** for containment hierarchies.

### Containment Hierarchy: ACYCLIC

The `contains` relationship **must not have cycles**. This prevents navigation loops.

```javascript
// ✅ Valid: Linear containment
Project --contains--> Task --contains--> Subtask

// ❌ Invalid: Cyclic containment
Project --contains--> Task --contains--> Project  // ERROR!
```

**Why:** Prevents infinite loops when browsing hierarchies.

### All Other Relationships: CYCLES ALLOWED

Non-containment relationships **can have cycles**. This enables:

- State machines
- Recursive workflows
- Feedback loops
- Circular dependencies (with caution)

```javascript
// ✅ Valid: Cyclic dependencies
Task A --depends_on--> Task B
Task B --depends_on--> Task C
Task C --depends_on--> Task A  // Cycle allowed!

// ✅ Valid: Recursive references
Document --references--> Document (self-reference)

// ✅ Valid: Feedback loops
Event --triggers--> Action --triggers--> Event
```

**Safety:** The execution engine has limits (e.g., 10,000 iterations) to prevent infinite loops while allowing complex business logic.

## Putting It All Together

Here's a complete example demonstrating all three principles:

```javascript
import { MujarradClient } from './client.js';

const client = new MujarradClient(apiKey, secretKey, 'my-space');

// Principle 1: Everything is a Node
// ===================================

// Context nodes (identity)
const alice = await client.createNode('Alice', 'CONTEXT', {
  email: 'alice@example.com',
  role: 'developer'
});

const team = await client.createNode('Engineering', 'CONTEXT', {
  department: 'Engineering'
});

// Regular nodes (data)
const project = await client.createNode('Website Redesign', 'REGULAR', {
  status: 'active',
  deadline: '2026-06-01'
});

const task1 = await client.createNode('Design homepage', 'REGULAR', {
  status: 'done',
  priority: 'high'
});

const task2 = await client.createNode('Implement auth', 'REGULAR', {
  status: 'in_progress',
  priority: 'critical'
});

// Template nodes (blueprints)
const template = await client.createNode('Bug Template', 'TEMPLATE', {
  fields: ['severity', 'steps', 'expected']
});

// Principle 2: Relationships Define Structure
// ============================================

// Team membership
await client.createAttribute(team.id, alice.id, 'has_member');

// Project ownership
await client.createAttribute(project.id, alice.id, 'owned_by');

// Containment
await client.createAttribute(project.id, task1.id, 'contains');
await client.createAttribute(project.id, task2.id, 'contains');

// Assignment
await client.createAttribute(task1.id, alice.id, 'assigned_to');
await client.createAttribute(task2.id, alice.id, 'assigned_to');

// Dependencies
await client.createAttribute(task2.id, task1.id, 'depends_on');

// Principle 3: Graph Traversal
// =============================

// What tasks are in this project?
const projectTasks = await client.getDescendants(project.id);
console.log(`Project has ${projectTasks.length} tasks`);

// What does task2 depend on?
const dependencies = await client.getAncestors(task2.id);
console.log('Task 2 dependencies:', dependencies.map(d => d.title));

// What's assigned to Alice?
const allNodes = await client.listNodes();
const assignedToAlice = [];

for (const node of allNodes) {
  const attrs = await client.getAttributes(node.id);
  if (attrs.some(a => a.attributeName === 'assigned_to' && a.targetNodeId === alice.id)) {
    assignedToAlice.push(node);
  }
}

console.log('Assigned to Alice:', assignedToAlice.map(n => n.title));
```

## SQL vs Mujarrad Comparison

| SQL | Mujarrad |
|-----|----------|
| Row in a table | Node |
| Table definition + columns | Node type + nodeDetails |
| Foreign key + JOIN | Attribute (relationship) |
| Database / Schema | Space |
| `SELECT * FROM users WHERE role = 'admin'` | `nodes.filter(n => n.nodeDetails.role === 'admin')` |
| `SELECT ... JOIN ... ON ...` | `getAncestors()` or `getDescendants()` |
| ALTER TABLE (schema migration) | Just add nodes/relationships |
| Fixed structure | Emergent structure |

## What's Next

Now that you understand the core principles, dive deeper:

- **[Node Types](./03-node-types.md)** - CONTEXT, REGULAR, TEMPLATE explained
- **[Relationships](./04-relationships.md)** - The power of typed semantic relationships
- **[Task Manager Tutorial](./05-task-manager-tutorial.md)** - Build a real application
- **[Graph Traversal](./07-graph-traversal.md)** - Advanced querying patterns
