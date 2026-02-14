# Task Manager Tutorial: Real-World Example

This tutorial walks you through building a complete task management system with Mujarrad. You'll learn all core concepts through working code based on the actual `task-manager-tutorial` implementation.

## What You'll Build

A project task manager with:
- **Users and Teams** (CONTEXT nodes)
- **Projects and Milestones** (REGULAR nodes)
- **Tasks and Comments** (REGULAR nodes)
- **Task Templates** (TEMPLATE nodes)
- **Relationships** (assignments, dependencies, containment)
- **Graph Queries** (finding dependencies, analyzing workload)

## Prerequisites

- Node.js 18+
- Mujarrad API keys (get them from [mujarrad.com](https://mujarrad.com))
- Basic JavaScript/TypeScript knowledge

## Setup

### 1. Install Dependencies

```bash
npm install axios dotenv
```

### 2. Create Environment File

Create `.env`:

```bash
MUJARRAD_API_PUBLIC_KEY=your_public_key_here
MUJARRAD_API_SECRET_KEY=your_secret_key_here
MUJARRAD_SPACE_SLUG=task-manager-demo
```

### 3. Create the Client

Create `src/client.ts`:

```typescript
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'https://mujarrad.onrender.com/api';

export interface MujarradNode<T = any> {
  id: string;
  spaceId: string;
  nodeType: 'REGULAR' | 'CONTEXT' | 'ASSUMPTION' | 'TEMPLATE';
  title: string;
  slug: string;
  content?: string;
  nodeDetails: T;
  createdAt: string;
  updatedAt: string;
}

export interface MujarradAttribute {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  attributeName: string;
  attributeType: string;
  attributeTypeMode: 'TYPED' | 'SCHEMALESS';
  attributeValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export class MujarradClient {
  private client: AxiosInstance;
  private spaceSlug: string;
  private apiPublicKey: string;
  private apiSecretKey: string;

  constructor(apiPublicKey: string, apiSecretKey: string, spaceSlug: string) {
    this.apiPublicKey = apiPublicKey;
    this.apiSecretKey = apiSecretKey;
    this.spaceSlug = spaceSlug;
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiPublicKey,
        'X-API-Secret': this.apiSecretKey,
      },
    });
  }

  // Node Operations
  async createNode<T>(
    title: string,
    nodeType: 'REGULAR' | 'CONTEXT' | 'ASSUMPTION' | 'TEMPLATE',
    nodeDetails: T
  ): Promise<MujarradNode<T>> {
    const response = await this.client.post<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes`,
      { title, nodeType, nodeDetails }
    );
    return response.data?.data || response.data;
  }

  async getNode<T>(nodeId: string): Promise<MujarradNode<T>> {
    const response = await this.client.get<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}`
    );
    return response.data?.data || response.data;
  }

  async listNodes<T>(filters?: { nodeType?: string }): Promise<MujarradNode<T>[]> {
    const params: any = {};
    if (filters?.nodeType) params.nodeType = filters.nodeType;

    const response = await this.client.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes`,
      { params }
    );
    return response.data?.data || response.data;
  }

  async updateNode<T>(nodeId: string, updates: Partial<MujarradNode<T>>): Promise<MujarradNode<T>> {
    const response = await this.client.put<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}`,
      updates
    );
    return response.data.data;
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.client.delete(`/spaces/${this.spaceSlug}/nodes/${nodeId}`);
  }

  // Graph Traversal
  async getAncestors<T>(nodeId: string): Promise<MujarradNode<T>[]> {
    const response = await this.client.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}/ancestors`
    );
    return response.data.data;
  }

  async getDescendants<T>(nodeId: string): Promise<MujarradNode<T>[]> {
    const response = await this.client.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}/descendants`
    );
    return response.data.data;
  }

  // Attribute (Relationship) Operations
  async createAttribute(
    sourceNodeId: string,
    targetNodeId: string,
    attributeName: string,
    metadata?: Record<string, any>
  ): Promise<MujarradAttribute> {
    const response = await this.client.post<ApiResponse<MujarradAttribute>>(
      `/nodes/${sourceNodeId}/attributes`,
      {
        targetNodeId,
        attributeName,
        attributeType: 'custom',
        attributeTypeMode: 'TYPED',
        attributeValue: metadata ? JSON.stringify(metadata) : undefined,
      }
    );
    return response.data.data;
  }

  async getAttributes(nodeId: string): Promise<MujarradAttribute[]> {
    const response = await this.client.get<ApiResponse<MujarradAttribute[]>>(
      `/nodes/${nodeId}/attributes`
    );
    return response.data.data;
  }

  // Space Operations
  async getSpaceBySlug(slug: string): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>(`/spaces/slug/${slug}`);
    return response.data.data;
  }

  async createSpace(name: string, slug: string): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/spaces', {
      name,
      slug,
    });
    return response.data.data;
  }
}
```

## Step 1: Define Your Schema

Create `src/schema.ts`:

```typescript
export const SCHEMA = {
  entities: {
    User: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        role: { type: 'enum', values: ['admin', 'manager', 'developer', 'designer', 'qa'] },
        avatarUrl: { type: 'string' },
      },
    },

    Team: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        department: { type: 'string' },
      },
    },

    Project: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        startDate: { type: 'date' },
        endDate: { type: 'date' },
        budget: { type: 'number' },
      },
    },

    Task: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        estimatedHours: { type: 'number' },
        actualHours: { type: 'number' },
        dueDate: { type: 'date' },
        completedAt: { type: 'date' },
        tags: { type: 'json' },
      },
    },

    Milestone: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        dueDate: { type: 'date', required: true },
        status: { type: 'enum', values: ['pending', 'in_progress', 'completed', 'overdue'] },
      },
    },

    Comment: {
      nodeType: 'REGULAR',
      fields: {
        body: { type: 'string', required: true },
        postedAt: { type: 'date', required: true },
      },
    },

    TaskTemplate: {
      nodeType: 'TEMPLATE',
      fields: {
        description: { type: 'string' },
        defaultPriority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        defaultEstimatedHours: { type: 'number' },
        tags: { type: 'json' },
        isTemplate: { type: 'boolean' },
      },
    },
  },

  relationships: {
    team_members: {
      source: 'Team',
      target: 'User',
      verb: 'has_member',
    },
    project_owner: {
      source: 'Project',
      target: 'User',
      verb: 'owned_by',
    },
    project_tasks: {
      source: 'Project',
      target: 'Task',
      verb: 'contains',
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
    task_blocking: {
      source: 'Task',
      target: 'Task',
      verb: 'blocks',
    },
    project_milestones: {
      source: 'Project',
      target: 'Milestone',
      verb: 'has_milestone',
    },
    milestone_tasks: {
      source: 'Milestone',
      target: 'Task',
      verb: 'contains',
    },
    task_comments: {
      source: 'Task',
      target: 'Comment',
      verb: 'has_comment',
    },
    task_from_template: {
      source: 'Task',
      target: 'TaskTemplate',
      verb: 'created_from',
    },
  },
};
```

### Why This Schema?

This schema demonstrates:
- **CONTEXT nodes**: Users, Teams
- **REGULAR nodes**: Projects, Tasks, Milestones, Comments
- **TEMPLATE nodes**: TaskTemplate
- **Hierarchical relationships**: contains (acyclic)
- **Dependency relationships**: depends_on, blocks (cyclic allowed)
- **Assignment relationships**: assigned_to, owned_by

## Step 2: Seed Sample Data

Create `src/seed.ts`:

```typescript
import { MujarradClient } from './client.js';
import dotenv from 'dotenv';

dotenv.config();

const API_PUBLIC_KEY = process.env.MUJARRAD_API_PUBLIC_KEY;
const API_SECRET_KEY = process.env.MUJARRAD_API_SECRET_KEY;
const SPACE_SLUG = process.env.MUJARRAD_SPACE_SLUG || 'task-manager-demo';

async function seed() {
  console.log('🚀 Seeding Task Manager Tutorial Data...\n');

  const client = new MujarradClient(API_PUBLIC_KEY!, API_SECRET_KEY!, SPACE_SLUG);

  // Ensure space exists
  try {
    await client.getSpaceBySlug(SPACE_SLUG);
    console.log('✓ Space already exists:', SPACE_SLUG);
  } catch (error) {
    console.log('Creating space:', SPACE_SLUG);
    await client.createSpace('Task Manager Demo', SPACE_SLUG);
    console.log('✓ Space created:', SPACE_SLUG);
  }

  console.log('\n📊 Creating Nodes...\n');

  // 1. Create Users (CONTEXT nodes)
  console.log('Creating Users...');
  const alice = await client.createNode('Alice Johnson', 'CONTEXT', {
    email: 'alice@example.com',
    name: 'Alice Johnson',
    role: 'developer',
  });
  console.log('  ✓', alice.title);

  const bob = await client.createNode('Bob Smith', 'CONTEXT', {
    email: 'bob@example.com',
    name: 'Bob Smith',
    role: 'manager',
  });
  console.log('  ✓', bob.title);

  // 2. Create Project (REGULAR node)
  console.log('\nCreating Projects...');
  const project = await client.createNode('Website Redesign', 'REGULAR', {
    description: 'Complete redesign of the company website',
    status: 'active',
    priority: 'high',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    budget: 50000,
  });
  console.log('  ✓', project.title);

  // 3. Create Milestones (REGULAR nodes)
  console.log('\nCreating Milestones...');
  const milestone1 = await client.createNode('Phase 1: Planning', 'REGULAR', {
    description: 'Complete project planning',
    dueDate: '2026-02-15',
    status: 'completed',
  });
  console.log('  ✓', milestone1.title);

  const milestone2 = await client.createNode('Phase 2: Design', 'REGULAR', {
    description: 'Complete all design mockups',
    dueDate: '2026-03-31',
    status: 'in_progress',
  });
  console.log('  ✓', milestone2.title);

  // 4. Create Tasks (REGULAR nodes)
  console.log('\nCreating Tasks...');
  const task1 = await client.createNode('Design homepage mockup', 'REGULAR', {
    description: 'Create initial homepage design mockups',
    status: 'done',
    priority: 'high',
    estimatedHours: 8,
    actualHours: 10,
    dueDate: '2026-02-20',
    completedAt: '2026-02-18',
    tags: ['design', 'ui'],
  });
  console.log('  ✓', task1.title);

  const task2 = await client.createNode('Implement user authentication', 'REGULAR', {
    description: 'Build login/signup functionality',
    status: 'in_progress',
    priority: 'critical',
    estimatedHours: 16,
    dueDate: '2026-03-10',
    tags: ['backend', 'auth'],
  });
  console.log('  ✓', task2.title);

  const task3 = await client.createNode('Write tests for auth', 'REGULAR', {
    description: 'Add test coverage for authentication',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 12,
    dueDate: '2026-03-20',
    tags: ['testing', 'backend'],
  });
  console.log('  ✓', task3.title);

  console.log('\n✅ Seeding Complete!\n');
  console.log('Summary:');
  console.log('  - 2 Users');
  console.log('  - 1 Project');
  console.log('  - 2 Milestones');
  console.log('  - 3 Tasks');
  console.log('\nRun "npm run demo" to explore the data!');
}

seed().catch(console.error);
```

Run the seed script:

```bash
npm run seed
```

## Step 3: Query the Graph

Create `src/demo.ts`:

```typescript
import { MujarradClient, MujarradNode } from './client.js';
import dotenv from 'dotenv';

dotenv.config();

const API_PUBLIC_KEY = process.env.MUJARRAD_API_PUBLIC_KEY;
const API_SECRET_KEY = process.env.MUJARRAD_API_SECRET_KEY;
const SPACE_SLUG = process.env.MUJARRAD_SPACE_SLUG || 'task-manager-demo';

async function demo() {
  console.log('🔍 Task Manager Graph Demo\n');

  const client = new MujarradClient(API_PUBLIC_KEY!, API_SECRET_KEY!, SPACE_SLUG);

  // Query 1: Get All Tasks
  console.log('1️⃣  Get All Tasks\n');
  const tasks = await client.listNodes<any>();
  const taskList = tasks.filter(t => t.nodeType === 'REGULAR' && t.nodeDetails.status);

  taskList.forEach(task => {
    console.log(`  • ${task.title}`);
    console.log(`    Status: ${task.nodeDetails.status} | Priority: ${task.nodeDetails.priority}`);
  });

  console.log(`\nFound: ${taskList.length} tasks\n`);

  // Query 2: Filter by Priority
  console.log('2️⃣  High Priority Tasks\n');
  const highPriorityTasks = taskList.filter(t =>
    t.nodeDetails.priority === 'high' || t.nodeDetails.priority === 'critical'
  );

  highPriorityTasks.forEach(task => {
    console.log(`  ⚡ ${task.title}`);
    console.log(`     Priority: ${task.nodeDetails.priority} | Status: ${task.nodeDetails.status}`);
  });

  // Query 3: Filter by Status
  console.log('\n3️⃣  Incomplete Tasks\n');
  const incompleteTasks = taskList.filter(t =>
    t.nodeDetails.status !== 'done' && t.nodeDetails.status !== 'completed'
  );

  incompleteTasks.forEach(task => {
    console.log(`  ⏳ ${task.title}`);
    console.log(`     Status: ${task.nodeDetails.status}`);
  });

  // Query 4: Users
  console.log('\n4️⃣  Team Members\n');
  const users = await client.listNodes({ nodeType: 'CONTEXT' });
  users.forEach(user => {
    console.log(`  👤 ${user.title} (${user.nodeDetails.email}) - ${user.nodeDetails.role}`);
  });

  console.log('\n✅ Demo Complete!\n');
}

demo().catch(console.error);
```

Run the demo:

```bash
npm run demo
```

## Graph Model vs SQL

### SQL Approach

```sql
-- Schema definition (rigid)
CREATE TABLE projects (id, name, status, priority);
CREATE TABLE tasks (id, project_id, title, status, assignee_id);
CREATE TABLE task_dependencies (task_id, depends_on_task_id);

-- Complex query
SELECT t.* FROM tasks t
JOIN task_dependencies td ON t.id = td.task_id
JOIN tasks dt ON td.depends_on_task_id = dt.id
WHERE t.assignee_id = ? AND dt.status != 'done';
```

### Mujarrad Graph Approach

```javascript
// Schema emerges from usage (flexible)
const project = await client.createNode('Website Redesign', 'REGULAR', { status: 'active' });
const task1 = await client.createNode('Design homepage', 'REGULAR', { status: 'todo' });
const task2 = await client.createNode('Implement auth', 'REGULAR', { status: 'in_progress' });

// Create relationships
await client.createAttribute(project.id, task1.id, 'contains');
await client.createAttribute(task2.id, task1.id, 'depends_on');

// Simple query
const dependencies = await client.getAncestors(task2.id);
const blockedBy = dependencies.filter(d => d.nodeDetails.status !== 'done');
```

### Advantages

| SQL | Mujarrad |
|-----|----------|
| Schema migrations required | No migrations—add nodes instantly |
| Complex JOINs | Simple graph traversal |
| Rigid structure | Emergent structure |
| Multiple tables | Single node concept |
| Foreign keys | Semantic relationships |

## What You Learned

✅ Creating nodes of different types (CONTEXT, REGULAR, TEMPLATE)
✅ Defining relationships between nodes
✅ Querying with filters
✅ Graph traversal with getAncestors/getDescendants
✅ Schema design for real-world applications
✅ SQL vs Graph comparison

## Next Steps

- **[API Basics](./06-api-basics.md)** - Full CRUD operations
- **[Graph Traversal](./07-graph-traversal.md)** - Advanced querying
- **[Best Practices](./08-best-practices.md)** - Production patterns

## Full Code

Find the complete working code in `/task-manager-tutorial/` directory.
