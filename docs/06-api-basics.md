# API Basics: Using the Mujarrad API

**Implementation Files:** [client.ts](../task-manager-tutorial/src/client.ts) | [server.ts](../task-manager-tutorial/server.ts)

This guide covers the fundamental API operations for working with Mujarrad: authentication, CRUD operations, and basic queries.

## Authentication

Mujarrad uses API key authentication with a public key and secret key pair.

### Getting Your API Keys

1. Sign up at [mujarrad.com](https://mujarrad.com)
2. Navigate to Settings → API Keys
3. Generate a new API key pair
4. Save both the public key (starts with `pk_`) and secret key (starts with `sk_`)

### Using API Keys

```javascript
// See: task-manager-tutorial/src/client.ts:70-82
import { MujarradClient } from './client.js';

const client = new MujarradClient(
  'pk_live_your_public_key',     // Public key
  'sk_live_your_secret_key',     // Secret key
  'my-workspace'                 // Space slug
);
```

See implementation: [`src/client.ts:70-82`](../task-manager-tutorial/src/client.ts#L70-L82) | [`src/seed.ts:24`](../task-manager-tutorial/src/seed.ts#L24)

### Environment Variables (Recommended)

Store keys in `.env`:

```bash
MUJARRAD_API_PUBLIC_KEY=pk_live_your_public_key
MUJARRAD_API_SECRET_KEY=sk_live_your_secret_key
MUJARRAD_SPACE_SLUG=my-workspace
```

Load them in your code:

```javascript
import dotenv from 'dotenv';
dotenv.config();

const client = new MujarradClient(
  process.env.MUJARRAD_API_PUBLIC_KEY!,
  process.env.MUJARRAD_API_SECRET_KEY!,
  process.env.MUJARRAD_SPACE_SLUG!
);
```

## Node CRUD Operations

### Create a Node

```javascript
// See: task-manager-tutorial/src/client.ts:85-105
const node = await client.createNode(
  'Task Title',           // title
  'REGULAR',              // nodeType: REGULAR, CONTEXT, TEMPLATE, ASSUMPTION
  {                       // nodeDetails (your custom data)
    status: 'todo',
    priority: 'high',
    estimatedHours: 8
  }
);

console.log('Created node:', node.id);
```

**Parameters:**
- `title` (string, required): Human-readable name
- `nodeType` (string, required): REGULAR, CONTEXT, TEMPLATE, or ASSUMPTION
- `nodeDetails` (object, required): Your custom data (any JSON)

**Returns:** Created node with auto-generated `id`, `slug`, `createdAt`, `updatedAt`

See implementation: [`src/client.ts:85-105`](../task-manager-tutorial/src/client.ts#L85-L105)

### Read a Node

```javascript
const node = await client.getNode('node-id-here');

console.log('Title:', node.title);
console.log('Type:', node.nodeType);
console.log('Details:', node.nodeDetails);
```

**Parameters:**
- `nodeId` (string, required): UUID of the node

**Returns:** Node object or throws error if not found

### Update a Node

```javascript
const updated = await client.updateNode('node-id-here', {
  title: 'Updated Title',
  nodeDetails: {
    status: 'in_progress',
    priority: 'critical'
  }
});

console.log('Updated:', updated.title);
```

**Parameters:**
- `nodeId` (string, required): UUID of the node
- `updates` (object, required): Fields to update (partial update)

**Returns:** Updated node object

**Note:** `nodeDetails` is merged, not replaced. To remove a field, explicitly set it to `null` or `undefined`.

### Delete a Node

```javascript
await client.deleteNode('node-id-here');

console.log('Node deleted');
```

**Parameters:**
- `nodeId` (string, required): UUID of the node

**Returns:** Nothing (void)

**Warning:** Deleting a node does not automatically delete its relationships. Consider traversing and cleaning up related nodes first.

## Listing and Filtering Nodes

### List All Nodes

```javascript
const allNodes = await client.listNodes();

console.log(`Total nodes: ${allNodes.length}`);
```

### Filter by Node Type

```javascript
// Get all CONTEXT nodes (users, teams)
const contextNodes = await client.listNodes({ nodeType: 'CONTEXT' });

// Get all REGULAR nodes (tasks, projects)
const regularNodes = await client.listNodes({ nodeType: 'REGULAR' });

// Get all TEMPLATE nodes
const templates = await client.listNodes({ nodeType: 'TEMPLATE' });
```

### Filter by Node Details

```javascript
// Client-side filtering (after fetching all nodes)
const allNodes = await client.listNodes();

// Filter by status
const todoTasks = allNodes.filter(n =>
  n.nodeType === 'REGULAR' && n.nodeDetails.status === 'todo'
);

// Filter by priority
const highPriorityTasks = allNodes.filter(n =>
  n.nodeDetails.priority === 'high' || n.nodeDetails.priority === 'critical'
);

// Complex filter
const criticalIncompleteTasks = allNodes.filter(n =>
  n.nodeType === 'REGULAR' &&
  n.nodeDetails.priority === 'critical' &&
  n.nodeDetails.status !== 'done'
);
```

**Note:** The API currently returns all nodes in a space. For large datasets, implement pagination or server-side filtering.

## Relationship (Attribute) Operations

### Create a Relationship

```javascript
// See: task-manager-tutorial/src/client.ts:153-170
const attribute = await client.createAttribute(
  sourceNodeId,           // From node
  targetNodeId,           // To node
  'contains'              // Relationship verb
);

console.log('Created relationship:', attribute.id);
```

**Parameters:**
- `sourceNodeId` (string, required): UUID of the source node
- `targetNodeId` (string, required): UUID of the target node
- `attributeName` (string, required): Relationship verb (e.g., 'contains', 'assigned_to')
- `metadata` (object, optional): Additional data on the relationship

**Returns:** Created attribute object

See implementation: [`src/client.ts:153-170`](../task-manager-tutorial/src/client.ts#L153-L170)

### With Metadata

```javascript
const attribute = await client.createAttribute(
  taskId,
  userId,
  'assigned_to',
  {
    assignedDate: '2026-02-14',
    role: 'lead',
    estimatedHours: 8
  }
);

// Metadata is stored as JSON string
console.log('Metadata:', JSON.parse(attribute.attributeValue));
```

### Get All Relationships for a Node

```javascript
const attributes = await client.getAttributes(nodeId);

console.log(`Node has ${attributes.length} relationships`);

attributes.forEach(attr => {
  console.log(`${attr.attributeName} → ${attr.targetNodeId}`);
});
```

**Parameters:**
- `nodeId` (string, required): UUID of the node

**Returns:** Array of attribute objects

### Find Related Nodes

```javascript
// Find all nodes assigned to a user
const allNodes = await client.listNodes();
const assignedToUser = [];

for (const node of allNodes) {
  const attrs = await client.getAttributes(node.id);
  const hasAssignment = attrs.some(a =>
    a.attributeName === 'assigned_to' && a.targetNodeId === userId
  );

  if (hasAssignment) {
    assignedToUser.push(node);
  }
}

console.log('Assigned to user:', assignedToUser.map(n => n.title));
```

## Graph Traversal

### Get Ancestors (Dependencies)

Walk upward in the graph to find all nodes this node depends on:

```javascript
// See: task-manager-tutorial/src/client.ts:138-143
const ancestors = await client.getAncestors(nodeId);

console.log(`Found ${ancestors.length} ancestors`);
ancestors.forEach(node => {
  console.log(`  - ${node.title}`);
});
```

**Use case:** "What does this task depend on?"

**Returns:** Array of nodes (ancestors, including transitive dependencies)

See implementation: [`src/client.ts:138-143`](../task-manager-tutorial/src/client.ts#L138-L143)

### Get Descendants (Dependents)

Walk downward in the graph to find all nodes that depend on this node:

```javascript
// See: task-manager-tutorial/src/client.ts:145-150
const descendants = await client.getDescendants(nodeId);

console.log(`Found ${descendants.length} descendants`);
descendants.forEach(node => {
  console.log(`  - ${node.title}`);
});
```

**Use case:** "What will be affected if I change this project?"

**Returns:** Array of nodes (descendants, including nested children)

See implementation: [`src/client.ts:145-150`](../task-manager-tutorial/src/client.ts#L145-L150)

### Example: Task Dependencies

```javascript
// Create tasks
const task1 = await client.createNode('Design mockup', 'REGULAR', {
  status: 'done'
});

const task2 = await client.createNode('Implement UI', 'REGULAR', {
  status: 'in_progress'
});

const task3 = await client.createNode('Write tests', 'REGULAR', {
  status: 'todo'
});

// Create dependencies
await client.createAttribute(task2.id, task1.id, 'depends_on');
await client.createAttribute(task3.id, task2.id, 'depends_on');

// Query: What does task3 depend on?
const dependencies = await client.getAncestors(task3.id);
console.log('Task 3 depends on:', dependencies.map(d => d.title));
// Output: ['Implement UI', 'Design mockup']

// Query: What's blocked if task1 isn't done?
const blocked = await client.getDescendants(task1.id);
console.log('Blocked tasks:', blocked.map(d => d.title));
// Output: ['Implement UI', 'Write tests']
```

## Space Operations

### Get Space by Slug

```javascript
const space = await client.getSpaceBySlug('my-workspace');

console.log('Space:', space.name);
console.log('ID:', space.id);
```

### Create a Space

```javascript
const space = await client.createSpace(
  'My Workspace',      // name
  'my-workspace'       // slug (optional, auto-generated from name)
);

console.log('Created space:', space.slug);
```

**Note:** Each client instance is scoped to a single space (specified in constructor).

## Error Handling

### Basic Error Handling

```javascript
try {
  const node = await client.getNode('non-existent-id');
} catch (error) {
  console.error('Error:', error.message);
}
```

### Handling API Errors

```javascript
try {
  const node = await client.createNode('Task', 'REGULAR', {
    status: 'todo'
  });
} catch (error) {
  if (error.response) {
    // API returned an error response
    console.error('API Error:', error.response.data);
    console.error('Status:', error.response.status);
  } else if (error.request) {
    // Request was made but no response received
    console.error('Network Error:', error.message);
  } else {
    // Something else went wrong
    console.error('Error:', error.message);
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API keys | Check your public and secret keys |
| 404 Not Found | Node or space doesn't exist | Verify the ID or slug |
| 400 Bad Request | Invalid data format | Check your request payload |
| 500 Internal Server Error | Server issue | Retry or contact support |

## Best Practices

### 1. Use Environment Variables for API Keys

❌ Don't hardcode keys:
```javascript
const client = new MujarradClient('pk_live_...', 'sk_live_...', 'space');
```

✅ Use environment variables:
```javascript
const client = new MujarradClient(
  process.env.MUJARRAD_API_PUBLIC_KEY!,
  process.env.MUJARRAD_API_SECRET_KEY!,
  process.env.MUJARRAD_SPACE_SLUG!
);
```

### 2. Handle Errors Gracefully

❌ Don't ignore errors:
```javascript
const node = await client.getNode(id);  // Might throw!
```

✅ Use try-catch:
```javascript
try {
  const node = await client.getNode(id);
  console.log('Found:', node.title);
} catch (error) {
  console.error('Node not found:', id);
}
```

### 3. Batch Related Operations

❌ Don't create nodes one-by-one in loops:
```javascript
for (const item of items) {
  await client.createNode(item.title, 'REGULAR', item.details);  // Slow!
}
```

✅ Use Promise.all for parallel operations:
```javascript
const promises = items.map(item =>
  client.createNode(item.title, 'REGULAR', item.details)
);
const nodes = await Promise.all(promises);  // Fast!
```

### 4. Cache Frequently Accessed Nodes

❌ Don't fetch the same node repeatedly:
```javascript
const node1 = await client.getNode(id);  // API call
const node2 = await client.getNode(id);  // Redundant API call
```

✅ Cache nodes in memory:
```javascript
const nodeCache = new Map();

async function getCachedNode(id) {
  if (!nodeCache.has(id)) {
    nodeCache.set(id, await client.getNode(id));
  }
  return nodeCache.get(id);
}
```

### 5. Use Meaningful Relationship Names

❌ Don't use generic verbs:
```javascript
await client.createAttribute(nodeA, nodeB, 'relates_to');  // Unclear
```

✅ Use semantic verbs:
```javascript
await client.createAttribute(taskId, userId, 'assigned_to');  // Clear
await client.createAttribute(projectId, taskId, 'contains');  // Clear
```

## Try It Now

Ready to see these concepts in action? Run the task-manager-tutorial:

```bash
# Navigate to tutorial
cd task-manager-tutorial

# Install dependencies
npm install

# Set up your API keys in .env
# (Copy your keys from mujarrad.com)

# Populate sample data
npm run seed

# Run demo queries
npm run demo

# Start the dashboard
npm start
# Open http://localhost:3000
```

**What to explore:**
1. **seed.ts** - See how nodes are created with different types
2. **demo.ts** - See query patterns in action
3. **server.ts** - See how API endpoints are built
4. **Dashboard** - Interact with the data visually

**Files to study:**
- [`src/client.ts`](../task-manager-tutorial/src/client.ts) - Complete MujarradClient implementation
- [`src/seed.ts`](../task-manager-tutorial/src/seed.ts) - Creating nodes and relationships
- [`src/demo.ts`](../task-manager-tutorial/src/demo.ts) - Query examples
- [`server.ts`](../task-manager-tutorial/server.ts) - REST API with caching

## What's Next

- **[Graph Traversal](./07-graph-traversal.md)** - Advanced querying patterns
- **[Best Practices](./08-best-practices.md)** - Production-ready patterns
- **[CLI Reference](./09-cli-reference.md)** - Command-line tools
