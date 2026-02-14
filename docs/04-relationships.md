# The Power of Relationships

In Mujarrad, **relationships define structure**. Nodes are connected by typed semantic relationships called **attributes** that create emergent patterns in your data.

## What Are Relationships?

In graph theory, relationships are called **edges**. In Mujarrad, we call them **attributes** because they:
- Connect two nodes (source → target)
- Have a typed name (verb like "contains", "depends_on")
- Can carry metadata (optional JSON value)
- Are directional (A → B is different from B → A)

### Attribute Structure

```typescript
interface MujarradAttribute {
  id: string;                // UUID, auto-generated
  sourceNodeId: string;      // The "from" node
  targetNodeId: string;      // The "to" node
  attributeName: string;     // The relationship verb (e.g., "contains")
  attributeType: string;     // Classification of the relationship
  attributeTypeMode: string; // TYPED or SCHEMALESS
  attributeValue?: string;   // Optional metadata (JSON string)
  createdAt: string;
  updatedAt: string;
}
```

### Visual Representation

```
┌─────────────┐                    ┌─────────────┐
│   Project   │   --contains-->    │    Task     │
│  (REGULAR)  │                    │  (REGULAR)  │
└─────────────┘                    └─────────────┘
     │                                    │
     │                                    │
     └─────────────────┐         ┌────────┘
                       │         │
                       ▼         ▼
               ┌──────────────────────┐
               │  MujarradAttribute   │
               │─────────────────────│
               │ sourceNodeId: proj  │
               │ targetNodeId: task  │
               │ attributeName: "contains" │
               │ attributeType: "project_task" │
               │ attributeTypeMode: "TYPED" │
               └──────────────────────┘
```

## Common Relationship Types

Mujarrad supports any relationship verb you need. Here are common patterns:

### Hierarchical Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `contains` | Parent-child hierarchy | Project contains Task | ❌ ACYCLIC |
| `part_of` | Inverse of contains | Task part_of Project | ❌ ACYCLIC |
| `has_child` | Explicit parent-child | Folder has_child File | ❌ ACYCLIC |

**Note:** Containment hierarchies MUST be acyclic to prevent navigation loops.

### Dependency Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `depends_on` | Prerequisite dependency | Task depends_on Task | ✅ CYCLIC |
| `blocks` | Inverse of depends_on | Task blocks Task | ✅ CYCLIC |
| `requires` | Hard requirement | Feature requires Module | ✅ CYCLIC |
| `enables` | Enablement | Module enables Feature | ✅ CYCLIC |

### Assignment Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `assigned_to` | Ownership/responsibility | Task assigned_to User | ✅ CYCLIC |
| `owned_by` | Ownership | Project owned_by User | ✅ CYCLIC |
| `managed_by` | Management | Project managed_by User | ✅ CYCLIC |
| `created_by` | Authorship | Document created_by User | ✅ CYCLIC |

### Membership Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `has_member` | Team membership | Team has_member User | ✅ CYCLIC |
| `member_of` | Inverse membership | User member_of Team | ✅ CYCLIC |
| `belongs_to` | Belonging | Asset belongs_to Organization | ✅ CYCLIC |

### Sequential Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `next` | Sequential ordering | Step next Step | ✅ CYCLIC |
| `previous` | Reverse sequential | Step previous Step | ✅ CYCLIC |
| `follows` | Sequence | Event follows Event | ✅ CYCLIC |

### Reference Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `references` | Cross-reference | Document references Document | ✅ CYCLIC |
| `links_to` | Hyperlink | Page links_to Page | ✅ CYCLIC |
| `mentions` | Citation | Post mentions User | ✅ CYCLIC |

### Trigger Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `triggers` | Cause-effect | Event triggers Action | ✅ CYCLIC |
| `calls` | Function invocation | Function calls Function | ✅ CYCLIC |
| `invokes` | Invocation | Workflow invokes Service | ✅ CYCLIC |

### Template Relationships

| Verb | Meaning | Example | Cyclic? |
|------|---------|---------|---------|
| `created_from` | Template instantiation | Task created_from Template | ✅ CYCLIC |
| `instance_of` | Type relationship | Object instance_of Class | ✅ CYCLIC |
| `based_on` | Derivation | Design based_on Mockup | ✅ CYCLIC |

## Creating Relationships

### Basic Creation

```javascript
// Create an attribute (relationship)
const attribute = await client.createAttribute(
  sourceNodeId,     // From node
  targetNodeId,     // To node
  'contains'        // Relationship verb
);
```

### With Metadata

Relationships can carry additional metadata:

```javascript
// Assignment with metadata
const attr = await client.createAttribute(
  taskId,
  userId,
  'assigned_to',
  {
    assignedDate: '2026-02-14',
    role: 'lead',
    estimatedHours: 8
  }
);

// The metadata is stored as a JSON string in attributeValue
console.log(attr.attributeValue); // '{"assignedDate":"2026-02-14","role":"lead",...}'
```

### Real-World Example: Project Management

```javascript
// Create nodes
const project = await client.createNode('Website Redesign', 'REGULAR', {
  status: 'active',
  deadline: '2026-06-01'
});

const milestone = await client.createNode('Phase 1: Design', 'REGULAR', {
  dueDate: '2026-03-31',
  status: 'in_progress'
});

const task1 = await client.createNode('Design homepage', 'REGULAR', {
  status: 'done',
  priority: 'high'
});

const task2 = await client.createNode('Implement auth', 'REGULAR', {
  status: 'in_progress',
  priority: 'critical'
});

const alice = await client.createNode('Alice', 'CONTEXT', {
  email: 'alice@example.com',
  role: 'developer'
});

// Create relationships
await client.createAttribute(project.id, milestone.id, 'has_milestone');
await client.createAttribute(milestone.id, task1.id, 'contains');
await client.createAttribute(milestone.id, task2.id, 'contains');
await client.createAttribute(task1.id, alice.id, 'assigned_to');
await client.createAttribute(task2.id, alice.id, 'assigned_to');
await client.createAttribute(task2.id, task1.id, 'depends_on');
```

The graph structure:

```
Project: Website Redesign
  │
  └── has_milestone --> Milestone: Phase 1: Design
                            │
                            ├── contains --> Task: Design homepage
                            │                  │
                            │                  ├── assigned_to --> User: Alice
                            │
                            └── contains --> Task: Implement auth
                                               │
                                               ├── assigned_to --> User: Alice
                                               ├── depends_on --> Task: Design homepage
```

## Querying Relationships

### Get All Relationships for a Node

```javascript
// Get all attributes where this node is the source
const attributes = await client.getAttributes(nodeId);

// Example: Find all tasks assigned to a user
const assignments = attributes.filter(attr =>
  attr.attributeName === 'assigned_to'
);

console.log('Assigned to:', assignments.map(a => a.targetNodeId));
```

### Find Nodes by Relationship

```javascript
// Find all tasks assigned to Alice
const allNodes = await client.listNodes();
const tasks = [];

for (const node of allNodes) {
  const attrs = await client.getAttributes(node.id);
  const hasAssignment = attrs.some(attr =>
    attr.attributeName === 'assigned_to' &&
    attr.targetNodeId === aliceId
  );

  if (hasAssignment) {
    tasks.push(node);
  }
}

console.log('Alice\'s tasks:', tasks.map(t => t.title));
```

### Traverse the Graph

Use `getAncestors()` and `getDescendants()` to walk relationships:

```javascript
// Get all tasks in a project (following "contains" relationships)
const projectTasks = await client.getDescendants(projectId);

// Get all dependencies of a task (following "depends_on" relationships)
const dependencies = await client.getAncestors(taskId);

// Check if a task is blocked
const blockedBy = dependencies.filter(dep =>
  dep.nodeDetails.status !== 'done'
);

if (blockedBy.length > 0) {
  console.log('Task is blocked by:', blockedBy.map(t => t.title));
}
```

## Cyclic vs Acyclic Relationships

### Containment: ACYCLIC Required

The `contains` relationship (and similar hierarchical verbs) **must not have cycles**.

```javascript
// ✅ Valid: Linear hierarchy
Project --contains--> Task --contains--> Subtask

// ❌ Invalid: Cyclic containment (will be rejected)
Task A --contains--> Task B --contains--> Task A  // ERROR!
```

**Why:** Prevents infinite loops when browsing hierarchies.

### All Other Relationships: CYCLES Allowed

Non-containment relationships **can have cycles**:

```javascript
// ✅ Valid: Cyclic dependencies (allowed, but use with caution)
Task A --depends_on--> Task B
Task B --depends_on--> Task C
Task C --depends_on--> Task A

// ✅ Valid: Self-references
Document --references--> Document (itself)

// ✅ Valid: Feedback loops
Event --triggers--> Action --triggers--> Event
```

**Safety:** The execution engine has limits (e.g., 10,000 iterations) to prevent infinite loops.

### Use Cases for Cycles

1. **State Machines**
   ```javascript
   State: Draft --next--> State: Review --next--> State: Approved
   State: Review --next--> State: Draft  // Cycle for revisions
   ```

2. **Recursive Workflows**
   ```javascript
   Step: Analyze --next--> Step: Implement --next--> Step: Test
   Step: Test --next--> Step: Analyze  // Cycle for iterations
   ```

3. **Circular Dependencies** (with caution)
   ```javascript
   Module A --depends_on--> Module B
   Module B --depends_on--> Module A
   // Both modules must be available simultaneously
   ```

## Attribute Type Modes

Attributes have two modes:

| Mode | When to Use | Validation |
|------|------------|------------|
| **TYPED** | Structured, schema-defined relationships | Validated against schema |
| **SCHEMALESS** | Free-form, ad-hoc connections | No validation |

```javascript
// TYPED: Schema-validated relationship
await client.createAttribute(
  projectId,
  taskId,
  'contains',
  null,
  'TYPED'
);

// SCHEMALESS: Free-form relationship
await client.createAttribute(
  nodeA,
  nodeB,
  'custom_relation',
  null,
  'SCHEMALESS'
);
```

**Default:** TYPED

## Relationship Metadata

Relationships can carry metadata in the `attributeValue` field:

```javascript
// Assignment with metadata
const attr = await client.createAttribute(
  taskId,
  userId,
  'assigned_to',
  {
    assignedDate: '2026-02-14',
    role: 'lead',
    estimatedHours: 8,
    priority: 'high'
  }
);

// Later, parse the metadata
const metadata = JSON.parse(attr.attributeValue);
console.log('Assigned on:', metadata.assignedDate);
console.log('Role:', metadata.role);
```

## Designing Your Relationships

### Best Practices

1. **Use semantic verbs** - Choose meaningful names: `assigned_to`, `contains`, `depends_on`
2. **Be consistent** - Use the same verb for the same relationship across your app
3. **Avoid cycles in hierarchies** - Keep `contains` acyclic
4. **Use metadata sparingly** - Store most data in nodes, not relationships
5. **Model intent** - Relationships should express "why" nodes are connected

### Common Mistakes

❌ **Don't use generic verbs:**
```javascript
// Bad: Unclear meaning
await client.createAttribute(nodeA, nodeB, 'relates_to');

// Good: Clear semantic meaning
await client.createAttribute(taskId, userId, 'assigned_to');
```

❌ **Don't store complex data in relationships:**
```javascript
// Bad: Complex data in attribute
await client.createAttribute(taskId, userId, 'assigned_to', {
  user: { name: 'Alice', email: '...', ... },
  history: [...]
});

// Good: Store data in nodes, use relationships for connections
const user = await client.createNode('Alice', 'CONTEXT', { email: '...' });
await client.createAttribute(taskId, user.id, 'assigned_to');
```

❌ **Don't create redundant relationships:**
```javascript
// Bad: Redundant inverse relationships
await client.createAttribute(projectId, taskId, 'contains');
await client.createAttribute(taskId, projectId, 'part_of');  // Redundant!

// Good: One direction is enough (can traverse both ways)
await client.createAttribute(projectId, taskId, 'contains');
// Query inverse: getAncestors(taskId) to find parent project
```

## SQL vs Graph Comparison

| SQL | Mujarrad Graph |
|-----|----------------|
| Foreign key | Attribute (relationship) |
| JOIN | Graph traversal (getAncestors/getDescendants) |
| Junction table | Direct relationship with metadata |
| Cascade delete | Manual traversal + delete |
| Many-to-many | Multiple attributes |

### Example: SQL vs Graph

**SQL Approach:**
```sql
CREATE TABLE projects (id, name);
CREATE TABLE tasks (id, project_id, name, assignee_id);
CREATE TABLE task_dependencies (task_id, depends_on_task_id);

SELECT t.* FROM tasks t
JOIN task_dependencies td ON t.id = td.task_id
WHERE td.depends_on_task_id = ?;
```

**Graph Approach:**
```javascript
// Create structure
const project = await client.createNode('Project', 'REGULAR', {});
const task1 = await client.createNode('Task 1', 'REGULAR', {});
const task2 = await client.createNode('Task 2', 'REGULAR', {});

await client.createAttribute(project.id, task1.id, 'contains');
await client.createAttribute(task2.id, task1.id, 'depends_on');

// Query: What depends on task1?
const dependents = await client.getDescendants(task1.id);
```

**Advantages:**
- No schema migrations
- Natural relationship modeling
- Single API call for traversal
- Flexible relationship types

## What's Next

Now that you understand relationships, see them in action:

- **[Task Manager Tutorial](./05-task-manager-tutorial.md)** - Build a real application with complex relationships
- **[Graph Traversal](./07-graph-traversal.md)** - Advanced querying and traversal patterns
- **[API Basics](./06-api-basics.md)** - Full CRUD operations for attributes
