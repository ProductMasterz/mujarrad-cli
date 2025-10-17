# Data Model: Obsidian Mapper Integration

**Feature**: 007-obsidian-mapper-i | **Date**: 2025-10-11 | **Status**: ✅ Complete

## Overview

This document defines the data entities used by the Mujarrad CLI and their backend counterparts. The CLI consumes the backend REST API and does not directly access the database. All entity definitions here describe the backend data model that the CLI interacts with via API endpoints.

## Backend Entity Model

### Existing Entities

The following entities already exist in the Mujarrad backend and are referenced by the Obsidian Mapper Integration feature:

#### 1. Space

Represents a space container that holds nodes and attributes.

**Properties**:
- `id` (UUID): Primary key
- `slug` (String): URL-safe identifier (unique)
- `name` (String): Display name
- `description` (String): Optional description
- `ownerId` (UUID): Foreign key to User
- `createdAt` (Timestamp): Creation timestamp
- `updatedAt` (Timestamp): Last modification timestamp
- `deleted` (Boolean): Soft delete flag
- `archivedAt` (Timestamp): Archive timestamp

**Relationships**:
- `nodes` (One-to-Many → Node): Nodes contained in this space
- `mappings` (One-to-Many → Mapping): Canvas mappings in this space
- `uploadSessions` (One-to-Many → UploadSession): Upload sessions for this space
- `syncSessions` (One-to-Many → SyncSession): Sync sessions for this space

**API Endpoints**:
- `GET /api/spaces` - List spaces
- `POST /api/spaces` - Create space
- `GET /api/spaces/{spaceId}` - Get space details
- `DELETE /api/spaces/{spaceId}` - Delete space

---

#### 2. Node

Represents a single note, concept, or entity in the knowledge graph.

**Properties**:
- `id` (UUID): Primary key
- `slug` (String): URL-safe identifier (unique within space)
- `name` (String): Display name (extracted from filename or H1 heading)
- `content` (Text): Markdown content
- `spaceId` (UUID): Foreign key to Space
- `createdAt` (Timestamp): Creation timestamp
- `updatedAt` (Timestamp): Last modification timestamp
- `deleted` (Boolean): Soft delete flag
- `archivedAt` (Timestamp): Archive timestamp
- `properties` (JSONB): Flexible metadata storage

**JSONB Properties Structure**:
```json
{
  "obsidian": {
    "filepath": "Projects/Mujarrad/spec.md",
    "frontmatter": {
      "tags": ["project", "mujarrad"],
      "date": "2025-10-09"
    },
    "wikilinks": ["[[plan]]", "[[tasks]]"],
    "lastModifiedTimestamp": "2025-10-09T10:00:00Z",
    "sha256Hash": "abc123..."
  }
}
```

**Relationships**:
- `space` (Many-to-One → Space): Parent space
- `attributes` (One-to-Many → Attribute): Attributes (relationships) from this node
- `nodeMappings` (One-to-Many → NodeMapping): Canvas node mappings
- `versions` (One-to-Many → NodeVersion): Version history

**API Endpoints**:
- `GET /api/spaces/{spaceId}/nodes` - List nodes in space
- `POST /api/spaces/{spaceId}/nodes` - Create node
- `GET /api/spaces/{spaceId}/nodes/{nodeId}` - Get node details
- `PUT /api/spaces/{spaceId}/nodes/{nodeId}` - Update node
- `DELETE /api/spaces/{spaceId}/nodes/{nodeId}` - Delete node

---

#### 3. Attribute

Represents a relationship or edge between two nodes in the knowledge graph.

**Properties**:
- `id` (UUID): Primary key
- `sourceNodeId` (UUID): Foreign key to Node (source)
- `targetNodeId` (UUID): Foreign key to Node (target)
- `relationshipType` (String): Type of relationship (e.g., "wikilink", "canvas-edge")
- `createdAt` (Timestamp): Creation timestamp
- `updatedAt` (Timestamp): Last modification timestamp
- `deleted` (Boolean): Soft delete flag
- `properties` (JSONB): Flexible metadata storage

**JSONB Properties Structure**:
```json
{
  "canvas": {
    "fromSide": "right",
    "toSide": "left",
    "color": "3",
    "label": "connects to"
  }
}
```

**Relationships**:
- `sourceNode` (Many-to-One → Node): Source node
- `targetNode` (Many-to-One → Node): Target node

**API Endpoints**:
- `GET /api/spaces/{spaceId}/attributes` - List attributes in space
- `POST /api/spaces/{spaceId}/attributes` - Create attribute

---

### New Entities (Template System)

The following entities are NEW and required for the Template System feature (Phase 8):

#### 4. SpaceTemplate

Represents a reusable space structure that can be instantiated to create new spaces.

**Purpose**: Enable users to create template spaces from existing spaces and instantiate them to create new spaces with the same structure.

**Properties**:
- `id` (UUID): Primary key
- `creatorId` (UUID): Foreign key to User (template creator)
- `sourceSpaceId` (UUID): Foreign key to Space (template source)
- `name` (String): Template display name (e.g., "Business Model Canvas")
- `description` (String): Template description
- `tags` (String[]): Template tags for categorization (e.g., ["business", "strategy"])
- `isPublic` (Boolean): Whether template is publicly visible
- `usageCount` (Integer): Number of times template has been instantiated
- `createdAt` (Timestamp): Creation timestamp
- `updatedAt` (Timestamp): Last modification timestamp
- `deleted` (Boolean): Soft delete flag

**Relationships**:
- `creator` (Many-to-One → User): User who created the template
- `sourceSpace` (Many-to-One → Space): Space used as template source
- `contextTemplates` (One-to-Many → ContextTemplate): Context templates within this space template

**Validation Rules**:
- `name` must be 3-100 characters
- `description` must be 0-1000 characters
- `tags` array must have 0-10 tags, each 1-50 characters
- `sourceSpaceId` must reference an existing, non-deleted space
- `creatorId` must match authenticated user (security check)

**API Endpoints**:
- `GET /api/templates` - List space templates (filtered by tags, isPublic)
- `POST /api/templates` - Create template from space
- `GET /api/templates/{templateId}` - Get template details
- `DELETE /api/templates/{templateId}` - Delete template
- `POST /api/spaces/{spaceId}/instantiate` - Instantiate template

**Example**:
```json
{
  "id": "template-uuid-1",
  "creatorId": "user-uuid-1",
  "sourceSpaceId": "space-uuid-1",
  "name": "Business Model Canvas",
  "description": "9-block business model framework for strategy planning",
  "tags": ["business", "strategy", "canvas"],
  "isPublic": true,
  "usageCount": 42,
  "createdAt": "2025-10-09T10:00:00Z",
  "updatedAt": "2025-10-09T10:00:00Z",
  "deleted": false
}
```

---

#### 5. ContextTemplate

Represents a folder structure template within a space template. Used to preserve folder hierarchies when instantiating templates.

**Purpose**: Enable preservation of Obsidian folder structures (e.g., "Customer Segments/", "Value Propositions/") when cloning templates.

**Properties**:
- `id` (UUID): Primary key
- `spaceTemplateId` (UUID): Foreign key to SpaceTemplate
- `name` (String): Context/folder name (e.g., "Customer Segments")
- `path` (String): Full folder path (e.g., "/Business Model Canvas/Customer Segments")
- `description` (String): Optional description
- `createdAt` (Timestamp): Creation timestamp
- `updatedAt` (Timestamp): Last modification timestamp
- `deleted` (Boolean): Soft delete flag

**Relationships**:
- `spaceTemplate` (Many-to-One → SpaceTemplate): Parent space template

**Validation Rules**:
- `name` must be 1-100 characters
- `path` must be a valid Unix-style path (no backslashes)
- `path` must not contain ".." (path traversal prevention)
- `spaceTemplateId` must reference an existing, non-deleted SpaceTemplate

**API Endpoints**:
- Context templates are nested within SpaceTemplate responses (no separate endpoints)
- Retrieved via `GET /api/templates/{templateId}` (includes `contextTemplates` array)

**Example**:
```json
{
  "id": "context-template-uuid-1",
  "spaceTemplateId": "template-uuid-1",
  "name": "Customer Segments",
  "path": "/Business Model Canvas/Customer Segments",
  "description": "Who are the different groups of people or organizations your enterprise aims to reach and serve?",
  "createdAt": "2025-10-09T10:00:00Z",
  "updatedAt": "2025-10-09T10:00:00Z",
  "deleted": false
}
```

---

### New Entities (Upload/Sync Sessions)

#### 6. UploadSession

Tracks batch upload progress for resumability (FR-008 to FR-012).

**Properties**:
- `id` (UUID): Primary key
- `spaceId` (UUID): Foreign key to Space
- `totalFiles` (Integer): Total number of files to upload
- `processedFiles` (Integer): Number of files successfully processed
- `failedFiles` (Integer): Number of files that failed
- `status` (Enum): Session status (`IN_PROGRESS`, `COMPLETED`, `FAILED`)
- `errorLog` (Text): Error messages for failed files
- `createdAt` (Timestamp): Session start timestamp
- `updatedAt` (Timestamp): Last update timestamp

**Relationships**:
- `space` (Many-to-One → Space): Target space

**API Endpoints**:
- `POST /api/spaces/{spaceId}/upload/batch` - Start upload session
- `GET /api/spaces/{spaceId}/upload/status` - Get upload progress
- `POST /api/spaces/{spaceId}/upload/resume` - Resume failed upload

---

#### 7. SyncSession

Tracks bidirectional sync operations for conflict resolution (FR-034 to FR-046).

**Properties**:
- `id` (UUID): Primary key
- `spaceId` (UUID): Foreign key to Space
- `localChanges` (Integer): Number of local changes detected
- `remoteChanges` (Integer): Number of remote changes detected
- `conflicts` (Integer): Number of conflicts detected
- `resolvedConflicts` (Integer): Number of conflicts resolved
- `status` (Enum): Session status (`IN_PROGRESS`, `COMPLETED`, `FAILED`)
- `resolutionStrategy` (Enum): Conflict resolution strategy (`LAST_WRITE_WINS`, `LOCAL_WINS`, `REMOTE_WINS`)
- `createdAt` (Timestamp): Session start timestamp
- `updatedAt` (Timestamp): Last update timestamp

**Relationships**:
- `space` (Many-to-One → Space): Target space

**API Endpoints**:
- `POST /api/spaces/{spaceId}/sync/detect` - Detect changes and conflicts
- `POST /api/spaces/{spaceId}/sync/apply` - Apply sync changes

---

### New Entities (Canvas Support)

#### 8. Mapping

Represents a canvas visualization with viewport configuration (FR-015 to FR-021).

**Properties**:
- `id` (UUID): Primary key
- `spaceId` (UUID): Foreign key to Space
- `name` (String): Canvas display name (derived from .canvas filename)
- `slug` (String): URL-safe identifier (unique within space)
- `description` (String): Optional description
- `configuration` (JSONB): Viewport settings

**JSONB Configuration Structure**:
```json
{
  "zoom": 1.5,
  "viewX": 100,
  "viewY": 200
}
```

**Relationships**:
- `space` (Many-to-One → Space): Parent space
- `nodeMappings` (One-to-Many → NodeMapping): Nodes within this canvas

**API Endpoints**:
- `GET /api/spaces/{spaceId}/mappings` - List canvases in space
- `POST /api/spaces/{spaceId}/mappings` - Create canvas
- `GET /api/spaces/{spaceId}/mappings/{mappingId}` - Get canvas details

---

#### 9. NodeMapping

Represents a node's position and visual properties within a canvas (FR-020, FR-021).

**Properties**:
- `id` (UUID): Primary key
- `mappingId` (UUID): Foreign key to Mapping (canvas)
- `containedNodeId` (UUID): Foreign key to Node (node being positioned)
- `metadata` (JSONB): Visual properties

**JSONB Metadata Structure**:
```json
{
  "x": 123.456,
  "y": 789.012,
  "width": 400.789,
  "height": 300.123,
  "color": "4",
  "type": "file",
  "file": "notes/my-note.md"
}
```

**Relationships**:
- `mapping` (Many-to-One → Mapping): Parent canvas
- `containedNode` (Many-to-One → Node): Node being positioned

**API Endpoints**:
- NodeMappings are nested within Mapping responses (no separate endpoints)
- Retrieved via `GET /api/spaces/{spaceId}/mappings/{mappingId}` (includes `nodeMappings` array)

---

#### 10. NodeVersion

Tracks version history of nodes for Git integration (FR-047 to FR-053).

**Properties**:
- `id` (UUID): Primary key
- `nodeId` (UUID): Foreign key to Node
- `versionNumber` (Integer): Incremental version number (1, 2, 3, ...)
- `content` (Text): Snapshot of node content at this version
- `commitHash` (String): Git commit SHA (if available)
- `commitMessage` (String): Git commit message
- `authorEmail` (String): Author email from Git
- `createdAt` (Timestamp): Version creation timestamp
- `properties` (JSONB): Snapshot of node properties at this version

**JSONB Properties Structure**:
```json
{
  "gitMetadata": {
    "branch": "main",
    "remoteUrl": "https://github.com/user/repo.git",
    "authorName": "John Doe"
  }
}
```

**Relationships**:
- `node` (Many-to-One → Node): Parent node

**API Endpoints**:
- `GET /api/spaces/{spaceId}/nodes/{nodeId}/versions` - List node versions
- `GET /api/spaces/{spaceId}/nodes/{nodeId}/versions/{versionId}` - Get specific version

---

## CLI-Side Data Structures

The CLI does NOT maintain a database. The following are in-memory or file-based data structures used by the CLI:

### 1. Mapping File (`.mujarrad/mappings.json`)

Maps local file paths to backend Node UUIDs for efficient sync.

**Format**:
```json
{
  "version": "1.0",
  "spaceId": "space-uuid",
  "mappings": {
    "Projects/Mujarrad/spec.md": "node-uuid-1",
    "Projects/Mujarrad/plan.md": "node-uuid-2",
    "Business Model Canvas.canvas": "node-uuid-3"
  }
}
```

**Operations**:
- Created after initial upload
- Updated after sync
- Deleted when space is unlinked

---

### 2. Credentials File (`~/.mujarrad/credentials.json`)

Stores JWT tokens for authentication (with 600 permissions).

**Format**:
```json
{
  "apiUrl": "https://api.example.com",
  "tokens": {
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresAt": "2025-10-10T10:00:00Z"
  },
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

**Security**:
- File permissions: 600 (owner read/write only)
- Stored in OS keychain via keytar (preferred)
- AES-256 encrypted fallback if keychain unavailable

---

### 3. Cache File (`~/.mujarrad/cache/{space-slug}/structure.json`)

Caches space structure for offline operations.

**Format**:
```json
{
  "spaceId": "space-uuid",
  "lastSync": "2025-10-10T10:00:00Z",
  "nodes": [
    {
      "id": "node-uuid-1",
      "slug": "spec",
      "name": "Specification",
      "filepath": "Projects/Mujarrad/spec.md",
      "sha256Hash": "abc123..."
    }
  ]
}
```

**Operations**:
- Created after first sync
- Updated after each sync
- Used for offline diff calculation

---

## Entity Relationship Diagram

```
User (existing, not shown)
  |
  +-- SpaceTemplate (NEW)
  |     |
  |     +-- ContextTemplate (NEW)
  |
  +-- Space
        |
        +-- Node
        |     |
        |     +-- NodeVersion (NEW)
        |     +-- Attribute (relationship)
        |     +-- NodeMapping (NEW)
        |
        +-- Mapping (NEW)
        |     |
        |     +-- NodeMapping
        |
        +-- UploadSession (NEW)
        +-- SyncSession (NEW)
```

## Database Migration Strategy

The backend uses Flyway for versioned database migrations (Constitution Principle II).

**Migration Files** (backend responsibility, CLI does not run these):
- `V1__create_space_node_attribute.sql` - Existing entities (already applied)
- `V2__create_template_entities.sql` - SpaceTemplate, ContextTemplate (NEW)
- `V3__create_session_entities.sql` - UploadSession, SyncSession (NEW)
- `V4__create_canvas_entities.sql` - Mapping, NodeMapping (NEW)
- `V5__create_version_entities.sql` - NodeVersion (NEW)

**CLI Behavior**:
- CLI does NOT run migrations
- CLI assumes backend API is up-to-date
- CLI reports error if API returns "entity not found" (suggests backend migration not applied)

---

## Terminology Clarification

**MVP Terminology** (Current):
- `SpaceTemplate` = Reusable space structure
- `ContextTemplate` = Folder structure within space template

**Future Terminology** (Post-MVP):
- `SpaceTemplate` = Renamed from `SpaceTemplate` (aligns with "Space" naming convention)
- `ContextTemplate` = Unchanged

**Migration Note**: The rename from `SpaceTemplate` → `SpaceTemplate` is deferred to post-MVP. All current code uses `SpaceTemplate`.

---

## Constitution Compliance

This data model satisfies Constitution Principles:

- ✅ **Principle I (API-First)**: All entities have OpenAPI endpoints defined in `contracts/openapi.yaml`
- ✅ **Principle II (Database Schema as Code)**: Backend uses Flyway migrations (not CLI responsibility)
- ✅ **Principle III (TDD)**: Entity validation tests required before implementation
- ✅ **Principle IV (Transactional Integrity)**: Session entities (UploadSession, SyncSession) track transactional operations
- ✅ **Principle V (Security by Default)**: JWT authentication, HTTPS only, 600 permissions on credentials
- ✅ **Principle VI (Sample Data)**: Sample vault at `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad` for integration tests

---

## Next Steps

1. ✅ Generate OpenAPI specification from entity definitions (already complete in `contracts/openapi.yaml`)
2. ✅ Write entity validation tests (TDD - tests before implementation)
3. Implement backend entities with JPA annotations (backend responsibility)
4. Implement CLI services to consume entity APIs
5. Test with sample vault (Business Model Canvas structure)

**Status**: ✅ Data Model Complete
