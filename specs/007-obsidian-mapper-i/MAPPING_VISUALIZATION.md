# Obsidian ↔ Mujarrad Mapping Visualization

**Feature**: 007-obsidian-mapper-i
**Created**: 2025-10-09
**Purpose**: Visual reference for understanding how Obsidian concepts map to Mujarrad data model

---

## 📊 Core Entity Mapping

| Obsidian Concept | Obsidian Type | Mujarrad Entity | Mujarrad Type | Key Details |
|---|---|---|---|---|
| **Vault** | Directory | `Space` | Space | Root container for all content |
| **Note File** | `.md` file | `Node` | nodeType=REGULAR | Content stored in `Node.content` |
| **Folder** | Directory | `Node` | nodeType=CONTEXT | Organizational container (no content) |
| **Canvas File** | `.canvas` file | `Node` + `Mapping` + `NodeMapping` | nodeType=CONTEXT | **Normalized storage**: canvas config, visual layout, mappings |
| **Canvas Node** | JSON object | `NodeMapping` | Mapping entry | Visual properties in `metadata` JSONB |
| **Canvas Edge** | JSON array | `Attribute` | Relationship | Visual properties in `properties` JSONB |
| **Wikilink** | `[[Link]]` | `Attribute` | Relationship | Note-to-note connection |
| **Markdown Link** | `[text](url)` | `Attribute` | Relationship | Similar to wikilink |
| **Folder Hierarchy** | Nested dirs | `Attribute` chain | CONTAINS type | Parent-child relationships |
| **Git Commit** | Version control | `NodeVersion` | Version history | Tracks changes over time |
| **Template Config File** | JSON/YAML file | `SpaceTemplate` metadata | Template reference | Links space to template |
| **Space Template** | Blueprint structure | `SpaceTemplate` | Entity | Pre-defined knowledge graph |
| **Context Template** | Framework pattern | `ContextTemplate` | Entity or Node | Reusable structure (e.g., BMC) |

---

## 🎨 Canvas Node Mapping (Critical Clarification)

### Key Principle
**Every canvas node MUST have a "file" attribute pointing to a note file.**

```
Canvas Node Structure (Obsidian):
{
  "id": "abc123",
  "type": "file",
  "file": "Business Model/Value Propositions.md",  ← REQUIRED
  "x": 100,
  "y": 200,
  "width": 400,
  "height": 300,
  "color": "3"
}
```

### Mapping Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Canvas File Upload                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Canvas → Node (nodeType=CONTEXT)                        │
│     - Store complete JSON in Node.content                   │
│     - Preserve ALL visual metadata                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  2. For Each Canvas Node in JSON:                           │
│     - Read "file" attribute (e.g., "Value Propositions.md") │
│     - Find corresponding REGULAR Node (the note file)       │
│     - Create Attribute: Canvas Node → Note Node             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  3. For Each Canvas Edge:                                    │
│     - Create Attribute: Source Node → Target Node           │
└─────────────────────────────────────────────────────────────┘
```

### Normalized Visual Data Storage

**Key Design Decision**: Visual representation data is stored in **MAPPINGS tables** (not in Node.content) for better normalization, data integrity, and query performance.

#### Why Normalized Storage?

**Before (Denormalized)**:
```json
// Stored in Node.content for canvas CONTEXT Node
{
  "nodes": [
    {"id": "n1", "file": "Note1.md", "x": 100, "y": 200, "width": 400, "height": 300, "color": "1"},
    {"id": "n2", "file": "Note2.md", "x": 600, "y": 200, "width": 400, "height": 300, "color": "3"}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "fromSide": "right", "toSide": "left"}
  ]
}
```

**Problems**:
- Mixes content with presentation
- Difficult to query visual properties
- Updates require JSON parsing/serialization
- No referential integrity for file references
- Duplicates node references (stored both in JSON and as separate Nodes)

**After (Normalized)**:
```
Tables:
- Nodes: Canvas container (nodeType=CONTEXT, title="Business Model Canvas")
- Mappings: Canvas-wide configuration
- NodeMappings: Visual properties per canvas node
- Attributes: Edges with visual properties
```

**Benefits**:
✓ Separation of concerns (content vs presentation)
✓ Direct SQL queries on visual properties
✓ Foreign key constraints ensure data integrity
✓ Efficient updates (no JSON parsing)
✓ Can query "all canvas nodes at position X" directly
✓ Reuse existing ERD tables (MAPPINGS, NODE_MAPPINGS)

#### Storage Breakdown

```
OBSIDIAN CANVAS                    MUJARRAD DATABASE
════════════════                   ═════════════════

Canvas File (.canvas)         →    Node (CONTEXT)
  ├─ Canvas-wide settings     →      ├─ Mapping.configuration
  │  (zoom, viewX, viewY)            │   {zoom: 1.5, viewX: 0, viewY: 0}
  │                                   │
  ├─ Canvas Node 1            →      ├─ NodeMapping entry
  │  ├─ file: "Note1.md"             │   ├─ mapping_node_id → Canvas Node
  │  ├─ x: 100, y: 200               │   ├─ contained_node_id → Note1 Node
  │  ├─ width: 400                   │   └─ metadata → {x, y, width, height, color}
  │  └─ color: "1" (red)             │
  │                                   │
  ├─ Canvas Node 2            →      ├─ NodeMapping entry
  │  ├─ file: "Note2.md"             │   ├─ mapping_node_id → Canvas Node
  │  ├─ x: 600, y: 200               │   ├─ contained_node_id → Note2 Node
  │  └─ color: "3" (yellow)          │   └─ metadata → {x, y, width, height, color}
  │                                   │
  └─ Edge (Note1 → Note2)     →      └─ Attribute
     ├─ fromNode: n1                    ├─ source_node_id → Note1 Node
     ├─ toNode: n2                      ├─ target_node_id → Note2 Node
     ├─ fromSide: "right"               └─ properties → {fromSide, toSide, color}
     └─ toSide: "left"
```

---

## 📁 Data Storage Mapping

### Note Files (.md)

| Obsidian | Storage Location | Mujarrad | Storage Location |
|---|---|---|---|
| Filename | `Project Plan.md` | Node.title | `"Project Plan"` |
| File path | `/Business/Plans/` | CONTAINS Attributes | Parent context relationships |
| Content | Markdown text | Node.content | Text field (JSONB) |
| UUID metadata | Hidden in file | Node.id | UUID primary key |
| Wikilinks | `[[Other Note]]` | Attributes | Relationship records |

### Canvas Files (.canvas) - Normalized Storage

| Obsidian | Storage Location | Mujarrad | Storage Location |
|---|---|---|---|
| Filename | `Business Model.canvas` | Node.title | `"Business Model"` (CONTEXT type) |
| Canvas-wide config | JSON root properties | Mapping.configuration | JSONB {zoom, viewX, viewY, settings} |
| Canvas nodes | JSON nodes array | NodeMappings table | One entry per canvas node |
| Per-node visual props | `x, y, width, height, color` | NodeMapping.metadata | JSONB {x, y, width, height, color, canvasNodeId} |
| Node file reference | `"file": "Note.md"` | NodeMapping.contained_node_id | Foreign key to Note's Node.id |
| Edges/connections | JSON edges array | Attributes table | sourceNode/targetNode with visual properties |
| Edge visual props | `fromSide, toSide, color` | Attribute.properties | JSONB {fromSide, toSide, fromEnd, toEnd, color, label} |

### Folder Structure

| Obsidian | Storage Location | Mujarrad | Storage Location |
|---|---|---|---|
| Folder name | Directory name | Node.title | `"Business Model"` |
| Parent folder | Parent directory | Attribute | CONTAINS relationship |
| Child files | Files in directory | Attribute | CONTAINS relationship |
| Subfolders | Subdirectories | Attribute | CONTAINS relationship |

---

## 🔌 CLI-to-API Architecture & Workflows

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER'S LOCAL MACHINE                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Obsidian Application                       │ │
│  │  • User edits .md files                                     │ │
│  │  • User creates/edits .canvas files                         │ │
│  │  • Renders visual canvases                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│                       File System I/O                            │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Local Obsidian Vault Files                     │ │
│  │  • Notes: My Note.md                                        │ │
│  │  • Canvases: Business Model.canvas                          │ │
│  │  • Folders: Projects/                                       │ │
│  │  • Hidden metadata: <!-- mujarrad-node-id: uuid -->         │ │
│  │  • Template config: template.config.json                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│                        Git Operations                            │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Git Repository                           │ │
│  │  • Tracks all file changes                                  │ │
│  │  • Commit history with metadata                             │ │
│  │  • Branch management                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│                    CLI Commands & Processing                     │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Mujarrad CLI Tool                         │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  User Commands:                                       │  │ │
│  │  │  $ mujarrad upload                                    │  │ │
│  │  │  $ mujarrad clone --template "bmc"                    │  │ │
│  │  │  $ mujarrad sync                                      │  │ │
│  │  │  $ mujarrad pull                                      │  │ │
│  │  │  $ mujarrad templates list                            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  CLI Responsibilities:                                │  │ │
│  │  │  1. Parse markdown (frontmatter, wikilinks)           │  │ │
│  │  │  2. Parse canvas JSON → normalized structure          │  │ │
│  │  │  3. Extract git commit metadata                       │  │ │
│  │  │  4. Manage authentication tokens                      │  │ │
│  │  │  5. Build HTTP API requests                           │  │ │
│  │  │  6. Handle API responses                              │  │ │
│  │  │  7. Cache space structure                         │  │ │
│  │  │  8. Reconstruct Obsidian files from API data          │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Local Storage:                                       │  │ │
│  │  │  ~/.mujarrad/                                         │  │ │
│  │  │    ├─ credentials.json (tokens, perms 600)            │  │ │
│  │  │    ├─ cache/{space-slug}/structure.json           │  │ │
│  │  │    └─ logs/cli.log (debug info)                       │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
                      HTTPS / REST API
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      MUJARRAD BACKEND                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         API Gateway / Load Balancer / Rate Limiter          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Spring Boot REST API Endpoints                 │ │
│  │                                                             │ │
│  │  Authentication:                                            │ │
│  │    POST /api/auth/login                                     │ │
│  │    POST /api/auth/refresh                                   │ │
│  │                                                             │ │
│  │  Spaces:                                                │ │
│  │    GET  /api/spaces                                     │ │
│  │    POST /api/spaces                                     │ │
│  │    GET  /api/spaces/{id}                                │ │
│  │                                                             │ │
│  │  Templates:                                                 │ │
│  │    GET  /api/templates                                      │ │
│  │    POST /api/spaces/clone-from-template                 │ │
│  │                                                             │ │
│  │  Upload (Session-Based):                                    │ │
│  │    POST /api/spaces/{id}/upload/init                    │ │
│  │    POST /api/spaces/{id}/upload/nodes                   │ │
│  │    POST /api/spaces/{id}/upload/canvas                  │ │
│  │    POST /api/spaces/{id}/upload/attributes              │ │
│  │    POST /api/spaces/{id}/upload/complete                │ │
│  │                                                             │ │
│  │  Clone/Export:                                              │ │
│  │    GET  /api/spaces/{id}/export                         │ │
│  │    GET  /api/spaces/{id}/export/incremental             │ │
│  │                                                             │ │
│  │  Sync (Session-Based):                                      │ │
│  │    POST /api/spaces/{id}/sync/init                      │ │
│  │    POST /api/spaces/{id}/sync/push                      │ │
│  │    GET  /api/spaces/{id}/sync/pull                      │ │
│  │    POST /api/spaces/{id}/sync/complete                  │ │
│  │                                                             │ │
│  │  Version History:                                           │ │
│  │    GET  /api/nodes/{id}/versions                            │ │
│  │                                                             │ │
│  │  Sharing:                                                   │ │
│  │    POST /api/spaces/{id}/share                          │ │
│  │    GET  /api/spaces/{id}/members                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 Service Layer (Business Logic)              │ │
│  │  • SpaceService                                         │ │
│  │  • NodeService                                              │ │
│  │  • MappingService (canvas visual data)                      │ │
│  │  • SyncService                                              │ │
│  │  • TemplateService                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    PostgreSQL Database                      │ │
│  │                                                             │ │
│  │  Tables (Normalized Storage):                               │ │
│  │    • SPACES                                             │ │
│  │    • USERS, SPACE_USERS                                 │ │
│  │    • NODES (nodeType: REGULAR, CONTEXT)                     │ │
│  │    • NODE_VERSIONS (git commit history)                     │ │
│  │    • ATTRIBUTES (relationships, edges)                      │ │
│  │    • MAPPINGS (canvas config)                               │ │
│  │    • NODE_MAPPINGS (canvas node visual properties)          │ │
│  │    • AUDIT_LOG                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Upload Workflow Sequence

```
┌──────────────┬────────────────────────┬──────────────────────────┬─────────────────────┐
│     USER     │       CLI TOOL         │      BACKEND API         │      DATABASE       │
├──────────────┼────────────────────────┼──────────────────────────┼─────────────────────┤
│              │                        │                          │                     │
│ $ mujarrad   │                        │                          │                     │
│   upload     │                        │                          │                     │
│              │                        │                          │                     │
│              │ Scan vault files:      │                          │                     │
│              │ • Find .md files       │                          │                     │
│              │ • Find .canvas files   │                          │                     │
│              │ • Find folders         │                          │                     │
│              │ • Calculate size       │                          │                     │
│              │                        │                          │                     │
│              │ POST /api/auth/login ──────>  Authenticate        │                     │
│              │                  <───────────  JWT token          │                     │
│              │ Store token in         │                          │                     │
│              │ ~/.mujarrad/           │                          │                     │
│              │   credentials.json     │                          │                     │
│              │                        │                          │                     │
│              │ POST /upload/init ─────────>  Create session      │                     │
│              │ {totalFiles: 150}      │      Generate ID         │                     │
│              │                  <───────────  {uploadSessionId,  │                     │
│              │                        │       batchSize: 50}     │                     │
│              │                        │                          │                     │
│              │ [BATCH 1 - Folders]    │                          │                     │
│              │ POST /upload/nodes ────────>  Create CONTEXT  ───────> INSERT nodes     │
│              │ {nodes: [              │      nodes               │     (CONTEXT)       │
│              │   {nodeType:CONTEXT}]} │                          │                     │
│              │                  <───────────  {created: [...]}   │                     │
│              │                        │                          │                     │
│              │ [BATCH 2 - Notes]      │                          │                     │
│              │ POST /upload/nodes ────────>  Create REGULAR  ───────> INSERT nodes     │
│              │ {nodes: [              │      nodes               │     (REGULAR)       │
│              │   {nodeType:REGULAR,   │                          │                     │
│              │    content:"..."}]}    │                          │                     │
│              │                  <───────────  {created: [...]}   │                     │
│              │                        │                          │                     │
│              │ Embed UUIDs into files │                          │                     │
│              │ <!-- mujarrad-node-id  │                          │                     │
│              │      uuid -->          │                          │                     │
│              │                        │                          │                     │
│              │ [BATCH 3 - Canvas]     │                          │                     │
│              │ POST /upload/canvas ───────>  Create canvas   ───────> INSERT nodes,    │
│              │ {canvasNode: {...},    │      CONTEXT node        │     mappings,       │
│              │  canvasConfig: {...},  │                          │     node_mappings,  │
│              │  canvasNodes: [...],   │                          │     attributes      │
│              │  canvasEdges: [...]}   │                          │                     │
│              │                  <───────────  {canvasNodeId,     │                     │
│              │                        │       mappingId}         │                     │
│              │                        │                          │                     │
│              │ [BATCH 4 - Wikilinks]  │                          │                     │
│              │ POST /upload/          ────>  Create LINK     ───────> INSERT           │
│              │   attributes           │      attributes          │     attributes      │
│              │ {attributes: [...]}    │                          │     (LINK)          │
│              │                  <───────────  {created: [...]}   │                     │
│              │                        │                          │                     │
│              │ POST /upload/complete ─────>  Finalize session    │                     │
│              │                  <───────────  {totalNodes: 150,  │                     │
│              │                        │       totalAttrs: 89}    │                     │
│              │                        │                          │                     │
│              │ git init               │                          │                     │
│              │ git add .              │                          │                     │
│              │ git commit -m "..."    │                          │                     │
│              │                        │                          │                     │
│ Upload       │                        │                          │                     │
│ complete! ✓  │                        │                          │                     │
└──────────────┴────────────────────────┴──────────────────────────┴─────────────────────┘
```

### Clone Workflow Sequence

```
┌──────────────┬────────────────────────┬──────────────────────────┬─────────────────────┐
│     USER     │       CLI TOOL         │      BACKEND API         │      DATABASE       │
├──────────────┼────────────────────────┼──────────────────────────┼─────────────────────┤
│              │                        │                          │                     │
│ $ mujarrad   │                        │                          │                     │
│   clone      │                        │                          │                     │
│   --template │                        │                          │                     │
│   "bmc"      │                        │                          │                     │
│              │                        │                          │                     │
│              │ POST /api/auth/login ──────>  Authenticate        │                     │
│              │                  <───────────  JWT token          │                     │
│              │                        │                          │                     │
│              │ GET /api/templates ────────>  Query templates ───────> SELECT FROM      │
│              │ ?name=bmc              │                          │     templates       │
│              │                  <───────────  {templates: [...]} │                     │
│              │                        │                          │                     │
│              │ User selects:          │                          │                     │
│              │ Business Model Canvas  │                          │                     │
│              │ (9 components)         │                          │                     │
│              │                        │                          │                     │
│              │ POST /spaces/      ────>  Create space───────> INSERT nodes     │
│              │   clone-from-template  │      from template       │     (9 placeholders)│
│              │ {templateId: "uuid",   │                          │     INSERT mappings │
│              │  spaceName: "...") │                          │     INSERT node_    │
│              │                        │                          │       mappings      │
│              │                  <───────────  {spaceId,      │     INSERT attrs    │
│              │                        │       nodes: [...]}      │                     │
│              │                        │                          │                     │
│              │ GET /spaces/       ────>  Export full     ───────> SELECT nodes,    │
│              │   {id}/export          │      structure           │     mappings,       │
│              │                  <───────────  {space,        │     node_mappings,  │
│              │                        │       nodes,             │     attributes      │
│              │                        │       mappings,          │                     │
│              │                        │       nodeMappings,      │                     │
│              │                        │       attributes}        │                     │
│              │                        │                          │                     │
│              │ mkdir ~/Documents/     │                          │                     │
│              │   MyStartup/           │                          │                     │
│              │                        │                          │                     │
│              │ Reconstruct files:     │                          │                     │
│              │ • REGULAR nodes →      │                          │                     │
│              │     .md files          │                          │                     │
│              │ • CONTEXT (folder) →   │                          │                     │
│              │     directories        │                          │                     │
│              │ • CONTEXT (canvas) →   │                          │                     │
│              │     .canvas files      │                          │                     │
│              │ • Embed UUIDs          │                          │                     │
│              │ • Convert attrs →      │                          │                     │
│              │     wikilinks          │                          │                     │
│              │                        │                          │                     │
│              │ Create template.       │                          │                     │
│              │   config.json          │                          │                     │
│              │                        │                          │                     │
│              │ git init               │                          │                     │
│              │ git add .              │                          │                     │
│              │ git commit -m "..."    │                          │                     │
│              │                        │                          │                     │
│ Space    │                        │                          │                     │
│ cloned! ✓    │                        │                          │                     │
│ Open in      │                        │                          │                     │
│ Obsidian     │                        │                          │                     │
└──────────────┴────────────────────────┴──────────────────────────┴─────────────────────┘
```

### Sync Workflow Sequence

```
┌──────────────┬────────────────────────┬──────────────────────────┬─────────────────────┐
│     USER     │       CLI TOOL         │      BACKEND API         │      DATABASE       │
├──────────────┼────────────────────────┼──────────────────────────┼─────────────────────┤
│              │                        │                          │                     │
│ User edits   │                        │                          │                     │
│ locally:     │                        │                          │                     │
│ • Updates    │                        │                          │                     │
│   Strategy.md│                        │                          │                     │
│ • Adds       │                        │                          │                     │
│   Roadmap.md │                        │                          │                     │
│ • Git commits│                        │                          │                     │
│              │                        │                          │                     │
│ $ mujarrad   │                        │                          │                     │
│   sync       │                        │                          │                     │
│              │                        │                          │                     │
│              │ Check Git history:     │                          │                     │
│              │ git log --since="..."  │                          │                     │
│              │ Found 3 commits:       │                          │                     │
│              │ • abc123 "Updated..."  │                          │                     │
│              │ • def456 "Added..."    │                          │                     │
│              │ • ghi789 "Fixed..."    │                          │                     │
│              │                        │                          │                     │
│              │ POST /api/auth/    ────────>  Refresh token       │                     │
│              │   refresh              │                          │                     │
│              │                  <───────────  New access token   │                     │
│              │                        │                          │                     │
│              │ POST /sync/init    ────────>  Initialize sync ───────> Check for       │
│              │ {lastSyncTimestamp,    │                          │     remote changes  │
│              │  localCommitHash}      │                          │                     │
│              │                  <───────────  {syncSessionId,    │                     │
│              │                        │       hasRemote: false,  │                     │
│              │                        │       hasLocal: true}    │                     │
│              │                        │                          │                     │
│              │ Extract changes:       │                          │                     │
│              │ git diff HEAD~3        │                          │                     │
│              │ M  Strategy.md         │                          │                     │
│              │ A  Roadmap.md          │                          │                     │
│              │                        │                          │                     │
│              │ Parse UUIDs from files │                          │                     │
│              │ <!-- mujarrad-node-id  │                          │                     │
│              │      uuid -->          │                          │                     │
│              │                        │                          │                     │
│              │ POST /sync/push    ────────>  Push local      ───────> INSERT           │
│              │ {syncSessionId,        │      changes             │     node_versions   │
│              │  changes: [            │                          │     UPDATE nodes    │
│              │    {nodeId, operation, │                          │     SET current_    │
│              │     content,           │                          │       version_id    │
│              │     gitCommitHash,     │                          │                     │
│              │     gitCommitMessage,  │                          │                     │
│              │     gitCommitAuthor}]} │                          │                     │
│              │                  <───────────  {versionsCreated:3,│                     │
│              │                        │       conflicts: []}     │                     │
│              │                        │                          │                     │
│              │ GET /sync/pull     ────────>  Check remote    ───────> SELECT changes   │
│              │ ?syncSessionId         │      changes             │     since lastSync  │
│              │                  <───────────  {changes: []}      │                     │
│              │                        │       (none)             │                     │
│              │                        │                          │                     │
│              │ POST /sync/complete ───────>  Finalize session    │                     │
│              │ {syncSessionId,        │      Mark complete       │                     │
│              │  newSyncTimestamp}     │                          │                     │
│              │                  <───────────  {success: true}    │                     │
│              │                        │                          │                     │
│              │ Update local cache     │                          │                     │
│              │ Write timestamp to     │                          │                     │
│              │ ~/.mujarrad/cache/     │                          │                     │
│              │   last-sync.json       │                          │                     │
│              │                        │                          │                     │
│ Sync         │                        │                          │                     │
│ complete! ✓  │                        │                          │                     │
│ 3 changes    │                        │                          │                     │
│ pushed       │                        │                          │                     │
└──────────────┴────────────────────────┴──────────────────────────┴─────────────────────┘
```

### Canvas Data Flow (Normalized Storage)

This section shows how canvas data flows from Obsidian through the CLI to the API and finally into the normalized database structure.

#### 1. Obsidian Canvas File
```json
{
  "nodes": [
    {
      "id": "node1",
      "type": "file",
      "file": "Key Partners.md",
      "x": 100, "y": 200,
      "width": 400, "height": 300,
      "color": "1"
    },
    {
      "id": "node2",
      "type": "file",
      "file": "Value Props.md",
      "x": 500, "y": 200,
      "width": 400, "height": 300,
      "color": "3"
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "fromNode": "node1",
      "toNode": "node2",
      "fromSide": "right",
      "toSide": "left"
    }
  ]
}
```

#### 2. CLI Processing Steps
1. Read `Business Model.canvas` file
2. Parse JSON structure
3. Extract canvas-wide config (zoom, viewX, viewY)
4. Extract visual properties for each canvas node
5. Map canvas nodes to referenced note files
6. Build normalized API request

#### 3. API Request (POST /upload/canvas)
```json
{
  "canvasNode": {
    "nodeType": "CONTEXT",
    "title": "BMC"
  },
  "canvasConfig": {
    "zoom": 1.0,
    "viewX": 0,
    "viewY": 0
  },
  "canvasNodes": [
    {
      "canvasNodeId": "node1",
      "referencedNodeSlug": "key-partners",
      "visualProperties": {"x": 100, "y": 200, "width": 400, "height": 300, "color": "1"}
    },
    {
      "canvasNodeId": "node2",
      "referencedNodeSlug": "value-props",
      "visualProperties": {"x": 500, "y": 200, "width": 400, "height": 300, "color": "3"}
    }
  ],
  "canvasEdges": [
    {
      "sourceNodeSlug": "key-partners",
      "targetNodeSlug": "value-props",
      "visualProperties": {"fromSide": "right", "toSide": "left"}
    }
  ]
}
```

#### 4. Database Storage (Normalized)

**NODES Table:**
| id | title | nodeType | content |
|-----|-------|----------|---------|
| uuid1 | BMC | CONTEXT | null |

**MAPPINGS Table:**
| id | node_id | configuration (JSONB) |
|-----|---------|---------------------|
| map1 | uuid1 | `{"zoom": 1.0, "viewX": 0, "viewY": 0}` |

**NODE_MAPPINGS Table:**
| id | mapping_id | contained_node_id | metadata (JSONB) |
|----|------------|-------------------|------------------|
| nm1 | map1 | uuid-kp | `{"canvasNodeId": "node1", "x": 100, "y": 200, "width": 400, "height": 300, "color": "1"}` |
| nm2 | map1 | uuid-vp | `{"canvasNodeId": "node2", "x": 500, "y": 200, "width": 400, "height": 300, "color": "3"}` |

**ATTRIBUTES Table:**
| source_node_id | target_node_id | type | properties (JSONB) |
|----------------|----------------|------|-------------------|
| uuid-kp | uuid-vp | EDGE | `{"fromSide": "right", "toSide": "left"}` |

#### Benefits of Normalized Storage
✓ **Separation of concerns** - Content vs visual layout
✓ **Direct SQL queries** - `SELECT * FROM node_mappings WHERE metadata->>'x' > 500`
✓ **Foreign key integrity** - Canvas nodes → notes validated by DB
✓ **Efficient updates** - Update single row vs parsing/serializing JSON
✓ **Reuses existing ERD** - Leverages MAPPINGS and NODE_MAPPINGS tables

---

## 👤 User Journey: From Template to AI-Powered Space

This section illustrates the complete user experience across different scenarios.

### Journey 1: Starting Fresh with a Template

```
PERSONA: Sarah, Business Strategist
GOAL: Create a business model for her startup using Mujarrad + Obsidian
KNOWLEDGE: Familiar with Obsidian, new to Mujarrad

──────────────────────────────────────────────────────────────────

STEP 1: Discover Available Templates
──────────────────────────────────────────────────────────────────
Sarah's Terminal:
$ mujarrad templates list

Mujarrad Response:
Available Templates:
1. Business Model Canvas (Osterwalder)
   - Category: business-strategy
   - Components: 9 building blocks
   - Best for: Startup planning, business analysis

2. SWOT Analysis Framework
   - Category: strategic-analysis
   - Components: 4 quadrants
   - Best for: Competitive analysis, decision making

3. Design Thinking Process
   - Category: innovation
   - Components: 5 stages
   - Best for: Product design, user experience

Sarah selects: "Business Model Canvas"

──────────────────────────────────────────────────────────────────

STEP 2: Clone Template to Create Space
──────────────────────────────────────────────────────────────────
Sarah's Terminal:
$ mujarrad clone --template "business-model-canvas" \
                 --space "my-saas-startup" \
                 --local-path ~/Documents/MyStartup

Mujarrad Backend Processing:
✓ Retrieved template: Business Model Canvas
✓ Created space: "my-saas-startup"
✓ Cloned 9 placeholder nodes (Key Partners, Value Props, etc.)
✓ Cloned canvas layout with visual configuration
✓ Generated template.config.json
✓ Initialized Git repository
✓ Created Obsidian vault at ~/Documents/MyStartup

Result:
Space ready! Open in Obsidian to start filling in your business model.

──────────────────────────────────────────────────────────────────

STEP 3: Open in Obsidian and Explore Structure
──────────────────────────────────────────────────────────────────
Sarah opens Obsidian vault at ~/Documents/MyStartup

Vault Structure:
MyStartup/
├── template.config.json
├── Business Model Canvas.canvas
├── Key Partners.md                 (empty, with guidance)
├── Key Activities.md               (empty, with guidance)
├── Key Resources.md                (empty, with guidance)
├── Value Propositions.md           (empty, with guidance)
├── Customer Relationships.md       (empty, with guidance)
├── Channels.md                     (empty, with guidance)
├── Customer Segments.md            (empty, with guidance)
├── Cost Structure.md               (empty, with guidance)
└── Revenue Streams.md              (empty, with guidance)

Sarah opens "Business Model Canvas.canvas":
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [Key Partners]    [Value Propositions]  [Customer Rel.]  │
│     (red)              (yellow)              (blue)        │
│                                                            │
│  [Key Activities]                         [Channels]       │
│     (red)                                    (blue)        │
│                                                            │
│  [Key Resources]                          [Customer Seg.]  │
│     (red)                                    (blue)        │
│                                                            │
│  [Cost Structure]                         [Revenue Str.]   │
│     (purple)                                 (green)       │
│                                                            │
└────────────────────────────────────────────────────────────┘

Each box is a canvas node pointing to its respective .md file.

──────────────────────────────────────────────────────────────────

STEP 4: Fill in Business Model Data
──────────────────────────────────────────────────────────────────
Sarah edits each note file with her startup's information:

Value Propositions.md:
<!-- mujarrad-node-id: 550e8400-e29b-41d4-a716-446655440000 -->
# Value Propositions

## Core Value
AI-powered project management that adapts to team workflows

## Key Benefits
- Automatic task prioritization based on deadlines and dependencies
- Smart notifications that reduce context switching
- Integration with existing tools (Slack, GitHub, Jira)

## Pain Relievers
- Eliminates manual status updates
- Reduces meeting overhead by 40%
- Prevents task bottlenecks through predictive analytics

Customer Segments.md:
<!-- mujarrad-node-id: 789abc12-3def-4567-8901-234567890abc -->
# Customer Segments

## Primary Segment
Tech startups with 10-50 employees

## Characteristics
- Fast-paced development cycles
- Distributed teams
- Budget-conscious but willing to pay for efficiency

## Secondary Segment
Digital agencies managing multiple client projects

Git commits as she works:
abc123 - "Added initial value propositions"
def456 - "Defined customer segments"
ghi789 - "Completed revenue model"

──────────────────────────────────────────────────────────────────

STEP 5: Sync Changes to Mujarrad
──────────────────────────────────────────────────────────────────
Sarah's Terminal:
$ mujarrad sync

Mujarrad Backend Processing:
✓ Detected 15 git commits since last sync
✓ Updated 9 nodes with new content
✓ Created 15 NodeVersion entries
✓ Preserved template reference metadata
✓ Maintained canvas structure

Sync complete! All changes saved to Mujarrad space.

──────────────────────────────────────────────────────────────────

STEP 6: AI Analysis Using Template Context
──────────────────────────────────────────────────────────────────
Sarah uses Mujarrad's AI features:

Sarah's Request (via Mujarrad web interface):
"Analyze my business model and suggest improvements for customer acquisition"

Mujarrad AI Processing:
1. Identifies space template: Business Model Canvas
2. Fetches template.config.json as contextual map
3. AI now understands:
   - "Value Propositions" = what startup offers
   - "Customer Segments" = target audience
   - "Channels" = how to reach customers
   - Relationships between components per BMC framework

AI Response:
Based on your Business Model Canvas:

VALUE PROPOSITION ANALYSIS:
Your core value ("AI-powered project management") strongly
resonates with your primary customer segment (tech startups
with 10-50 employees).

CUSTOMER ACQUISITION RECOMMENDATIONS:
1. CHANNELS GAP: Your "Channels" section is empty. Given your
   customer segments, consider:
   - Content marketing on Dev.to and Hacker News
   - Integration partnerships with tools they already use
   - Freemium model for viral growth

2. CUSTOMER RELATIONSHIPS: Consider:
   - Self-service onboarding (matches budget-conscious segment)
   - Community forum (matches tech-savvy audience)
   - Premium support tier for agencies

3. COST STRUCTURE ALIGNMENT:
   Your customer acquisition cost should be <$200 given the
   startup segment's typical budget constraints.

KEY INSIGHT: Your secondary segment (agencies) may have higher
LTV - consider separate acquisition channels for each segment.

The AI understood Sarah's business model structure AUTOMATICALLY
because the template acted as a contextual map!

──────────────────────────────────────────────────────────────────

STEP 7: Iterate and Collaborate
──────────────────────────────────────────────────────────────────
Sarah shares space with her co-founder:

$ mujarrad share --space "my-saas-startup" \
                 --user "john@startup.com" \
                 --permission "edit"

John clones the space:
$ mujarrad clone --space "my-saas-startup" \
                 --local-path ~/Documents/OurStartup

Both Sarah and John can:
- Edit locally in Obsidian
- Sync changes to Mujarrad
- Get AI insights based on shared template structure
- Track version history via Git
```

### Journey 2: Uploading Existing Obsidian Vault

```
PERSONA: Marcus, Product Manager
GOAL: Upload existing Obsidian vault to Mujarrad for team collaboration
KNOWLEDGE: Power user of Obsidian, has extensive vault

──────────────────────────────────────────────────────────────────

STEP 1: Marcus's Existing Vault Structure
──────────────────────────────────────────────────────────────────
Marcus has been using Obsidian for 2 years:

ProductVault/
├── Projects/
│   ├── Mobile App/
│   │   ├── Features.md
│   │   ├── Roadmap.md
│   │   └── User Stories.md
│   └── Web Platform/
│       ├── Architecture.md
│       └── API Design.md
├── Research/
│   ├── Competitor Analysis.md
│   ├── User Interviews.md
│   └── Market Trends.md
├── Strategy/
│   ├── Product Vision.canvas
│   └── OKRs.md
└── Daily Notes/
    └── (100+ daily note files)

Product Vision.canvas contains:
- 12 canvas nodes referencing various notes
- Visual groupings by color (features=blue, risks=red)
- Connection arrows showing dependencies

──────────────────────────────────────────────────────────────────

STEP 2: Upload to Mujarrad
──────────────────────────────────────────────────────────────────
Marcus's Terminal:
$ cd ~/Documents/ProductVault
$ mujarrad upload --space "product-management" \
                  --create

Mujarrad Backend Processing:
Analyzing vault...
✓ Found 147 markdown files
✓ Found 1 canvas file
✓ Found 4 folders
✓ Detected 89 wikilinks
✓ No template detected (custom structure)

Uploading...
[████████████████████] 100%

Results:
✓ Created space: "product-management"
✓ Created 147 REGULAR nodes (notes)
✓ Created 4 CONTEXT nodes (folders)
✓ Created 1 CONTEXT node (canvas)
✓ Created 89 LINK attributes (wikilinks)
✓ Created 12 CONTAINS attributes (canvas references)
✓ Created 147 CONTAINS attributes (folder hierarchy)
✓ Embedded UUIDs in all files

Upload complete!

──────────────────────────────────────────────────────────────────

STEP 3: Marcus Checks Embedded Metadata
──────────────────────────────────────────────────────────────────
Marcus opens Features.md in Obsidian:

<!-- mujarrad-node-id: aaa111bb-2222-3333-4444-555566667777 -->
<!-- mujarrad-space-id: bbb222cc-3333-4444-5555-666677778888 -->

# Mobile App Features

## Core Features
- Push notifications
- Offline mode
- [[User Authentication]] ← wikilink preserved

The metadata is hidden (HTML comments don't show in reading mode)

──────────────────────────────────────────────────────────────────

STEP 4: Team Member Clones Space
──────────────────────────────────────────────────────────────────
Marcus's designer, Elena, joins:

Elena's Terminal:
$ mujarrad clone --space "product-management" \
                 --local-path ~/Documents/ProductWork

Mujarrad Backend Processing:
✓ Retrieved space structure
✓ Recreating folder hierarchy...
  - Projects/Mobile App/
  - Projects/Web Platform/
  - Research/
  - Strategy/
  - Daily Notes/
✓ Generated 147 markdown files with metadata
✓ Generated 1 canvas file (Product Vision.canvas)
✓ Reconstructed all wikilinks
✓ Initialized Git repository
✓ Created initial commit

Clone complete!

Elena's vault is IDENTICAL to Marcus's original structure.

──────────────────────────────────────────────────────────────────

STEP 5: Collaborative Editing
──────────────────────────────────────────────────────────────────
Day 1: Marcus edits Roadmap.md
$ mujarrad sync
✓ Created NodeVersion for Roadmap node
✓ Commit: abc123 "Updated Q3 roadmap priorities"

Day 2: Elena edits User Stories.md
$ mujarrad sync
✓ Created NodeVersion for User Stories node
✓ Commit: def456 "Added authentication user stories"

Day 3: Marcus pulls latest changes
$ mujarrad pull

Mujarrad Backend Processing:
✓ Detected remote changes in User Stories node
✓ Updated local file: User Stories.md
✓ Created git commit

Marcus sees Elena's changes automatically!

──────────────────────────────────────────────────────────────────

STEP 6: Version History Tracking
──────────────────────────────────────────────────────────────────
Marcus checks history of Features.md:

$ mujarrad history --file "Features.md"

Version History:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v5 | 2025-10-09 16:30 | Marcus  | abc789 | "Added biometric auth"
v4 | 2025-10-08 14:20 | Elena   | def456 | "Updated offline mode specs"
v3 | 2025-10-07 09:15 | Marcus  | ghi123 | "Refined push notifications"
v2 | 2025-10-05 11:00 | Marcus  | jkl890 | "Initial feature list"
v1 | 2025-10-01 10:00 | Marcus  | mno567 | "Created Features.md"

Each version linked to Git commit hash!
```

### Journey 3: AI-Powered Knowledge Discovery

```
PERSONA: Dr. Lisa, Research Scientist
GOAL: Organize research notes and use AI to discover connections
KNOWLEDGE: New to both Obsidian and Mujarrad

──────────────────────────────────────────────────────────────────

STEP 1: Clone Research Template
──────────────────────────────────────────────────────────────────
Lisa's Terminal:
$ mujarrad clone --template "research-methodology" \
                 --space "ml-research-2025" \
                 --local-path ~/Research/ML2025

Template includes:
- Literature Review.canvas
- Methodology.md
- Experiments/
- Results/
- Analysis/
- Publications/

──────────────────────────────────────────────────────────────────

STEP 2: Lisa Fills in Research Notes Over 3 Months
──────────────────────────────────────────────────────────────────
Lisa creates 200+ notes:

Literature Review/
├── Paper - Attention Mechanisms.md
├── Paper - Transformer Architecture.md
├── Paper - BERT Model.md
└── ... (50 more papers)

Experiments/
├── Experiment 001 - Baseline Model.md
├── Experiment 002 - Attention Variant.md
└── ... (30 experiments)

Results/
├── Dataset A Results.md
├── Dataset B Results.md
└── Comparative Analysis.md

She adds wikilinks connecting related concepts:
"Our [[Experiment 002]] builds on [[Paper - Attention Mechanisms]]"

Regular syncing:
$ mujarrad sync
(Lisa syncs weekly, creating version history)

──────────────────────────────────────────────────────────────────

STEP 3: AI Discovers Hidden Connections
──────────────────────────────────────────────────────────────────
Lisa asks Mujarrad AI:

"What patterns exist in my research that I might have missed?"

Mujarrad AI Processing:
1. Analyzes 200+ nodes and 400+ wikilink attributes
2. Identifies template: Research Methodology
3. Understands structure:
   - Literature Review = prior work
   - Experiments = hypothesis testing
   - Results = empirical findings

AI Response:
DISCOVERED PATTERNS:

1. CONVERGENT FINDING:
   Your Experiments 002, 007, and 015 all improved performance
   on Dataset A but degraded on Dataset B. These experiments
   share a common characteristic: they all modified the attention
   mechanism's temperature parameter.

   → Hypothesis: Temperature sensitivity varies by dataset
   → Suggested experiment: Adaptive temperature per dataset

2. CITATION GAP:
   You referenced [[Paper - Attention Mechanisms]] in 12 notes,
   but never connected it to [[Paper - BERT Model]], even though
   BERT heavily uses attention. Your Experiment 018 independently
   discovered a technique similar to BERT's masked prediction.

   → Opportunity: Compare your approach to BERT explicitly

3. TEMPORAL PATTERN:
   Experiments conducted in Month 2 had 30% better results than
   Month 1, but Month 3 showed no improvement over Month 2.

   → Insight: You may have plateaued; consider different approach

4. KNOWLEDGE CLUSTER:
   Found 15 notes about "regularization" scattered across folders
   with no wikilinks connecting them. Creating a canvas grouping
   these concepts might reveal optimization opportunities.

Would you like me to generate a canvas visualizing these patterns?

Lisa: "Yes, please!"

AI creates "Discovered Patterns.canvas" with:
- Grouped experiments by similarity
- Connected related papers
- Highlighted the plateau pattern chronologically
- Visualized the regularization cluster

──────────────────────────────────────────────────────────────────

STEP 4: Lisa Syncs AI-Generated Canvas
──────────────────────────────────────────────────────────────────
The AI-generated canvas is automatically:
✓ Created as CONTEXT node in Mujarrad
✓ Synced to Lisa's Obsidian vault
✓ Linked to existing notes via Attributes

Lisa opens it in Obsidian and immediately sees connections
she missed across 3 months of research!

──────────────────────────────────────────────────────────────────

STEP 5: Collaboration with Advisor
──────────────────────────────────────────────────────────────────
Lisa shares space with her PhD advisor:

$ mujarrad share --space "ml-research-2025" \
                 --user "advisor@university.edu" \
                 --permission "view"

Advisor clones and adds comments:
Experiments/Experiment 002 - Attention Variant.md:

> [!NOTE] Advisor Comment
> Have you considered comparing this to Smith et al. (2024)?
> Their temperature scaling approach is similar.

$ mujarrad sync

Lisa sees the comment next time she pulls:
$ mujarrad pull

Both maintain version history, all trackable via Git!
```

### Journey 4: Template Evolution and Deviation

```
PERSONA: Alex, Innovation Consultant
GOAL: Use Business Model Canvas template but customize for consulting
KNOWLEDGE: Expert in both business strategy and Obsidian

──────────────────────────────────────────────────────────────────

STEP 1: Clone Standard Template
──────────────────────────────────────────────────────────────────
$ mujarrad clone --template "business-model-canvas" \
                 --space "client-acme-corp" \
                 --local-path ~/Clients/AcmeCorp

Standard BMC template cloned with 9 building blocks.

──────────────────────────────────────────────────────────────────

STEP 2: Alex Customizes Structure
──────────────────────────────────────────────────────────────────
Alex adds custom nodes beyond the template:

NEW ADDITIONS:
├── Risk Analysis.md              (not in template)
├── Competitive Landscape.md      (not in template)
├── Implementation Timeline.md    (not in template)
└── Stakeholder Map.canvas       (new canvas!)

Alex modifies the original canvas:
- Adds "Risk Analysis" as canvas node
- Changes colors to match client branding
- Rearranges positions for better flow

$ mujarrad sync

Mujarrad Backend Processing:
✓ Detected template deviation
✓ Created new REGULAR nodes (Risk Analysis, etc.)
✓ Updated canvas CONTEXT node content (modified layout)
✓ PRESERVED template reference (templateId maintained)
✓ Marked space as "evolved from template"

──────────────────────────────────────────────────────────────────

STEP 3: AI Still Understands Core Structure
──────────────────────────────────────────────────────────────────
Alex asks AI:

"Analyze the business model's scalability"

AI Response:
Based on your Business Model Canvas (with customizations):

CORE ANALYSIS (from template):
- Value Propositions: Strong enterprise focus ✓
- Customer Segments: Well-defined corporate clients ✓
- Revenue Streams: Subscription model identified ✓

CUSTOM ADDITIONS INCORPORATED:
I see you've added Risk Analysis and Competitive Landscape.
These strengthen the standard BMC framework!

SCALABILITY INSIGHTS:
1. Your Key Resources section indicates heavy reliance on
   senior consultants (from template structure)

2. Your Risk Analysis (custom) identifies hiring as bottleneck

3. RECOMMENDATION: Consider knowledge management system to
   reduce dependency on senior expertise (enables scaling)

The AI understood BOTH the template structure AND the custom
additions because template reference was preserved!

──────────────────────────────────────────────────────────────────

STEP 4: Template Updated by Admin
──────────────────────────────────────────────────────────────────
Mujarrad admin releases Business Model Canvas v2.0:
- Adds "Sustainability Impact" building block
- Updates visual layout
- Adds guidance text improvements

Alex receives notification:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Template Update Available
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your space "client-acme-corp" was created from:
  Business Model Canvas v1.0

A new version is available:
  Business Model Canvas v2.0

Changes:
  + New: Sustainability Impact section
  + Updated: Visual layout improved
  + Updated: Guidance text for all sections

Your space has custom modifications. Options:
  1. View changes only (keep current version)
  2. Merge new components (add Sustainability, keep customs)
  3. Full upgrade (lose customizations, not recommended)

Alex chooses: Option 2 (Merge)

Mujarrad Backend Processing:
✓ Added "Sustainability Impact.md" to space
✓ Preserved custom nodes (Risk Analysis, etc.)
✓ Updated guidance text where no conflicts
✓ Kept custom canvas layout
✓ Updated templateVersion metadata to "v2.0 (merged)"

Alex now has best of both worlds:
- Template improvements
- Custom additions preserved
```

---

## 🔄 Bidirectional Flow Examples

### Example 1: Upload Note with Wikilinks

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: Strategy.md
Content:
  # Strategy
  Our strategy connects to [[Value Proposition]]
  and [[Business Model Canvas]]
```

**Upload Flow:**

```
Step 1: Create REGULAR Node
  ├─ title: "Strategy"
  ├─ slug: "strategy"
  ├─ nodeType: REGULAR
  └─ content: "# Strategy\nOur strategy..."

Step 2: Parse Wikilinks
  ├─ Found: [[Value Proposition]]
  ├─ Found: [[Business Model Canvas]]
  └─ Create 2 Attributes linking to target Nodes

Step 3: Embed Metadata
  └─ Add hidden UUID to Strategy.md file
```

**MUJARRAD DATABASE:**

```
Node Table:
┌──────────────────────────┬───────────┬──────────┬─────────────┐
│ id (UUID)                │ title     │ nodeType │ content     │
├──────────────────────────┼───────────┼──────────┼─────────────┤
│ 550e8400-e29b-41d4-a716  │ Strategy  │ REGULAR  │ # Strategy..│
└──────────────────────────┴───────────┴──────────┴─────────────┘

Attribute Table:
┌──────────────────────────┬──────────────────────────┬──────────┐
│ sourceNodeId             │ targetNodeId             │ type     │
├──────────────────────────┼──────────────────────────┼──────────┤
│ 550e8400... (Strategy)   │ 789abc... (Value Prop)   │ LINK     │
│ 550e8400... (Strategy)   │ 456def... (BMC)          │ LINK     │
└──────────────────────────┴──────────────────────────┴──────────┘
```

---

### Example 2: Upload Canvas with Nodes

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: Business Model Canvas.canvas

Canvas Nodes:
1. Node: "Key Partners.md"     (x:100, y:200, color:red)
2. Node: "Value Propositions.md" (x:500, y:200, color:yellow)
3. Node: "Customer Segments.md" (x:900, y:200, color:blue)

Edges:
- Value Propositions → Customer Segments
```

**Upload Flow (Normalized Storage):**

```
Step 1: Create Canvas CONTEXT Node
  ├─ title: "Business Model Canvas"
  ├─ nodeType: CONTEXT
  └─ (No canvas JSON in content - normalized instead!)

Step 2: Create Mapping for Canvas
  ├─ node_id → Canvas CONTEXT Node
  ├─ ordering_strategy: "manual"
  └─ configuration → {zoom: 1.0, viewX: 0, viewY: 0}

Step 3: Create NodeMapping for Each Canvas Node
  ├─ Canvas Node 1: "Key Partners.md"
  │   ├─ mapping_node_id → Canvas Node
  │   ├─ contained_node_id → Key Partners Node (REGULAR)
  │   └─ metadata → {canvasNodeId: "node1", x: 100, y: 200, width: 400, height: 300, color: "1"}
  │
  ├─ Canvas Node 2: "Value Propositions.md"
  │   ├─ mapping_node_id → Canvas Node
  │   ├─ contained_node_id → Value Propositions Node (REGULAR)
  │   └─ metadata → {canvasNodeId: "node2", x: 500, y: 200, width: 400, height: 300, color: "3"}
  │
  └─ Canvas Node 3: "Customer Segments.md"
      ├─ mapping_node_id → Canvas Node
      ├─ contained_node_id → Customer Segments Node (REGULAR)
      └─ metadata → {canvasNodeId: "node3", x: 900, y: 200, width: 400, height: 300, color: "5"}

Step 4: Create Attributes for Canvas Edges
  └─ Value Propositions → Customer Segments
      ├─ source_node_id → Value Propositions Node
      ├─ target_node_id → Customer Segments Node
      ├─ attribute_type: "EDGE"
      └─ properties → {fromSide: "right", toSide: "left", fromEnd: "arrow", toEnd: "none"}
```

**MUJARRAD DATABASE (Normalized Storage):**

```
Node Table:
┌──────────────┬──────────────────────┬──────────┬─────────────────────┐
│ id           │ title                │ nodeType │ content             │
├──────────────┼──────────────────────┼──────────┼─────────────────────┤
│ aaa111...    │ Business Model Canvas│ CONTEXT  │ (null/empty)        │  ← Canvas container
│ bbb222...    │ Key Partners         │ REGULAR  │ # Key Partners...   │  ← Note content
│ ccc333...    │ Value Propositions   │ REGULAR  │ # Value Props...    │  ← Note content
│ ddd444...    │ Customer Segments    │ REGULAR  │ # Customers...      │  ← Note content
└──────────────┴──────────────────────┴──────────┴─────────────────────┘

Mapping Table (Canvas Config):
┌──────────────┬──────────────┬────────────────────────────────────────┐
│ id           │ node_id      │ configuration (JSONB)                  │
├──────────────┼──────────────┼────────────────────────────────────────┤
│ map001...    │ aaa111...    │ {"zoom": 1.0, "viewX": 0, "viewY": 0}  │
└──────────────┴──────────────┴────────────────────────────────────────┘

NodeMapping Table (Canvas Node Visual Layout):
┌─────┬─────────────────┬──────────────────┬─────────────────────────────────────────────────┐
│ id  │ mapping_node_id │ contained_node_id│ metadata (JSONB)                                │
├─────┼─────────────────┼──────────────────┼─────────────────────────────────────────────────┤
│ nm1 │ aaa111...       │ bbb222...        │ {"canvasNodeId": "node1", "x": 100, "y": 200,  │
│     │                 │                  │  "width": 400, "height": 300, "color": "1"}     │
├─────┼─────────────────┼──────────────────┼─────────────────────────────────────────────────┤
│ nm2 │ aaa111...       │ ccc333...        │ {"canvasNodeId": "node2", "x": 500, "y": 200,  │
│     │                 │                  │  "width": 400, "height": 300, "color": "3"}     │
├─────┼─────────────────┼──────────────────┼─────────────────────────────────────────────────┤
│ nm3 │ aaa111...       │ ddd444...        │ {"canvasNodeId": "node3", "x": 900, "y": 200,  │
│     │                 │                  │  "width": 400, "height": 300, "color": "5"}     │
└─────┴─────────────────┴──────────────────┴─────────────────────────────────────────────────┘

Attribute Table (Canvas Edges):
┌──────────────┬──────────────┬──────┬────────────────────────────────────────────┐
│ source_node  │ target_node  │ type │ properties (JSONB)                         │
├──────────────┼──────────────┼──────┼────────────────────────────────────────────┤
│ ccc333...    │ ddd444...    │ EDGE │ {"fromSide": "right", "toSide": "left",    │
│              │              │      │  "fromEnd": "arrow", "toEnd": "none"}      │
└──────────────┴──────────────┴──────┴────────────────────────────────────────────┘
```

**Key Benefits of Normalized Approach:**

1. **Separation of Concerns**: Visual layout separate from content
2. **Queryable**: `SELECT * FROM node_mappings WHERE metadata->>'x' > 500` finds all nodes on right side
3. **Data Integrity**: Foreign keys ensure referenced notes exist
4. **Efficient Updates**: Update single row instead of parsing/serializing JSON
5. **Reuses ERD**: Leverages existing MAPPINGS and NODE_MAPPINGS tables

---

### Example 3: Clone Space to Obsidian

```
MUJARRAD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Space: "My Business"

Nodes:
1. CONTEXT: "Projects" (folder)
2. REGULAR: "Project Plan"
3. REGULAR: "Budget Analysis"
4. CONTEXT: "Business Model Canvas" (canvas with JSON)

Attributes:
- Projects CONTAINS Project Plan
- Projects CONTAINS Budget Analysis
```

**Clone Flow:**

```
Step 1: Create Vault Directory
  └─ Directory: "My Business/" (from Space.slug)

Step 2: Process CONTEXT Node "Projects"
  └─ Create folder: "My Business/Projects/"

Step 3: Process REGULAR Nodes
  ├─ Create: "My Business/Projects/Project Plan.md"
  │   ├─ Write content from Node.content
  │   └─ Embed hidden UUID metadata
  │
  └─ Create: "My Business/Projects/Budget Analysis.md"
      ├─ Write content from Node.content
      └─ Embed hidden UUID metadata

Step 4: Process Canvas CONTEXT Node
  ├─ Create: "My Business/Business Model Canvas.canvas"
  ├─ Extract canvas JSON from Node.content
  ├─ Reconstruct canvas nodes with "file" attributes
  └─ Link to existing note files

Step 5: Initialize Git
  ├─ git init
  └─ git commit -m "Initial clone from Mujarrad"
```

**OBSIDIAN RESULT:**

```
My Business/
├── Projects/
│   ├── Project Plan.md          ← REGULAR Node
│   └── Budget Analysis.md       ← REGULAR Node
└── Business Model Canvas.canvas ← CONTEXT Node (canvas)
```

---

## 🔗 Relationship Type Mapping

| Relationship Type | Obsidian Representation | Mujarrad Attribute Type | Direction |
|---|---|---|---|
| **Folder containment** | Files in directory | `CONTAINS` | Parent → Child |
| **Wikilink** | `[[Target]]` | `LINK` or custom type | Source → Target |
| **Canvas node reference** | Canvas node "file" attribute | `CONTAINS` | Canvas → Note |
| **Canvas edge** | Connection line in canvas | `EDGE` or custom type | Node → Node |
| **Nested folder** | Subdirectory | `CONTAINS` | Parent Folder → Subfolder |
| **Canvas nesting** | Canvas references canvas | `CONTAINS` | Parent Canvas → Child Canvas |

---

## 📦 Metadata Embedding

### Hidden UUID Metadata in Note Files

**Obsidian File** (with embedded metadata):

```markdown
<!-- mujarrad-node-id: 550e8400-e29b-41d4-a716-446655440000 -->
<!-- mujarrad-space-id: 123e4567-e89b-12d3-a456-426614174000 -->

# Project Plan

This is the content of the note...
```

**Mapping:**
- `mujarrad-node-id` → Links to `Node.id` in database
- `mujarrad-space-id` → Links to `Space.id` in database
- Hidden via HTML comments (invisible in Obsidian reading mode)

---

## 🎨 Visual Properties Preservation

### Canvas Color Mapping

| Obsidian Color Code | Color Name | Preserved In | Usage |
|---|---|---|---|
| `"1"` | Red | Canvas JSON → Node.content | Semantic grouping |
| `"2"` | Orange | Canvas JSON → Node.content | Semantic grouping |
| `"3"` | Yellow | Canvas JSON → Node.content | Semantic grouping |
| `"4"` | Green | Canvas JSON → Node.content | Semantic grouping |
| `"5"` | Blue | Canvas JSON → Node.content | Semantic grouping |
| `"6"` | Purple | Canvas JSON → Node.content | Semantic grouping |

### Position & Size Preservation

| Property | Obsidian | Mujarrad Storage | Reconstruction |
|---|---|---|---|
| X coordinate | Canvas node `x` | Canvas JSON in Node.content | Exact value restored |
| Y coordinate | Canvas node `y` | Canvas JSON in Node.content | Exact value restored |
| Width | Canvas node `width` | Canvas JSON in Node.content | Exact value restored |
| Height | Canvas node `height` | Canvas JSON in Node.content | Exact value restored |

---

## 🔄 Version Control Integration

### Git Commit → NodeVersion Mapping

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User edits: "Strategy.md"

Git commits:
1. abc123 - "Initial draft" (2025-10-09 10:00)
2. def456 - "Added SWOT analysis" (2025-10-09 14:00)
3. ghi789 - "Finalized Q1 goals" (2025-10-09 18:00)
```

**Sync to Mujarrad:**

```
NodeVersion Table:
┌──────────┬──────────────┬────────────┬──────────────────┬─────────────┐
│ id       │ nodeId       │ version    │ commitHash       │ createdAt   │
├──────────┼──────────────┼────────────┼──────────────────┼─────────────┤
│ v1...    │ 550e8400...  │ 1          │ abc123           │ 2025-10-09  │
│ v2...    │ 550e8400...  │ 2          │ def456           │ 2025-10-09  │
│ v3...    │ 550e8400...  │ 3          │ ghi789           │ 2025-10-09  │
└──────────┴──────────────┴────────────┴──────────────────┴─────────────┘

Node.currentVersion → v3... (points to latest)
```

---

## 🌳 Folder Hierarchy Mapping

### Example Structure

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business/
├── Model/
│   ├── Canvas.canvas
│   └── Overview.md
├── Analysis/
│   ├── SWOT.md
│   └── Competitors.md
└── Strategy.md
```

**Mujarrad Representation:**

```
Nodes:
┌──────────┬────────────┬──────────┐
│ id       │ title      │ nodeType │
├──────────┼────────────┼──────────┤
│ n1...    │ Business   │ CONTEXT  │  ← Folder
│ n2...    │ Model      │ CONTEXT  │  ← Subfolder
│ n3...    │ Canvas     │ CONTEXT  │  ← Canvas file
│ n4...    │ Overview   │ REGULAR  │  ← Note
│ n5...    │ Analysis   │ CONTEXT  │  ← Subfolder
│ n6...    │ SWOT       │ REGULAR  │  ← Note
│ n7...    │ Competitors│ REGULAR  │  ← Note
│ n8...    │ Strategy   │ REGULAR  │  ← Note
└──────────┴────────────┴──────────┘

Attributes (CONTAINS relationships):
┌────────────┬────────────┬──────────┐
│ sourceId   │ targetId   │ type     │
├────────────┼────────────┼──────────┤
│ n1 (Business)    │ n2 (Model)      │ CONTAINS │
│ n1 (Business)    │ n5 (Analysis)   │ CONTAINS │
│ n1 (Business)    │ n8 (Strategy)   │ CONTAINS │
│ n2 (Model)       │ n3 (Canvas)     │ CONTAINS │
│ n2 (Model)       │ n4 (Overview)   │ CONTAINS │
│ n5 (Analysis)    │ n6 (SWOT)       │ CONTAINS │
│ n5 (Analysis)    │ n7 (Competitors)│ CONTAINS │
└────────────┴────────────┴──────────┘
```

**Visual Tree:**

```
n1 (Business) CONTEXT
├─ CONTAINS → n2 (Model) CONTEXT
│  ├─ CONTAINS → n3 (Canvas) CONTEXT
│  └─ CONTAINS → n4 (Overview) REGULAR
│
├─ CONTAINS → n5 (Analysis) CONTEXT
│  ├─ CONTAINS → n6 (SWOT) REGULAR
│  └─ CONTAINS → n7 (Competitors) REGULAR
│
└─ CONTAINS → n8 (Strategy) REGULAR
```

---

## 🔍 Special Cases & Edge Scenarios

### 1. Nested Canvas References

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Model Canvas.canvas
  └─ Contains canvas node pointing to:
     → Value Proposition Canvas.canvas
```

**Mujarrad Mapping:**

```
Nodes:
├─ n1: "Business Model Canvas" (CONTEXT, canvas JSON)
└─ n2: "Value Proposition Canvas" (CONTEXT, canvas JSON)

Attributes:
└─ n1 CONTAINS n2 (canvas-to-canvas relationship)

Canvas JSON in n1:
{
  "nodes": [
    {
      "id": "nested-canvas",
      "type": "file",
      "file": "Value Proposition Canvas.canvas",  ← Points to another canvas
      "x": 100,
      "y": 100
    }
  ]
}
```

### 2. Wikilink with Path

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: Strategy.md
Content: [[Business/Model/Overview]]
```

**Resolution:**

```
Step 1: Parse path "Business/Model/Overview"
Step 2: Traverse CONTEXT hierarchy
  ├─ Find CONTEXT Node "Business"
  ├─ Find child CONTEXT Node "Model"
  └─ Find child REGULAR Node "Overview"
Step 3: Create Attribute: Strategy → Overview
```

### 3. Canvas with Extreme Coordinates

```
OBSIDIAN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Canvas node coordinates:
x: -2621, y: 5362, width: 6000, height: 4000
```

**Mujarrad Storage:**

```
Node.content (JSONB) stores exact values:
{
  "nodes": [
    {
      "x": -2621,     ← Negative values preserved
      "y": 5362,      ← Large positive values preserved
      "width": 6000,
      "height": 4000
    }
  ]
}
```

**Note:** PostgreSQL JSONB handles large integers correctly.

---

## 📋 Mapping Checklist

Use this checklist to verify correct mapping implementation:

### Upload (Obsidian → Mujarrad)

- [ ] Vault directory maps to Space
- [ ] Each .md file creates REGULAR Node
- [ ] Each folder creates CONTEXT Node
- [ ] Each .canvas file creates CONTEXT Node with JSON in content
- [ ] Canvas nodes reference notes via "file" attribute
- [ ] Attributes created for each canvas node → note relationship
- [ ] Canvas edges create Attributes between nodes
- [ ] Wikilinks parsed and mapped to Attributes
- [ ] Folder hierarchy mapped to CONTAINS Attributes
- [ ] UUIDs embedded back into note files as hidden metadata

### Clone (Mujarrad → Obsidian)

- [ ] Space maps to vault directory
- [ ] REGULAR Nodes generate .md files
- [ ] CONTEXT Nodes (folders) generate directories
- [ ] CONTEXT Nodes (canvases) generate .canvas files
- [ ] Canvas JSON reconstructed with "file" attributes
- [ ] Attributes converted back to wikilinks in notes
- [ ] CONTAINS Attributes recreate folder hierarchy
- [ ] Git repository initialized
- [ ] Initial commit created
- [ ] Hidden metadata embedded in all files

### Sync (Bidirectional Updates)

- [ ] Git commits map to NodeVersions
- [ ] Modified notes update corresponding Nodes
- [ ] New notes create new REGULAR Nodes
- [ ] Deleted notes handled (strategy TBD)
- [ ] Canvas changes update CONTEXT Node content
- [ ] Metadata validates before sync
- [ ] Version history preserved

---

## 📋 Template System Mapping

### Template Concepts

The template system enables users to:
1. **Clone pre-structured spaces** from templates (boilerplate functionality)
2. **Indicate knowledge graph structure** for AI contextual mapping

### Template Entity Relationships

```
SpaceTemplate (e.g., "Business Model Canvas")
├── Contains multiple ContextTemplate entities
│   ├── ContextTemplate 1: "Business Model Canvas"
│   ├── ContextTemplate 2: "Value Proposition Canvas"
│   └── ContextTemplate 3: "Customer Journey Map"
│
├── Defines structure:
│   ├── CONTEXT Nodes (canvas layouts)
│   ├── Placeholder REGULAR Nodes (guidance text)
│   └── Attribute relationships (semantic connections)
│
└── Generates:
    ├── Template config file (JSON/YAML)
    └── Template reference metadata in Space
```

### Template Clone Flow

```
USER ACTION:
CLI command: mujarrad clone --template "business-model-canvas" --space "my-startup"

MUJARRAD BACKEND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Retrieve SpaceTemplate
  └─ Find template: "Business Model Canvas"

Step 2: Create new Space
  ├─ name: "My Startup"
  ├─ slug: "my-startup"
  └─ templateId: <SpaceTemplate.id>

Step 3: Clone template structure
  For each ContextTemplate in SpaceTemplate:
    ├─ Clone CONTEXT Node (canvas)
    │   └─ Copy canvas JSON to Node.content
    │
    ├─ Clone REGULAR Nodes (placeholders)
    │   ├─ "Key Partners" (empty)
    │   ├─ "Value Propositions" (guidance text)
    │   ├─ "Customer Segments" (guidance text)
    │   └─ ... (all canvas components)
    │
    └─ Clone Attributes
        ├─ Canvas CONTAINS relationships
        ├─ Folder hierarchy CONTAINS
        └─ Semantic connections (edges)

Step 4: Generate template config
  └─ Create template.config.json with:
      ├─ templateId
      ├─ templateName
      ├─ templateVersion
      └─ structure definition

Step 5: Clone to Obsidian
  ├─ Generate vault directory
  ├─ Create canvas files from CONTEXT Nodes
  ├─ Create note files from REGULAR Nodes
  ├─ Write template.config.json to vault root
  └─ Initialize Git repository

OBSIDIAN VAULT RESULT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
my-startup/
├── template.config.json          ← Template metadata
├── Business Model Canvas.canvas  ← Pre-structured canvas
├── Key Partners.md               ← Placeholder note
├── Value Propositions.md         ← Placeholder note
├── Customer Segments.md          ← Placeholder note
└── ... (other components)
```

### Template Configuration File Structure

```json
{
  "mujarradTemplate": {
    "templateId": "550e8400-e29b-41d4-a716-446655440000",
    "templateName": "Business Model Canvas",
    "templateVersion": "1.0.0",
    "category": "business-strategy",
    "framework": "Business Model Canvas (Osterwalder)",
    "contexts": [
      {
        "name": "Business Model Canvas",
        "type": "canvas",
        "nodes": [
          {
            "component": "Key Partners",
            "type": "REGULAR",
            "canvasPosition": {"x": 100, "y": 200},
            "color": "red",
            "description": "Key partners and suppliers"
          },
          {
            "component": "Value Propositions",
            "type": "REGULAR",
            "canvasPosition": {"x": 500, "y": 200},
            "color": "yellow",
            "description": "Value delivered to customers"
          }
        ],
        "relationships": [
          {
            "from": "Value Propositions",
            "to": "Customer Segments",
            "type": "EDGE"
          }
        ]
      }
    ]
  }
}
```

### Template for AI Contextual Mapping

When an AI model operates on a space cloned from a template:

```
AI REQUEST:
"Analyze my business model and suggest improvements"

MUJARRAD BACKEND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Identify space template
  └─ Space.templateId → "Business Model Canvas"

Step 2: Fetch template structure
  └─ Load template.config.json as contextual map

Step 3: Provide context to AI
  AI now understands:
  ├─ Space follows BMC framework
  ├─ "Key Partners" node represents partnerships
  ├─ "Value Propositions" node represents value delivery
  ├─ Relationships indicate value flow
  └─ Structure follows Osterwalder's BMC pattern

Step 4: AI operates autonomously
  ├─ Reads user's data from nodes
  ├─ Understands semantic meaning via template
  ├─ Analyzes based on BMC principles
  └─ Suggests improvements aligned with framework
```

**Key Benefit**: The template acts as a "mirror" showing the AI what knowledge structure the space follows, enabling autonomous operation without requiring explicit user instructions about space organization.

### Template Update Scenarios

| Scenario | Behavior |
|---|---|
| **User fills in template placeholders** | Content updates, structure preserved, template reference maintained |
| **User adds new nodes to template-based space** | Additional nodes created, template reference preserved, structure extended |
| **User modifies canvas layout** | Visual changes saved, template reference maintained, deviation tracked |
| **User modifies template config file** | [NEEDS CLARIFICATION: Sync behavior?] |
| **Template version updated by admin** | [NEEDS CLARIFICATION: Migration strategy?] |
| **User removes template-defined node** | [NEEDS CLARIFICATION: Validation? Warning?] |

### Example: Business Model Canvas Template

```
TEMPLATE STRUCTURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SpaceTemplate: "Business Model Canvas"
│
├── ContextTemplate: "Business Model Canvas"
│   │
│   ├── Canvas Layout (CONTEXT Node)
│   │   └─ Canvas JSON with 9 positioned zones
│   │
│   ├── Placeholder Nodes (REGULAR Nodes)
│   │   ├─ "Key Partners" (x:100, y:100, color:red)
│   │   ├─ "Key Activities" (x:100, y:400, color:red)
│   │   ├─ "Key Resources" (x:100, y:700, color:red)
│   │   ├─ "Value Propositions" (x:500, y:400, color:yellow)
│   │   ├─ "Customer Relationships" (x:900, y:100, color:blue)
│   │   ├─ "Channels" (x:900, y:400, color:blue)
│   │   ├─ "Customer Segments" (x:900, y:700, color:blue)
│   │   ├─ "Cost Structure" (x:100, y:1000, color:purple)
│   │   └─ "Revenue Streams" (x:900, y:1000, color:green)
│   │
│   └── Semantic Relationships (Attributes)
│       ├─ Value Propositions → Customer Segments
│       ├─ Channels → Customer Segments
│       └─ Customer Relationships → Customer Segments
│
└── Template Config
    ├─ name: "Business Model Canvas"
    ├─ version: "1.0.0"
    ├─ category: "business-strategy"
    └─ framework: "Osterwalder BMC"

CLONED SPACE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Space: "My Startup"
├─ templateId: <SpaceTemplate.id>
├─ All 9 REGULAR Nodes created (empty/guidance text)
├─ Canvas CONTEXT Node with layout
├─ All Attributes preserved
└─ template.config.json in Obsidian vault
```

---

## 🎯 Summary

### Critical Points to Remember

1. **Every canvas node has a "file" attribute** pointing to a note file
2. **Canvas visual data is stored NORMALIZED** in mapping tables (not in Node.content):
   - Per-node layout → `NodeMapping.metadata` {x, y, width, height, color}
   - Canvas config → `Mapping.configuration` {zoom, viewX, viewY}
   - Edge visuals → `Attribute.properties` {fromSide, toSide, color}
3. **Folders are CONTEXT Nodes** with CONTAINS Attributes to children
4. **Canvas files are CONTEXT Nodes** serving as containers (content is null/empty)
5. **Note files are REGULAR Nodes** with markdown content in `Node.markdown_content`
6. **Canvas nodes create NodeMapping entries** (not Attributes) with visual layout in metadata
7. **Git commits map to NodeVersions** for history tracking
8. **Hidden metadata embeds UUIDs** to maintain mappings
9. **Templates enable space cloning** from pre-defined knowledge graph structures
10. **Template config files act as mirrors** for AI contextual mapping
11. **SpaceTemplate entities contain ContextTemplates** representing frameworks
12. **Template references persist** even when space content deviates from structure
13. **Normalized storage enables SQL queries** on visual properties directly
14. **Foreign key constraints ensure** canvas nodes reference valid notes

### Data Flow Principles

```
OBSIDIAN                 MUJARRAD
════════                 ════════
Vault        ──────────→ Space
Note (.md)   ──────────→ Node (REGULAR)
Folder       ──────────→ Node (CONTEXT)
Canvas       ──────────→ Node (CONTEXT) with JSON
Canvas Node  ──────────→ Attribute to Note
Canvas Edge  ──────────→ Attribute between Nodes
Wikilink     ──────────→ Attribute
Git Commit   ──────────→ NodeVersion
Template     ──────────→ SpaceTemplate
Config File  ──────────→ Template metadata
```

### Template Flow Principles

```
TEMPLATE SYSTEM          SPACE CREATION
═══════════════          ══════════════════
SpaceTemplate ─────→ New Space (with templateId)
ContextTemplate   ─────→ Cloned CONTEXT Nodes
Placeholder Nodes ─────→ Cloned REGULAR Nodes
Template Config   ─────→ template.config.json in vault
Template Structure ────→ AI Contextual Map
```

---

**Document Version**: 2.0
**Last Updated**: 2025-10-09 (Added template system)
**Related Spec**: `/specs/007-obsidian-mapper-i/spec.md`
