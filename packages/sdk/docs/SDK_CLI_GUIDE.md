# Mujarrad SDK CLI Guide

Learn how to use the Mujarrad CLI to scaffold SDK-based projects with automatic API key generation and environment setup.

## 🎯 Overview

The `mujarrad sdk` commands help developers quickly create new projects using the Mujarrad SDK with:

- ✅ Automatic API key generation
- ✅ `.env` file configuration
- ✅ Project scaffolding with folder structure
- ✅ Multiple project templates
- ✅ Pre-built examples and demos
- ✅ Web server setup (optional)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Mujarrad account (sign up at https://www.mujarrad.com)
- Authenticated with CLI: `mujarrad auth login`

### Create Your First Project

```bash
mujarrad sdk init my-app
```

This will:
1. ✅ Create a new space in your Mujarrad account
2. ✅ Generate API keys (public and secret)
3. ✅ Create `.env` file with credentials
4. ✅ Scaffold project structure
5. ✅ Install necessary dependencies
6. ✅ Provide next steps

## 📦 Project Templates

### Basic Template

Simple starter project with minimal setup.

```bash
mujarrad sdk init my-app --template basic
```

**Includes:**
- Schema definition
- Client configuration
- Example code
- TypeScript setup

**Project Structure:**
```
my-app/
├── src/
│   ├── index.ts      # Entry point
│   └── schema.ts     # Data model
├── .env             # API keys (auto-generated)
├── package.json
├── tsconfig.json
└── README.md
```

**Getting Started:**
```bash
cd my-app
npm install
npm start
```

---

### Task Manager Template

Full-featured task management application with web dashboard.

```bash
mujarrad sdk init my-app --template task-manager
```

**Includes:**
- Complete task management system
- Web dashboard with real-time updates
- REST API endpoints
- Seed data with examples
- Query demonstrations
- Graph traversal examples
- Debug console
- Browser compatibility checker

**Project Structure:**
```
my-app/
├── public/              # Web assets
│   ├── index.html      # Main dashboard
│   ├── debug.html      # Debug console
│   └── check_browser.html  # Compatibility check
├── src/
│   ├── client.ts       # Mujarrad API client
│   ├── schema.ts       # Data model
│   ├── seed.ts        # Sample data generator
│   └── demo.ts        # Query demonstrations
├── server.ts          # Express server with API
├── .env               # API keys (auto-generated)
├── .env.example       # Example configuration
├── package.json
├── tsconfig.json
└── README.md
```

**Getting Started:**
```bash
cd my-app
npm install

# Option 1: CLI Only
npm run seed      # Load sample data
npm run demo      # Run query demos

# Option 2: With Web Dashboard
npm start         # Start server (http://localhost:3000)
```

**Features:**
- 📊 Interactive Dashboard
- 🔍 Real-time Data Visualization
- 👥 Team Management
- 📋 Task Tracking with Dependencies
- 🎯 Milestone Progress
- 🔧 Debug Console
- 📚 Query Examples

## 🔐 API Key Management

### Generate API Keys

```bash
mujarrad sdk keygen
```

Output:
```
✓ New API key pair created

  Name:       default
  Public Key: pk_live_abc123...
  Secret Key: sk_live_xyz456...

  ⚠ Save the secret key now — it will not be shown again
```

### Generate Named API Keys

```bash
mujarrad sdk keygen --name "production"
```

Output:
```
✓ New API key pair created

  Name:       production
  Public Key: pk_live_def789...
  Secret Key: sk_live_ghi012...

  ⚠ Save the secret key now — it will not be shown again
```

### View Your Keys

API keys are automatically saved to your project's `.env` file:

```env
MUJARRAD_API_PUBLIC_KEY=pk_live_abc123...
MUJARRAD_API_SECRET_KEY=sk_live_xyz456...
MUJARRAD_SPACE_SLUG=my-app

PORT=3000
```

**Important:**
- ⚠️ Never commit `.env` to version control
- ⚠️ Secret keys are shown only once
- ⚠️ Keep your secret keys secure
- ⚠️ Use different keys for development and production

## 📝 Complete Workflow Example

### Step 1: Initialize Project

```bash
mujarrad sdk init my-task-manager --template task-manager
```

**Interactive Prompt:**
```
? Choose a project template:
  Basic - Simple starter with schema and client
  Task Manager - Full-featured task management app with web dashboard
❯ Task Manager - Full-featured task management app with web dashboard
```

**Output:**
```
✓ Checking authentication...
✓ Authenticated
✓ Setting up space "my-task-manager"...
✓ Space ready: my-task-manager
✓ Generating API keys...
✓ API keys generated
✓ Scaffolding project...
✓ Project created

✓ Project "my-task-manager" is ready!

  Directory:  /Users/developer/my-task-manager
  Space:      my-task-manager
  Template:   task-manager
  Public Key: pk_live_abc123...

  ⚠ Secret key saved to .env — shown only once

  Next steps:
    cd my-task-manager
    npm install
    npm run seed    # Load sample data
    npm run demo    # Run query demos
    npm start       # Start web dashboard
```

### Step 2: Install Dependencies

```bash
cd my-task-manager
npm install
```

### Step 3: Load Sample Data

```bash
npm run seed
```

**Output:**
```
🌱 Seeding Task Manager Database

Creating users...
  ✓ Created 3 users

Creating project...
  ✓ Created project: Website Redesign

Creating tasks...
  ✓ Created 5 tasks

Creating relationships...
  ✓ Alice owns the project
  ✓ Tasks added to project
  ✓ Carol assigned to Design Homepage
  ✓ Alice assigned to Implement Homepage
  ✓ Bob assigned to Write Tests
  ✓ Carol assigned to Design Dashboard
  ✓ Alice assigned to Implement API
  ✓ Implement Homepage depends on Design Homepage
  ✓ Write Tests depends on Implement Homepage

✅ Database seeded successfully!

Next steps:
  1. Run: npm run demo
  2. Run: npm start
  3. Open: http://localhost:3000
```

### Step 4: Explore Queries

```bash
npm run demo
```

**Output:**
```
🔍 Task Manager Graph Demo

============================================================
Exploring the power of Mujarrad's graph data model

1️⃣  QUERY: Get All Tasks

Found: 5 tasks

2️⃣  QUERY: High Priority Tasks

Found: 3 high/critical tasks

3️⃣  QUERY: Task Dependencies

Task Design Homepage has 0 dependencies

============================================================
💡 KEY INSIGHTS

Graph Approach:
  ✓ Single concept: Everything is a node
  ✓ Natural relationships: Nodes connected via attributes
  ✓ Easy traversal: getAncestors() / getDescendants()
  ✓ Flexible schema: Add new relationship types instantly

============================================================
🎓 TUTORIAL COMPLETE
```

### Step 5: Start Web Dashboard

```bash
npm start
```

**Output:**
```
Using API Key authentication
Space: my-task-manager

✓ Server running on http://localhost:3000

Dashboard: http://localhost:3000
Debug:     http://localhost:3000/debug.html
```

Open your browser to:
- **Dashboard**: http://localhost:3000 - Interactive task management
- **Debug**: http://localhost:3000/debug.html - API console
- **Browser Check**: http://localhost:3000/check_browser.html - Compatibility test

## 🎨 Customizing Your Project

### Modify the Schema

Edit `src/schema.ts` to define your data model:

```typescript
export const SCHEMA = {
  entities: {
    User: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        role: { type: 'enum', values: ['admin', 'developer', 'designer'] },
      },
    },
    Task: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['todo', 'in_progress', 'done'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high'] },
      },
    },
  },
  relationships: {
    task_assignee: {
      source: 'Task',
      target: 'User',
      verb: 'assigned_to',
    },
  },
};
```

### Add Custom API Endpoints

Edit `server.ts` to add new endpoints:

```typescript
app.get('/api/my-custom-endpoint', async (req, res) => {
  // Your custom logic here
  res.json({ message: 'Hello from custom endpoint' });
});
```

### Extend the Dashboard

Edit `public/index.html` to customize the UI.

### Add Seed Data

Edit `src/seed.ts` to add your own sample data.

### Write Custom Queries

Edit `src/demo.ts` or create new scripts.

## 🔧 Configuration

### Environment Variables

Your `.env` file contains:

```env
# Mujarrad API Configuration
MUJARRAD_API_PUBLIC_KEY=pk_live_abc123...
MUJARRAD_API_SECRET_KEY=sk_live_xyz456...
MUJARRAD_SPACE_SLUG=my-app

# Server Configuration
PORT=3000
```

### TypeScript Configuration

`tsconfig.json` is configured for:
- Target: ES2022
- Module: ES2022
- Strict mode enabled
- Node.js module resolution

## 📚 Learning Resources

- [Architecture Comparison](../packages/sdk/docs/ARCHITECTURE_COMPARISON.md) - Understand the difference between concrete and abstract approaches
- [Getting Started Guide](../packages/sdk/docs/getting-started.md) - SDK fundamentals and examples
- [Task Manager Tutorial](../task-manager-tutorial/README.md) - Complete example application
- [Mujarrad Documentation](https://docs.mujarrad.com) - Official documentation

## 🤝 Contributing

Want to improve the SDK CLI?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🐛 Troubleshooting

### "Not authenticated" Error

```bash
mujarrad auth login
```

### "Space not found" Error

The space is automatically created when you run `mujarrad sdk init`. If you see this error, try:

```bash
mujarrad sdk init my-app --template basic
```

### Module Not Found Errors

```bash
cd my-app
npm install
```

### Build Errors

Make sure you have the latest TypeScript:

```bash
npm install -g typescript@latest
```

## 📞 Support

- 📖 [Documentation](https://docs.mujarrad.com)
- 💬 [Discord Community](https://discord.gg/mujarrad)
- 🐛 [Issue Tracker](https://github.com/mujarrad/mujarrad-cli/issues)
- 📧 [Email Support](support@mujarrad.com)

---

**Happy Coding! 🚀**

Built with 💜 by the Mujarrad Team
