# Mujarrad SDK Documentation Index

Complete documentation for building applications with the Mujarrad SDK.

## 📚 Documentation Overview

### 1. SDK CLI Guide
**File:** [SDK_CLI_GUIDE.md](./SDK_CLI_GUIDE.md)

Learn how to use the Mujarrad CLI to scaffold SDK-based projects:

- ✅ Automatic API key generation
- ✅ Project scaffolding with folder structure
- ✅ Environment setup (.env files)
- ✅ Multiple project templates
- ✅ Pre-built examples and demos

**Quick Start:**
```bash
mujarrad sdk init my-app --template task-manager
```

---

### 2. Architecture Comparison
**File:** [ARCHITECTURE_COMPARISON.md](./ARCHITECTURE_COMPARISON.md)

Understand the architectural differences between building applications with:

- **Concrete Application**: Raw HTTP/API calls
- **Abstraction Layer**: Mujarrad SDK

**Key Differences:**

| Aspect | Concrete (Raw HTTP) | SDK (Abstraction) |
|--------|-------------------|-------------------|
| Code Volume | 150+ lines | 45 lines |
| API Calls | 201 (N+1 problem) | 1 (batch) |
| Type Safety | None | Full |
| Development Time | 4 hours | 30 minutes |
| Error Handling | Manual | Automatic |

**Why Choose SDK:**
- 80% less boilerplate code
- Full type safety with TypeScript
- Built-in graph traversal
- Automatic schema validation
- 87.5% faster development

---

### 3. Getting Started Guide
**File:** [getting-started.md](./getting-started.md)

Complete tutorial for building applications with the Mujarrad SDK:

**Topics Covered:**
1. Installation and setup
2. Core concepts (Entities, Relationships, Traversal)
3. Complete Task Manager example
4. Advanced features (Batch operations, Validation, Error handling)
5. Best practices

**Example:**
```typescript
import { Mujarrad, defineSchema } from '@mujarrad/sdk';

const schema = defineSchema(builder => {
  builder.entity('Task', 'REGULAR')
    .field('status', 'enum', ['todo', 'done'])
    .field('priority', 'enum', ['low', 'medium', 'high']);
});

const client = new Mujarrad(config).withSchema(schema);

const task = await client.createEntity('Task', {
  title: 'My First Task',
  status: 'todo',
  priority: 'high',
});
```

---

## 🚀 Quick Reference

### CLI Commands

```bash
# Initialize a new project (interactive)
mujarrad sdk init my-app

# Initialize with specific template
mujarrad sdk init my-app --template basic
mujarrad sdk init my-app --template task-manager

# Generate API keys
mujarrad sdk keygen

# Generate named API keys
mujarrad sdk keygen --name "production"
```

### SDK Operations

```typescript
// Create a node
const node = await client.nodes.create({
  title: 'My Node',
  nodeType: 'REGULAR',
  nodeDetails: { status: 'active' },
});

// List nodes
const nodes = await client.nodes.list({ nodeType: 'REGULAR' });

// Graph traversal
const ancestors = await client.getAncestors(nodeId);    // Dependencies
const descendants = await client.getDescendants(nodeId); // Dependents

// Create relationships
await client.link(sourceId, targetId, 'assigned_to');

// Schema validation
const schema = defineSchema(builder => {
  builder.entity('Task', 'REGULAR')
    .field('status', 'enum', ['todo', 'done']);
});
```

### Project Templates

| Template | Description | Use Case |
|----------|-------------|----------|
| `basic` | Simple starter | Learning, small projects |
| `task-manager` | Full-featured app | Complete examples, production apps |

---

## 📖 Learning Path

### Beginner (New to Graph Databases)

1. Start with **[SDK CLI Guide](./SDK_CLI_GUIDE.md)**
   - Create your first project
   - Explore the basic template
   - Understand project structure

2. Read **[Architecture Comparison](./ARCHITECTURE_COMPARISON.md)**
   - Understand why SDK is better than raw HTTP
   - Learn the architectural benefits

3. Try the **[Getting Started Guide](./getting-started.md)**
   - Build a simple application
   - Learn core concepts
   - Run examples

### Intermediate (Familiar with Graph Databases)

1. Create a task-manager project:
   ```bash
   mujarrad sdk init my-app --template task-manager
   ```

2. Explore the generated code:
   - `src/schema.ts` - Data model
   - `src/client.ts` - API client
   - `src/seed.ts` - Sample data
   - `src/demo.ts` - Query examples

3. Customize for your use case

### Advanced (Building Production Applications)

1. Design your schema
2. Implement business logic
3. Build custom UI
4. Add authentication/authorization
5. Deploy to production

---

## 🎯 Use Cases

### Task Management
Graph databases excel at modeling complex relationships:
- Task dependencies
- Team assignments
- Project hierarchies
- Milestone tracking

**Template:** `task-manager`

### Knowledge Management
Model information and its relationships:
- Document connections
- Cross-references
- Tagging and categorization
- Version history

### Social Networks
Model users and their interactions:
- Friendships
- Posts and comments
- Groups and communities
- Recommendations

### Supply Chain
Model products and their journey:
- Components and sub-assemblies
- Supplier relationships
- Inventory tracking
- Quality control

---

## 🔧 Configuration

### Environment Variables

```env
# Required
MUJARRAD_API_PUBLIC_KEY=pk_live_...
MUJARRAD_API_SECRET_KEY=sk_live_...
MUJARRAD_SPACE_SLUG=my-space

# Optional (for web servers)
PORT=3000
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

---

## 📊 Comparison: Before and After

### Before (Raw HTTP API)

```typescript
// ❌ 80+ lines of code
const response = await axios.post('/nodes', {
  title: 'My Task',
  nodeType: 'REGULAR',
  nodeDetails: {
    status: 'todo',
    priority: 'high',
  }
}, {
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-API-Secret': secretKey,
  }
});

const task = response.data?.data || response.data;
```

**Problems:**
- Manual HTTP handling
- No type safety
- Repetitive code
- Error-prone

### After (Mujarrad SDK)

```typescript
// ✅ 3 lines of code
const task = await client.createEntity('Task', {
  title: 'My Task',
  status: 'todo',
  priority: 'high',
});
```

**Benefits:**
- Automatic validation
- Full type safety
- Clean, readable code
- Error handling built-in

---

## 🎓 Key Concepts

### 1. Schema-First Development

Define your data model first:

```typescript
const schema = defineSchema(builder => {
  builder.entity('User', 'CONTEXT')
    .field('email', 'string', { required: true });

  builder.entity('Task', 'REGULAR')
    .field('status', 'enum', ['todo', 'done']);

  builder.relationship('Task', 'User', 'assigned_to');
});
```

### 2. Node Types

| Type | Purpose | Example |
|------|---------|---------|
| `REGULAR` | Standard data | Tasks, Projects, Documents |
| `CONTEXT` | Identity entities | Users, Teams, Organizations |
| `ASSUMPTION` | Draft/hypothesis | Draft tasks, Unconfirmed reports |
| `TEMPLATE` | Reusable patterns | Task templates, Form templates |

### 3. Graph Traversal

One of the most powerful features:

```typescript
// Find all dependencies
const dependencies = await client.getAncestors(taskId);

// Find all dependents
const dependents = await client.getDescendants(taskId);

// Single API call for complex relationships!
```

### 4. Type Safety

Full TypeScript support:

```typescript
interface TaskDetails {
  description: string;
  status: 'backlog' | 'todo' | 'done';
  priority: 'low' | 'medium' | 'high';
}

const task: MujarradNode<TaskDetails> = await client.nodes.get(id);
// TypeScript knows the exact types!
```

---

## 🤝 Community & Support

- 📖 [Documentation](https://docs.mujarrad.com)
- 💬 [Discord Community](https://discord.gg/mujarrad)
- 🐛 [Issue Tracker](https://github.com/mujarrad/mujarrad-cli/issues)
- 📧 [Email Support](support@mujarrad.com)

---

## 📝 License

Apache 2.0 License - See LICENSE file for details

---

**Built with 💜 by the Mujarrad Team**
