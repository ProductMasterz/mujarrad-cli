# CLI Commands

The Mujarrad CLI provides `sdk` commands for project scaffolding and API key management. This guide covers every command, option, and workflow.

## Prerequisites

Install the CLI globally:

```bash
npm install -g mujarrad-cli
```

Authenticate (required before any `sdk` command):

```bash
mujarrad auth login
```

Check your auth status:

```bash
mujarrad auth status
```

## Command Overview

| Command | Description |
|---------|-------------|
| `mujarrad sdk init <name>` | Scaffold a new SDK project |
| `mujarrad sdk keygen` | Generate a new API key pair |

## `mujarrad sdk init`

Scaffolds a new Mujarrad SDK project with everything configured.

### Usage

```bash
mujarrad sdk init <project-name>
```

### What It Does

1. **Checks authentication** — Verifies your JWT token is valid
2. **Creates a Space** — Creates (or reuses) a space named `<project-name>` on the backend
3. **Generates API keys** — Creates a public/secret key pair for programmatic access
4. **Scaffolds the project** — Creates a directory with working code and configuration

### Output

```
✓ Authenticated
✓ Space ready: my-app
✓ API keys generated
✓ Project created

✓ Project "my-app" is ready!

  Directory:  /Users/you/my-app
  Space:      my-app
  Public Key: pk_live_abc123...

  ⚠ Secret key saved to .env — shown only once

  Next steps:
    cd my-app
    npm install
    npm start
```

### Generated Project Structure

```
my-app/
├── package.json          # @mujarrad/sdk dependency
├── tsconfig.json         # TypeScript config (ES2022, strict)
├── .env                  # API keys (NEVER commit this)
├── .gitignore            # Ignores .env, node_modules, dist
├── src/
│   ├── index.ts          # Working example
│   └── schema.ts         # Example schema
└── README.md             # Quick start guide
```

### `.env` File Contents

```env
MUJARRAD_PUBLIC_KEY=pk_live_...
MUJARRAD_SECRET_KEY=sk_live_...
MUJARRAD_SPACE=my-app
```

### After Scaffolding

```bash
cd my-app
npm install
npm start
```

This runs the example code, which creates a node on the Mujarrad backend.

## `mujarrad sdk keygen`

Generates a new API key pair for programmatic access.

### Usage

```bash
mujarrad sdk keygen [--name <name>]
```

### Options

| Flag | Description |
|------|-------------|
| `--name <name>` | Give the key a descriptive name (e.g., "staging", "production") |

### Examples

```bash
# Generate a default key
mujarrad sdk keygen

# Generate a named key
mujarrad sdk keygen --name "staging"
mujarrad sdk keygen --name "production"
mujarrad sdk keygen --name "ci-cd"
```

### Output

```
✓ Authenticated
✓ API keys generated

✓ New API key pair created

  Name:       staging
  Public Key: pk_live_xyz789...
  Secret Key: sk_live_abc123...

  ⚠ Save the secret key now — it will not be shown again
```

### Key Management Tips

- **Secret keys are shown once** — Copy and save them immediately
- **Use separate keys per environment** — Create distinct keys for dev, staging, production
- **Rotate compromised keys** — If a key is exposed, rotate it via the SDK:
  ```typescript
  const rotated = await client.apiKeys.rotate('key-id');
  ```
- **Delete unused keys** — Clean up keys you no longer need:
  ```typescript
  await client.apiKeys.delete('key-id');
  ```

## Authentication Flow

All `sdk` commands require authentication. The flow is:

1. You run `mujarrad auth login` and enter your credentials
2. The CLI stores your JWT token in the OS keychain
3. When you run `mujarrad sdk init` or `mujarrad sdk keygen`, the CLI reads the token
4. The token is used to authenticate API calls (space creation, key generation)
5. The generated API keys (`pk_live_`, `sk_live_`) are what the SDK uses for runtime auth

```
CLI Auth (JWT)                    SDK Auth (API Keys)
┌──────────────┐                  ┌──────────────────┐
│ mujarrad     │  creates keys    │ @mujarrad/sdk    │
│ auth login   │ ──────────────>  │ new Mujarrad({   │
│              │                  │   apiKey: pk_..  │
│ JWT token    │                  │   secretKey: sk_ │
│ in keychain  │                  │ })               │
└──────────────┘                  └──────────────────┘
```

**CLI commands** use your JWT token (stored in keychain).
**SDK operations** use API keys (stored in `.env`).

## Error Messages

### Not Authenticated

```
✗ SDK init failed: Not authenticated. Run "mujarrad auth login" first.

Run "mujarrad auth login" to authenticate
```

**Fix:** Run `mujarrad auth login` before using `sdk` commands.

### Session Expired

```
✗ SDK init failed: Request failed with status code 401

Session expired. Run "mujarrad auth login" to re-authenticate
```

**Fix:** Your JWT token has expired. Run `mujarrad auth login` again.

### Network Error

```
✗ SDK init failed: connect ECONNREFUSED 127.0.0.1:3000

Network error. Check your internet connection.
```

**Fix:** Check your internet connection. If you're using a custom `apiBaseUrl`, verify the server is running.

## Workflow: New Project from Scratch

```bash
# 1. Install the CLI
npm install -g mujarrad-cli

# 2. Authenticate
mujarrad auth login

# 3. Scaffold a project
mujarrad sdk init my-todo-app

# 4. Set up
cd my-todo-app
npm install

# 5. Edit src/schema.ts to define your data model
# 6. Edit src/index.ts to build your app logic

# 7. Run
npm start
```

## Workflow: Add API Keys to Existing Project

```bash
# Generate keys for different environments
mujarrad sdk keygen --name "development"
mujarrad sdk keygen --name "staging"
mujarrad sdk keygen --name "production"

# Copy the keys to your .env files
# .env.development, .env.staging, .env.production
```

## Getting Help

```bash
# SDK command help
mujarrad sdk --help

# Init subcommand help
mujarrad sdk init --help

# Keygen subcommand help
mujarrad sdk keygen --help
```

## What's Next

- [Architecture & Internals](./10-architecture.md) — How the SDK works under the hood
- [Getting Started](./01-getting-started.md) — Quick start guide
- [Building a Todo App](./07-tutorial-todo-app.md) — Full tutorial
