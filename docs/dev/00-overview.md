# Mujarrad SDK Developer Documentation

Welcome to the Mujarrad SDK documentation. This guide takes you from zero to building production apps on Mujarrad's graph-based data platform.

## What is Mujarrad?

Mujarrad is a graph-based data platform where **everything is a node** and **relationships are attributes**. Think of it as Firebase or Supabase — but graph-native. Instead of rows in tables, you work with nodes in a graph. Instead of foreign keys, you create typed relationships between nodes.

### Core Data Model

```
  ┌──────────┐    attributeName: "contains"    ┌──────────┐
  │   Node   │ ──────────────────────────────> │   Node   │
  │  (User)  │        Attribute                │  (Task)  │
  └──────────┘                                 └──────────┘
       │                                            │
       ├── id                                       ├── id
       ├── title                                    ├── title
       ├── nodeType: CONTEXT                        ├── nodeType: REGULAR
       ├── nodeDetails: { email, name }             ├── nodeDetails: { status }
       └── spaceId                                  └── spaceId
```

**Nodes** hold your data. **Attributes** connect them. **Spaces** group them.

### Key Concepts

| Concept | What It Is | SQL Equivalent |
|---------|-----------|----------------|
| **Node** | A data entity (user, task, document, anything) | A row |
| **Attribute** | A directed relationship between two nodes | A foreign key / join |
| **Space** | A workspace that groups related nodes | A database / schema |
| **Node Type** | Classification of a node (REGULAR, CONTEXT, ASSUMPTION, TEMPLATE) | A table name |
| **Node Details** | Arbitrary JSON data stored on a node | Column values |

## Documentation Index

| Guide | What You'll Learn |
|-------|-------------------|
| [01 - Getting Started](./01-getting-started.md) | Install, authenticate, scaffold your first project |
| [02 - Core Concepts](./02-core-concepts.md) | Nodes, Attributes, Spaces, and the graph model |
| [03 - Schema Definition](./03-schema-definition.md) | Define entity shapes and relationships with the fluent builder |
| [04 - CRUD Operations](./04-crud-operations.md) | Create, read, update, delete nodes and attributes |
| [05 - Graph Traversal](./05-graph-traversal.md) | Walk the graph with ancestors, descendants, and links |
| [06 - Error Handling](./06-error-handling.md) | Handle errors, retries, and edge cases |
| [07 - Building a Todo App](./07-tutorial-todo-app.md) | End-to-end tutorial building a real application |
| [08 - API Reference](./08-api-reference.md) | Complete reference for every class, method, and type |
| [09 - CLI Commands](./09-cli-commands.md) | `mujarrad sdk init`, `mujarrad sdk keygen`, and workflow |
| [10 - Architecture & Internals](./10-architecture.md) | How the SDK works internally, contributing guide |

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- A Mujarrad account (sign up at [mujarrad.com](https://www.mujarrad.com))
