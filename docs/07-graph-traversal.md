# Graph Traversal: Walking the Graph

Graph traversal is one of Mujarrad's most powerful features. Instead of complex SQL JOINs, you navigate relationships directly.

## Core Traversal Operations

Mujarrad provides two primary traversal methods:

1. **getAncestors()** - Walk upward (find dependencies)
2. **getDescendants()** - Walk downward (find dependents)

## getAncestors(): Find Dependencies

Walk upward in the graph to find all nodes that this node depends on or is connected to.

### Basic Usage

```javascript
const ancestors = await client.getAncestors(nodeId);

console.log(`Found ${ancestors.length} ancestors`);
ancestors.forEach(node => {
  console.log(`  - ${node.title} (${node.nodeType})`);
});
```

### Use Cases

- "What does this task depend on?"
- "Which users are assigned to this project (transitively)?"
- "What templates was this node created from?"
- "Which parent projects contain this task?"

### Example: Task Dependencies

```javascript
// Create tasks with dependencies
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

// Create dependency chain: task3 -> task2 -> task1
await client.createAttribute(task2.id, task1.id, 'depends_on');
await client.createAttribute(task3.id, task2.id, 'depends_on');

// Query: What does "Write tests" depend on?
const dependencies = await client.getAncestors(task3.id);

console.log('Dependencies:', dependencies.map(d => d.title));
// Output: ['Implement UI', 'Design mockup']

// Check if blocked
const blockedBy = dependencies.filter(dep =>
  dep.nodeDetails.status !== 'done'
);

if (blockedBy.length > 0) {
  console.log('Task is blocked by:', blockedBy.map(t => t.title));
}
```

### Example: Project Hierarchy

```javascript
// Create hierarchy: Project -> Milestone -> Task
const project = await client.createNode('Website Redesign', 'REGULAR', {
  status: 'active'
});

const milestone = await client.createNode('Phase 1: Design', 'REGULAR', {
  dueDate: '2026-03-31'
});

const task = await client.createNode('Design homepage', 'REGULAR', {
  status: 'in_progress'
});

await client.createAttribute(project.id, milestone.id, 'has_milestone');
await client.createAttribute(milestone.id, task.id, 'contains');

// Query: What hierarchy is this task part of?
const hierarchy = await client.getAncestors(task.id);

console.log('Task hierarchy:');
hierarchy.forEach(node => {
  console.log(`  ${node.nodeType}: ${node.title}`);
});
// Output:
//   REGULAR: Phase 1: Design
//   REGULAR: Website Redesign
```

## getDescendants(): Find Dependents

Walk downward in the graph to find all nodes that depend on this node or are contained by it.

### Basic Usage

```javascript
const descendants = await client.getDescendants(nodeId);

console.log(`Found ${descendants.length} descendants`);
descendants.forEach(node => {
  console.log(`  - ${node.title} (${node.nodeType})`);
});
```

### Use Cases

- "What tasks are in this project?"
- "What will be affected if I change this node?"
- "What's blocked if this task isn't done?"
- "All sub-tasks and nested items"

### Example: Project Tasks

```javascript
const project = await client.createNode('Website Redesign', 'REGULAR', {
  status: 'active'
});

const task1 = await client.createNode('Design homepage', 'REGULAR', {
  status: 'done'
});

const task2 = await client.createNode('Implement auth', 'REGULAR', {
  status: 'in_progress'
});

const task3 = await client.createNode('Write tests', 'REGULAR', {
  status: 'todo'
});

await client.createAttribute(project.id, task1.id, 'contains');
await client.createAttribute(project.id, task2.id, 'contains');
await client.createAttribute(project.id, task3.id, 'contains');

// Query: What tasks are in this project?
const projectTasks = await client.getDescendants(project.id);

console.log(`Project has ${projectTasks.length} tasks:`);
projectTasks.forEach(task => {
  console.log(`  - ${task.title}: ${task.nodeDetails.status}`);
});
```

### Example: Nested Hierarchies

```javascript
// Create nested structure: Project -> Task -> Subtask
const project = await client.createNode('E-commerce Platform', 'REGULAR', {});

const task = await client.createNode('Build checkout', 'REGULAR', {});
const subtask1 = await client.createNode('Payment integration', 'REGULAR', {});
const subtask2 = await client.createNode('Cart persistence', 'REGULAR', {});

await client.createAttribute(project.id, task.id, 'contains');
await client.createAttribute(task.id, subtask1.id, 'contains');
await client.createAttribute(task.id, subtask2.id, 'contains');

// Query: All work in project (including nested tasks)
const allWork = await client.getDescendants(project.id);

console.log(`Total work items: ${allWork.length}`);
// Output: 3 (task, subtask1, subtask2)
```

## Filtering Results

### Filter by Node Type

```javascript
const descendants = await client.getDescendants(projectId);

// Get only tasks (not milestones or comments)
const tasks = descendants.filter(n => n.nodeType === 'REGULAR');

// Get only users
const users = descendants.filter(n => n.nodeType === 'CONTEXT');
```

### Filter by Node Details

```javascript
const projectTasks = await client.getDescendants(projectId);

// Get incomplete tasks
const incompleteTasks = projectTasks.filter(t =>
  t.nodeDetails.status !== 'done' && t.nodeDetails.status !== 'completed'
);

// Get high-priority tasks
const highPriorityTasks = projectTasks.filter(t =>
  t.nodeDetails.priority === 'high' || t.nodeDetails.priority === 'critical'
);

// Get tasks due soon
const today = new Date();
const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

const dueThisWeek = projectTasks.filter(t => {
  if (!t.nodeDetails.dueDate) return false;
  const dueDate = new Date(t.nodeDetails.dueDate);
  return dueDate >= today && dueDate <= oneWeek;
});
```

### Filter by Relationship Type

```javascript
// Find all nodes with a specific relationship
const allDescendants = await client.getDescendants(projectId);

for (const node of allDescendants) {
  const attrs = await client.getAttributes(node.id);

  // Find nodes assigned to a user
  const isAssigned = attrs.some(a =>
    a.attributeName === 'assigned_to' && a.targetNodeId === userId
  );

  if (isAssigned) {
    console.log('Assigned to user:', node.title);
  }
}
```

## Complex Queries

### Multi-Level Filtering

```javascript
// Find all incomplete, high-priority tasks assigned to Alice in a project
const projectTasks = await client.getDescendants(projectId);

const filtered = [];

for (const task of projectTasks) {
  // Filter by node details
  if (task.nodeType !== 'REGULAR') continue;
  if (task.nodeDetails.status === 'done') continue;
  if (task.nodeDetails.priority !== 'high' && task.nodeDetails.priority !== 'critical') continue;

  // Filter by relationship
  const attrs = await client.getAttributes(task.id);
  const isAssignedToAlice = attrs.some(a =>
    a.attributeName === 'assigned_to' && a.targetNodeId === aliceId
  );

  if (isAssignedToAlice) {
    filtered.push(task);
  }
}

console.log('Critical tasks for Alice:', filtered.map(t => t.title));
```

### Finding Blocked Tasks

```javascript
// Find all tasks blocked by incomplete dependencies
const allTasks = await client.listNodes();
const blockedTasks = [];

for (const task of allTasks) {
  if (task.nodeType !== 'REGULAR') continue;
  if (task.nodeDetails.status === 'done') continue;

  // Get dependencies
  const dependencies = await client.getAncestors(task.id);

  // Check if any dependency is incomplete
  const hasIncompleteDep = dependencies.some(dep =>
    dep.nodeDetails.status && dep.nodeDetails.status !== 'done'
  );

  if (hasIncompleteDep) {
    blockedTasks.push({
      task,
      blockedBy: dependencies.filter(d => d.nodeDetails.status !== 'done')
    });
  }
}

blockedTasks.forEach(({ task, blockedBy }) => {
  console.log(`${task.title} is blocked by:`);
  blockedBy.forEach(dep => {
    console.log(`  - ${dep.title} (${dep.nodeDetails.status})`);
  });
});
```

### Finding Critical Path

```javascript
// Find the longest dependency chain in a project
async function findCriticalPath(projectId) {
  const tasks = await client.getDescendants(projectId);

  let longestPath = [];
  let maxLength = 0;

  for (const task of tasks) {
    const dependencies = await client.getAncestors(task.id);
    if (dependencies.length > maxLength) {
      maxLength = dependencies.length;
      longestPath = [task, ...dependencies];
    }
  }

  return longestPath;
}

const criticalPath = await findCriticalPath(projectId);
console.log('Critical path:');
criticalPath.forEach((node, i) => {
  console.log(`  ${i + 1}. ${node.title}`);
});
```

## Aggregation and Statistics

### Task Distribution by Status

```javascript
const projectTasks = await client.getDescendants(projectId);

const statusGroups = {};

projectTasks.forEach(task => {
  const status = task.nodeDetails.status || 'unknown';
  statusGroups[status] = (statusGroups[status] || 0) + 1;
});

console.log('Task distribution:');
Object.entries(statusGroups).forEach(([status, count]) => {
  console.log(`  ${status}: ${count}`);
});
```

### Workload Analysis

```javascript
// Calculate total estimated hours by user
const allTasks = await client.listNodes();
const userWorkload = {};

for (const task of allTasks) {
  if (task.nodeType !== 'REGULAR') continue;

  const attrs = await client.getAttributes(task.id);
  const assignment = attrs.find(a => a.attributeName === 'assigned_to');

  if (assignment) {
    const userId = assignment.targetNodeId;
    const hours = task.nodeDetails.estimatedHours || 0;

    userWorkload[userId] = (userWorkload[userId] || 0) + hours;
  }
}

// Get user names
for (const [userId, hours] of Object.entries(userWorkload)) {
  const user = await client.getNode(userId);
  console.log(`${user.title}: ${hours} hours`);
}
```

### Completion Percentage

```javascript
const projectTasks = await client.getDescendants(projectId);

const total = projectTasks.length;
const completed = projectTasks.filter(t => t.nodeDetails.status === 'done').length;

const percentage = Math.round((completed / total) * 100);

console.log(`Project completion: ${completed}/${total} (${percentage}%)`);
```

## Performance Considerations

### Caching Results

For frequently accessed data, cache traversal results:

```javascript
const cache = new Map();

async function getCachedDescendants(nodeId) {
  if (!cache.has(nodeId)) {
    cache.set(nodeId, await client.getDescendants(nodeId));
  }
  return cache.get(nodeId);
}

// Use cached version
const tasks = await getCachedDescendants(projectId);
```

### Limiting Depth

For deep hierarchies, consider limiting traversal depth:

```javascript
async function getDescendantsWithDepth(nodeId, maxDepth = 3) {
  // This is a conceptual example - actual implementation may vary
  const visited = new Set();
  const results = [];

  async function traverse(id, depth) {
    if (depth > maxDepth) return;
    if (visited.has(id)) return;

    visited.add(id);

    const descendants = await client.getDescendants(id);
    results.push(...descendants);

    for (const node of descendants) {
      await traverse(node.id, depth + 1);
    }
  }

  await traverse(nodeId, 0);
  return results;
}
```

## SQL vs Graph Comparison

### SQL: Complex JOINs

```sql
-- Find all tasks assigned to Alice in active projects
SELECT t.*
FROM tasks t
JOIN project_tasks pt ON t.id = pt.task_id
JOIN projects p ON pt.project_id = p.id
JOIN task_assignments ta ON t.id = ta.task_id
JOIN users u ON ta.user_id = u.id
WHERE p.status = 'active'
  AND u.email = 'alice@example.com'
  AND t.status != 'done';
```

### Mujarrad: Simple Traversal

```javascript
// Find all tasks assigned to Alice in active projects
const projects = await client.listNodes();
const activeProjects = projects.filter(p =>
  p.nodeType === 'REGULAR' && p.nodeDetails.status === 'active'
);

const aliceTasks = [];

for (const project of activeProjects) {
  const tasks = await client.getDescendants(project.id);

  for (const task of tasks) {
    if (task.nodeDetails.status === 'done') continue;

    const attrs = await client.getAttributes(task.id);
    const isAssignedToAlice = attrs.some(a =>
      a.attributeName === 'assigned_to' && a.targetNodeId === aliceId
    );

    if (isAssignedToAlice) {
      aliceTasks.push(task);
    }
  }
}
```

**Advantages:**
- No complex JOIN syntax
- Natural, readable code
- Easy to extend with more filters
- Type-safe (TypeScript)

## What's Next

- **[Best Practices](./08-best-practices.md)** - Production-ready patterns
- **[CLI Reference](./09-cli-reference.md)** - Command-line tools
- **[Task Manager Tutorial](./05-task-manager-tutorial.md)** - See traversal in action
