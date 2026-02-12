# Getting Started

This guide walks you through installing the SDK, authenticating, and creating your first node in under 5 minutes.

## Step 1: Install the Mujarrad CLI

The CLI handles authentication and project scaffolding.

```bash
npm install -g mujarrad-cli
```

Verify the installation:

```bash
mujarrad --version
```

## Step 2: Create an Account and Log In

```bash
mujarrad auth login
```

This opens an interactive prompt. Enter your email and password (or register a new account). The CLI stores your JWT token securely in your OS keychain.

Check your auth status at any time:

```bash
mujarrad auth status
```

## Step 3: Scaffold a Project

The fastest way to start is the `sdk init` command. It creates a project directory with everything pre-configured:

```bash
mujarrad sdk init my-first-app
```

This does four things:
1. Creates (or reuses) a **Space** named `my-first-app` on the Mujarrad backend
2. Generates an **API key pair** (public + secret) for programmatic access
3. Scaffolds a project directory with working code
4. Saves your keys to a `.env` file

You'll see output like:

```
✓ Authenticated
✓ Space ready: my-first-app
✓ API keys generated
✓ Project created

✓ Project "my-first-app" is ready!

  Directory:  /Users/you/my-first-app
  Space:      my-first-app
  Public Key: pk_live_abc123...

  ⚠ Secret key saved to .env — shown only once

  Next steps:
    cd my-first-app
    npm install
    npm start
```

## Step 4: Install Dependencies

```bash
cd my-first-app
npm install
```

## Step 5: Explore the Scaffolded Code

The project structure:

```
my-first-app/
├── package.json          # @mujarrad/sdk dependency
├── tsconfig.json         # TypeScript config (ES2022, strict)
├── .env                  # Your API keys (NEVER commit this)
├── .gitignore            # Ignores .env, node_modules, dist
├── src/
│   ├── index.ts          # Working example — creates a node
│   └── schema.ts         # Example schema definition
└── README.md
```

### `src/schema.ts` — Your Data Model

```typescript
import { defineSchema } from '@mujarrad/sdk';

export const schema = defineSchema()
  .entity('Task')
    .string('title', { required: true })
    .enum('status', ['todo', 'in_progress', 'done'])
    .string('description')
    .done()
  .entity('Note')
    .string('title', { required: true })
    .string('content')
    .done()
  .relationship('task_notes', {
    source: 'Task',
    target: 'Note',
    verb: 'contains',
  })
  .build();
```

### `src/index.ts` — The Entry Point

```typescript
import { Mujarrad } from '@mujarrad/sdk';
import { schema } from './schema.js';

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: process.env.MUJARRAD_SPACE!,
}).withSchema(schema);

async function main() {
  const node = await client.createEntity('Task', {
    title: 'My First Task',
    status: 'todo',
  });

  console.log('Created node:', node.id);

  const nodes = await client.nodes.list();
  console.log('Total nodes:', nodes.length);
}

main().catch(console.error);
```

## Step 6: Run It

```bash
npm start
```

You should see:

```
Created node: 550e8400-e29b-41d4-a716-446655440000
Total nodes: 1
```

Congratulations — you just created your first node on the Mujarrad graph.

## Step 7 (Optional): Generate Additional API Keys

If you need separate keys for different environments:

```bash
mujarrad sdk keygen --name "staging"
mujarrad sdk keygen --name "production"
```

Each key pair is independent. Rotate or revoke them at any time.

## Manual Setup (Without CLI Scaffolding)

If you prefer to set up manually:

```bash
mkdir my-app && cd my-app
npm init -y
npm install @mujarrad/sdk
```

Create `src/index.ts`:

```typescript
import { Mujarrad } from '@mujarrad/sdk';

const client = new Mujarrad({
  apiKey: 'pk_live_your_key',
  secretKey: 'sk_live_your_secret',
  space: 'your-space-slug',
});

const node = await client.nodes.create({ title: 'Hello Mujarrad' });
console.log(node);
```

Run with:

```bash
npx tsx src/index.ts
```

## What's Next

- [Core Concepts](./02-core-concepts.md) — Understand the data model
- [Schema Definition](./03-schema-definition.md) — Model your domain
- [CRUD Operations](./04-crud-operations.md) — Full data operations
- [Building a Todo App](./07-tutorial-todo-app.md) — End-to-end tutorial
