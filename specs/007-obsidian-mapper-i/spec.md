# Feature Specification: Obsidian Mapper Integration

**Feature Branch**: `007-obsidian-mapper-i`
**Created**: 2025-10-09
**Status**: Draft
**Input**: User description: "Obsidian Mapper - I need to be able to make obsidian files to Mujarrad nodes, Obsidian edges or links to Mujarrad Attributes, and Obsidian Canvas to Mujarrad Graph (which happens dynamically) through considering all obsidian canvas nodes as Mujarrad nodes (whether those nodes were files or just canvas nodes) as well as considering the canvas nodes wire connections aka edges as Mujarad Attributes. Please notice that the canvas visual information like sizes, positions, colors, etc all of that will be preserved in the Mujarrad nodes that has a node-type:cotnext. Which means Obsidian Canvas will be mapped to Mujarrad context and the canvas data will be saved in the context content as is and then will be retrieved back when we clone the Mujarrad space locally. The obsidian vault will be mapped to Mujarrad workspacce. When we clone Mujarrad space we open the cloned files in Obsidian, this means that each node will be converted to Obsidian files, the hierarchial information where folders of obsidian will be mapped to Mujarrad contexts that contains the nodes (obsidian file after cloning the space). The cloning will be made using a Mujarrad CLI tool that will be created in another proejct that will be public on Github and distributed through npm (and of course pip and npx). The user can use CLI to upload updates, each node/obsidian files has to have direct mapping to the UUID of Mujarrad node as well as the canvas that will preserve context. The metadata that will preserve this information we can hide it some how if this is possible so that the user can't see it or miss up with. Once a project being cloned the CLI tool will initialize git rightaway so that all edits would be tracked. The history of the changes on each file will be uploaded as node history mapped to the Mujarrad's node versions entity. Now you understand the pattern continue the specs by looking at the value I am going to provide as a sample data so that you consider covering other aspects that I missed if there are any and of course to be able to write the requirements based on real project not just conceptualization about it. Here is the obsidian sample valut: '/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad' Before you do anything create a new branch"

## Execution Flow (main)
```
1. Parse user description from Input
   → Bidirectional sync between Obsidian vaults and Mujarrad spaces
2. Extract key concepts from description
   → Identified: Obsidian files, Canvas nodes, Markdown links, JSONB metadata, Git history, CLI tool
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → User uploads Obsidian vault, syncs changes, clones space
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-09

- Q: How should the system store hidden UUIDs in Obsidian markdown files? → A: HTML comments (`<!-- mujarrad-node-id: uuid -->`) with a centralized mapping file acting as database in user-readable format. Use serialization/hidden code approach to prevent user mistakes.
- Q: When conflicts occur (duplicate slugs, concurrent edits, filename collisions), how should the system handle them? → A: Auto-resolve (append UUID suffix to duplicates, last-write-wins for concurrent edits) as primary strategy, falling back to hybrid approach (auto-resolve simple conflicts, prompt for complex ones) if auto-resolution fails.
- Q: How should users authenticate with the Mujarrad backend? → A: Multiple methods supported (API token, username/password, OAuth 2.0), with API token being the only method available in first release.
- Q: When a user deletes a file locally and runs sync, what should happen? → A: Soft delete in Mujarrad - mark node as deleted/archived, preserve in database.
- Q: Where should Git commit metadata (hash, author, timestamp, message) be stored in the NodeVersion entity? → A: Store all Git metadata in properties JSONB field.

### Session 2025-10-10

- Q: What file encodings should the system support beyond UTF-8? (FR-048) → A: UTF-8 ONLY. System must reject all other encodings (UTF-16, ISO-8859-1, Windows-1252, etc.) with clear error messages instructing users to convert files to UTF-8 before upload.
- Q: What are the baseline assumptions for performance requirement "1000 files in 5 minutes"? (NFR-001) → A: Assumes (1) 50KB average file size, (2) ≥10 Mbps network upload speed, (3) backend API response <500ms per batch, (4) client machine with 4GB RAM and modern CPU. Performance degrades with slower networks or larger files.
- Q: How should broken wikilinks be reported during upload? (FR-053) → A: Log to `~/.mujarrad/logs/upload-{session-id}.log` with source file path, line number, broken target, timestamp. Display summary at end with total count and log location. Create Attribute anyway but mark with "broken" flag in properties JSONB.
- Q: What structural deviations from templates are allowed? (FR-066) → A: Users may freely add/remove nodes, modify content, add/remove relationships, reorganize layouts after cloning. Template reference persists for AI contextual mapping but does NOT enforce constraints. Templates are starting points, not rigid schemas.
- Q: How should upload resume work after interruptions? (FR-051) → A: Hash comparison approach (Option C). On resume, CLI computes SHA-256 file hashes for all vault files and queries backend API to check which nodes already exist (by hash). CLI skips files already uploaded and continues with remaining files. Slower resume than session-based approach but requires no backend session persistence or state management. Stateless, simpler implementation suitable for MVP.
- Q: Should the .obsidian configuration folder be synced to Mujarrad? → A: Yes, sync as special space metadata. Upload `.obsidian` folder contents to Space.properties JSONB field under "obsidianConfig" key. Clone operation recreates `.obsidian` folder from metadata. Enables consistent Obsidian setup (plugins, themes, space layout) across devices.
- Q: How should users be notified when templates are updated after space creation? → A: No version notifications in MVP (Option C - templates immutable after cloning). Users wanting latest template version must create new space and manually migrate content. Future roadmap includes passive sync notifications (Option A) and explicit check commands (Option B), requiring conflict resolution, mapping logic, and data consistency management.
- Q: How should generated files be named during canvas-to-file conversion? (FR-074) → A: Use canvas node text content as filename. Extract first line of canvas node text, sanitize for filesystem compatibility, add .md extension (e.g., node text "Key Partners" → "Key Partners.md"). If canvas node text is empty, fallback to canvas node ID with prefix (e.g., "canvas-node-a3f2e1b4.md"). Natural, user-friendly naming that reflects content.
- Q: What content should be placed in generated markdown files? (FR-078) → A: Combine hidden metadata with canvas node text content (Options A + C). Generated files contain: (1) hidden Mujarrad metadata as HTML comment at top, (2) canvas node's full text content as file body, preserving all text from the canvas node. Ensures no information loss while maintaining metadata tracking. If canvas node has no text, file contains only metadata (empty body).

---

## Terminology Clarification

**Important**: Obsidian uses two distinct concepts that can cause confusion:

1. **Obsidian Note**: A markdown file (.md) stored in the vault's file system. Notes are the primary content units in Obsidian and appear as files in the local directory structure.

2. **Canvas Node**: An element within an Obsidian Canvas (.canvas file). Canvas nodes are graphical elements that MAY reference a note file through a file attribute in the canvas JSON structure. Canvas nodes without file attributes are supported and can have markdown files generated for them via the Canvas-to-File conversion feature (FR-072 to FR-081).

Throughout this specification:
- "Note" or "Obsidian note" refers to .md files
- "Canvas node" refers to elements within a canvas (may or may not reference note files)
- "Mujarrad Node" refers to the Node entity in the Mujarrad database

**Key Relationship**: Canvas nodes MAY have a file attribute pointing to an associated Obsidian note (.md file). When present, the canvas JSON contains this file reference, and the note file exists both in the vault's folder hierarchy and on the local drive. The visual representation (position, size, color) is stored in the canvas, while the content is stored in the referenced note file (or in the canvas node text itself if no file is referenced).

### Template System Terminology

3. **Space Template** (MVP terminology): A predefined knowledge graph structure that serves as a blueprint for creating new spaces. In future versions, this will be referred to as "Space Template."

4. **Context Template**: A reusable structure representing a specific framework, process, paradigm, or structured pattern (e.g., Business Model Canvas, SWOT Analysis). Context templates define the visual canvas layout and the semantic relationships between nodes.

5. **Space Template** (future terminology): A collection of context templates forming a complete knowledge graph template. This represents structured knowledge frameworks that can be cloned and serve as contextual maps for AI operations.

6. **Template Configuration File**: Configuration defining the visual representation, canvas layout, node structure, and semantic relationships within a template. This file enables templates to act as "mirrors" indicating which knowledge graph structure a space follows.

**Template Purpose**: Templates serve dual purposes:
- **Boilerplate/Cloning**: Users can clone templates to start with pre-structured spaces, allowing them to focus on filling in data rather than creating structure
- **AI Contextual Mapping**: Templates act as standard contextual maps that AI models can fetch to understand the space structure and operate autonomously on the data

---

## Obsidian ↔ Mujarrad Mapping Table

| Obsidian Concept | Type/Structure | Mujarrad Mapping | Entity Type | Storage Details |
|---|---|---|---|---|
| **Vault (root directory)** | Directory | Space | `Space` | Space.slug, Space.name |
| **Note (.md file)** | Markdown file | Node | `Node` | `nodeType=REGULAR`<br/>Content → `Node.content`<br/>UUID embedded as hidden metadata in file |
| **Folder** | Directory | Node | `Node` | `nodeType=CONTEXT`<br/>No content stored<br/>CONTAINS children via Attributes |
| **Canvas file (.canvas)** | JSON file | Node + Mapping | `Node` (CONTEXT) + `Mapping` | `nodeType=CONTEXT`<br/>Canvas config → `Mapping.configuration`<br/>Visual layout normalized in mapping tables |
| **Canvas node** | JSON object in canvas | NodeMapping | `NodeMapping` | **Every canvas node references a note via mapping**<br/>Creates NodeMapping entry with visual properties in `metadata` JSONB<br/>Visual props: {x, y, width, height, color, canvasNodeId} |
| **Canvas edge/connection** | JSON array in canvas | Attribute | `Attribute` | `sourceNode` and `targetNode`<br/>Edge visual properties in `Attribute.properties` JSONB |
| **Wikilink `[[Target]]`** | Markdown syntax | Attribute | `Attribute` | Relationship between source and target Nodes<br/>`attributeType` for link type |
| **Markdown link `[text](url)`** | Markdown syntax | Attribute | `Attribute` | Similar to wikilink mapping |
| **Folder hierarchy** | Nested directories | Attribute chain | `Attribute` | CONTAINS relationships form tree<br/>Parent CONTEXT → Child Node |
| **Git commit** | Version control | NodeVersion | `NodeVersion` | Each commit → new NodeVersion<br/>Commit hash, author, message stored |
| **Canvas visual properties** | JSON properties | NodeMapping.metadata + Mapping.configuration | `NodeMapping` + `Mapping` | **Per-node visual props** → `NodeMapping.metadata` {x, y, width, height, color}<br/>**Canvas-wide config** → `Mapping.configuration` {zoom, viewX, viewY} |
| **Hidden metadata (UUID)** | File metadata | Foreign key | N/A | Links local file to `Node.id`<br/>Format TBD (frontmatter/HTML comment) |
| **Template config file** | JSON/YAML file | SpaceTemplate metadata | `SpaceTemplate` | Visual config, structure definition<br/>Template-to-space linkage |
| **Space Template** | Predefined structure | SpaceTemplate | `SpaceTemplate` | Blueprint for space creation<br/>Collection of context templates |
| **Context Template** | Framework structure | ContextTemplate | `ContextTemplate` or Node | Canvas layout + semantic relationships<br/>Reusable knowledge patterns |

### Mapping Flow Examples

#### Upload Flow: Note File → Mujarrad

```
Obsidian Note: "Project Plan.md"
   ↓
1. Create Node (nodeType=REGULAR, title="Project Plan", slug="project-plan")
2. Store markdown content in Node.content
3. Embed Node.id UUID back into file as hidden metadata
4. Parse wikilinks → Create Attribute relationships
```

#### Upload Flow: Canvas → Mujarrad

```
Canvas File: "Business Model.canvas"
   ↓
1. Create Node (nodeType=CONTEXT, title="Business Model")
2. Create Mapping for canvas (Mapping.node_id → canvas Node)
3. Store canvas-wide config in Mapping.configuration:
   {zoom, viewX, viewY, canvasSettings}
4. For each canvas node in JSON:
   - Every canvas node has a "file" attribute pointing to a note
   - Find referenced note's Mujarrad Node
   - Create NodeMapping entry:
     * mapping_node_id → canvas Node
     * contained_node_id → referenced note Node
     * metadata → {x, y, width, height, color, canvasNodeId}
5. For each edge: Create Attribute with visual properties in Attribute.properties
   {fromX, fromY, toX, toY, fromSide, toSide, color, label}
```

#### Clone Flow: Mujarrad → Obsidian Note

```
Node (nodeType=REGULAR, title="Strategy", content="...")
   ↓
1. Generate file: "Strategy.md"
2. Write Node.content to file
3. Embed Node.id as hidden metadata
4. Place in folder hierarchy based on CONTAINS relationships
5. Convert Attribute relationships back to wikilinks
```

#### Clone Flow: Mujarrad → Canvas

```
Node (nodeType=CONTEXT) + Mapping + NodeMappings
   ↓
1. Generate file: "Strategy Canvas.canvas"
2. Retrieve canvas-wide config from Mapping.configuration
3. Query NodeMappings WHERE mapping_node_id = canvas Node
4. For each NodeMapping:
   - Extract visual properties from metadata: {x, y, width, height, color}
   - Get contained_node_id to find referenced note
   - Build canvas node JSON with "file" attribute pointing to note file
5. Query Attributes WHERE source/target = canvas nodes
6. For each Attribute (edge):
   - Extract visual properties from Attribute.properties
   - Reconstruct edge in canvas JSON
7. Combine canvas config + nodes + edges → write .canvas file
```

#### Template Clone Flow: SpaceTemplate → Space

```
SpaceTemplate: "Business Model Canvas Framework"
   ↓
1. User selects template via CLI
2. System retrieves template structure (context templates + config)
3. Create new Space instance
4. For each ContextTemplate in SpaceTemplate:
   - Clone CONTEXT Node structure (canvas layout)
   - Clone placeholder REGULAR Nodes (empty or with guidance text)
   - Clone Attribute relationships (structure)
   - Preserve visual configuration (colors, positions, sizes)
5. Link space to template (template reference metadata)
6. Generate Obsidian vault with template structure
7. Include template config file for AI contextual mapping
```

### Special Cases

| Scenario | Obsidian Behavior | Mujarrad Handling |
|---|---|---|
| **Canvas node references note** | Every canvas node has "file" attribute pointing to .md file | Attribute relationship links canvas CONTEXT Node to referenced note's REGULAR Node |
| **Canvas references another canvas** | Nested canvas view | Canvas CONTEXT Node's JSON references another CONTEXT Node (nested) |
| **Note renamed in Obsidian** | File renamed, wikilinks may break | Node.slug updated, Attributes remain intact via UUID |
| **Folder moved** | Directory relocated | CONTAINS Attributes updated to new parent CONTEXT Node |
| **Wikilink with path** | `[[Folder/Note]]` | Resolve path through CONTEXT hierarchy, create Attribute to target Node |
| **Template cloning** | CLI clone from template | Instantiate SpaceTemplate → new Space with structure + config file |
| **Space follows template** | Template config file present | Space metadata references SpaceTemplate for AI contextual mapping |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Upload and Clone (Priority: P1)

As a knowledge worker, I want to upload my Obsidian vault to Mujarrad and clone it back, so that I can back up my notes and access them from multiple devices.

**Why this priority**: This is the foundational capability that enables all other features. Without reliable upload/clone, the integration cannot function.

**Independent Test**: Can be fully tested by creating a simple vault with 10 notes in 3 folders, uploading to Mujarrad, cloning to a new directory, and verifying content matches perfectly.

**Acceptance Scenarios**:

1. **Given** a user has an existing Obsidian vault with notes (.md files) and folders, **When** they run the CLI upload command with their space credentials, **Then** the system creates corresponding Mujarrad Nodes and contexts preserving the complete folder hierarchy
2. **Given** a Mujarrad space contains Nodes organized in folder structures, **When** a user runs the CLI clone command, **Then** the system recreates the folder hierarchy locally, generates Obsidian note files for each REGULAR Node with hidden metadata mappings to UUID, and initializes a Git repository tracking all files
3. **Given** an Obsidian note contains wikilinks `[[Another Note]]`, **When** uploaded to Mujarrad, **Then** the system creates an Attribute relationship between the source and target Mujarrad Nodes
4. **Given** cloned notes contain wikilinks, **When** rendered in Obsidian, **Then** all wikilinks resolve correctly to their target files

---

### User Story 2 - Bidirectional Sync with Version Control (Priority: P1)

As a knowledge worker, I want to edit notes locally and sync changes to Mujarrad, so that I can work offline and maintain version history.

**Why this priority**: Sync is essential for the MVP - without it, users must manually upload after every change, making the tool impractical for daily use.

**Independent Test**: Clone space, edit 5 notes, commit changes via Git, run sync command, verify NodeVersions created in Mujarrad with correct Git metadata.

**Acceptance Scenarios**:

1. **Given** a user has cloned a Mujarrad space locally, **When** they edit an Obsidian note and run the sync command, **Then** the system creates a new NodeVersion in Mujarrad, updates the Node entity, and preserves the Git commit history
2. **Given** a user has made multiple Git commits to their cloned space note files, **When** they run the sync command, **Then** the system creates NodeVersion entries for each note change corresponding to Git commit history
3. **Given** a user creates a new note in their cloned vault, **When** they sync, **Then** the system creates a new REGULAR-type Mujarrad Node with embedded metadata
4. **Given** a user has edited files locally while another user edited the same space remotely, **When** they sync, **Then** the system detects conflicts and provides resolution options (strategy determined by Conflict Resolution clarification)

---

### User Story 3 - Canvas Visual Preservation (Priority: P2)

As a business strategist, I want to upload Obsidian canvases with visual layouts to Mujarrad and clone them back, so that I can preserve my visual business model designs.

**Why this priority**: Canvas support is a key differentiator but not essential for basic note-taking. Users can function without it for MVP validation.

**Independent Test**: Create canvas with 5 nodes in specific positions/colors, upload to Mujarrad, clone to new directory, verify canvas renders with exact visual layout (position, size, color).

**Acceptance Scenarios**:

1. **Given** a user has a canvas file (.canvas) containing canvas nodes (where each canvas node has a "file" attribute pointing to a note), **When** they upload to Mujarrad, **Then** the system creates a CONTEXT-type Mujarrad Node, creates NodeMapping entries with visual properties, and creates Attributes for all canvas edges
2. **Given** a canvas contains canvas nodes with different colors and positions (where each canvas node references a note via "file" attribute), **When** uploaded to Mujarrad, **Then** the system normalizes visual data into NodeMapping.metadata (per-node) and Mapping.configuration (canvas-wide)
3. **Given** a Mujarrad space contains canvas CONTEXT Nodes with Mappings and NodeMappings, **When** cloned to Obsidian, **Then** the system reconstructs .canvas files with all visual properties preserved (position accuracy within 1 pixel)
4. **Given** a canvas contains edges connecting nodes, **When** uploaded, **Then** the system stores edge visual properties in Attribute.properties JSONB and reconstructs them accurately on clone

---

### User Story 4 - Template System for Knowledge Frameworks (Priority: P3)

As a business consultant, I want to clone spaces from templates (e.g., Business Model Canvas), so that I can quickly start new projects with proven frameworks.

**Why this priority**: Templates are a powerful feature but not essential for MVP. Users can create their own structures manually initially.

**Independent Test**: List available templates, clone "Business Model Canvas" template, verify space contains pre-structured canvas with 9 components and template config file.

**Acceptance Scenarios**:

1. **Given** a user wants to start a new business model project, **When** they run the CLI command to clone from a "Business Model Canvas" template, **Then** the system creates a new space with pre-structured canvas layouts, placeholder nodes for all components, visual configuration preserved, and a template config file
2. **Given** a space was created from a template and contains a template config file, **When** an AI model needs to operate on the space data, **Then** the system provides the template structure as a contextual map
3. **Given** a user has cloned a space from a template and edited some nodes, **When** they sync changes back to Mujarrad, **Then** the system preserves the template reference metadata while updating the modified node content
4. **Given** templates are updated with new versions, **When** users check for updates, **Then** the system notifies them of newer template versions (versioning strategy determined by Template Versioning clarification)

---

### User Story 5 - Canvas-to-File Conversion (Priority: P4)

As a visual thinker, I want to create canvas nodes without files and have the system generate files automatically, so that I can focus on structure before content.

**Why this priority**: Advanced convenience feature that streamlines workflow but not essential for core functionality.

**Independent Test**: Create canvas with 3 nodes lacking file references, enable conversion during upload, verify 3 markdown files created with proper metadata and NodeMapping entries.

**Acceptance Scenarios**:

1. **Given** a user has an Obsidian canvas where some canvas nodes don't have associated files yet, **When** they upload the canvas via CLI with canvas-to-file conversion enabled, **Then** the system creates markdown files for each canvas node that lacks an associated file, embeds Mujarrad node UUIDs in the generated files
2. **Given** a canvas with 10 canvas nodes where 6 have existing files and 4 don't, **When** upload with conversion occurs, **Then** the system creates 4 new markdown files, preserves references to existing 6 files, and maintains all visual layout information
3. **Given** generated files lack descriptive names, **When** system generates files, **Then** files are named using first line of canvas node text content (sanitized for filesystem compatibility), or fallback to `canvas-node-{id}.md` if text empty, with naming conflicts resolved by appending UUID suffix per Conflict Resolution strategy

---

### User Story 6 - Auto-Context Creation (Priority: P4)

As a user with unorganized notes, I want the system to suggest folder structures automatically, so that I can organize large vaults efficiently.

**Why this priority**: Nice-to-have feature that improves UX but users can organize manually.

**Independent Test**: Upload 20 unorganized markdown files with auto-context enabled, verify system creates logical folder structure grouping related files.

**Acceptance Scenarios**:

1. **Given** a user uploads multiple markdown files without any existing folder structure, **When** auto-context creation is enabled, **Then** the system analyzes file organization needs, creates CONTEXT-type Mujarrad Nodes representing folders, and establishes CONTAINS relationships
2. **Given** a user clones a space that contains auto-generated folders, **When** the clone operation completes, **Then** the local Obsidian vault contains all generated files in proper folder hierarchy with hidden metadata intact
3. **Given** files need categorization, **When** system creates folders, **Then** folders are named intelligently (merge conflicts resolved per Conflict Resolution clarification) [NEEDS CLARIFICATION: File clustering algorithm - AI categorization analyzing content, filename pattern matching, manual user tagging, or unsupervised clustering?]

---

### Edge Cases
- What happens when a user edits the hidden metadata in an Obsidian file manually?
  - System should validate UUID existence before syncing, reject invalid metadata, and warn user

- **Conflict Resolution Strategy** - How does the system handle various conflict scenarios?
  - System uses auto-resolve strategy as primary approach: (A) Name conflicts → append UUID suffix to duplicates, (B) Concurrent edits → last-write-wins, (C) Same-name file and canvas → auto-rename with suffix, (D) Canvas node filename conflicts → UUID suffix, (E) Folder merge conflicts → auto-merge. Falls back to hybrid approach (auto-resolve simple conflicts, prompt for complex ones) if auto-resolution fails.

### Conflict Resolution Decision Tree

**Concurrent Edit Resolution** (FR-032, US-2 Scenario 4):
1. Compare Git commit timestamps (client-side `git log` output)
2. **If timestamps differ >1 second**: Remote (latest timestamp) wins automatically
   - CLI displays: `Conflict auto-resolved: Remote changes applied to {filename} (newer by {X} seconds)`
   - Logged to `~/.mujarrad/logs/sync-{session-id}.log` with before/after content diff
3. **If timestamps within 1 second**: Trigger hybrid mode (interactive prompt)
   - Display diff showing local vs remote changes
   - Prompt user: `Conflict detected in {filename}. Choose: [L]ocal | [R]emote | [M]anual merge`
   - User selection:
     * `L`: Keep local changes, discard remote
     * `R`: Keep remote changes, discard local
     * `M`: Open in system editor for manual merge (write merged content, CLI re-reads and syncs)
4. **Same-timestamp tiebreaker**: If both timestamps identical, compare content hashes
   - If hashes match: No conflict (identical edits)
   - If hashes differ: Prompt user (hybrid mode as above)

**Notification Format**:
- **Auto-resolved conflicts**: CLI displays summary after sync: `✓ 3 conflicts auto-resolved (2 remote wins, 1 local wins)`
- **User-resolved conflicts**: CLI displays: `→ Resolved {filename}: Kept {local|remote|merged} version`
- **Conflict log**: Stored in `~/.mujarrad/logs/sync-{session-id}.log`:
  ```
  [2025-10-11 14:32:15] CONFLICT AUTO-RESOLVED
  File: notes/Strategy.md
  Local timestamp: 2025-10-11 14:30:10
  Remote timestamp: 2025-10-11 14:31:45
  Resolution: Remote wins (95 seconds newer)
  Local content (discarded): "# Strategy\n\nOld approach..."
  Remote content (applied): "# Strategy\n\nNew approach..."
  ```

**Hybrid Mode Fallback Triggers** (auto-resolve fails when):
1. **File deleted locally + modified remotely**: Prompt "File {filename} was deleted locally but modified remotely. Restore remote version? [Y/n]"
2. **Metadata UUID mismatch**: Prompt "UUID mismatch in {filename}. This may indicate file corruption. Re-sync from remote? [Y/n]"
3. **File moved + content changed**: Prompt "File {filename} was moved to {new-path} AND content changed. Apply both? [Y/n]"
4. **Canvas structure conflict**: Prompt "Canvas {filename} has conflicting node positions. Keep [L]ocal layout | [R]emote layout | [M]erge visual properties"

**Performance Requirements**:
- Conflict detection: <100ms per file (NFR-003 sync <10s total)
- Timestamp comparison: Use ISO-8601 format from Git metadata (FR-029)
- Content hash: SHA-256 (reuse from upload resume FR-051 hash computation)

- What happens when a user deletes a file locally and syncs?
  - System performs soft delete in Mujarrad: marks node as deleted/archived while preserving in database. This allows for recovery and maintains referential integrity.

- How does the system handle very large vaults (10,000+ files)?
  - System uses batch uploading with backend-determined batch sizes (typically 50-100 files per batch as returned by /upload/init endpoint). Progress indicators show current batch and total batches. Resumable uploads via hash comparison enable recovery from interruptions - CLI computes file hashes and queries backend for existing nodes, then uploads only remaining files.

- What happens when canvas references a file that doesn't exist in the vault?
  - System should create placeholder node or warn about broken references

- How are broken wikilinks handled during upload? (FR-053)
  - **Detection**: MarkdownParser.extractWikilinks() validates that each `[[Target]]` resolves to an existing file in vault
  - **Logging**: Broken links logged to `~/.mujarrad/logs/upload-{session-id}.log` with:
    * Source file path (e.g., "notes/Strategy.md")
    * Line number where broken link found (e.g., line 15)
    * Broken link target (e.g., "[[Non-Existent Note]]")
    * Timestamp (ISO-8601 format)
  - **Attribute Creation**: System creates Attribute anyway (preserving user intent) but marks it with `{"broken": true, "targetNotFound": "Non-Existent Note"}` in Attribute.properties JSONB
  - **User Notification**: At upload completion, CLI displays:
    ```
    ⚠ 3 broken wikilinks detected
    See details: ~/.mujarrad/logs/upload-abc123.log
    ```
  - **Rationale**: Broken links are common during note-taking (forward references, work-in-progress). System preserves them for future resolution rather than failing upload.

- What happens when Git history cannot be initialized (e.g., directory not writable)?
  - **Current Implementation (MVP)**: System fails gracefully with warning message, allows vault to remain (user can manually initialize Git later with `git init`). Clone operation succeeds without Git tracking.
  - **FR-052 Interpretation**: "Clean up partial clone and report error" means:
    * **Partial clone** = Files written but Git not initialized → This is a VALID state (usable vault without version control)
    * **Cleanup required** = Files corrupted/incomplete → Would be caught by CloneService validation before Git init
  - **Rationale**: Git is optional enhancement for version control. If Git fails, vault is still functional. Deleting a working vault due to Git failure would violate least-surprise principle and cause data loss.
  - **Test Coverage**: Clone command includes try-catch for Git errors with user-friendly warning (lines 143-148 in src/commands/clone.ts)

- How does the system handle circular references in canvas connections?
  - System should allow cycles as per FR-007 cyclic graph support, except for Context→Node CONTAINS relationships

- **Template Versioning and Lifecycle** - How does the system handle template-related operations?
  - MVP approach: Templates are immutable after space creation. No version update notifications or automatic migration. Users wanting latest template must create new space and manually migrate content. Template versions use semantic versioning (1.0.0). Future versions will add passive notifications during sync and explicit `mujarrad template:check-updates` command. Structural deviations allowed (see FR-066). Manual template config modifications sync to Mujarrad as space changes, not template updates.

- What happens when a user tries to clone a template that has been deleted or archived?
  - System should return clear error message and suggest available templates

- How does the system handle canvas nodes with no visual properties (position 0,0)?
  - System should still create file but warn about missing layout, use default positioning

- What happens if a user manually edits an auto-generated file and then syncs?
  - System should treat it as a normal edited file, preserve changes, create node version

---

## CLI Tool Architecture & API Integration

### Overview

The Mujarrad CLI tool acts as a **frontend tier** that communicates with the Mujarrad backend APIs. The CLI is responsible for:
- Local file system operations (reading/writing Obsidian vaults)
- Git repository management
- HTTP API communication with Mujarrad backend
- Authentication and session management
- Local metadata caching for performance

**Important Note**: The CLI tool is a **separate project** distributed via npm/pip/npx and will be open-sourced on GitHub. This specification defines the backend API requirements that the CLI will consume.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Local Machine                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Obsidian Application                       │ │
│  │  - Edits .md files                                      │ │
│  │  - Edits .canvas files                                  │ │
│  │  - Renders visualizations                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↕                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Obsidian Vault (File System)               │ │
│  │  - Notes (.md)                                          │ │
│  │  - Canvases (.canvas)                                   │ │
│  │  - Folders                                              │ │
│  │  - Hidden metadata (UUIDs)                              │ │
│  │  - template.config.json                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↕                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Git Repository                             │ │
│  │  - Tracks all file changes                              │ │
│  │  - Commit history                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↕                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Mujarrad CLI Tool                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Commands:                                        │  │ │
│  │  │  - mujarrad upload                                │  │ │
│  │  │  - mujarrad clone                                 │  │ │
│  │  │  - mujarrad sync                                  │  │ │
│  │  │  - mujarrad pull                                  │  │ │
│  │  │  - mujarrad templates list                        │  │ │
│  │  │  - mujarrad share                                 │  │ │
│  │  │  - mujarrad history                               │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Responsibilities:                                │  │ │
│  │  │  - File system I/O                                │  │ │
│  │  │  - Git operations (init, commit, log, diff)       │  │ │
│  │  │  - JSON parsing (canvas files)                    │  │ │
│  │  │  - Markdown parsing (frontmatter, wikilinks)      │  │ │
│  │  │  - HTTP client (API requests)                     │  │ │
│  │  │  - Authentication token storage                   │  │ │
│  │  │  - Local cache management                         │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↕  HTTPS
                          ↕  REST API
┌─────────────────────────────────────────────────────────────┐
│                    Mujarrad Backend                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Gateway / Load Balancer                │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↕                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Spring Boot REST APIs                      │ │
│  │  - /api/spaces                                      │ │
│  │  - /api/nodes                                           │ │
│  │  - /api/attributes                                      │ │
│  │  - /api/mappings                                        │ │
│  │  - /api/templates                                       │ │
│  │  - /api/sync                                            │ │
│  │  - /api/auth                                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↕                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                        │ │
│  │  - Spaces, Nodes, Attributes                        │ │
│  │  - Mappings, NodeMappings                               │ │
│  │  - NodeVersions, Users                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### API Endpoints Specification

#### 1. Authentication APIs

**POST /api/auth/login**
- **Purpose**: Authenticate user and obtain access token
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
  ```
- **CLI Usage**: Store token in `~/.mujarrad/credentials.json`

**POST /api/auth/refresh**
- **Purpose**: Refresh expired access token
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
  ```
- **Response**: Same as /login

**POST /api/auth/logout**
- **Purpose**: Invalidate tokens
- **Headers**: `Authorization: Bearer <token>`

#### 2. Space APIs

**GET /api/spaces**
- **Purpose**: List user's spaces
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**:
  - `page` (optional, default: 0)
  - `size` (optional, default: 20)
- **Response**:
  ```json
  {
    "spaces": [
      {
        "id": "uuid",
        "name": "My Space",
        "slug": "my-space",
        "templateId": "uuid or null",
        "createdAt": "2025-10-09T10:00:00Z",
        "updatedAt": "2025-10-09T15:30:00Z"
      }
    ],
    "totalPages": 5,
    "totalElements": 100
  }
  ```

**POST /api/spaces**
- **Purpose**: Create new space
- **Request Body**:
  ```json
  {
    "name": "My New Space",
    "slug": "my-new-space",
    "templateId": "uuid or null"
  }
  ```
- **Response**: Created space object with id

**GET /api/spaces/{spaceId}**
- **Purpose**: Get space details
- **Response**: Full space object with metadata

**DELETE /api/spaces/{spaceId}**
- **Purpose**: Delete space (soft delete)
- **Response**: 204 No Content

#### 3. Template APIs

**GET /api/templates**
- **Purpose**: List available space templates
- **Query Params**:
  - `category` (optional): filter by category
- **Response**:
  ```json
  {
    "templates": [
      {
        "id": "uuid",
        "name": "Business Model Canvas",
        "slug": "business-model-canvas",
        "category": "business-strategy",
        "version": "1.0.0",
        "description": "Osterwalder's Business Model Canvas framework",
        "componentsCount": 9
      }
    ]
  }
  ```

**POST /api/spaces/clone-from-template**
- **Purpose**: Create space from template
- **Request Body**:
  ```json
  {
    "templateId": "uuid",
    "spaceName": "My Startup",
    "spaceSlug": "my-startup"
  }
  ```
- **Response**: Created space with structure

#### 4. Upload APIs

**POST /api/spaces/{spaceId}/upload/init**
- **Purpose**: Initialize upload session
- **Request Body**:
  ```json
  {
    "totalFiles": 150,
    "totalSize": 5242880,
    "vaultName": "MyVault"
  }
  ```
- **Response**:
  ```json
  {
    "uploadSessionId": "uuid",
    "batchSize": 50
  }
  ```

**POST /api/spaces/{spaceId}/upload/nodes**
- **Purpose**: Upload batch of nodes (notes/folders)
- **Request Body**:
  ```json
  {
    "uploadSessionId": "uuid",
    "nodes": [
      {
        "nodeType": "REGULAR",
        "title": "My Note",
        "slug": "my-note",
        "content": "# My Note\n\nContent here...",
        "localPath": "folder/My Note.md",
        "fileHash": "sha256:abc123..."
      },
      {
        "nodeType": "CONTEXT",
        "title": "Projects",
        "slug": "projects",
        "localPath": "Projects/"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "created": [
      {
        "localPath": "folder/My Note.md",
        "nodeId": "uuid",
        "slug": "my-note"
      }
    ],
    "errors": []
  }
  ```

**POST /api/spaces/{spaceId}/upload/canvas**
- **Purpose**: Upload canvas with normalized visual data
- **Request Body**:
  ```json
  {
    "uploadSessionId": "uuid",
    "canvasNode": {
      "nodeType": "CONTEXT",
      "title": "Business Model Canvas",
      "slug": "business-model-canvas",
      "localPath": "Business Model Canvas.canvas"
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
        "visualProperties": {
          "x": 100,
          "y": 200,
          "width": 400,
          "height": 300,
          "color": "1"
        }
      }
    ],
    "canvasEdges": [
      {
        "sourceNodeSlug": "value-propositions",
        "targetNodeSlug": "customer-segments",
        "visualProperties": {
          "fromSide": "right",
          "toSide": "left",
          "fromEnd": "arrow",
          "toEnd": "none"
        }
      }
    ]
  }
  ```
- **Response**: Created canvas node, mapping, and node mappings

**POST /api/spaces/{spaceId}/upload/attributes**
- **Purpose**: Upload wikilinks and relationships
- **Request Body**:
  ```json
  {
    "uploadSessionId": "uuid",
    "attributes": [
      {
        "sourceNodeSlug": "note-a",
        "targetNodeSlug": "note-b",
        "attributeType": "LINK"
      }
    ]
  }
  ```

**POST /api/spaces/{spaceId}/upload/complete**
- **Purpose**: Finalize upload session
- **Request Body**:
  ```json
  {
    "uploadSessionId": "uuid"
  }
  ```
- **Response**:
  ```json
  {
    "totalNodesCreated": 150,
    "totalAttributesCreated": 89,
    "totalMappingsCreated": 1,
    "success": true
  }
  ```

**POST /api/spaces/{spaceId}/nodes/exists-by-hash**
- **Purpose**: Check which files already exist by hash (for upload resume)
- **Request Body**:
  ```json
  {
    "fileHashes": [
      {"filePath": "note1.md", "hash": "sha256:abc123..."},
      {"filePath": "note2.md", "hash": "sha256:def456..."}
    ]
  }
  ```
- **Response**:
  ```json
  {
    "existingHashes": ["sha256:abc123..."],
    "missingHashes": ["sha256:def456..."]
  }
  ```
- **Note**: Enables stateless upload resume via hash comparison

#### 5. Clone APIs

**GET /api/spaces/{spaceId}/export**
- **Purpose**: Export space structure for cloning
- **Response**:
  ```json
  {
    "space": {
      "id": "uuid",
      "name": "My Space",
      "slug": "my-space",
      "templateId": "uuid or null"
    },
    "nodes": [
      {
        "id": "uuid",
        "nodeType": "REGULAR",
        "title": "My Note",
        "slug": "my-note",
        "content": "# My Note\n\n...",
        "parentPath": "folder/"
      }
    ],
    "mappings": [
      {
        "nodeId": "uuid",
        "configuration": {"zoom": 1.0}
      }
    ],
    "nodeMappings": [
      {
        "mappingNodeId": "uuid",
        "containedNodeId": "uuid",
        "metadata": {
          "x": 100,
          "y": 200,
          "width": 400,
          "height": 300,
          "color": "1"
        }
      }
    ],
    "attributes": [
      {
        "sourceNodeId": "uuid",
        "targetNodeId": "uuid",
        "attributeType": "LINK",
        "properties": {}
      }
    ]
  }
  ```
- **Note**: CLI reconstructs Obsidian vault from this data

**GET /api/spaces/{spaceId}/export/incremental**
- **Purpose**: Export only changes since last sync
- **Query Params**:
  - `since`: ISO timestamp of last sync
- **Response**: Same structure as /export but only changed entities

#### 6. Sync APIs

**POST /api/spaces/{spaceId}/sync/init**
- **Purpose**: Initialize sync session
- **Request Body**:
  ```json
  {
    "lastSyncTimestamp": "2025-10-09T10:00:00Z",
    "localCommitHash": "abc123def456"
  }
  ```
- **Response**:
  ```json
  {
    "syncSessionId": "uuid",
    "hasRemoteChanges": true,
    "hasLocalChanges": true
  }
  ```

**POST /api/spaces/{spaceId}/sync/push**
- **Purpose**: Push local changes to Mujarrad
- **Request Body**:
  ```json
  {
    "syncSessionId": "uuid",
    "changes": [
      {
        "nodeId": "uuid",
        "operation": "UPDATE",
        "content": "# Updated content",
        "gitCommitHash": "abc123",
        "gitCommitMessage": "Updated note",
        "gitCommitAuthor": "John Doe",
        "gitCommitTimestamp": "2025-10-09T15:30:00Z"
      }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "versionsCreated": 5,
    "conflicts": []
  }
  ```

**GET /api/spaces/{spaceId}/sync/pull**
- **Purpose**: Pull remote changes
- **Query Params**:
  - `syncSessionId`: uuid
- **Response**: Changes to apply locally

**POST /api/spaces/{spaceId}/sync/complete**
- **Purpose**: Finalize sync session
- **Request Body**:
  ```json
  {
    "syncSessionId": "uuid",
    "newSyncTimestamp": "2025-10-09T16:00:00Z"
  }
  ```

#### 7. Version History APIs

**GET /api/nodes/{nodeId}/versions**
- **Purpose**: Get version history for a node
- **Response**:
  ```json
  {
    "versions": [
      {
        "id": "uuid",
        "versionNumber": 5,
        "content": "...",
        "gitCommitHash": "abc123",
        "createdBy": "user-uuid",
        "createdAt": "2025-10-09T16:30:00Z"
      }
    ]
  }
  ```

**GET /api/nodes/{nodeId}/versions/{versionNumber}**
- **Purpose**: Get specific version content

#### 8. Sharing APIs

**POST /api/spaces/{spaceId}/share**
- **Purpose**: Share space with user
- **Request Body**:
  ```json
  {
    "userEmail": "colleague@example.com",
    "role": "MEMBER"
  }
  ```

**GET /api/spaces/{spaceId}/members**
- **Purpose**: List space members

### CLI Requirements

#### Authentication Management

- **FR-CLI-001**: CLI MUST store authentication tokens securely in `~/.mujarrad/credentials.json` with file permissions 600
- **FR-CLI-002**: CLI MUST automatically refresh tokens when expired using refresh token
- **FR-CLI-003**: CLI MUST prompt user for credentials if no valid token exists
- **FR-CLI-004**: CLI MUST support multiple space authentication profiles

#### File System Operations

- **FR-CLI-005**: CLI MUST scan local directory recursively to find all `.md` and `.canvas` files
- **FR-CLI-006**: CLI MUST parse markdown frontmatter and extract metadata
- **FR-CLI-007**: CLI MUST parse wikilink syntax `[[Target]]` to create attribute mappings
- **FR-CLI-008**: CLI MUST parse canvas JSON files and decompose into normalized API requests
- **FR-CLI-009**: CLI MUST embed hidden metadata (UUIDs) in markdown files as HTML comments
- **FR-CLI-010**: CLI MUST validate file encoding (UTF-8) before upload

#### Git Integration

- **FR-CLI-011**: CLI MUST initialize git repository in cloned space directory
- **FR-CLI-012**: CLI MUST create git commits for all cloned files
- **FR-CLI-013**: CLI MUST use `git log` to detect file changes since last sync
- **FR-CLI-014**: CLI MUST use `git diff` to extract changed content
- **FR-CLI-015**: CLI MUST store git commit metadata (hash, author, message, timestamp) in sync requests

#### API Communication

- **FR-CLI-016**: CLI MUST use batched requests for large uploads (batch size from backend response)
- **FR-CLI-017**: CLI MUST implement retry logic with exponential backoff for failed API requests
- **FR-CLI-018**: CLI MUST handle HTTP status codes appropriately (401 re-auth, 429 rate limit, 5xx retry)
- **FR-CLI-019**: CLI MUST show progress indicators for long-running operations (upload, clone, sync)
- **FR-CLI-020**: CLI MUST validate API responses and handle errors gracefully

#### Local Caching

- **FR-CLI-021**: CLI MUST cache space structure locally in `~/.mujarrad/cache/{space-slug}/`
- **FR-CLI-022**: CLI MUST store last sync timestamp locally for incremental sync
- **FR-CLI-023**: CLI MUST store node UUID → file path mappings for quick lookup

#### Error Handling

- **FR-CLI-024**: CLI MUST rollback local changes if sync fails (using git reset)
- **FR-CLI-025**: CLI MUST provide clear error messages with actionable remediation steps
- **FR-CLI-026**: CLI MUST log all API requests/responses to `~/.mujarrad/logs/` for debugging
- **FR-CLI-027**: CLI MUST detect and report conflicts (concurrent edits) to user

### API Response Standards

All APIs MUST follow these standards:

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-10-09T16:00:00Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "SPACE_NOT_FOUND",
    "message": "Space with slug 'my-space' not found",
    "details": {},
    "timestamp": "2025-10-09T16:00:00Z"
  }
}
```

**Pagination**:
```json
{
  "data": [ ... ],
  "page": 0,
  "size": 20,
  "totalPages": 5,
  "totalElements": 100
}
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a 1000-file vault (with mixed notes, folders, and canvases) in under 5 minutes
- **SC-002**: 100% preservation of canvas visual layout with position accuracy within 1 pixel when cloning space back to Obsidian
- **SC-003**: Sync operation detects 99% of file changes within 10 seconds of Git commit
- **SC-004**: Zero data loss during upload/sync operations (content, metadata, relationships)
- **SC-005**: 95% of users successfully clone space on first attempt without errors or manual intervention
- **SC-006**: Template-based space creation completes in under 30 seconds for templates with up to 50 nodes
- **SC-007**: AI models can parse template structure and contextual map in under 2 seconds
- **SC-008**: Bidirectional sync maintains 100% consistency between local Obsidian vault and Mujarrad space
- **SC-009**: System handles vaults with up to 10,000 files without performance degradation
- **SC-010**: Wikilink resolution accuracy of 99% for all supported link formats (standard, nested paths, aliases)
- **SC-011**: Canvas-to-file conversion creates valid markdown files with proper metadata for 100% of canvas nodes
- **SC-012**: Auto-generated folder structures reduce manual organization effort by 80% for unstructured vaults

---

## Requirements

### Functional Requirements

#### Obsidian to Mujarrad Mapping

- **FR-001**: System MUST map each Obsidian note (.md file) to a Mujarrad Node entity with nodeType=REGULAR
- **FR-002**: System MUST map each Obsidian folder to a Mujarrad Node entity with nodeType=CONTEXT
- **FR-003**: System MUST map each Obsidian Canvas file (.canvas) to a Mujarrad Node entity with nodeType=CONTEXT
- **FR-004**: System MUST map the Obsidian vault root directory to a Mujarrad Space entity
- **FR-005**: System MUST map Obsidian wikilinks `[[Target]]` to Mujarrad Attribute entities with appropriate relationship type
- **FR-006**: System MUST map markdown standard links `[text](target.md)` to Mujarrad Attribute entities
- **FR-007**: System MUST map canvas node wire connections (edges) to Mujarrad Attribute entities between corresponding Mujarrad Nodes
- **FR-008**: System MUST store canvas visual metadata in normalized form: per-node properties (x, y, width, height, color) in `NodeMapping.metadata` JSONB, canvas-wide config in `Mapping.configuration` JSONB
- **FR-009**: System MUST create a NodeMapping entry for each canvas node linking the canvas CONTEXT Node to the referenced note Node, storing visual properties in `metadata` JSONB
- **FR-009a**: System MUST ensure that the note file referenced by each canvas node exists as a separate REGULAR-type Mujarrad Node
- **FR-009b**: System MUST create a Mapping entity for each canvas Node to hold canvas-wide configuration and ordering strategy
- **FR-010**: System MUST establish CONTAINS relationships (via Attributes) between folder CONTEXT Nodes and their child note Nodes
- **FR-011**: System MUST establish CONTAINS relationships between parent folder CONTEXT Nodes and subfolder CONTEXT Nodes

#### Metadata Preservation & Mapping

- **FR-012**: System MUST embed Mujarrad Node UUID in each Obsidian note file as hidden metadata
- **FR-013**: System MUST embed Mujarrad Space UUID in vault configuration as hidden metadata
- **FR-013a**: System MUST upload `.obsidian` folder contents (plugins, themes, settings, space layout) to Space.properties JSONB field under "obsidianConfig" key during vault upload. System MUST recreate `.obsidian` folder structure from Space.properties during clone operation to maintain consistent Obsidian configuration across devices
- **FR-014**: System MUST decompose Canvas JSON structure into normalized database entities: Node (canvas container), Mapping (canvas config), NodeMappings (visual layout per node), Attributes (edges with visual properties)
- **FR-015**: System MUST store all canvas node visual properties in `NodeMapping.metadata` as JSONB: {canvasNodeId, x, y, width, height, color, fileReference}
- **FR-016**: Hidden metadata MUST use HTML comments format (`<!-- mujarrad-node-id: uuid -->`) that does not render visibly in Obsidian reading mode, with a centralized mapping file acting as database in user-readable format. System MUST use serialization/hidden code approach to prevent user mistakes and MUST preserve existing Obsidian frontmatter when present.
- **FR-017**: System MUST validate metadata integrity before sync operations (UUID exists, space matches, no corruption)

#### Mujarrad to Obsidian Mapping (Clone Operation)

- **FR-018**: System MUST recreate folder hierarchy by traversing CONTEXT-type Mujarrad Nodes with CONTAINS relationships
- **FR-019**: System MUST generate Obsidian note files (.md) from REGULAR-type Mujarrad Nodes with embedded UUID metadata
- **FR-020**: System MUST generate .canvas files from CONTEXT-type Mujarrad Nodes by querying associated Mapping, NodeMappings, and Attributes
- **FR-021**: System MUST reconstruct canvas node positions, dimensions, colors from `NodeMapping.metadata` and canvas-wide config from `Mapping.configuration`
- **FR-022**: System MUST convert Attribute relationships back to Obsidian wikilinks in note content
- **FR-022a**: System MUST recreate canvas nodes with their "file" attributes linking to the appropriate note files when generating .canvas files
- **FR-023**: System MUST initialize Git repository in cloned vault directory immediately after clone completion
- **FR-024**: System MUST create initial Git commit with all cloned note and canvas files

#### Synchronization & Version Control

- **FR-025**: System MUST detect note file changes by comparing Git commit history since last sync
- **FR-026**: System MUST create new NodeVersion entity for each modified note during sync
- **FR-027**: System MUST link NodeVersion entities to corresponding Git commit hashes by storing the hash in the properties JSONB field
- **FR-028**: System MUST update Node.currentVersion reference to latest NodeVersion after sync
- **FR-029**: System MUST preserve complete Git commit metadata (hash, author, timestamp, message) in NodeVersion.properties JSONB field
- **FR-030**: System MUST support incremental sync (only changed note files, not entire vault)
- **FR-031**: System MUST handle new note file creation during sync by creating new REGULAR-type Mujarrad Node entities with metadata injection
- **FR-032**: System MUST handle note file deletion during sync by soft deleting nodes in Mujarrad (marking as deleted/archived while preserving in database)

#### Canvas-Specific Requirements

- **FR-033**: System MUST support nested canvas references (canvas node "file" attribute pointing to another .canvas file)
- **FR-034**: System MUST preserve canvas color codes (1=red, 2=orange, 3=yellow, 4=green, 5=blue, 6=purple) in `NodeMapping.metadata` for each canvas node
- **FR-035**: System MUST recognize that every canvas node has a "file" attribute pointing to a note file
- **FR-036**: System MUST create NodeMapping entries (not Attributes) linking canvas CONTEXT Node to each referenced note's Mujarrad Node, storing visual layout in metadata
- **FR-037**: System MUST reconstruct canvas edges as visual connections from Attributes, retrieving edge visual properties from `Attribute.properties` JSONB
- **FR-038**: System MUST preserve canvas layout zones and semantic groupings defined by position and color
- **FR-038a**: System MUST store canvas edge visual properties in `Attribute.properties` JSONB: {fromNode, toNode, fromSide, toSide, fromEnd, toEnd, color, label}

#### Authentication & Authorization

- **FR-040**: CLI tool MUST authenticate users before allowing upload/sync/clone operations. System MUST support multiple authentication methods (API token, username/password, OAuth 2.0) with API token being the only available method in first release.
- **FR-041**: System MUST verify user has space access permissions before clone operation
- **FR-042**: System MUST verify user has write permissions before sync/upload operations
- **FR-043**: System MUST associate all created/modified entities with authenticated user (createdBy, modifiedBy fields)

#### Data Integrity & Validation

- **FR-044**: System MUST validate Canvas JSON structure before creating CONTEXT-type Mujarrad Nodes
- **FR-045**: System MUST validate all file references in canvas nodes (via "file" attribute) exist in vault before upload
- **FR-046**: System MUST validate space slug uniqueness before clone operation creates local directory
- **FR-047**: System MUST prevent sync if metadata UUID does not match existing space Mujarrad Nodes
- **FR-048**: System MUST validate note file encoding and reject unsupported formats. UTF-8 encoding is REQUIRED for all markdown files. System MUST reject files with other encodings (e.g., UTF-16, ISO-8859-1, Windows-1252) with a clear error message indicating the file path and detected encoding, instructing users to convert to UTF-8 before upload.

#### Error Handling & Recovery

- **FR-049**: System MUST provide clear error messages when metadata is missing or corrupted
- **FR-050**: System MUST rollback partial uploads if any note file fails during batch upload
- **FR-051**: System MUST provide resume capability for interrupted uploads using hash-based comparison. When resuming an interrupted upload, CLI MUST compute SHA-256 file hashes for all files in the vault and query the backend API (via new endpoint `/api/spaces/{spaceId}/nodes/exists-by-hash`) to determine which files have already been uploaded. Backend MUST return list of existing file hashes. CLI MUST skip files that already exist (matching hash) and upload only remaining files. This stateless approach requires no backend session persistence but involves hash computation overhead on resume. CLI MUST display progress showing "Checking {X} files against existing nodes..." followed by "Resuming upload: {Y} files remaining".
- **FR-052**: System MUST handle Git initialization failures by cleaning up partial clone and reporting error
- **FR-053**: System MUST detect and report broken wikilinks during upload without failing entire operation. Broken wikilinks (links to non-existent files) MUST be logged to `~/.mujarrad/logs/upload-{session-id}.log` with the following information: (1) source file path, (2) line number, (3) broken link target, (4) timestamp. At upload completion, CLI MUST display a summary showing total broken links found and log file location. The system MUST create the Attribute relationship anyway (preserving the user's intent), but mark it with a "broken" flag in Attribute.properties JSONB for potential future resolution.

#### Template System Requirements

- **FR-054**: System MUST support creation and storage of SpaceTemplate entities containing pre-defined knowledge graph structures
- **FR-055**: System MUST allow users to list available space templates via CLI command
- **FR-056**: System MUST enable users to clone a space from a template, creating a new Space instance with template structure
- **FR-057**: System MUST apply clone requirements FR-018 to FR-024 when instantiating a space from a template (folder hierarchy, note generation, canvas reconstruction, wikilink conversion, Git initialization)
- **FR-058**: System MUST include template-specific placeholder content in generated notes when cloning from template
- **FR-059**: System MUST copy SpaceTemplate source structure including ContextTemplates to new Space instance during template clone
- **FR-060**: Template clone MUST preserve canvas visual configuration (colors, positions, sizes) per FR-021 visual property reconstruction requirements
- **FR-061**: System MUST generate template configuration file in cloned Obsidian vault indicating space follows template
- **FR-062**: System MUST store template reference metadata in Space entity linking to source SpaceTemplate
- **FR-063**: System MUST include template configuration file during space clone to Obsidian vault
- **FR-064**: System MUST provide API/interface for AI models to retrieve template structure as contextual map
- **FR-065**: System MUST maintain template reference when user syncs changes from template-based space
- **FR-066**: System MUST allow structural deviations from template while preserving template reference metadata. Users MAY freely add new nodes, remove placeholder nodes, modify node content, add/remove relationships, and reorganize canvas layouts after cloning from a template. The template reference (Space.templateId) MUST persist regardless of modifications, enabling AI models to use the original template structure as a contextual map while understanding that the space content has evolved. The system MUST NOT enforce template constraints after initial clone - templates serve as starting points, not rigid schemas.
- **FR-067**: SpaceTemplate MUST contain one or more ContextTemplate entities representing frameworks/patterns
- **FR-068**: ContextTemplate MUST define canvas layout structure, node types, and semantic relationship types
- **FR-069**: Template configuration file MUST be in structured format (JSON or YAML) containing template metadata and structure definition
- **FR-070**: System MUST validate template structure before allowing clone operation
- **FR-071**: System MUST support template metadata including name, description, category, version, and framework type. Template versions follow semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0). MVP does NOT support version update notifications or automatic migration - templates are immutable after space creation. Users wanting latest template version must create new space from updated template and manually migrate content. Future versions will support passive sync notifications and explicit update check commands with conflict resolution logic.

#### Canvas-to-File Conversion

- **FR-072**: System MUST detect canvas nodes that lack associated file references during upload
- **FR-073**: System MUST generate markdown files for canvas nodes without file references
- **FR-074**: Generated files MUST be created with title derived from canvas node text content. System MUST extract the first line of canvas node text, sanitize it for filesystem compatibility (remove/replace invalid characters: `/\:*?"<>|`), and append `.md` extension. If canvas node text is empty or contains only whitespace, system MUST fallback to canvas node ID with prefix (format: `canvas-node-{id}.md`). Examples: node text "Key Partners" → "Key Partners.md", empty node → "canvas-node-a3f2e1b4.md". If filename collision occurs, append UUID suffix per conflict resolution strategy.
- **FR-075**: Generated files MUST contain embedded Mujarrad node UUID metadata in hidden format
- **FR-076**: System MUST create REGULAR-type Mujarrad Nodes for each generated file
- **FR-077**: System MUST create NodeMapping entries linking canvas CONTEXT node to generated file nodes with visual properties preserved in metadata
- **FR-078**: Generated files MUST include hidden Mujarrad metadata as HTML comment at the top, followed by the canvas node's full text content as the file body. Format: `<!-- mujarrad-node-id: {uuid} -->\n<!-- mujarrad-space-id: {uuid} -->\n<!-- mujarrad-generated-from: canvas-node-{canvasNodeId} -->\n\n{canvas node text content}`. If canvas node contains no text, file body remains empty (contains only metadata comments). This approach preserves all canvas node information while maintaining metadata tracking.
- **FR-079**: System MUST update canvas JSON to include file references for newly generated files
- **FR-080**: System MUST preserve all visual properties (x, y, width, height, color) for canvas nodes in NodeMapping.metadata JSONB
- **FR-081**: System MUST maintain canvas-to-node mappings bidirectionally (canvas node ID ↔ generated file UUID)

#### Auto-Context (Folder) Creation

- **FR-082**: System MUST analyze uploaded files to determine organizational structure needs
- **FR-083**: System MUST create CONTEXT-type Mujarrad Nodes representing folders when uploaded files lack folder structure
- **FR-084**: System MUST establish CONTAINS relationships (via Attributes) between auto-generated folder nodes and contained file nodes
- **FR-085**: Auto-generated folder nodes MUST have appropriate slugs and titles based on content analysis or naming strategy [NEEDS CLARIFICATION: Folder naming strategy - AI-generated, user prompt, or pattern-based?]
- **FR-086**: System MUST support hierarchical folder creation (folders within folders) when organizational depth is needed
- **FR-087**: System MUST recreate auto-generated folder hierarchy in cloned Obsidian vault as actual directories
- **FR-088**: System MUST provide option to enable/disable auto-context creation [NEEDS CLARIFICATION: Default enabled or disabled?]
- **FR-089**: System MUST allow users to review and modify suggested folder structure before finalizing upload [NEEDS CLARIFICATION: Interactive mode required?]

#### Metadata Provisioning for Generated Content

- **FR-090**: All generated files MUST contain complete Mujarrad node metadata: node UUID, space UUID, node type, creation timestamp
- **FR-091**: All generated CONTEXT nodes MUST contain provenance metadata indicating auto-generation vs manual creation
- **FR-092**: Generated files MUST include reference to originating canvas node ID when created from canvas-to-file conversion
- **FR-093**: System MUST embed metadata in non-visible format compatible with Obsidian rendering (format determined by FR-016 clarification)
- **FR-094**: System MUST maintain metadata integrity through sync operations for auto-generated content
- **FR-095**: System MUST track generation method in node metadata (canvas-to-file, auto-context, manual) for audit purposes

#### Integration of Generated Content

- **FR-096**: Canvas-to-file conversion MUST integrate with existing upload workflow defined in earlier requirements
- **FR-097**: Auto-generated files MUST support all existing sync operations (edit detection, version control, Git integration)
- **FR-098**: Auto-generated contexts MUST support all existing clone operations (folder recreation, hierarchy preservation)
- **FR-099**: Generated content MUST be compatible with template system (space templates can include auto-generated placeholders)
- **FR-100**: System MUST maintain backward compatibility with existing workflows that don't use auto-generation features

### Non-Functional Requirements

#### Performance Requirements

- **NFR-001**: Upload operation MUST handle 1000-file vaults within 5 minutes under these baseline conditions: (1) average file size 50KB, (2) network upload speed ≥10 Mbps, (3) backend API response time <500ms per batch request, (4) client machine with 4GB RAM and modern CPU. Performance may degrade with slower networks, larger files (>200KB average), or resource-constrained environments.
- **NFR-002**: Clone operation MUST complete within 3 minutes for spaces containing 1000 nodes
- **NFR-003**: Sync operation MUST detect and process file changes within 10 seconds of Git commit
- **NFR-004**: API response time MUST be under 500ms for 95% of requests (excluding large file transfers)
- **NFR-005**: System MUST support concurrent sync operations from up to 10 users per space without deadlocks

#### Scalability Requirements

- **NFR-006**: System MUST handle vaults containing up to 10,000 files without performance degradation
- **NFR-007**: System MUST support canvases with up to 500 nodes per canvas
- **NFR-008**: System MUST handle deeply nested folder structures (up to 20 levels deep)
- **NFR-009**: System MUST process wikilinks in notes containing up to 1000 links per note
- **NFR-010**: Database MUST efficiently query NodeMapping and Mapping tables for canvases with 100+ nodes

#### Reliability Requirements

- **NFR-011**: Upload/sync operations MUST have transactional integrity (all-or-nothing, with rollback on failure)
- **NFR-012**: System MUST maintain 99.9% uptime for API endpoints
- **NFR-013**: Data loss probability MUST be less than 0.01% across all operations
- **NFR-014**: System MUST automatically retry failed API requests up to 3 times with exponential backoff
- **NFR-015**: Git repository initialization MUST succeed or fail gracefully with complete cleanup on failure

#### Security Requirements

- **NFR-016**: Authentication tokens MUST be stored with file permissions 600 (user-read/write only)
- **NFR-017**: All API communication MUST use HTTPS/TLS 1.2 or higher
- **NFR-018**: User credentials MUST NOT be stored in plaintext anywhere in the system
- **NFR-019**: Hidden metadata UUIDs MUST be cryptographically validated to prevent tampering
- **NFR-020**: System MUST enforce space-level access control (users cannot access spaces they don't own/share)

#### Usability Requirements

- **NFR-021**: CLI MUST provide clear progress indicators for operations taking longer than 5 seconds
- **NFR-022**: Error messages MUST include actionable remediation steps (not just error codes)
- **NFR-023**: CLI MUST support --help flag for all commands with usage examples
- **NFR-024**: System MUST log all operations to `~/.mujarrad/logs/` with timestamps and request IDs for debugging
- **NFR-025**: Installation process MUST complete in under 2 minutes via npm/pip/npx

#### Compatibility Requirements

- **NFR-026**: CLI MUST support macOS, Linux, and Windows operating systems
- **NFR-027**: System MUST support Obsidian vault format versions 1.0 and above
- **NFR-028**: Markdown files MUST be UTF-8 encoded (system rejects other encodings with clear error)
- **NFR-029**: Git version MUST be 2.20 or higher for proper repository management
- **NFR-030**: Node.js runtime MUST be version 18 or higher (for CLI implementation)

#### Data Integrity Requirements

- **NFR-031**: Canvas visual property preservation MUST have position accuracy within ±1 pixel
- **NFR-032**: Wikilink resolution accuracy MUST be 99% or higher for all supported link formats
- **NFR-033**: System MUST validate all JSON structures (canvas files, API responses) before processing
- **NFR-034**: Hidden metadata MUST survive common Obsidian editing operations (move, rename, copy/paste)
- **NFR-035**: System MUST detect and reject corrupted or invalid metadata with descriptive error messages

### Key Entities

- **Obsidian Vault**: A directory containing note files (.md), folders, canvas files (.canvas), and Obsidian configuration; maps to Mujarrad Space

- **Obsidian Note**: Individual .md files containing markdown content, optional frontmatter, and wikilinks; maps to Mujarrad Node (nodeType=REGULAR)

- **Canvas File**: .canvas files (JSON format) containing visual graph structures; maps to normalized entities: Node (CONTEXT type as container), Mapping (canvas-wide config), NodeMappings (per-node visual layout), Attributes (edges with visual properties)

- **Folder**: Directory structure organizing notes and subfolders; maps to Mujarrad Node (nodeType=CONTEXT) with CONTAINS relationships to children

- **Canvas Node**: Individual element within a canvas. Every canvas node references a note file via NodeMapping entry. Visual properties (x, y, width, height, color, canvasNodeId) stored in `NodeMapping.metadata` JSONB field.

- **Canvas Edge**: Connection/wire between canvas nodes; maps to Attribute entity with sourceNode, targetNode, and visual properties in `Attribute.properties` JSONB {fromSide, toSide, fromEnd, toEnd, color, label}

- **Wikilink**: Obsidian's `[[Target]]` link syntax within note content; maps to Attribute relationship between Mujarrad Nodes

- **Hidden Metadata**: Embedded UUID mappings in note files linking to Mujarrad entities; stored in non-visible format

- **Git Commit**: Version control snapshot of file changes; corresponds to NodeVersion entities

- **Visual Properties**: Canvas aesthetic data stored in normalized form: per-node properties (x, y, width, height, color) in `NodeMapping.metadata`, canvas-wide settings (zoom, pan, etc.) in `Mapping.configuration`, edge visuals in `Attribute.properties`

- **Folder Hierarchy**: Tree structure of nested folders; represented by CONTEXT Nodes with CONTAINS Attributes forming parent-child relationships

- **Space Template** (MVP terminology for Space Template): A blueprint entity containing pre-defined knowledge graph structure including context templates, node structures, and relationship patterns. Serves as source for cloning new spaces and as contextual map for AI operations.

- **Context Template**: A reusable framework structure representing specific paradigms (e.g., Business Model Canvas, SWOT Analysis, Design Thinking). Contains canvas layout definition, placeholder nodes, semantic relationships, and visual configuration.

- **Template Configuration File**: JSON or YAML file stored in cloned Obsidian vault containing template metadata, structure definition, and reference to source SpaceTemplate. Enables AI models to understand space organization.

- **Template Reference Metadata**: Foreign key relationship in Space entity linking to source SpaceTemplate, indicating space follows specific knowledge graph structure. Preserved during sync operations even when content deviates from template.

- **Canvas Node Without File**: A canvas node element in Obsidian canvas JSON that lacks a "file" attribute reference; triggers file generation during upload

- **Generated File**: A markdown file automatically created by the system from a canvas node; contains placeholder content and embedded Mujarrad metadata

- **Auto-Generated Context**: A CONTEXT-type Mujarrad Node (representing a folder) automatically created by the system to organize uploaded files; includes CONTAINS relationships to child nodes

- **File-to-Node Metadata Mapping**: Hidden metadata embedded in generated markdown files linking local file to Mujarrad node UUID, space, and generation provenance

- **Canvas-to-File Conversion**: Process of detecting canvas nodes without files, generating corresponding markdown files, creating Mujarrad nodes, and establishing NodeMapping relationships

- **Auto-Context Creation**: Process of analyzing uploaded file collection, determining organizational structure, creating folder CONTEXT nodes, and establishing hierarchical CONTAINS relationships

- **Generation Provenance**: Metadata tracking how content was created (manual, canvas-to-file conversion, auto-context generation) for audit and management purposes

- **Mapping**: Entity that stores canvas-wide configuration for a CONTEXT-type Node representing a canvas. Contains configuration JSONB field with zoom level, viewport position, and other canvas-level settings. One Mapping per canvas Node.

- **NodeMapping**: Entity that links a canvas CONTEXT Node to the contained nodes it references, storing per-node visual properties. Contains metadata JSONB field with {canvasNodeId, x, y, width, height, color, fileReference}. Multiple NodeMappings per canvas (one per canvas node element).

- **Upload Session**: Temporary session entity tracking batch upload progress. Contains uploadSessionId, totalFiles, processedFiles, errors. Enables resumable uploads and batch processing coordination.

- **Sync Session**: Temporary session entity coordinating bidirectional sync operations. Contains syncSessionId, lastSyncTimestamp, localCommitHash, hasRemoteChanges, hasLocalChanges. Manages conflict detection and sync state.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed (Success Criteria ✅, User Scenarios ✅, NFRs ✅)

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain - **14 consolidated clarifications** (reduced from 26)
- [x] Requirements are testable and unambiguous (except marked items)
- [x] Success criteria are measurable and technology-agnostic
- [x] All acceptance scenarios are defined with P1/P2/P3 prioritization
- [x] Edge cases are identified
- [x] Scope is clearly bounded (backend API requirements; CLI tool is separate project; template system; canvas-to-file; auto-context)
- [x] Dependencies and assumptions identified (Git, Obsidian format knowledge, separate CLI tool, template entities, content generation)

### Feature Readiness
- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows with independent test descriptions
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification
- [x] Non-functional requirements defined (performance, scalability, security, usability, compatibility)

### Identified Clarifications Needed (10 Remaining - 4 Resolved on 2025-10-10)

**✅ RESOLVED** (Session 2025-10-10):
- ~~**Supported File Encodings** (FR-048)~~ → UTF-8 only (clarified)
- ~~**Performance Baseline Assumptions** (NFR-001)~~ → 50KB avg, 10Mbps, <500ms API (clarified)
- ~~**Broken Wikilink Reporting** (FR-053)~~ → Log format specified (clarified)
- ~~**Template Structural Deviations** (FR-066)~~ → Free deviation allowed (clarified)

**Critical (Blocks MVP)** - 3 remaining:
1. **Metadata Format Strategy** (FR-016) - HTML comments, YAML frontmatter, or combination approach; frontmatter preservation
2. **Conflict Resolution Policy** - Unified strategy for name conflicts, concurrent edits, file/canvas name collisions, generation conflicts, merge conflicts
3. **CLI Authentication Method** (FR-040) - API token, username/password, or OAuth

**High Priority (Affects P1/P2 Stories)** - 3 remaining:
4. **File Deletion Sync Behavior** - Soft delete/archive, explicit command, or prevent deletion
5. **Large Vault Handling** - Batch limits, progress indicators, resumable uploads
6. **Git Commit Metadata Storage** (FR-027, FR-029) - Commit hash storage location and metadata mapping in NodeVersion
7. **Upload Resume Mechanism** (FR-051) - Design for interrupted upload recovery

**Medium Priority (Affects P3/P4 Stories)** - 4 remaining:
8. **Template Versioning & Lifecycle** - Config modifications, update notifications, versioning metadata strategy
9. **Canvas Node File Naming** (FR-074) - Canvas ID, AI-generated titles, sequential numbers, or user pattern
10. **Generated File Placeholder Format** (FR-078) - Empty, template headers, or AI-generated outline
11. **File Clustering Algorithm** - AI categorization, filename patterns, manual tagging, or unsupervised clustering
12. **Auto-Context Default Setting** (FR-088) - Enabled or disabled by default
13. **Auto-Context Interactive Mode** (FR-089) - Require user review before upload finalization

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (with clarifications pending)

---

## Analysis of Sample Vault Structure

Based on analysis of `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad`:

### Observed Patterns

**Canvas Implementation:**
- Two root-level canvas files: `Business Model Canvas.canvas`, `Value Proposition Canvas.canvas`
- Canvas contains file-reference nodes pointing to markdown files
- Canvas contains nested canvas references (BMC embeds VPC as node)
- Visual metadata includes: x, y, width, height, color (1-6 mapping to semantic colors)
- No edges defined in sample canvases (edges array empty)

**Folder Structure:**
- Deep nesting: `Business Model/Product Lifecycle/1. Introduction/Value Preposition/...`
- Folders serve as organizational contexts
- Some folders contain markdown files, others contain subfolders

**Markdown Files:**
- Standard markdown with heading structure
- Wikilinks to other files: `[[Key Partners]]`, `[[Wider Docs/BMC Docs/Value Propositions]]`
- Frontmatter not observed in samples (but common in Obsidian)

**Special Files:**
- `Canvases Config.md`: Contains JSON configuration schemas documenting canvas aesthetics
- `.obsidian` folder: Obsidian configuration (plugins, settings, space layout) - synced as space metadata in Space.properties JSONB field to enable consistent setup across devices

**File Naming:**
- Spaces in filenames common: `Business Model Canvas - Overview.md`
- Special characters: hyphens, numbers, parentheses

### Mapping Implications

1. **Context Node Content Storage**: Canvas JSON must be stored verbatim in Node.content field for CONTEXT nodes representing canvases
2. **Canvas Color Semantics**: Color codes carry business meaning (red=partnerships, yellow=value prop, purple=financial) - must preserve exactly
3. **Nested Canvas Support**: System must handle canvas-within-canvas scenarios (VPC embedded in BMC)
4. **Path-Based Wikilinks**: Some wikilinks include folder paths - requires resolution logic
5. **Configuration Files**: `Canvases Config.md` represents documentation, not structural data - treat as regular markdown
6. **Large Canvases**: VPC has 6 nodes with extreme coordinates (x: -2621 to 4360, y: -2621 to 5362) - ensure JSONB handles large numbers

---