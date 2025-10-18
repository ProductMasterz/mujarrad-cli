# MUJARRAD CLI

> ⚠️ **ALPHA SOFTWARE** - This CLI is currently in alpha development. Features may change without notice, and breaking changes may occur between versions. Use at your own risk. See [Version Status](#version-status) for details.

<div align="center">

```
╔═══╗
          ║▓▓▓║     ╔═══╗
          ║▓▓▓║═════╣▓▓▓║
              ╚═══╝     ║▓▓▓║═══╗
                        ╚═══╝   ║
                                ║
                                    ╚═══╝

   ███╗   ███╗██╗   ██╗     ██╗ █████╗ ██████╗ ██████╗  █████╗ ██████╗
    ████╗ ████║██║   ██║     ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
    ██╔████╔██║██║   ██║     ██║███████║██████╔╝██████╔╝███████║██║  ██║
    ██║╚██╔╝██║██║   ██║██   ██║██╔══██║██╔══██╗██╔══██╗██╔══██║██║  ██║
    ██║ ╚═╝ ██║╚██████╔╝╚█████╔╝██║  ██║██║  ██║██║  ██║██║  ██║██████╔╝
    ╚═╝     ╚═╝ ╚═════╝  ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝

   ╔═══════════════════════════════════════════════════════════════════╗
   ║                          DATA UNLOCKD                             ║
   ╚═══════════════════════════════════════════════════════════════════╝
```

**The Ultimate Abstraction Application**

*Unlock, Distill, and Amplify Your Data*

[![npm version](https://img.shields.io/npm/v/mujarrad-cli.svg)](https://www.npmjs.com/package/mujarrad-cli)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

</div>

---

## Version Status

**Current Version**: `1.0.5` (Alpha)

This CLI is in **active alpha development**. While core functionality is stable and tested, you should expect:

- **Feature Changes**: New features may be added, modified, or removed based on feedback
- **Breaking Changes**: Commands, options, and configurations may change between minor versions
- **API Evolution**: The underlying API and data structures are being refined
- **Beta Timeline**: We expect to reach beta status after completing comprehensive user testing

**What's Stable**:
- ✅ Authentication (login, logout, registration)
- ✅ Init workflow (auto-create spaces, upload vault)
- ✅ Clone workflow (space to vault)
- ✅ Sync workflow (bidirectional synchronization)
- ✅ Template system (list and clone)
- ✅ Canvas support (visual preservation)
- ✅ Space auto-creation (automatic, with metadata, --no-auto-create flag)

**What's Being Refined**:
- ⚠️ Error messages and user feedback
- ⚠️ Performance optimization
- ⚠️ Edge case handling
- ⚠️ Advanced conflict resolution

**Reporting Issues**: Please report bugs and feedback at [GitHub Issues](https://github.com/mujarrad/mujarrad-cli/issues). Your feedback helps us improve!

---

## What is Mujarrad?

**Mujarrad** is the **data superpower** that transforms complexity into clarity. We don't just manage data—we **unlock** its potential, **distill** its essence, and **amplify** its impact.

### The Mujarrad Philosophy

In a world drowning in **noise**, **chaos**, and **complexity**, Mujarrad reveals the **signal**. We architect **intelligent abstractions** that transform overwhelming data landscapes into **elegant**, **composable** building blocks.

**We harness complexity. We deliver simplicity.**

### What We Do to Data

<table>
<tr>
<td width="33%" valign="top">

#### 🔓 **UNLOCK**
- **Reveal** hidden patterns
- **Demystify** complex structures
- **Unleash** trapped potential
- **Activate** dormant insights
- **Empower** decision-making

</td>
<td width="33%" valign="top">

#### 🎯 **DISTILL**
- **Refine** noise into signal
- **Sculpt** chaos into order
- **Translate** complexity to clarity
- **Distill** essence from bulk
- **Extract** core meaning

</td>
<td width="33%" valign="top">

#### ⚡ **AMPLIFY**
- **Accelerate** workflows
- **Scale** operations effortlessly
- **Automate** repetitive tasks
- **Innovate** with freed resources
- **Evolve** continuously

</td>
</tr>
</table>

### Core Principles

**🧩 Abstraction as Power**
We **compose** data into **polymorphic**, **flexible** blocks—**adaptive** components that **evolve** with your needs.

**🏗️ Architecture as Art**
Every **layer** is **engineered** with **elegance**. Our **framework** provides the **foundation** for **scalable**, **intelligent** systems.

**⚙️ Intelligence in Action**
**Data-driven**, **smart**, **sophisticated** operations that **master** complexity and **deliver** results.

**🌊 Fluid by Design**
**Dynamic**, **elastic**, **agile** structures that **embrace** change and **flow** with your requirements.

---

## Features

### 🚀 **Obsidian Vault Integration**
Transform your Obsidian knowledge base into a **powerful**, **structured** graph. **Upload** notes, folders, and canvases while preserving every **visual** detail and **connection**.

### 🔄 **Bidirectional Sync**
**Real-time** synchronization keeps your data **flowing** seamlessly. Work **offline** or **online**—Mujarrad **adapts** to your workflow.

### 🎨 **Canvas Visual Preservation**
**Pixel-perfect** accuracy maintains your **creative** layouts. Every **position**, **color**, and **connection** is **preserved** with **precision**.

### 📚 **Template System**
**Accelerate** project creation with **pre-built** frameworks. **Business Model Canvas**, **SWOT Analysis**, and more—all **ready** to **activate**.

### 🔐 **Smart Security**
**Encrypted** credentials, **intelligent** access control, **secure** by **design**. Your data's **foundation** is **solid**.

### 📊 **Version Control**
**Track** every change, **master** your history. Git **integration** provides **complete** **insight** into your data's **evolution**.

### ⚡ **Performance Engineered**
**Batch** processing, **efficient** algorithms, **optimized** operations. **Speed** meets **sophistication**.

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

### 1. Authenticate & Activate

```bash
mujarrad auth login
```

**Unlock** your space with secure credentials.

### 2. Initialize & Transform

```bash
mujarrad init ./my-vault --space my-space
```

**Distill** your Obsidian vault into **structured**, **intelligent** data. Space is **automatically created** if it doesn't exist.

### 3. Clone & Recreate

```bash
mujarrad clone ./new-vault --space my-space
```

**Realize** your knowledge graph anywhere, anytime.

### 4. Sync & Flow

```bash
mujarrad sync ./my-vault --watch
```

**Embrace** continuous synchronization—data that **adapts** and **evolves**.

---

## Architecture

Mujarrad CLI is **engineered** with a **5-layer abstraction**—each **layer** **refined**, **composable**, and **intelligent**:

```
┌─────────────────────────────────────┐
│   Commands Layer                    │  ← CLI Interface
│   (User Interaction)                │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│   Services Layer                    │  ← Business Logic
│   (Core Intelligence)               │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│   Workflows Layer                   │  ← Orchestration
│   (Multi-Step Automation)           │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│   API Client Layer                  │  ← Communication
│   (Auto-Generated from OpenAPI)     │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│   File System Layer                 │  ← Data Source
│   (Vault Scanning & Parsing)        │
└─────────────────────────────────────┘
```

**Layered**, **scalable**, **elegant**—architecture as **art**.

---

## Commands

### Authentication

```bash
mujarrad auth login          # Unlock your space
mujarrad auth logout         # Secure logout
mujarrad auth status         # Check authentication state
```

### Space Management

```bash
mujarrad space create    # Build new space
mujarrad space list      # View all spaces
mujarrad space delete    # Remove space
```

### Data Operations

```bash
# Init: Initialize vault upload (automatically creates space if needed)
mujarrad init <vault-path> --space <slug>

# Init with metadata: Create new space with custom name and description
mujarrad init <vault-path> --space <slug> \
  --space-name "Display Name" \
  --space-description "Description"

# Init without auto-create: Fail if space doesn't exist (power users)
mujarrad init <vault-path> --space <slug> --no-auto-create

# Init with sync: Pull remote content before upload
mujarrad init <vault-path> --space <slug> --sync

# Clone: Recreate spaces as local vaults
mujarrad clone <target-path> --space <slug>

# Sync: Flow data bidirectionally
mujarrad sync <vault-path> [--watch]
```

### Template System

```bash
mujarrad template list                    # Discover frameworks
mujarrad template clone <target-path>     # Activate template
  --template <id>                         # Framework identifier
  --name <space-name>                 # Your space name
```

### Version History

```bash
mujarrad history <node-id>                # View evolution
mujarrad history diff <node-id> <v1> <v2> # Compare versions
```

### Help & Documentation

```bash
mujarrad --help              # Master all commands
mujarrad <command> --help    # Command-specific guidance
```

---

## Configuration

Mujarrad **adapts** to your environment. Configuration stored in `~/.mujarrad/config.json`:

```json
{
  "apiBaseUrl": "https://mujarrad.onrender.com",
  "defaultSpace": "my-space",
  "autoSync": false,
  "logLevel": "info"
}
```

**Note**: v1.0.5+ automatically migrates old config files with incorrect API URLs.

### Credential Storage

**Secure** by **design**, **intelligent** by **default**:
- **macOS**: Keychain Access
- **Windows**: Credential Manager
- **Linux**: libsecret
- **Fallback**: AES-256 encrypted `~/.mujarrad/credentials.json` (permissions: 600)

---

## Use Cases

### 📊 Business Strategy

**Accelerate** planning with **Business Model Canvas** templates. **Distill** complex strategies into **visual**, **actionable** frameworks.

### 🎓 Research & Knowledge Management

**Unlock** research potential with **interconnected** notes. **Compose** ideas into **fluid**, **evolving** knowledge graphs.

### 💼 Project Management

**Master** project complexity with **structured** templates. **Track** versions, **synchronize** teams, **deliver** results.

### 🚀 Product Development

**Engineer** product roadmaps with **canvas** visualizations. **Refine** requirements, **translate** vision to **reality**.

---

## Examples

### Example 1: Quick Start with Auto-Creation

```bash
# Initialize new space (automatically created if doesn't exist)
mujarrad init ./my-vault --space my-new-space

# Initialize with custom metadata
mujarrad init ./my-vault --space startup-kb \
  --space-name "Startup Knowledge Base" \
  --space-description "Ideas and research for my startup"

# Visual properties preserved:
# • Node positions, sizes, colors
# • Edge connections and styles
# • Canvas-wide zoom and viewport settings
# • Wikilink relationships
```

### Example 2: Template-Based Workflow

```bash
# Discover available frameworks
mujarrad template list

# Activate Business Model Canvas template
mujarrad template clone ./my-startup \
  --template business-model-canvas \
  --name "My Startup"

# Template includes:
# • Pre-structured canvas layouts
# • Placeholder nodes with guidance
# • Template configuration file
# • Framework-specific structure
```

### Example 3: Continuous Synchronization

```bash
# Enable real-time sync with watch mode
mujarrad sync ./my-vault --watch

# Mujarrad monitors and responds:
# ✓ Detects: new files, updates, deletions
# ✓ Handles: conflict resolution, version tracking
# ✓ Flows: bidirectional synchronization
```

---

## Philosophy in Action

### The Mujarrad Advantage

**Traditional data tools** **complicate**. They add **layers** of **noise**, require **complex** setup, and **constrain** **flexibility**.

**Mujarrad** **simplifies**. We:
- **Unlock** data from rigid structures
- **Distill** complexity into **elegant** abstractions
- **Amplify** your productivity with **intelligent** automation
- **Compose** **flexible**, **adaptive** systems
- **Deliver** **clarity** from **chaos**

### What Makes Us Different

<table>
<tr>
<th>Concept</th>
<th>Traditional Approach</th>
<th>Mujarrad Approach</th>
</tr>
<tr>
<td><strong>Abstraction</strong></td>
<td>Hidden complexity, rigid structures</td>
<td><strong>Composable</strong> blocks, <strong>polymorphic</strong> design</td>
</tr>
<tr>
<td><strong>Data Flow</strong></td>
<td>Manual, error-prone transfers</td>
<td><strong>Automated</strong>, <strong>intelligent</strong> sync</td>
</tr>
<tr>
<td><strong>Visual Design</strong></td>
<td>Lost in translation</td>
<td><strong>Pixel-perfect</strong> preservation</td>
</tr>
<tr>
<td><strong>Scalability</strong></td>
<td>Performance degradation</td>
<td><strong>Engineered</strong> for <strong>scale</strong></td>
</tr>
<tr>
<td><strong>Flexibility</strong></td>
<td>Locked into workflows</td>
<td><strong>Adaptive</strong>, <strong>fluid</strong> by design</td>
</tr>
</table>

---

## Troubleshooting

### Authentication Issues

```bash
# Diagnose authentication state
mujarrad auth status

# Reset and re-authenticate
mujarrad auth logout
mujarrad auth login
```

**Note**: If you installed v1.0.0-1.0.3 and experience 403 errors, simply upgrade to v1.0.5:
```bash
npm install -g mujarrad-cli@latest
```
The CLI will automatically fix your config file on next run.

### Sync Conflicts

Mujarrad uses **intelligent** **conflict resolution**:
- **Last-write-wins** for concurrent edits (timestamp-based)
- **UUID suffix** for name conflicts (`Note-a1b2c3d4.md`)
- **Interactive prompts** for complex scenarios

### Performance Optimization

```bash
# View detailed logs
tail -f ~/.mujarrad/logs/mujarrad.log

# Adjust log level in config
{
  "logLevel": "debug"  // Options: error, warn, info, debug
}
```

### Git Integration

```bash
# Verify Git installation
git --version

# Configure Git identity
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## Development

### Setup

```bash
git clone https://github.com/mujarrad/mujarrad-cli.git
cd mujarrad-cli
npm install
```

### Build & Run

```bash
npm run build        # Compile TypeScript
npm run dev          # Development mode
npm start            # Production mode
```

### Testing

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

**Test-Driven Development**: We **engineer** quality through **comprehensive** test coverage.

### Code Quality

```bash
npm run lint              # Check for errors
npm run lint:fix          # Auto-fix issues
npm run format            # Format code (Prettier)
```

---

## Roadmap

### Phase 0: Project Setup ✅
- [x] TypeScript 5.3 with ES modules
- [x] Jest testing framework
- [x] Project directory structure
- [x] Brand identity

### Phase 1: Foundational Components ✅
- [x] API client generation (OpenAPI → TypeScript)
- [x] Configuration management (cosmiconfig)
- [x] Credential security (OS keychain + AES-256)
- [x] Logging infrastructure (winston)
- [x] Progress UI (ora + cli-progress)
- [x] Frontmatter parsing

### Phase 2: Authentication & API Integration ✅
- [x] AuthService (JWT with refresh)
- [x] RetryHandler (exponential backoff)
- [x] ErrorHandler (user-friendly messages)
- [x] ResponseValidator (type-safe validation)
- [x] auth CLI commands

### Phase 3: File Scanning & Parsing ✅
- [x] Vault scanning (recursive .md/.canvas)
- [x] Markdown parsing (wikilinks, frontmatter)
- [x] Canvas processing (JSON Canvas spec)
- [x] Metadata management (UUID embedding)
- [x] Local caching (space structure)

### Phase 4: Upload Workflow ✅
- [x] UploadService (batch upload)
- [x] upload CLI command
- [x] Session management
- [x] Progress tracking

### Phase 5: Clone Workflow ✅
- [x] CloneService (space export)
- [x] clone CLI command
- [x] Git initialization (simple-git)
- [x] ZIP extraction (unzipper)
- [x] Vault recreation

### Phase 6: Sync Workflow ✅
- [x] SyncService (bidirectional sync)
- [x] ConflictResolver (merge strategies)
- [x] sync CLI command
- [x] Watch mode for continuous sync

### Phase 7: Canvas Support ✅
- [x] CanvasUploadService (visual property extraction)
- [x] CanvasCloneService (canvas reconstruction)
- [x] NFR-031: Visual accuracy within ±1 pixel

### Phase 8: Template System ✅
- [x] TemplateService (list, get, search, popular)
- [x] TemplateCloneWorkflow (instantiate and clone)
- [x] template CLI commands (list, clone)
- [x] Template configuration management

### Phase 9: Additional Features 📋
- [ ] Space management commands
- [ ] Version history commands
- [ ] Sharing commands
- [ ] Status command

### Phase 10: Distribution ✅
- [x] NPM package (v1.0.5 published)
- [x] User documentation (README.md)
- [x] Developer documentation (inline comments + specs)

**Current Version**: `1.0.5` - Published on npm

See [tasks.md](./specs/007-obsidian-mapper-i/tasks.md) for detailed implementation plan.

---

## Contributing

**Contributions** **empower** the Mujarrad ecosystem. We **welcome** your **innovations**.

### Development Workflow

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Write** tests first (TDD approach)
4. **Implement** your feature
5. **Ensure** tests pass (`npm test`)
6. **Commit** your changes (`git commit -m 'Add amazing feature'`)
7. **Push** to branch (`git push origin feature/amazing-feature`)
8. **Open** Pull Request

### Code Standards

- **Test-Driven Development** (TDD) is **non-negotiable**
- **TypeScript strict mode** enforced
- **ESLint** and **Prettier** for code quality
- **Comprehensive** documentation required

---

## The Mujarrad Lexicon

### Core Concepts
**Abstract** • **Abstraction** • **Adaptive** • **Agile** • **Block** • **Composable** • **Complex** • **Data** • **Data-Driven** • **Direct** • **Distilled** • **Dynamic** • **Elastic** • **Elegant** • **Essential** • **Flexible** • **Fluid** • **Intelligent** • **Polymorphic** • **Powerful** • **Refined** • **Simple** • **Simplicity** • **Smart** • **Sophisticated** • **Universal**

### Actions
**Accelerate** • **Activate** • **Adapt** • **Amplify** • **Automate** • **Build** • **Command** • **Compose** • **Create** • **Deliver** • **Demystify** • **Distill** • **Embrace** • **Empower** • **Engineer** • **Evolve** • **Harness** • **Innovate** • **Master** • **Realize** • **Refine** • **Reveal** • **Scale** • **Sculpt** • **Solve** • **Translate** • **Unlock** • **Unleash**

### Outcomes
**Advantage** • **Agility** • **Art** • **Clarity** • **Edge** • **Efficiency** • **Flow** • **Focus** • **Foundation** • **Freedom** • **Insight** • **Logic** • **Order** • **Power** • **Potential** • **Scale** • **Signal** • **Solution** • **Speed** • **Structure** • **Superpower**

### Metaphors
**Architecture** • **Blueprint** • **Blocks** • **Chaos** • **Code** • **Components** • **Core** • **Engine** • **Framework** • **Layer** • **Map** • **Maze** • **Noise** • **Platform** • **Source** • **System**

---

## License

Apache License 2.0 - see [LICENSE](./LICENSE) file for details.

**Freedom** to **build**, **adapt**, and **innovate**.

---

## Support

- **Documentation**: [GitHub Wiki](https://github.com/mujarrad/mujarrad-cli/wiki)
- **Issues**: [GitHub Issues](https://github.com/mujarrad/mujarrad-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mujarrad/mujarrad-cli/discussions)

---

<div align="center">

**Built with Intelligence. Designed for Power. Engineered for You.**

*Mujarrad: Where Data Complexity Becomes Elegant Simplicity*

[Website](https://www.mujarrad.com) • [Documentation](https://docs.mujarrad.com) • [Community](https://www.wider.community)

---

**DATA UNLOCKD**

</div>
