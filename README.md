# MUJARRAD CLI

<div align="center">

```
   ███╗   ███╗██╗   ██╗     ██╗ █████╗ ██████╗ ██████╗  █████╗ ██████╗
   ████╗ ████║██║   ██║     ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
   ██╔████╔██║██║   ██║     ██║███████║██████╔╝██████╔╝███████║██║  ██║
   ██║╚██╔╝██║██║   ██║██   ██║██╔══██║██╔══██╗██╔══██╗██╔══██║██║  ██║
   ██║ ╚═╝ ██║╚██████╔╝╚█████╔╝██║  ██║██║  ██║██║  ██║██║  ██║██████╔╝
   ╚═╝     ╚═╝ ╚═════╝  ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

**Obsidian Knowledge Graph Integration CLI**

Sync your Obsidian vaults with Mujarrad workspaces seamlessly.

[![npm version](https://img.shields.io/npm/v/mujarrad-cli.svg)](https://www.npmjs.com/package/mujarrad-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

</div>

---

## Features

- 🚀 **Upload Obsidian Vaults** - Batch upload notes, folders, and canvases to Mujarrad
- 📥 **Clone Workspaces** - Download Mujarrad workspaces as local Obsidian vaults
- 🔄 **Bidirectional Sync** - Keep your local vaults and remote workspaces in sync
- 🎨 **Canvas Preservation** - Maintain visual layouts with pixel-perfect accuracy
- 📚 **Template System** - Clone workspaces from pre-built templates (Business Model Canvas, etc.)
- 🔐 **Secure Authentication** - JWT-based authentication with encrypted credential storage
- 📊 **Version History** - Track all changes with Git integration
- ⚡ **Fast & Efficient** - Batch processing with progress indicators

---

## Installation

### NPM (Recommended)

```bash
npm install -g mujarrad-cli
```

### NPX (No Installation Required)

```bash
npx mujarrad-cli [command]
```

### Prerequisites

- **Node.js**: >= 18.0.0
- **Git**: >= 2.20 (for version control features)
- **Obsidian**: Compatible with all vault formats

---

## Quick Start

### 1. Authenticate

```bash
mujarrad auth login
```

Enter your email and password when prompted.

### 2. Upload Your Vault

```bash
mujarrad upload ./my-vault --workspace my-workspace
```

### 3. Clone a Workspace

```bash
mujarrad clone ./new-vault --workspace my-workspace
```

### 4. Sync Changes

```bash
mujarrad sync ./my-vault
```

Enable continuous sync with watch mode:

```bash
mujarrad sync ./my-vault --watch
```

---

## Commands

### Authentication

```bash
mujarrad auth login          # Login with email/password
mujarrad auth logout         # Logout and clear credentials
mujarrad auth status         # Show authentication status
```

### Workspace Management

```bash
mujarrad workspace create    # Create a new workspace
mujarrad workspace list      # List your workspaces
mujarrad workspace delete    # Delete a workspace
```

### Upload & Sync

```bash
mujarrad upload <vault-path> --workspace <slug>
  Upload Obsidian vault to Mujarrad workspace

mujarrad sync <vault-path>
  Sync local changes with Mujarrad

  Options:
    --watch    Enable continuous sync (watches for file changes)
```

### Clone

```bash
mujarrad clone <target-path> --workspace <slug>
  Clone Mujarrad workspace to local Obsidian vault
  Automatically initializes Git repository
```

### Templates

```bash
mujarrad template list                    # List available templates
mujarrad template clone <target-path>     # Clone from template
  --template <id>                         # Template ID or slug
  --name <workspace-name>                 # New workspace name
```

### Version History

```bash
mujarrad history <node-id>               # View version history
mujarrad history diff <node-id> <v1> <v2>  # Show diff between versions
```

### Help

```bash
mujarrad --help              # Show all commands
mujarrad <command> --help    # Show help for specific command
```

---

## Configuration

Mujarrad CLI stores configuration in `~/.mujarrad/config.json`:

```json
{
  "apiBaseUrl": "https://api.example.com",
  "defaultWorkspace": "my-workspace",
  "autoSync": false,
  "logLevel": "info"
}
```

### Credential Storage

Credentials are stored securely:
- **macOS**: Keychain Access
- **Windows**: Credential Manager
- **Linux**: libsecret
- **Fallback**: AES-256 encrypted `~/.mujarrad/credentials.json` (permissions: 600)

---

## Architecture

Mujarrad CLI follows a 5-layer architecture:

```
Commands Layer (CLI handlers)
    ↓
Services Layer (Business logic)
    ↓
Workflows Layer (Multi-step orchestration)
    ↓
API Client Layer (Auto-generated from OpenAPI)
    ↓
File System Layer (Vault scanning, parsing)
```

---

## Development

### Setup

```bash
git clone https://github.com/mujarrad/mujarrad-cli.git
cd mujarrad-cli
npm install
```

### Build

```bash
npm run build
```

### Run in Development

```bash
npm run dev
```

### Testing

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

### Linting & Formatting

```bash
npm run lint              # Check for lint errors
npm run lint:fix          # Fix lint errors
npm run format            # Format code with Prettier
```

---

## Examples

### Example 1: Upload Business Model Canvas

```bash
# Upload vault with canvas files
mujarrad upload ./business-models --workspace startup-canvas

# Canvas visual properties are preserved:
# - Node positions, sizes, colors
# - Edge connections and styles
# - Canvas-wide zoom and viewport settings
```

### Example 2: Clone Template

```bash
# List available templates
mujarrad template list

# Clone Business Model Canvas template
mujarrad template clone ./my-startup \
  --template business-model-canvas \
  --name "My Startup"

# Template includes:
# - Pre-structured canvas layouts
# - Placeholder nodes
# - Template configuration file
```

### Example 3: Continuous Sync

```bash
# Start continuous sync with watch mode
mujarrad sync ./my-vault --watch

# CLI will monitor file changes and sync automatically
# Detects: new files, updates, deletions
# Handles: conflict resolution, version tracking
```

---

## Troubleshooting

### Authentication Issues

```bash
# Check authentication status
mujarrad auth status

# Re-authenticate
mujarrad auth logout
mujarrad auth login
```

### Sync Conflicts

When conflicts occur, Mujarrad CLI uses intelligent resolution:
- **Last-write-wins** for concurrent edits (based on timestamp)
- **UUID suffix** for name conflicts (e.g., `Note-a1b2c3d4.md`)
- **Interactive prompts** for complex conflicts

### Git Issues

```bash
# Ensure Git is installed
git --version

# Check Git configuration
git config --global user.name
git config --global user.email
```

### Logs

All operations are logged to `~/.mujarrad/logs/mujarrad.log`:

```bash
# View logs
tail -f ~/.mujarrad/logs/mujarrad.log
```

---

## Roadmap

- [x] Phase 0: Project Setup
- [ ] Phase 1: Foundation (API client, Config, Auth)
- [ ] Phase 2: File System Operations
- [ ] Phase 3: Upload Workflow
- [ ] Phase 4: Clone Workflow
- [ ] Phase 5: Sync Workflow
- [ ] Phase 6: Canvas Support
- [ ] Phase 7: Template System
- [ ] Phase 8: Distribution (pip, binaries, executables)

See [tasks.md](./specs/007-obsidian-mapper-i/tasks.md) for detailed implementation plan.

---

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) first.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD approach)
4. Implement your feature
5. Ensure tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Support

- **Documentation**: [GitHub Wiki](https://github.com/mujarrad/mujarrad-cli/wiki)
- **Issues**: [GitHub Issues](https://github.com/mujarrad/mujarrad-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mujarrad/mujarrad-cli/discussions)

---

<div align="center">

**Made with 💜 by the Mujarrad Team**

[Website](https://mujarrad.com) • [Documentation](https://docs.mujarrad.com) • [Community](https://community.mujarrad.com)

</div>
