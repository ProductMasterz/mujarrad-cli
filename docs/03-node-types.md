# Understanding Node Types

**Implementation Files:** [seed.ts](../task-manager-tutorial/src/seed.ts) | [schema.ts](../task-manager-tutorial/src/schema.ts)

In Mujarrad, every node has a `nodeType` that classifies its role in the graph. There are three primary types:

1. **CONTEXT** - Identity, scope, and contextual nodes
2. **REGULAR** - Standard data entities (default)
3. **TEMPLATE** - Reusable blueprints

(Note: The backend also supports `ASSUMPTION` for hypothetical or draft data, but it's used less frequently.)

## Why Node Types Matter

Node types help you:
- **Organize data** - Separate identity (users, teams) from data (tasks, documents)
- **Query efficiently** - Filter by type: `nodes.filter(n => n.nodeType === 'CONTEXT')`
- **Model semantics** - Express intent: "This is a user" vs "This is a task"
- **Control behavior** - Different UI modes or permissions based on type

## CONTEXT Nodes

**CONTEXT nodes represent identity, scope, or contextual information.**

### What Are CONTEXT Nodes?

- **Users** - People who interact with the system
- **Teams** - Groups of users
- **Organizations** - Companies, departments, divisions
- **Environments** - Production, staging, development
- **Accounts** - Customer accounts, billing entities
- **Roles** - Permission groups

### Why CONTEXT?

CONTEXT nodes provide the "who", "where", and "under what circumstances" for your data.

They answer questions like:
- Who owns this project?
- Which team is responsible for this task?
- What environment is this configuration for?
- Who is this data scoped to?

### Example: Users and Teams

```javascript
// See: task-manager-tutorial/src/seed.ts:40-59
// Create a user (CONTEXT node)
const alice = await client.createNode('Alice Johnson', 'CONTEXT', {
  email: 'alice@example.com',
  name: 'Alice Johnson',
  role: 'developer',
  avatarUrl: 'https://example.com/avatars/alice.jpg'
});

// See: task-manager-tutorial/src/seed.ts:70-74
// Create a team (CONTEXT node)
const engineeringTeam = await client.createNode('Engineering Team', 'CONTEXT', {
  name: 'Engineering Team',
  department: 'Engineering'
});

// Connect them
await client.createAttribute(engineeringTeam.id, alice.id, 'has_member');
```

See implementation: [`src/seed.ts:40-80`](../task-manager-tutorial/src/seed.ts#L40-L80)

### When to Use CONTEXT

Use CONTEXT nodes when:
- The node represents an **identity** (user, account, organization)
- The node provides **scope** (team, environment, workspace)
- The node is a **context** for other data (role, permission group)

### CONTEXT in Queries

Filter by CONTEXT type to get all identity nodes:

```javascript
// Get all users
const users = await client.listNodes({ nodeType: 'CONTEXT' });
console.log('Users:', users.filter(n => n.nodeDetails.email));

// Get all teams
const teams = await client.listNodes({ nodeType: 'CONTEXT' });
console.log('Teams:', teams.filter(n => n.nodeDetails.department));
```

## REGULAR Nodes

**REGULAR nodes are standard data entities—the core of your application.**

### What Are REGULAR Nodes?

- **Tasks** - Work items, to-dos
- **Projects** - Collections of tasks
- **Documents** - Files, notes, articles
- **Items** - Products, inventory
- **Events** - Calendar events, logs
- **Comments** - Annotations, feedback
- **Milestones** - Project phases, deliverables

### Why REGULAR?

REGULAR is the **default node type**. It represents your actual data—the things your application works with.

### Example: Tasks and Projects

```javascript
// See: task-manager-tutorial/src/seed.ts:103-112
// Create a project (REGULAR node)
const project = await client.createNode('Website Redesign', 'REGULAR', {
  description: 'Complete redesign of company website',
  status: 'active',
  priority: 'high',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  budget: 50000
});

// See: task-manager-tutorial/src/seed.ts:138-149
// Create a task (REGULAR node)
const task = await client.createNode('Design homepage mockup', 'REGULAR', {
  description: 'Create initial homepage design mockups',
  status: 'in_progress',
  priority: 'high',
  estimatedHours: 8,
  dueDate: '2026-02-20',
  tags: ['design', 'ui']
});

// Connect them
await client.createAttribute(project.id, task.id, 'contains');

// Assign to a user
await client.createAttribute(task.id, alice.id, 'assigned_to');
```

See implementation: [`src/seed.ts:103-198`](../task-manager-tutorial/src/seed.ts#L103-L198)

### When to Use REGULAR

Use REGULAR nodes when:
- The node represents **data** (not identity or templates)
- The node is **specific** (not a reusable blueprint)
- The node is **concrete** (not hypothetical or draft)

This is the **default** type—most of your nodes will be REGULAR.

### REGULAR in Queries

Filter by nodeDetails to find specific REGULAR nodes:

```javascript
// Get all tasks
const allNodes = await client.listNodes();
const tasks = allNodes.filter(n =>
  n.nodeType === 'REGULAR' && n.nodeDetails.status
);

// Get all high-priority tasks
const highPriorityTasks = tasks.filter(t =>
  t.nodeDetails.priority === 'high' || t.nodeDetails.priority === 'critical'
);

// Get all incomplete tasks
const incompleteTasks = tasks.filter(t =>
  t.nodeDetails.status !== 'done' && t.nodeDetails.status !== 'completed'
);
```

## TEMPLATE Nodes

**TEMPLATE nodes are reusable blueprints for creating other nodes.**

### What Are TEMPLATE Nodes?

- **Task Templates** - Standard task definitions
- **Document Templates** - Pre-formatted documents
- **Project Templates** - Standard project structures
- **Form Templates** - Reusable form layouts
- **Workflow Templates** - Standard processes

### Why TEMPLATE?

Templates allow you to:
- **Standardize** - Ensure consistency across similar entities
- **Reuse** - Create new instances from blueprints
- **Evolve** - Update templates without changing existing instances
- **Onboard** - Provide starting points for users

### Example: Task Templates

```javascript
// See: task-manager-tutorial/src/seed.ts:84-91
// Create a bug report template
const bugTemplate = await client.createNode('Bug Report Template', 'TEMPLATE', {
  description: 'Template for reporting bugs',
  defaultPriority: 'high',
  defaultEstimatedHours: 4,
  tags: ['bug', 'priority'],
  isTemplate: true,  // Optional flag for additional metadata
  fields: ['severity', 'steps_to_reproduce', 'expected_behavior']
});

// See: task-manager-tutorial/src/seed.ts:93-100
// Create a feature template
const featureTemplate = await client.createNode('Feature Template', 'TEMPLATE', {
  description: 'Template for new features',
  defaultPriority: 'medium',
  defaultEstimatedHours: 16,
  tags: ['feature', 'enhancement'],
  isTemplate: true,
  fields: ['requirements', 'acceptance_criteria', 'design_notes']
});

// Use a template to create a task
const newBug = await client.createNode('Fix navigation bug', 'REGULAR', {
  description: 'Navigation menu not collapsing on mobile',
  status: 'todo',
  priority: bugTemplate.nodeDetails.defaultPriority,
  estimatedHours: bugTemplate.nodeDetails.defaultEstimatedHours,
  tags: bugTemplate.nodeDetails.tags
});

// Link to template
await client.createAttribute(newBug.id, bugTemplate.id, 'created_from');
```

See implementation: [`src/seed.ts:84-100`](../task-manager-tutorial/src/seed.ts#L84-L100)

### When to Use TEMPLATE

Use TEMPLATE nodes when:
- The node is a **blueprint** (not a specific instance)
- The node will be **reused** to create multiple instances
- The node defines **defaults** or **structure**

### TEMPLATE in Queries

```javascript
// Get all templates
const templates = await client.listNodes();
const taskTemplates = templates.filter(n =>
  n.nodeType === 'TEMPLATE' && n.nodeDetails.isTemplate
);

// Find instances created from a template
const instances = await client.getDescendants(templateId);
const createdFromTemplate = instances.filter(n =>
  n.nodeDetails.createdFrom === templateId
);

// Or use relationships
const allNodes = await client.listNodes();
for (const node of allNodes) {
  const attrs = await client.getAttributes(node.id);
  if (attrs.some(a => a.attributeName === 'created_from' && a.targetNodeId === templateId)) {
    console.log('Created from template:', node.title);
  }
}
```

## Node Type Comparison

| Type | Purpose | Examples | When to Use |
|------|---------|----------|-------------|
| **CONTEXT** | Identity, scope, context | Users, teams, organizations, environments | Represents "who" or "where" |
| **REGULAR** | Standard data entities | Tasks, projects, documents, items | Represents actual data (default) |
| **TEMPLATE** | Reusable blueprints | Task templates, document templates | Represents reusable patterns |

## Schema Definition with Node Types

When using the schema builder (advanced), you can specify node types for each entity:

```javascript
// See: task-manager-tutorial/src/schema.ts:26-99
// From schema.ts in task-manager-tutorial
export const SCHEMA = {
  entities: {
    User: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        role: { type: 'enum', values: ['admin', 'manager', 'developer'] }
      }
    },

    Team: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        department: { type: 'string' }
      }
    },

    Project: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['planning', 'active', 'completed'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high'] }
      }
    },

    Task: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['todo', 'in_progress', 'done'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high'] }
      }
    },

    TaskTemplate: {
      nodeType: 'TEMPLATE',
      fields: {
        description: { type: 'string' },
        defaultPriority: { type: 'enum', values: ['low', 'medium', 'high'] },
        isTemplate: { type: 'boolean' }
      }
    }
  }
};
```

See complete schema: [`src/schema.ts`](../task-manager-tutorial/src/schema.ts)

## Practical Guidelines

### Designing Your Node Types

1. **Start with REGULAR** - Default to REGULAR for most data
2. **Add CONTEXT for identity** - Create CONTEXT nodes for users, teams, accounts
3. **Use TEMPLATE sparingly** - Only when you have true reusable blueprints

### Common Patterns

#### Pattern 1: User + Data + Assignments

```javascript
// CONTEXT: Users
const alice = await client.createNode('Alice', 'CONTEXT', { email: '...' });
const bob = await client.createNode('Bob', 'CONTEXT', { email: '...' });

// REGULAR: Tasks
const task1 = await client.createNode('Task 1', 'REGULAR', { status: 'todo' });
const task2 = await client.createNode('Task 2', 'REGULAR', { status: 'in_progress' });

// Relationships: Assignments
await client.createAttribute(task1.id, alice.id, 'assigned_to');
await client.createAttribute(task2.id, bob.id, 'assigned_to');
```

#### Pattern 2: Teams + Projects + Ownership

```javascript
// CONTEXT: Teams
const team = await client.createNode('Engineering', 'CONTEXT', { department: '...' });

// REGULAR: Projects
const project = await client.createNode('Website', 'REGULAR', { status: 'active' });

// Relationships: Ownership
await client.createAttribute(project.id, team.id, 'owned_by');
```

#### Pattern 3: Templates + Instances

```javascript
// TEMPLATE: Bug template
const template = await client.createNode('Bug Template', 'TEMPLATE', {
  defaultPriority: 'high',
  fields: ['severity', 'steps']
});

// REGULAR: Actual bugs
const bug1 = await client.createNode('Bug #1', 'REGULAR', {
  priority: template.nodeDetails.defaultPriority,
  severity: 'critical'
});

// Relationships: Track template usage
await client.createAttribute(bug1.id, template.id, 'created_from');
```

## What's Next

Now that you understand node types, learn about the relationships that connect them:

- **[Relationships](./04-relationships.md)** - The power of typed semantic relationships
- **[Task Manager Tutorial](./05-task-manager-tutorial.md)** - See all node types in action
- **[API Basics](./06-api-basics.md)** - Create, read, update, delete nodes
