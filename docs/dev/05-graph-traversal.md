# Graph Traversal

Mujarrad stores data as a graph of connected nodes. This guide explains how to navigate that graph using ancestors, descendants, and attribute queries.

## How the Graph Works

When you create an attribute (relationship) between two nodes, you create a directed edge:

```
  Source Node ──attributeName──> Target Node
```

For example:
```
  Project ──contains──> Task
  Task    ──assigned_to──> User
  User    ──manages──> Project
```

The SDK provides two traversal methods:

| Method | Direction | Returns |
|--------|-----------|---------|
| `ancestors(nodeId)` | Up the graph | Nodes that point **to** this node |
| `descendants(nodeId)` | Down the graph | Nodes that this node points **to** |

## Descendants

`descendants()` returns all nodes reachable **from** a given node — its children, grandchildren, and so on.

```typescript
// Get all descendants of a project
const allNodes = await client.nodes.descendants(projectId);

console.log(`Project has ${allNodes.length} descendants`);
for (const node of allNodes) {
  console.log(`  ${node.nodeType}: ${node.title}`);
}
```

**Use cases:**
- "Show me all tasks in this project"
- "List all comments under this task"
- "Get the full tree below this node"

## Ancestors

`ancestors()` returns all nodes that point **to** a given node — its parents, grandparents, and so on.

```typescript
// Get all ancestors of a task
const parents = await client.nodes.ancestors(taskId);

console.log(`Task belongs to:`);
for (const node of parents) {
  console.log(`  ${node.nodeType}: ${node.title}`);
}
```

**Use cases:**
- "Which project does this task belong to?"
- "Who is this task assigned to?"
- "What's the full path from root to this node?"

## Querying Attributes Directly

To see the specific relationships on a node (not just the connected nodes), use `attributes.list()`:

```typescript
// Get all outgoing relationships from a node
const attrs = await client.attributes.list(nodeId);

for (const attr of attrs) {
  console.log(`  --${attr.attributeName}--> ${attr.targetNodeId}`);
  if (attr.attributeValue) {
    console.log(`    metadata: ${attr.attributeValue}`);
  }
}
```

This is useful when you need:
- The relationship type or metadata
- To filter by `attributeName` on the client side
- To update or delete specific relationships

## Building a Tree

Combine traversal with attribute queries to build hierarchical views:

```typescript
async function getProjectTree(projectId: string) {
  const project = await client.nodes.get(projectId);
  const attrs = await client.attributes.list(projectId);

  const children = [];
  for (const attr of attrs) {
    if (attr.attributeName === 'contains') {
      const child = await client.nodes.get(attr.targetNodeId);
      const childAttrs = await client.attributes.list(child.id);
      children.push({
        ...child,
        subtasks: childAttrs
          .filter(a => a.attributeName === 'contains')
          .map(a => a.targetNodeId),
      });
    }
  }

  return { project, children };
}
```

## Traversal Patterns

### Find All Tasks Assigned to a User

```typescript
async function getUserTasks(userId: string) {
  // Get descendants of the user node
  const related = await client.nodes.descendants(userId);

  // Or query attributes for "assigned_to" relationships pointing at this user
  // Since attributes are directional (Task -> User), we look at user's ancestors
  const tasks = await client.nodes.ancestors(userId);

  return tasks.filter(n => n.nodeType === 'REGULAR');
}
```

### Walk a Dependency Chain

```typescript
async function getDependencyChain(taskId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId = taskId;

  while (currentId) {
    const attrs = await client.attributes.list(currentId);
    const dep = attrs.find(a => a.attributeName === 'depends_on');

    if (dep) {
      chain.push(dep.targetNodeId);
      currentId = dep.targetNodeId;
    } else {
      break;
    }
  }

  return chain;
}
```

### Get the Full Subgraph

```typescript
async function getSubgraph(rootId: string) {
  const nodes = await client.nodes.descendants(rootId);
  const root = await client.nodes.get(rootId);

  const allNodeIds = [root.id, ...nodes.map(n => n.id)];
  const allAttributes = [];

  for (const nodeId of allNodeIds) {
    const attrs = await client.attributes.list(nodeId);
    allAttributes.push(...attrs);
  }

  return {
    nodes: [root, ...nodes],
    attributes: allAttributes,
  };
}
```

## Performance Tips

1. **Use `descendants()` instead of recursive `attributes.list()`** — The backend resolves the full subtree in a single query, which is faster than making one API call per node.

2. **Paginate `list()` calls** — When a space has many nodes, use pagination:
   ```typescript
   const page1 = await client.nodes.list({ page: 0, size: 50 });
   const page2 = await client.nodes.list({ page: 1, size: 50 });
   ```

3. **Filter by node type** — Narrow queries with `nodeType`:
   ```typescript
   const tasks = await client.nodes.list({ nodeType: 'REGULAR' });
   const users = await client.nodes.list({ nodeType: 'CONTEXT' });
   ```

4. **Batch reads where possible** — Use `batch.upload()` for bulk creation, and try to reduce round-trips by fetching descendants in one call rather than node-by-node.

## What's Next

- [Error Handling](./06-error-handling.md) — Handle traversal errors gracefully
- [Building a Todo App](./07-tutorial-todo-app.md) — Full example with traversal
- [API Reference](./08-api-reference.md) — Complete method signatures
