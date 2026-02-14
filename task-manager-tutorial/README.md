# Task Manager Tutorial 📋

A comprehensive tutorial demonstrating **Mujarrad's graph-based data platform** through a real-world project task management system.

## 🎯 Learning Objectives

This tutorial shows you how to:
- ✅ Model complex relationships in a graph (dependencies, assignments, milestones)
- ✅ Use Mujarrad's node types (CONTEXT, REGULAR, TEMPLATE)
- ✅ Perform powerful graph traversals (ancestors, descendants)
- ✅ Query data by relationships rather than foreign keys
- ✅ Understand the advantages of graph databases over SQL

## 📊 The Data Model

### Nodes (Entities)

| Type | Node Type | Purpose |
|-------|-----------|---------|
| User | CONTEXT | Team members |
| Team | CONTEXT | Departments/Teams |
| Project | REGULAR | Projects being managed |
| Task | REGULAR | Individual work items |
| Milestone | REGULAR | Project milestones |
| Comment | REGULAR | Task discussions |
| TaskTemplate | TEMPLATE | Reusable task blueprints |

### Relationships (Attributes)

```
Project --contains--> Task
  Task --depends_on--> Task
  Task --assigned_to--> User
  Task --blocks--> Task
Project --has_milestone--> Milestone
  Milestone --contains--> Task
  Task --has_comment--> Comment
  Team --has_member--> User
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Mujarrad account (sign up at https://www.mujarrad.com)
- Tutorial is pre-configured with credentials: admin@wider.community

### Installation

```bash
npm install
```

### Running the Tutorial

**Option 1: CLI Only**
```bash
npm run seed      # Create sample data
npm run demo      # Run query demonstrations
```

**Option 2: With Web Server** 🌐
```bash
npm start         # Start local server (port 3000)
# Then open: http://localhost:3000
```

The web server provides:
- 📊 **Live Dashboard**: View and interact with data in real-time
- 🔍 **Filters**: Filter tasks by status and priority
- 👥 **Team View**: See all team members
- 💻 **Query Examples**: Auto-generated code based on your filters
- 🔄 **API Endpoints**: Interact with backend directly

### Step 1: Seed Sample Data

Populate the database with realistic project data:

```bash
npm run seed
```

This creates:
- 4 Users (Alice, Bob, Carol, David)
- 2 Teams (Development, Design)
- 1 Project (Website Redesign)
- 3 Milestones
- 6 Tasks (with dependencies, assignments, comments)
- 2 Task Templates
- Multiple relationships connecting everything

### Step 2: Explore the Graph

Run the interactive demo:

```bash
npm run demo
```

The demo demonstrates 6 powerful queries:

1. **Get All Tasks** - Basic node listing
2. **Task Dependencies** - Graph traversal via `getAncestors()`
3. **Blocked Tasks** - Reverse traversal via `getDescendants()`
4. **Team Workload** - Filter by assignment attributes
5. **Critical Tasks** - Complex filtering + traversal
6. **Milestone Progress** - Descendants + status counting

## 🎓 Key Concepts

### 1. Node Types

```typescript
// CONTEXT nodes represent identity
const user = await createNode('Alice Johnson', 'CONTEXT', {
  email: 'alice@example.com',
  role: 'developer',
});

// REGULAR nodes hold data
const task = await createNode('Fix bug', 'REGULAR', {
  status: 'todo',
  priority: 'high',
});

// TEMPLATE nodes are reusable blueprints
const template = await createNode('Bug Template', 'TEMPLATE', {
  defaultPriority: 'high',
  defaultEstimatedHours: 4,
});
```

### 2. Attributes (Relationships)

```typescript
// Create a relationship
await client.createAttribute(taskId, userId, 'assigned_to');

// Query relationships
const attrs = await client.getAttributes(taskId);
const assignment = attrs.find(a => a.attributeName === 'assigned_to');
```

### 3. Graph Traversal

**The power of Mujarrad:**

```typescript
// Find all tasks that Task A depends on
const dependencies = await client.getAncestors(taskA.id);
// One API call, instant results!

// Find all tasks blocked by Task A
const blockedTasks = await client.getDescendants(taskA.id);
// One API call, complete dependency chain!
```

**SQL Equivalent (much more complex):**

```sql
SELECT t.* FROM tasks t
JOIN task_dependencies td ON t.id = td.dependent_id
JOIN tasks pt ON td.prerequisite_id = pt.id
WHERE td.prerequisite_id = ?
ORDER BY td.depth;
```

## 📝 Code Structure

```
src/
├── client.ts       # HTTP client wrapper for Mujarrad API
├── schema.ts      # Data model and relationships documentation
├── seed.ts        # Sample data generation
└── demo.ts        # Query demonstrations
```

## 🎯 Real-World Use Cases

### Use Case 1: Dependency Impact Analysis

**Question:** "If Task A is delayed, what other tasks are affected?"

```typescript
const blockedTasks = await client.getDescendants(taskA.id);
blockedTasks.forEach(task => {
  console.log(`⚠️  ${task.title} will be delayed`);
});
```

### Use Case 2: Workload Balancing

**Question:** "Who has the most critical tasks?"

```typescript
const users = await listNodes({ nodeType: 'CONTEXT' });
for (const user of users) {
  const assignedTasks = await getAssignedTasks(user.id);
  const criticalCount = assignedTasks.filter(t =>
    t.nodeDetails.priority === 'critical'
  ).length;
  console.log(`${user.title}: ${criticalCount} critical tasks`);
}
```

### Use Case 3: Project Health Dashboard

**Question:** "What's our project progress by milestone?"

```typescript
const project = await listNodes().find(n => n.title === 'Website Redesign');
const milestones = await getMilestones(project.id);

for (const milestone of milestones) {
  const tasks = await getDescendants(milestone.id);
  const completed = tasks.filter(t => t.nodeDetails.status === 'done').length;
  console.log(`${milestone.title}: ${completed}/${tasks.length} complete`);
}
```

## 🔍 Why Graph Model?

### SQL Approach
- ❌ Multiple tables (Users, Tasks, Dependencies, Assignments, Comments)
- ❌ Complex JOINs for simple queries
- ❌ N+1 query problem when traversing relationships
- ❌ Schema migrations for new relationship types

### Graph Approach (Mujarrad)
- ✅ Single concept: Everything is a node
- ✅ Natural modeling: Relationships are edges
- ✅ Efficient traversal: One API call for dependencies
- ✅ Flexible schema: Add new relationships instantly

## 📚 Next Steps

1. **Modify `src/seed.ts`** - Add your own data
2. **Extend `src/demo.ts`** - Write custom queries
3. **Build a UI** - Create a web interface
4. **Add features** - Notifications, file attachments, time tracking

## 🤝 Contributing

Want to extend this tutorial?

- Add new query patterns to `src/demo.ts`
- Improve the data model in `src/schema.ts`
- Add more sample data in `src/seed.ts`

## 📖 Further Learning

- [Mujarrad Documentation](https://docs.mujarrad.com)
- [Graph Database Concepts](https://neo4j.com/developer/graph-data-science/graph-databases/)
- [Project Management Patterns](https://www.atlassian.com/agile/project-management)

## 📝 License

Tutorial by Mujarrad Team - Apache 2.0 License

---

**Built with 💜 using Mujarrad's Graph Data Platform**
