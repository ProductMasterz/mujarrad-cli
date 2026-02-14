# Mujarrad Quick Start Guide

Get up and running with Mujarrad in minutes. Choose your learning path based on your role and available time.

## Prerequisites

- Node.js 18+ installed
- Basic JavaScript/TypeScript knowledge
- A Mujarrad account (sign up at [mujarrad.com](https://mujarrad.com))
- API keys (public and secret)

## Learning Paths

### Path 1: Beginner (2-3 hours)
**For:** First-time users, product managers, designers
**Goal:** Understand Mujarrad and build your first application

### Path 2: Developer (4-6 hours)
**For:** Backend developers, full-stack engineers
**Goal:** Master the API and build production-ready apps

### Path 3: Architect (6-8 hours)
**For:** Technical architects, system designers
**Goal:** Design scalable graph-based systems

---

## Path 1: Beginner

### Step 1: Understand Why Mujarrad Exists (15 min)

**Read:** [00-overview.md](./00-overview.md)

**Key Concepts:**
- The abstraction bottleneck (powder vs cement)
- ISAAT paradigm
- Why graph databases matter

**No code yet - just read and understand the vision.**

---

### Step 2: Learn the Three Core Principles (30 min)

**Read:** [02-core-concepts.md](./02-core-concepts.md)

**Key Concepts:**
1. Everything is a Node (EiaN)
2. Relationships Define Structure
3. Graph Traversal

**Try It Now:**

```bash
# Navigate to the tutorial
cd task-manager-tutorial

# Open the MujarradNode interface
cat src/client.ts | head -n 20
```

**Look for these lines:**
- Lines 10-20: MujarradNode interface definition
- Notice: `id`, `nodeType`, `title`, `nodeDetails` fields

**Why this matters:** Every piece of data in Mujarrad follows this same structure.

---

### Step 3: Understand Node Types (20 min)

**Read:** [03-node-types.md](./03-node-types.md)

**Key Concepts:**
- CONTEXT nodes (users, teams, identity)
- REGULAR nodes (tasks, projects, data)
- TEMPLATE nodes (blueprints, reusable patterns)

**Try It Now:**

```bash
# Look at how users are created (CONTEXT nodes)
cat src/seed.ts | sed -n '40,66p'
```

**You'll see:**
- `createNode('Alice Johnson', 'CONTEXT', { ... })`
- Email, name, and role stored in `nodeDetails`

**Look at how tasks are created (REGULAR nodes):**

```bash
cat src/seed.ts | sed -n '138,149p'
```

**You'll see:**
- `createNode('Design homepage mockup', 'REGULAR', { ... })`
- Status, priority, tags stored in `nodeDetails`

**Why this matters:** Node types help you organize and query data efficiently.

---

### Step 4: Build the Tutorial Application (60 min)

**Read:** [05-task-manager-tutorial.md](./05-task-manager-tutorial.md)

**Set up your environment:**

```bash
# Navigate to tutorial directory
cd task-manager-tutorial

# Install dependencies
npm install

# Create .env file with your API keys
cat > .env << EOF
MUJARRAD_API_PUBLIC_KEY=pk_live_your_public_key_here
MUJARRAD_API_SECRET_KEY=sk_live_your_secret_key_here
MUJARRAD_SPACE_SLUG=task-manager-demo
PORT=3000
EOF
```

**Important:** Replace `pk_live_your_public_key_here` and `sk_live_your_secret_key_here` with your actual API keys from mujarrad.com.

**Populate sample data:**

```bash
npm run seed
```

**What this does:**
- Creates 4 users (Alice, Bob, Carol, David)
- Creates 2 teams (Development, Design)
- Creates 1 project (Website Redesign)
- Creates 6 tasks with various statuses
- Creates 3 milestones
- Creates 2 task templates

**Files executed:**
- [`src/seed.ts`](../task-manager-tutorial/src/seed.ts)

**Start the server:**

```bash
npm start
```

**Open your browser:**
```
http://localhost:3000
```

**Explore the dashboard:**
- View tasks by status
- See team members
- Check project statistics
- Filter by priority

**Files involved:**
- Server: [`server.ts`](../task-manager-tutorial/server.ts)
- Frontend: [`public/index.html`](../task-manager-tutorial/public/index.html)

---

### Step 5: Run Demo Queries (30 min)

**Read:** [06-api-basics.md](./06-api-basics.md) (first half)

**Run the demo script:**

```bash
npm run demo
```

**What you'll see:**
- Query 1: List all tasks
- Query 2: Filter by priority
- Query 3: Filter by status
- Query 4: Team workload analysis
- Query 5: Critical task risk assessment
- Query 6: Task statistics

**Files executed:**
- [`src/demo.ts`](../task-manager-tutorial/src/demo.ts)

**Try modifying a query:**

Open `src/demo.ts` in your editor and modify line 53-56:

```typescript
// Original: Filter high/critical priority
const highPriorityTasks = taskList.filter(t => {
  const details = t.nodeDetails as unknown as TaskDetails;
  return details.priority === 'high' || details.priority === 'critical';
});

// Try: Filter only medium priority
const mediumPriorityTasks = taskList.filter(t => {
  const details = t.nodeDetails as unknown as TaskDetails;
  return details.priority === 'medium';
});
```

Run again:
```bash
npm run demo
```

**Why this matters:** You're learning how to query and filter graph data.

---

### Beginner Path Complete!

**What you've learned:**
1. Why Mujarrad exists (abstraction paradigm)
2. The three core principles (Nodes, Relationships, Traversal)
3. Node types (CONTEXT, REGULAR, TEMPLATE)
4. How to run a complete Mujarrad application
5. How to query graph data

**Next Steps:**
- Experiment with the dashboard
- Try creating new tasks via the UI
- Read the API Basics doc to learn CRUD operations
- Start building your own application

---

## Path 2: Developer

### Step 1: Quick Fundamentals Review (20 min)

**Read:** [02-core-concepts.md](./02-core-concepts.md)

**Focus on:**
- MujarradNode interface
- Relationship structure
- Graph traversal (getAncestors/getDescendants)

**Skip the conceptual parts - focus on code examples.**

---

### Step 2: Master the Client API (45 min)

**Read:** [06-api-basics.md](./06-api-basics.md)

**Study the entire MujarradClient class:**

```bash
cd task-manager-tutorial
cat src/client.ts
```

**Key methods to understand:**
- `constructor()` (L70-82): Authentication setup
- `createNode()` (L85-105): Create any node type
- `getNode()` (L107-112): Fetch by ID
- `listNodes()` (L114-123): Query with filters
- `updateNode()` (L125-131): Update node data
- `deleteNode()` (L133-135): Remove node
- `createAttribute()` (L153-170): Create relationships
- `getAttributes()` (L172-177): Get node relationships
- `getAncestors()` (L138-143): Walk up the graph
- `getDescendants()` (L145-150): Walk down the graph

**Try It Now:**

Create a new file `test-api.ts`:

```typescript
import { MujarradClient } from './src/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAPI() {
  const client = new MujarradClient(
    process.env.MUJARRAD_API_PUBLIC_KEY!,
    process.env.MUJARRAD_API_SECRET_KEY!,
    process.env.MUJARRAD_SPACE_SLUG!
  );

  // Create a user
  const user = await client.createNode('Test User', 'CONTEXT', {
    email: 'test@example.com',
    role: 'developer'
  });
  console.log('Created user:', user.id);

  // Create a task
  const task = await client.createNode('Test Task', 'REGULAR', {
    status: 'todo',
    priority: 'high',
    description: 'Testing the API'
  });
  console.log('Created task:', task.id);

  // Create relationship
  const attr = await client.createAttribute(task.id, user.id, 'assigned_to');
  console.log('Created assignment:', attr.id);

  // Query
  const tasks = await client.listNodes({ nodeType: 'REGULAR' });
  console.log('Total tasks:', tasks.length);

  // Cleanup
  await client.deleteNode(task.id);
  await client.deleteNode(user.id);
  console.log('Cleanup complete');
}

testAPI().catch(console.error);
```

Run it:
```bash
npx tsx test-api.ts
```

---

### Step 3: Study API Endpoint Patterns (45 min)

**Study:** [`server.ts`](../task-manager-tutorial/server.ts)

**Key patterns:**

**Authentication (L71-76):**
```typescript
getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': this.apiPublicKey,
    'X-API-Secret': this.apiSecretKey,
  };
}
```

**Caching (L30-37, L209-211, L274-278):**
```typescript
// Server-side cache
let dashboardCache: CacheData | null = null;
const CACHE_TTL = 30000; // 30 seconds

// Check cache
if (dashboardCache && (now - dashboardCache.timestamp) < CACHE_TTL) {
  return res.json(dashboardCache.data);
}

// Update cache
dashboardCache = {
  data: responseData,
  timestamp: now,
};
```

**Error Handling (L281-287):**
```typescript
} catch (error: any) {
  console.error('Error fetching dashboard data:', error.message);
  res.status(500).json({
    success: false,
    error: error.message,
  });
}
```

**REST API Structure:**
- GET `/api/dashboard` - Optimized single endpoint with caching
- GET `/api/data` - List all nodes and tasks
- GET `/api/users` - Filter CONTEXT nodes
- POST `/api/tasks` - Create task
- PUT `/api/tasks/:id` - Update task
- DELETE `/api/tasks/:id` - Delete task

**Try modifying an endpoint:** Add a filter to `/api/tasks` to only return incomplete tasks.

---

### Step 4: Advanced Query Patterns (60 min)

**Read:** [07-graph-traversal.md](./07-graph-traversal.md)

**Study all query examples in:** [`src/demo.ts`](../task-manager-tutorial/src/demo.ts)

**Query 1: Basic Listing (L28-44)**
```typescript
const tasks = await client.listNodes<MujarradNode<TaskDetails>>();
const taskList = tasks.filter(t => t.nodeType === 'REGULAR');
```

**Query 2: Filter by Priority (L49-66)**
```typescript
const highPriorityTasks = taskList.filter(t => {
  const details = t.nodeDetails as unknown as TaskDetails;
  return details.priority === 'high' || details.priority === 'critical';
});
```

**Query 3: Filter by Status (L71-87)**
```typescript
const incompleteTasks = taskList.filter(t => {
  const details = t.nodeDetails as unknown as TaskDetails;
  return details.status !== 'done' && details.status !== 'completed';
});
```

**Query 6: Statistics (L142-159)**
```typescript
const statusGroups: Record<string, number> = {};
taskList.forEach(task => {
  const details = task.nodeDetails as unknown as TaskDetails;
  statusGroups[details.status] = (statusGroups[details.status] || 0) + 1;
});
```

**Exercise: Create a complex query**

Add this to `src/demo.ts`:

```typescript
// Query 7: Overdue high-priority tasks assigned to specific user
console.log('7️⃣  QUERY: Overdue High-Priority Tasks\n');

const now = new Date();
const overdueTasks = taskList.filter(t => {
  const details = t.nodeDetails as unknown as TaskDetails;
  const dueDate = details.dueDate ? new Date(details.dueDate) : null;

  return (
    details.priority === 'high' &&
    details.status !== 'done' &&
    dueDate &&
    dueDate < now
  );
});

console.log(`Found ${overdueTasks.length} overdue tasks\n`);
```

---

### Step 5: Production Best Practices (45 min)

**Read:** [08-best-practices.md](./08-best-practices.md)

**Study production patterns:**

**1. Caching Strategy (server.ts L30-37, L209-211, L274-278)**
- Server-side cache with TTL
- Invalidate on mutations
- Reduces API calls

**2. Error Handling (throughout server.ts)**
- Try-catch blocks
- Specific error messages
- HTTP status codes

**3. Environment Variables (server.ts L23, L40-49)**
- Never hardcode API keys
- Validate required config
- Use dotenv

**4. Parallel Operations**
```typescript
// Bad: Sequential
for (const item of items) {
  await client.createNode(item.title, 'REGULAR', item.details);
}

// Good: Parallel
const promises = items.map(item =>
  client.createNode(item.title, 'REGULAR', item.details)
);
const nodes = await Promise.all(promises);
```

**Try implementing caching in your own endpoint.**

---

### Step 6: Relationship Modeling (30 min)

**Read:** [04-relationships.md](./04-relationships.md)

**Study:** [`src/schema.ts`](../task-manager-tutorial/src/schema.ts)

**Relationship definitions (L101-153):**
```typescript
relationships: {
  team_members: {
    source: 'Team',
    target: 'User',
    verb: 'has_member',
  },
  task_assignee: {
    source: 'Task',
    target: 'User',
    verb: 'assigned_to',
  },
  task_dependencies: {
    source: 'Task',
    target: 'Task',
    verb: 'depends_on',
  },
}
```

**Exercise:** Design relationships for your domain (e.g., e-commerce, CRM, content management).

---

### Step 7: Build Your Own Application (2-3 hours)

**Goal:** Create a new application using the patterns you've learned.

**Project Ideas:**
1. Blog system (Posts, Authors, Comments, Tags)
2. E-commerce (Products, Orders, Customers)
3. CRM (Contacts, Companies, Deals, Activities)
4. Content management (Pages, Media, Categories)

**Steps:**
1. Clone task-manager-tutorial structure
2. Define your node types (CONTEXT, REGULAR, TEMPLATE)
3. Define relationships
4. Create seed script
5. Build API endpoints
6. Create demo queries

**Example: Blog System**

```typescript
// schema.ts
export const SCHEMA = {
  entities: {
    Author: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        bio: { type: 'string' }
      }
    },
    Post: {
      nodeType: 'REGULAR',
      fields: {
        content: { type: 'string', required: true },
        published: { type: 'boolean' },
        publishedAt: { type: 'date' }
      }
    },
    Comment: {
      nodeType: 'REGULAR',
      fields: {
        body: { type: 'string', required: true },
        postedAt: { type: 'date', required: true }
      }
    }
  },
  relationships: {
    post_author: {
      source: 'Post',
      target: 'Author',
      verb: 'written_by'
    },
    post_comments: {
      source: 'Post',
      target: 'Comment',
      verb: 'has_comment'
    },
    comment_author: {
      source: 'Comment',
      target: 'Author',
      verb: 'posted_by'
    }
  }
};
```

---

### Developer Path Complete!

**What you've mastered:**
1. Complete MujarradClient API
2. REST API endpoint patterns
3. Advanced query and filtering
4. Production best practices (caching, errors, config)
5. Relationship modeling
6. Building custom applications

**Next Steps:**
- Optimize for production (add pagination, search)
- Implement real-time updates (WebSockets)
- Add authentication and authorization
- Deploy to production

---

## Path 3: Architect

### Step 1: Deep Dive into ISAAT (30 min)

**Read:** [01-philosophy.md](./01-philosophy.md)

**Focus on:**
- The abstraction bottleneck
- Powder vs cement analogy
- Why traditional architectures fail for complex systems
- How ISAAT solves the problem

**Key insight:** Understand that Mujarrad isn't just a database - it's a paradigm shift in how we model information.

---

### Step 2: Graph Theory Foundations (45 min)

**Read:** [02-core-concepts.md](./02-core-concepts.md)

**Focus on:**
- Graph structure (nodes, edges)
- Directed vs undirected graphs
- Acyclic vs cyclic relationships
- Transitive dependencies
- Graph traversal algorithms

**Study:** How containment hierarchies must be acyclic but other relationships can have cycles.

**Example from docs:**
```javascript
// ✅ Valid: Linear containment (acyclic)
Project --contains--> Task --contains--> Subtask

// ❌ Invalid: Cyclic containment
Project --contains--> Task --contains--> Project  // ERROR!

// ✅ Valid: Cyclic dependencies
Task A --depends_on--> Task B
Task B --depends_on--> Task C
Task C --depends_on--> Task A  // Cycle allowed!
```

**Why this matters:** Understanding when to allow cycles is crucial for modeling complex business logic.

---

### Step 3: Relationship Pattern Design (60 min)

**Read:** [04-relationships.md](./04-relationships.md)

**Study the complete schema:** [`src/schema.ts`](../task-manager-tutorial/src/schema.ts)

**Analyze relationship patterns:**

**1. Hierarchy (Containment)**
```typescript
project_tasks: {
  source: 'Project',
  target: 'Task',
  verb: 'contains'
}
```

**2. Assignment**
```typescript
task_assignee: {
  source: 'Task',
  target: 'User',
  verb: 'assigned_to'
}
```

**3. Dependencies**
```typescript
task_dependencies: {
  source: 'Task',
  target: 'Task',
  verb: 'depends_on'
}
```

**4. Ownership**
```typescript
project_owner: {
  source: 'Project',
  target: 'User',
  verb: 'owned_by'
}
```

**Exercise: Design relationships for complex domains**

**Example: Multi-tenant SaaS with RBAC**

```typescript
export const SAAS_SCHEMA = {
  entities: {
    Tenant: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        plan: { type: 'enum', values: ['free', 'pro', 'enterprise'] },
        maxUsers: { type: 'number' }
      }
    },
    User: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        globalRole: { type: 'enum', values: ['admin', 'user'] }
      }
    },
    Role: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        permissions: { type: 'json' }
      }
    },
    Resource: {
      nodeType: 'REGULAR',
      fields: {
        type: { type: 'string' },
        data: { type: 'json' }
      }
    }
  },
  relationships: {
    tenant_users: {
      source: 'Tenant',
      target: 'User',
      verb: 'has_member'
    },
    user_roles_in_tenant: {
      source: 'User',
      target: 'Role',
      verb: 'has_role',
      metadata: { tenantId: 'string' }  // Scoped to tenant
    },
    resource_owner: {
      source: 'Resource',
      target: 'Tenant',
      verb: 'owned_by'
    },
    role_permissions: {
      source: 'Role',
      target: 'Resource',
      verb: 'can_access',
      metadata: { permissions: ['read', 'write', 'delete'] }
    }
  }
};
```

**Challenge:** How would you model:
1. Hierarchical teams (teams within teams)?
2. Time-based permissions (access that expires)?
3. Audit trails (who changed what, when)?

---

### Step 4: Advanced Query Design (90 min)

**Read:** [07-graph-traversal.md](./07-graph-traversal.md)

**Study all query patterns in:** [`src/demo.ts`](../task-manager-tutorial/src/demo.ts)

**Design complex multi-hop queries:**

**Example 1: Find all tasks assigned to users in a specific team**

```typescript
async function getTasksForTeam(teamId: string) {
  // Get all team members
  const teamMembers = await client.getDescendants(teamId);
  const userIds = new Set(teamMembers.map(u => u.id));

  // Get all tasks
  const allNodes = await client.listNodes();
  const tasks = [];

  for (const node of allNodes) {
    if (node.nodeType !== 'REGULAR') continue;

    const attrs = await client.getAttributes(node.id);
    const isAssignedToTeamMember = attrs.some(a =>
      a.attributeName === 'assigned_to' && userIds.has(a.targetNodeId)
    );

    if (isAssignedToTeamMember) {
      tasks.push(node);
    }
  }

  return tasks;
}
```

**Example 2: Find critical path in project (longest dependency chain)**

```typescript
async function findCriticalPath(projectId: string) {
  const tasks = await client.getDescendants(projectId);
  const paths: Array<{ task: MujarradNode; depth: number }> = [];

  for (const task of tasks) {
    const dependencies = await client.getAncestors(task.id);
    paths.push({ task, depth: dependencies.length });
  }

  // Sort by depth (longest chain first)
  paths.sort((a, b) => b.depth - a.depth);

  return paths[0]; // Critical path
}
```

**Example 3: Detect circular dependencies**

```typescript
async function detectCircularDependencies(taskId: string) {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  async function dfs(nodeId: string): Promise<boolean> {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const attrs = await client.getAttributes(nodeId);
    const dependencies = attrs
      .filter(a => a.attributeName === 'depends_on')
      .map(a => a.targetNodeId);

    for (const depId of dependencies) {
      if (!visited.has(depId)) {
        if (await dfs(depId)) return true;
      } else if (recursionStack.has(depId)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  return await dfs(taskId);
}
```

**Exercise:** Design queries for:
1. Shortest path between two nodes
2. Find all orphaned nodes (no relationships)
3. Get nodes by relationship count (most/least connected)

---

### Step 5: Architecture Patterns (60 min)

**Read:** [08-best-practices.md](./08-best-practices.md)

**Study production patterns:**

**1. Caching Layers**
- Server-side cache (server.ts L30-37)
- Client-side cache (in-memory Map)
- Distributed cache (Redis)

**2. API Optimization**
- Batch operations (Promise.all)
- Pagination for large datasets
- GraphQL-style field selection

**3. Security**
- API key authentication
- Rate limiting
- Input validation

**4. Scalability**
- Connection pooling
- Query optimization
- Indexing strategies

**Design exercise:** Architecture for 1M+ nodes

**Considerations:**
- How to paginate `listNodes()`?
- How to optimize `getAncestors()` for deep graphs?
- How to cache relationship traversals?
- How to handle concurrent updates?

**Sample architecture:**

```
┌─────────────────────────────────────────────────┐
│                  Load Balancer                  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼───────┐
│  API Server 1  │   │  API Server 2  │
│   (Node.js)    │   │   (Node.js)    │
└───────┬────────┘   └────────┬───────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   Redis Cache       │
        │   (Relationship     │
        │    Traversals)      │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Mujarrad Backend   │
        │   (PostgreSQL +     │
        │    Graph Engine)    │
        └─────────────────────┘
```

---

### Step 6: Design Complex System (3-4 hours)

**Goal:** Design a production-ready multi-tenant graph system

**Requirements:**
1. Multi-tenant isolation
2. Role-based access control
3. Hierarchical teams and projects
4. Audit trail (who changed what)
5. Time-based permissions
6. Performance at scale (1M+ nodes)

**Deliverables:**
1. Complete schema (entities + relationships)
2. Access control model
3. Query patterns for common operations
4. Caching strategy
5. API endpoint design

**Example: Enterprise Project Management System**

**Schema:**
```typescript
export const ENTERPRISE_SCHEMA = {
  entities: {
    Organization: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        industry: { type: 'string' },
        size: { type: 'enum', values: ['small', 'medium', 'large'] }
      }
    },
    Department: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        budget: { type: 'number' }
      }
    },
    Team: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        teamType: { type: 'enum', values: ['dev', 'design', 'qa', 'pm'] }
      }
    },
    User: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        title: { type: 'string' }
      }
    },
    Role: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        permissions: { type: 'json' },
        level: { type: 'enum', values: ['org', 'dept', 'team', 'project'] }
      }
    },
    Project: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['planning', 'active', 'on_hold', 'completed'] },
        budget: { type: 'number' },
        startDate: { type: 'date' },
        endDate: { type: 'date' }
      }
    },
    Task: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['backlog', 'todo', 'in_progress', 'done'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        estimatedHours: { type: 'number' },
        dueDate: { type: 'date' }
      }
    },
    AuditLog: {
      nodeType: 'REGULAR',
      fields: {
        action: { type: 'enum', values: ['create', 'update', 'delete'] },
        timestamp: { type: 'date', required: true },
        changes: { type: 'json' }
      }
    }
  },
  relationships: {
    org_departments: {
      source: 'Organization',
      target: 'Department',
      verb: 'contains'
    },
    dept_teams: {
      source: 'Department',
      target: 'Team',
      verb: 'contains'
    },
    team_members: {
      source: 'Team',
      target: 'User',
      verb: 'has_member'
    },
    user_roles: {
      source: 'User',
      target: 'Role',
      verb: 'has_role',
      metadata: {
        scopeType: 'string',  // 'org', 'dept', 'team', 'project'
        scopeId: 'string',    // ID of the scope
        expiresAt: 'date'     // Time-based permissions
      }
    },
    project_owner: {
      source: 'Project',
      target: 'User',
      verb: 'owned_by'
    },
    project_tasks: {
      source: 'Project',
      target: 'Task',
      verb: 'contains'
    },
    task_assignee: {
      source: 'Task',
      target: 'User',
      verb: 'assigned_to'
    },
    task_dependencies: {
      source: 'Task',
      target: 'Task',
      verb: 'depends_on'
    },
    audit_subject: {
      source: 'AuditLog',
      target: 'Node',  // Any node
      verb: 'logged_change_to'
    },
    audit_actor: {
      source: 'AuditLog',
      target: 'User',
      verb: 'performed_by'
    }
  }
};
```

**Access Control Queries:**

```typescript
async function canUserAccessResource(
  userId: string,
  resourceId: string,
  permission: 'read' | 'write' | 'delete'
): Promise<boolean> {
  // Get user's roles
  const attrs = await client.getAttributes(userId);
  const roleAttrs = attrs.filter(a => a.attributeName === 'has_role');

  // Check each role
  for (const roleAttr of roleAttrs) {
    const metadata = roleAttr.attributeValue
      ? JSON.parse(roleAttr.attributeValue)
      : {};

    // Check if role is expired
    if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
      continue;
    }

    const role = await client.getNode(roleAttr.targetNodeId);
    const permissions = role.nodeDetails.permissions || {};

    // Check permission
    if (permissions[permission]) {
      // Check scope
      if (await isResourceInScope(resourceId, metadata.scopeType, metadata.scopeId)) {
        return true;
      }
    }
  }

  return false;
}

async function isResourceInScope(
  resourceId: string,
  scopeType: string,
  scopeId: string
): Promise<boolean> {
  // Get all ancestors of the resource
  const ancestors = await client.getAncestors(resourceId);

  // Check if scope is in ancestors
  return ancestors.some(a => a.id === scopeId);
}
```

**Audit Trail Implementation:**

```typescript
async function logChange(
  userId: string,
  nodeId: string,
  action: 'create' | 'update' | 'delete',
  changes: any
) {
  const auditLog = await client.createNode('Audit Log Entry', 'REGULAR', {
    action,
    timestamp: new Date().toISOString(),
    changes
  });

  await client.createAttribute(auditLog.id, nodeId, 'logged_change_to');
  await client.createAttribute(auditLog.id, userId, 'performed_by');

  return auditLog;
}
```

---

### Architect Path Complete!

**What you've mastered:**
1. ISAAT paradigm and philosophy
2. Graph theory foundations
3. Complex relationship patterns
4. Multi-hop query design
5. Production architecture patterns
6. Multi-tenant system design
7. Access control modeling
8. Audit trail implementation

**Next Steps:**
- Design your own complex system
- Contribute to Mujarrad documentation
- Share your architecture patterns with the community
- Build production systems at scale

---

## Common Issues and Solutions

### Issue: API Authentication Error (401)

**Solution:**
```bash
# Verify your API keys
echo $MUJARRAD_API_PUBLIC_KEY
echo $MUJARRAD_API_SECRET_KEY

# Make sure they're set in .env
cat .env | grep MUJARRAD_API
```

### Issue: Space Not Found (404)

**Solution:**
```typescript
// Create space if it doesn't exist
try {
  await client.getSpaceBySlug('my-space');
} catch (error) {
  await client.createSpace('My Space', 'my-space');
}
```

### Issue: Node Creation Fails

**Solution:**
```typescript
// Check required fields
const node = await client.createNode(
  'Node Title',  // Required: title
  'REGULAR',     // Required: nodeType
  {}             // Required: nodeDetails (can be empty object)
);
```

### Issue: Relationship Not Working

**Solution:**
```typescript
// Verify both nodes exist before creating relationship
const sourceNode = await client.getNode(sourceId);
const targetNode = await client.getNode(targetId);

// Then create relationship
await client.createAttribute(sourceId, targetId, 'verb');
```

---

## Additional Resources

- **Documentation:** [Full documentation index](./README.md)
- **API Reference:** [06-api-basics.md](./06-api-basics.md)
- **Examples:** [task-manager-tutorial/](../task-manager-tutorial/)
- **GitHub:** [ProductMasterz/mujarrad-cli](https://github.com/ProductMasterz/mujarrad-cli)
- **Website:** [mujarrad.com](https://mujarrad.com)

---

## Next Steps

After completing your chosen path:

1. **Build something real** - Don't just read, implement
2. **Experiment** - Modify the tutorial code
3. **Share** - Contribute examples back to the community
4. **Scale** - Take your application to production

Happy building with Mujarrad!
