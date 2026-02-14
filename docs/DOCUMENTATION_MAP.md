# Mujarrad Documentation Map

This file provides a comprehensive map linking the Mujarrad documentation to the working implementation in the `task-manager-tutorial/` directory.

## Quick Navigation

- [Documentation Overview Table](#documentation-overview-table)
- [Visual Learning Path](#visual-learning-path)
- [Implementation Reference Matrix](#implementation-reference-matrix)
- [Learning Paths](#learning-paths)

---

## Documentation Overview Table

| Doc File | What You'll Learn | Implementation Files | Key Examples |
|----------|-------------------|---------------------|--------------|
| **[00-overview.md](./00-overview.md)** | ISAAT paradigm, core innovation, why Mujarrad exists | N/A (conceptual) | Philosophy and vision |
| **[01-philosophy.md](./01-philosophy.md)** | The abstraction bottleneck, powder vs cement analogy | N/A (conceptual) | Theoretical foundation |
| **[02-core-concepts.md](./02-core-concepts.md)** | Everything is a Node (EiaN), Relationships, Graph Traversal | [`src/client.ts`](../task-manager-tutorial/src/client.ts)<br/>[`src/demo.ts`](../task-manager-tutorial/src/demo.ts) | MujarradNode interface (L10-20), createNode() (L85-105), getAncestors/Descendants (L138-150) |
| **[03-node-types.md](./03-node-types.md)** | CONTEXT, REGULAR, TEMPLATE node types | [`src/seed.ts`](../task-manager-tutorial/src/seed.ts)<br/>[`src/schema.ts`](../task-manager-tutorial/src/schema.ts) | User creation (L40-59), Task creation (L138-198), Template creation (L84-100) |
| **[04-relationships.md](./04-relationships.md)** | Typed semantic relationships, attribute structure | [`src/client.ts`](../task-manager-tutorial/src/client.ts) | createAttribute() (L153-170), getAttributes() (L172-177) |
| **[05-task-manager-tutorial.md](./05-task-manager-tutorial.md)** | Complete walkthrough building a task manager | All files in [`task-manager-tutorial/`](../task-manager-tutorial/) | End-to-end implementation |
| **[06-api-basics.md](./06-api-basics.md)** | Authentication, CRUD operations, basic queries | [`src/client.ts`](../task-manager-tutorial/src/client.ts)<br/>[`server.ts`](../task-manager-tutorial/server.ts) | MujarradClient class (L64-192), API endpoints (L204-693) |
| **[07-graph-traversal.md](./07-graph-traversal.md)** | Advanced querying, filtering, traversal patterns | [`src/demo.ts`](../task-manager-tutorial/src/demo.ts) | Query examples (L28-199) |
| **[08-best-practices.md](./08-best-practices.md)** | Production patterns, error handling, optimization | [`server.ts`](../task-manager-tutorial/server.ts) | Caching (L30-37), error handling (L281-287) |
| **[09-cli-reference.md](./09-cli-reference.md)** | Command-line tools and operations | N/A (CLI tool) | Mujarrad CLI commands |

---

## Visual Learning Path

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MUJARRAD LEARNING JOURNEY                        │
└─────────────────────────────────────────────────────────────────────┘

START HERE
    │
    ├─► [00-overview.md] ────────────► Why Mujarrad exists
    │   "The Vision"                    ISAAT paradigm
    │
    ├─► [01-philosophy.md] ──────────► Abstraction bottleneck
    │   "The Problem"                   Powder vs Cement
    │
    ├─► [02-core-concepts.md] ───────► Everything is a Node (EiaN)
    │   "The Foundation"      │         Relationships define structure
    │                         │         Graph traversal
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    ├─ src/client.ts ──────► MujarradClient API
    │                                    └─ src/demo.ts ────────► Query patterns
    │
    ├─► [03-node-types.md] ──────────► CONTEXT, REGULAR, TEMPLATE
    │   "Types of Nodes"      │
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    ├─ src/seed.ts ────────► Creating nodes
    │                                    └─ src/schema.ts ──────► Schema definition
    │
    ├─► [04-relationships.md] ────────► Typed semantic relationships
    │   "Connections"         │         Attributes (edges)
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    └─ src/client.ts ──────► createAttribute()
    │
    ├─► [05-task-manager-tutorial.md] ► Complete walkthrough
    │   "Hands-On Practice"   │
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    ├─ server.ts ───────────► Express server
    │                                    ├─ src/seed.ts ────────► Populate data
    │                                    ├─ src/demo.ts ────────► Query examples
    │                                    └─ public/index.html ──► Dashboard UI
    │
    ├─► [06-api-basics.md] ───────────► CRUD operations
    │   "Building Blocks"     │         Authentication
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    ├─ src/client.ts ──────► API methods
    │                                    └─ server.ts ───────────► API endpoints
    │
    ├─► [07-graph-traversal.md] ──────► Advanced querying
    │   "Power Queries"       │         Filtering & traversal
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    └─ src/demo.ts ────────► 6 query examples
    │
    ├─► [08-best-practices.md] ───────► Production patterns
    │   "Production Ready"    │         Error handling
    │                         │
    │                         └────────► task-manager-tutorial/
    │                                    └─ server.ts ───────────► Caching, errors
    │
    └─► [09-cli-reference.md] ────────► Command-line tools
        "CLI Mastery"                   Mujarrad CLI

BUILD YOUR OWN APPLICATION
```

---

## Implementation Reference Matrix

This table shows which implementation files demonstrate each documentation concept.

| Implementation File | Concepts Demonstrated | Referenced in Docs | Key Line Numbers |
|---------------------|----------------------|-------------------|------------------|
| **[server.ts](../task-manager-tutorial/server.ts)** | Express server, API endpoints, MujarradClient usage, caching, error handling | 06-api-basics.md<br/>08-best-practices.md | L57-188 (MujarradClient)<br/>L204-288 (/api/dashboard)<br/>L30-37 (caching)<br/>L281-287 (errors) |
| **[src/client.ts](../task-manager-tutorial/src/client.ts)** | MujarradClient class, node interfaces, CRUD operations, graph traversal, authentication | 02-core-concepts.md<br/>06-api-basics.md<br/>07-graph-traversal.md | L10-20 (MujarradNode)<br/>L64-82 (constructor)<br/>L85-105 (createNode)<br/>L138-150 (traversal) |
| **[src/seed.ts](../task-manager-tutorial/src/seed.ts)** | Creating nodes, node types (CONTEXT/REGULAR), populating data | 03-node-types.md<br/>05-task-manager-tutorial.md | L40-66 (CONTEXT users)<br/>L138-198 (REGULAR tasks)<br/>L84-100 (templates) |
| **[src/demo.ts](../task-manager-tutorial/src/demo.ts)** | Graph queries, filtering, traversal patterns, statistics | 07-graph-traversal.md<br/>02-core-concepts.md | L28-44 (list tasks)<br/>L49-66 (filter by priority)<br/>L71-87 (filter by status)<br/>L142-159 (statistics) |
| **[src/schema.ts](../task-manager-tutorial/src/schema.ts)** | Schema definition, entity types, relationship mapping | 03-node-types.md | L26-99 (entities)<br/>L101-153 (relationships) |
| **[public/index.html](../task-manager-tutorial/public/index.html)** | Frontend dashboard, data visualization | 05-task-manager-tutorial.md | L1-100+ (UI components) |
| **[package.json](../task-manager-tutorial/package.json)** | Dependencies, scripts | 05-task-manager-tutorial.md | L6-8 (npm scripts) |
| **[.env.example](../task-manager-tutorial/.env.example)** | Configuration, API keys | 06-api-basics.md | (if exists) |

---

## Learning Paths

Choose your path based on your role and goals:

### Path 1: Beginner (Learn the Basics)
**Time:** 2-3 hours
**Goal:** Understand Mujarrad fundamentals and build your first application

1. **[00-overview.md](./00-overview.md)** (15 min) - Why Mujarrad?
2. **[02-core-concepts.md](./02-core-concepts.md)** (30 min) - The three principles
   - Try: Read [`src/client.ts`](../task-manager-tutorial/src/client.ts) lines 10-20 (MujarradNode interface)
3. **[03-node-types.md](./03-node-types.md)** (20 min) - CONTEXT, REGULAR, TEMPLATE
   - Try: Read [`src/seed.ts`](../task-manager-tutorial/src/seed.ts) lines 40-66 (creating users)
4. **[05-task-manager-tutorial.md](./05-task-manager-tutorial.md)** (60 min) - Build the tutorial
   - Try: Run `npm run seed` and `npm start`
   - Try: Open http://localhost:3000 and explore the dashboard
5. **[06-api-basics.md](./06-api-basics.md)** (30 min) - CRUD operations
   - Try: Run `npm run demo` to see queries in action

### Path 2: Developer (Build Production Apps)
**Time:** 4-6 hours
**Goal:** Master the API and build production-ready applications

1. **[02-core-concepts.md](./02-core-concepts.md)** (20 min) - Quick review
2. **[06-api-basics.md](./06-api-basics.md)** (45 min) - Deep dive into API
   - Study: [`src/client.ts`](../task-manager-tutorial/src/client.ts) - entire MujarradClient class
   - Study: [`server.ts`](../task-manager-tutorial/server.ts) - API endpoint patterns
3. **[07-graph-traversal.md](./07-graph-traversal.md)** (60 min) - Advanced queries
   - Study: [`src/demo.ts`](../task-manager-tutorial/src/demo.ts) - all 6 query examples
   - Try: Modify queries to filter by different criteria
4. **[08-best-practices.md](./08-best-practices.md)** (45 min) - Production patterns
   - Study: [`server.ts`](../task-manager-tutorial/server.ts) lines 30-37 (caching strategy)
   - Study: Error handling patterns throughout server.ts
5. **[04-relationships.md](./04-relationships.md)** (30 min) - Relationship modeling
   - Study: [`src/schema.ts`](../task-manager-tutorial/src/schema.ts) - relationship definitions
6. **Hands-On Project** (2-3 hours) - Build your own application
   - Clone task-manager-tutorial structure
   - Implement your own domain model

### Path 3: Architect (Design Graph Systems)
**Time:** 6-8 hours
**Goal:** Design scalable graph-based architectures with Mujarrad

1. **[01-philosophy.md](./01-philosophy.md)** (30 min) - Deep dive into ISAAT
2. **[02-core-concepts.md](./02-core-concepts.md)** (45 min) - Graph theory foundations
3. **[04-relationships.md](./04-relationships.md)** (60 min) - Relationship patterns
   - Study: [`src/schema.ts`](../task-manager-tutorial/src/schema.ts) - complete schema design
   - Exercise: Design relationships for your domain
4. **[07-graph-traversal.md](./07-graph-traversal.md)** (90 min) - Advanced patterns
   - Study: All query patterns in [`src/demo.ts`](../task-manager-tutorial/src/demo.ts)
   - Exercise: Design complex multi-hop queries
5. **[08-best-practices.md](./08-best-practices.md)** (60 min) - Architecture patterns
   - Study: Server-side caching in [`server.ts`](../task-manager-tutorial/server.ts)
   - Study: API optimization strategies
6. **Architecture Exercise** (3-4 hours)
   - Design a complex multi-tenant system
   - Model hierarchical relationships
   - Plan performance optimization strategies

---

## File-to-Concept Index

Use this index to find implementation examples for specific concepts:

### Authentication & Setup
- **API Key Authentication:** [`src/client.ts:70-82`](../task-manager-tutorial/src/client.ts#L70-L82)
- **Environment Variables:** [`server.ts:23`](../task-manager-tutorial/server.ts#L23)
- **Client Initialization:** [`src/seed.ts:24`](../task-manager-tutorial/src/seed.ts#L24)

### Node Operations
- **Create Node:** [`src/client.ts:85-105`](../task-manager-tutorial/src/client.ts#L85-L105)
- **Get Node:** [`src/client.ts:107-112`](../task-manager-tutorial/src/client.ts#L107-L112)
- **Update Node:** [`src/client.ts:125-131`](../task-manager-tutorial/src/client.ts#L125-L131)
- **Delete Node:** [`src/client.ts:133-135`](../task-manager-tutorial/src/client.ts#L133-L135)
- **List Nodes:** [`src/client.ts:114-123`](../task-manager-tutorial/src/client.ts#L114-L123)

### Node Types
- **CONTEXT Nodes (Users):** [`src/seed.ts:40-66`](../task-manager-tutorial/src/seed.ts#L40-L66)
- **CONTEXT Nodes (Teams):** [`src/seed.ts:68-80`](../task-manager-tutorial/src/seed.ts#L68-L80)
- **REGULAR Nodes (Tasks):** [`src/seed.ts:138-198`](../task-manager-tutorial/src/seed.ts#L138-L198)
- **REGULAR Nodes (Projects):** [`src/seed.ts:103-112`](../task-manager-tutorial/src/seed.ts#L103-L112)
- **TEMPLATE Nodes:** [`src/seed.ts:84-100`](../task-manager-tutorial/src/seed.ts#L84-L100)

### Relationships (Attributes)
- **Create Attribute:** [`src/client.ts:153-170`](../task-manager-tutorial/src/client.ts#L153-L170)
- **Get Attributes:** [`src/client.ts:172-177`](../task-manager-tutorial/src/client.ts#L172-L177)
- **Relationship Schema:** [`src/schema.ts:101-153`](../task-manager-tutorial/src/schema.ts#L101-L153)

### Graph Traversal
- **Get Ancestors:** [`src/client.ts:138-143`](../task-manager-tutorial/src/client.ts#L138-L143)
- **Get Descendants:** [`src/client.ts:145-150`](../task-manager-tutorial/src/client.ts#L145-L150)
- **Query Examples:** [`src/demo.ts:28-199`](../task-manager-tutorial/src/demo.ts#L28-L199)

### Filtering & Queries
- **Filter by Node Type:** [`src/demo.ts:96`](../task-manager-tutorial/src/demo.ts#L96)
- **Filter by Priority:** [`src/demo.ts:53-56`](../task-manager-tutorial/src/demo.ts#L53-L56)
- **Filter by Status:** [`src/demo.ts:75-77`](../task-manager-tutorial/src/demo.ts#L75-L77)
- **Statistics:** [`src/demo.ts:142-159`](../task-manager-tutorial/src/demo.ts#L142-L159)

### API Endpoints
- **Dashboard Endpoint:** [`server.ts:204-288`](../task-manager-tutorial/server.ts#L204-L288)
- **List Data:** [`server.ts:294-327`](../task-manager-tutorial/server.ts#L294-L327)
- **Get Users:** [`server.ts:333-359`](../task-manager-tutorial/server.ts#L333-L359)
- **Create Task:** [`server.ts:444-486`](../task-manager-tutorial/server.ts#L444-L486)
- **Update Task:** [`server.ts:492-541`](../task-manager-tutorial/server.ts#L492-L541)
- **Delete Task:** [`server.ts:547-573`](../task-manager-tutorial/server.ts#L547-L573)

### Best Practices
- **Caching Strategy:** [`server.ts:30-37`](../task-manager-tutorial/server.ts#L30-L37)
- **Error Handling:** [`server.ts:281-287`](../task-manager-tutorial/server.ts#L281-L287)
- **Config Validation:** [`server.ts:46-49`](../task-manager-tutorial/server.ts#L46-L49)

---

## Quick Command Reference

Use these commands to explore the task-manager-tutorial:

```bash
# Navigate to tutorial directory
cd task-manager-tutorial

# Install dependencies
npm install

# Populate sample data
npm run seed

# Run demo queries
npm run demo

# Start the server and dashboard
npm start

# Open dashboard in browser
open http://localhost:3000
```

---

## Next Steps

After exploring this map:

1. Pick a [learning path](#learning-paths) that matches your role
2. Follow the documentation in order
3. Run the code examples from task-manager-tutorial/
4. Experiment by modifying the implementation
5. Build your own application using the patterns you've learned

For questions or contributions, visit the [GitHub repository](https://github.com/ProductMasterz/mujarrad-cli).
