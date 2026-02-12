# Tutorial: Building a Todo App

This end-to-end tutorial builds a working Todo app backend using the Mujarrad SDK. You'll create users, projects, tasks, and wire up relationships — covering every core concept in a practical context.

## What We're Building

A task management system with:
- **Users** who manage projects
- **Projects** that contain tasks
- **Tasks** with statuses, priorities, and assignments
- **Labels** for categorizing tasks

## Step 1: Scaffold the Project

```bash
mujarrad sdk init todo-app
cd todo-app
npm install
```

This creates the project, a space called `todo-app`, and your API keys in `.env`.

## Step 2: Define the Schema

Replace `src/schema.ts` with:

```typescript
import { defineSchema } from '@mujarrad/sdk';

export const schema = defineSchema()
  .entity('User')
    .type('CONTEXT')
    .string('name', { required: true })
    .string('email', { required: true })
    .enum('role', ['admin', 'member'])
    .done()

  .entity('Project')
    .string('name', { required: true })
    .string('description')
    .enum('status', ['active', 'archived'])
    .done()

  .entity('Task')
    .string('title', { required: true })
    .string('description')
    .enum('status', ['todo', 'in_progress', 'done'])
    .enum('priority', ['low', 'medium', 'high'])
    .date('dueDate')
    .done()

  .entity('Label')
    .string('name', { required: true })
    .string('color', { required: true })
    .done()

  // Relationships
  .relationship('user_projects', {
    source: 'User',
    target: 'Project',
    verb: 'manages',
  })
  .relationship('project_tasks', {
    source: 'Project',
    target: 'Task',
    verb: 'contains',
  })
  .relationship('task_assignee', {
    source: 'Task',
    target: 'User',
    verb: 'assigned_to',
  })
  .relationship('task_labels', {
    source: 'Task',
    target: 'Label',
    verb: 'tagged_with',
  })
  .build();
```

## Step 3: Initialize the Client

Replace `src/index.ts` with:

```typescript
import { Mujarrad } from '@mujarrad/sdk';
import { schema } from './schema.js';

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: process.env.MUJARRAD_SPACE!,
}).withSchema(schema);

async function main() {
  await seedData();
  await queryData();
}

main().catch(console.error);
```

## Step 4: Seed Data

Add the `seedData` function:

```typescript
async function seedData() {
  console.log('--- Seeding data ---\n');

  // 1. Create users
  const alice = await client.createEntity('User', {
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin',
  });
  console.log(`Created user: ${alice.nodeDetails.name} (${alice.id})`);

  const bob = await client.createEntity('User', {
    name: 'Bob',
    email: 'bob@example.com',
    role: 'member',
  });
  console.log(`Created user: ${bob.nodeDetails.name} (${bob.id})`);

  // 2. Create a project
  const project = await client.createEntity('Project', {
    name: 'Website Redesign',
    description: 'Redesign the company website with a modern look',
    status: 'active',
  });
  console.log(`Created project: ${project.nodeDetails.name} (${project.id})`);

  // 3. Link Alice as project manager
  await client.link(alice.id, project.id, 'manages');
  console.log(`Linked: Alice manages Website Redesign`);

  // 4. Create tasks
  const task1 = await client.createEntity('Task', {
    title: 'Create wireframes',
    description: 'Design wireframes for all key pages',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-01',
  });

  const task2 = await client.createEntity('Task', {
    title: 'Set up CI/CD',
    description: 'Configure GitHub Actions for deployment',
    status: 'todo',
    priority: 'medium',
  });

  const task3 = await client.createEntity('Task', {
    title: 'Write landing page copy',
    status: 'todo',
    priority: 'low',
  });

  console.log(`Created ${3} tasks`);

  // 5. Add tasks to the project
  await client.link(project.id, task1.id, 'contains');
  await client.link(project.id, task2.id, 'contains');
  await client.link(project.id, task3.id, 'contains');
  console.log(`Linked: 3 tasks added to project`);

  // 6. Assign tasks
  await client.link(task1.id, alice.id, 'assigned_to');
  await client.link(task2.id, bob.id, 'assigned_to');
  await client.link(task3.id, alice.id, 'assigned_to');
  console.log(`Linked: tasks assigned to users`);

  // 7. Create labels and tag tasks
  const bugLabel = await client.createEntity('Label', {
    name: 'design',
    color: '#3B82F6',
  });

  const featureLabel = await client.createEntity('Label', {
    name: 'infrastructure',
    color: '#10B981',
  });

  await client.link(task1.id, bugLabel.id, 'tagged_with');
  await client.link(task2.id, featureLabel.id, 'tagged_with');
  console.log(`Linked: tasks tagged with labels`);

  console.log('\n--- Seeding complete ---\n');

  return { alice, bob, project, tasks: [task1, task2, task3] };
}
```

## Step 5: Query the Graph

Add the `queryData` function:

```typescript
async function queryData() {
  console.log('--- Querying data ---\n');

  // List all nodes
  const allNodes = await client.nodes.list();
  console.log(`Total nodes in space: ${allNodes.length}`);

  // List only users (CONTEXT nodes)
  const users = await client.nodes.list({ nodeType: 'CONTEXT' });
  console.log(`Users: ${users.length}`);
  for (const user of users) {
    console.log(`  - ${user.title} (${user.nodeType})`);
  }

  // List regular nodes (projects, tasks, labels)
  const regulars = await client.nodes.list({ nodeType: 'REGULAR' });
  console.log(`Regular nodes: ${regulars.length}`);

  // Find a project and get its tasks (descendants)
  const projects = await client.nodes.list({ nodeType: 'REGULAR' });
  const project = projects.find(n =>
    (n.nodeDetails as any)?.status === 'active'
  );

  if (project) {
    console.log(`\nProject: ${project.title}`);

    const descendants = await client.nodes.descendants(project.id);
    console.log(`  Descendants: ${descendants.length}`);
    for (const d of descendants) {
      const details = d.nodeDetails as any;
      console.log(`    - ${d.title} [${details?.status || 'n/a'}]`);
    }
  }

  console.log('\n--- Queries complete ---');
}
```

## Step 6: Run It

```bash
npm start
```

Expected output:

```
--- Seeding data ---

Created user: Alice (550e8400-...)
Created user: Bob (550e8401-...)
Created project: Website Redesign (550e8402-...)
Linked: Alice manages Website Redesign
Created 3 tasks
Linked: 3 tasks added to project
Linked: tasks assigned to users
Linked: tasks tagged with labels

--- Seeding complete ---

--- Querying data ---

Total nodes in space: 7
Users: 2
  - Alice (CONTEXT)
  - Bob (CONTEXT)
Regular nodes: 5
Project: Website Redesign
  Descendants: 5
    - Create wireframes [in_progress]
    - Set up CI/CD [todo]
    - Write landing page copy [todo]
    - design [n/a]
    - infrastructure [n/a]

--- Queries complete ---
```

## Step 7: Update and Delete

Add operations to modify data:

```typescript
async function updateTask(taskId: string) {
  // Update a task's status
  const updated = await client.nodes.update(taskId, {
    nodeDetails: { status: 'done' },
  });
  console.log(`Updated: ${updated.title} -> ${(updated.nodeDetails as any).status}`);
}

async function deleteTask(taskId: string) {
  // First, remove relationships
  const attrs = await client.attributes.list(taskId);
  for (const attr of attrs) {
    await client.attributes.delete(attr.id);
  }

  // Then delete the node
  await client.nodes.delete(taskId);
  console.log(`Deleted task: ${taskId}`);
}
```

## Step 8: Error Handling

Wrap operations with proper error handling:

```typescript
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  NetworkError,
} from '@mujarrad/sdk';

async function safeCreateTask(data: Record<string, unknown>) {
  try {
    const task = await client.createEntity('Task', data as any);
    console.log(`Created: ${task.title}`);
    return task;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Invalid task data:');
      for (const e of error.errors) {
        console.error(`  - ${e}`);
      }
    } else if (error instanceof AuthenticationError) {
      console.error('Check your API keys in .env');
    } else if (error instanceof NetworkError) {
      console.error('Cannot reach Mujarrad — check your internet');
    } else {
      throw error;
    }
    return null;
  }
}

// Valid task
await safeCreateTask({ title: 'Valid task', status: 'todo', priority: 'low' });

// Missing required field
await safeCreateTask({ status: 'todo' });
// Output: Invalid task data:
//           - Task.title is required

// Invalid enum value
await safeCreateTask({ title: 'Bad status', status: 'invalid' });
// Output: Invalid task data:
//           - Task.status must be one of: todo, in_progress, done
```

## Complete Source Code

Here's the full `src/index.ts` for reference:

```typescript
import { Mujarrad, ValidationError, NotFoundError } from '@mujarrad/sdk';
import { schema } from './schema.js';

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: process.env.MUJARRAD_SPACE!,
}).withSchema(schema);

async function main() {
  // Seed
  const alice = await client.createEntity('User', {
    name: 'Alice', email: 'alice@example.com', role: 'admin',
  });

  const project = await client.createEntity('Project', {
    name: 'Website Redesign', status: 'active',
  });
  await client.link(alice.id, project.id, 'manages');

  const task = await client.createEntity('Task', {
    title: 'Create wireframes', status: 'todo', priority: 'high',
  });
  await client.link(project.id, task.id, 'contains');
  await client.link(task.id, alice.id, 'assigned_to');

  // Query
  const descendants = await client.nodes.descendants(project.id);
  console.log(`Project tasks: ${descendants.length}`);

  // Update
  await client.nodes.update(task.id, {
    nodeDetails: { status: 'done' },
  });

  // Verify
  const updated = await client.nodes.get(task.id);
  console.log(`Task status: ${(updated.nodeDetails as any).status}`);
}

main().catch(console.error);
```

## Graph Visualization

Here's what the graph looks like after seeding:

```
  Alice (CONTEXT)
    ├── manages ──> Website Redesign (REGULAR)
    │                 ├── contains ──> Create wireframes
    │                 │                  ├── assigned_to ──> Alice
    │                 │                  └── tagged_with ──> design
    │                 ├── contains ──> Set up CI/CD
    │                 │                  ├── assigned_to ──> Bob
    │                 │                  └── tagged_with ──> infrastructure
    │                 └── contains ──> Write landing page copy
    │                                    └── assigned_to ──> Alice
    │
  Bob (CONTEXT)
```

## What's Next

- [API Reference](./08-api-reference.md) — Full method and type reference
- [CLI Commands](./09-cli-commands.md) — CLI workflow for developers
- [Architecture](./10-architecture.md) — How the SDK works internally
