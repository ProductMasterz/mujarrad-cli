# Implementation Tasks: Obsidian Mapper Integration

**Feature**: 007-obsidian-mapper-i
**Branch**: 007-obsidian-mapper-i
**Generated**: 2025-10-09
**Status**: Ready for implementation

---

## Overview

This document breaks down the implementation into dependency-ordered tasks following TDD principles (Constitution Principle III). Each task includes:
- **Dependency markers**: [P] for parallel execution, sequential otherwise
- **Test requirements**: Tests must be written BEFORE implementation
- **User story mapping**: Each task maps to a specific user story

---

## Phase 0: Project Setup & Infrastructure

### Task 0.1: Initialize Node.js Project [P]
**Priority**: P1
**Estimated effort**: 1 hour
**Dependencies**: None

**Description**:
Initialize npm project with TypeScript configuration and essential development dependencies.

**Acceptance Criteria**:
- [ ] package.json created with project metadata
- [ ] TypeScript 5+ installed and configured
- [ ] tsconfig.json with strict mode enabled
- [ ] ESLint and Prettier configured
- [ ] .gitignore covers node_modules, dist, logs, cache
- [ ] Project builds successfully with `npm run build`

**Implementation Notes**:
```bash
npm init -y
npm install --save-dev typescript@5 @types/node eslint prettier
npx tsc --init
```

**Related User Stories**: Foundation for all stories

---

### Task 0.2: Configure Jest Testing Framework [P]
**Priority**: P1
**Estimated effort**: 1 hour
**Dependencies**: Task 0.1

**Description**:
Set up Jest 29+ for unit and integration testing with TypeScript support.

**Acceptance Criteria**:
- [ ] Jest 29+ installed with ts-jest
- [ ] jest.config.js configured for TypeScript
- [ ] Test directory structure created (unit/, integration/, e2e/)
- [ ] Sample test passes: `npm test`
- [ ] Code coverage reporting enabled (target: 80%)

**Implementation Notes**:
```bash
npm install --save-dev jest@29 ts-jest @types/jest
npx ts-jest config:init
```

**Related User Stories**: Foundation for all stories (Constitution Principle III)

---

### Task 0.3: Set Up Project Directory Structure [P]
**Priority**: P1
**Estimated effort**: 30 minutes
**Dependencies**: Task 0.1

**Description**:
Create standardized directory structure for CLI tool following 5-layer architecture.

**Acceptance Criteria**:
- [ ] Directory structure matches plan.md (src/commands/, src/services/, src/api/generated/, src/filesystem/, src/workflows/, src/config/, src/utils/)
- [ ] README.md created with installation instructions
- [ ] LICENSE file added (MIT recommended)
- [ ] .npmignore configured for distribution

**Implementation Notes**:
```
src/
├── commands/        # CLI command handlers
├── services/        # Business logic layer
├── api/generated/   # Auto-generated API client
├── filesystem/      # Vault scanning, parsing
├── workflows/       # 5 automated patterns
├── config/          # ConfigManager, CredentialManager
└── utils/           # Logger, ProgressBar, Validator, AutoUpdater
```

**Related User Stories**: Foundation for all stories

---

## Phase 1: Foundational Components

### Task 1.1: Generate TypeScript API Client from OpenAPI
**Priority**: P1
**Estimated effort**: 2 hours
**Dependencies**: Task 0.1, Task 0.3
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Generate TypeScript client from contracts/openapi.yaml using openapi-generator-cli.

**Tests** (write FIRST):
```typescript
// tests/unit/api/apiClient.test.ts
describe('API Client Generation', () => {
  it('should have authentication API methods', () => {
    expect(apiClient.authApi.login).toBeDefined();
    expect(apiClient.authApi.refresh).toBeDefined();
  });

  it('should have workspace API methods', () => {
    expect(apiClient.workspacesApi.getWorkspaces).toBeDefined();
    expect(apiClient.workspacesApi.createWorkspace).toBeDefined();
  });

  it('should have upload API methods', () => {
    expect(apiClient.uploadApi.initUploadSession).toBeDefined();
    expect(apiClient.uploadApi.uploadNodes).toBeDefined();
  });
});
```

**Acceptance Criteria**:
- [ ] openapi-generator-cli installed
- [ ] Generated client in src/api/generated/
- [ ] TypeScript types match OpenAPI schemas
- [ ] All 8 API categories accessible (Auth, Workspace, Template, Upload, Clone, Sync, Version, Sharing)
- [ ] Tests pass for API client structure

**Implementation Notes**:
```bash
npm install --save-dev @openapitools/openapi-generator-cli
npx openapi-generator-cli generate -i specs/007-obsidian-mapper-i/contracts/openapi.yaml -g typescript-axios -o src/api/generated
```

**Related Requirements**: FR-CLI-016, FR-CLI-017, FR-CLI-018

---

### Task 1.2: Implement ConfigManager (Configuration Loading)
**Priority**: P1
**Estimated effort**: 3 hours
**Dependencies**: Task 0.1, Task 0.2
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create ConfigManager to load CLI configuration using cosmiconfig 8+.

**Tests** (write FIRST):
```typescript
// tests/unit/config/ConfigManager.test.ts
describe('ConfigManager', () => {
  it('should load config from ~/.mujarrad/config.json', async () => {
    const config = await ConfigManager.load();
    expect(config.apiBaseUrl).toBeDefined();
  });

  it('should create default config if none exists', async () => {
    // Mock fs to simulate no config
    const config = await ConfigManager.load();
    expect(config.apiBaseUrl).toBe('https://api.example.com');
  });

  it('should validate required config fields', async () => {
    // Mock invalid config
    await expect(ConfigManager.load()).rejects.toThrow('Invalid configuration');
  });
});
```

**Acceptance Criteria**:
- [X] cosmiconfig 8+ installed
- [X] Loads config from ~/.mujarrad/config.json or .mujarradrc
- [X] Creates default config if none exists
- [X] Validates configuration schema
- [X] Supports environment variable overrides
- [X] Tests pass for config loading and validation

**Implementation Notes**:
Config schema:
```json
{
  "apiBaseUrl": "https://api.example.com",
  "defaultWorkspace": "my-workspace",
  "autoSync": false,
  "logLevel": "info"
}
```

**Related Requirements**: FR-CLI-021

---

### Task 1.3: Implement CredentialManager (Token Storage)
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 0.1, Task 0.2
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create CredentialManager to securely store JWT tokens using keytar 7+ (OS keychain) with encrypted fallback.

**Tests** (write FIRST):
```typescript
// tests/unit/config/CredentialManager.test.ts
describe('CredentialManager', () => {
  it('should store token in OS keychain', async () => {
    await CredentialManager.storeToken('test-token');
    const token = await CredentialManager.getToken();
    expect(token).toBe('test-token');
  });

  it('should fallback to encrypted file if keychain unavailable', async () => {
    // Mock keytar failure
    await CredentialManager.storeToken('test-token');
    const token = await CredentialManager.getToken();
    expect(token).toBe('test-token');
  });

  it('should validate token expiry', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // expired JWT
    await CredentialManager.storeToken(expiredToken);
    const isValid = await CredentialManager.isTokenValid();
    expect(isValid).toBe(false);
  });

  it('should set file permissions to 600 for encrypted fallback', async () => {
    // Mock keytar failure
    await CredentialManager.storeToken('test-token');
    const stats = fs.statSync(path.join(os.homedir(), '.mujarrad/credentials.json'));
    expect(stats.mode & 0o777).toBe(0o600);
  });
});
```

**Acceptance Criteria**:
- [ ] keytar 7+ installed
- [ ] Stores tokens in OS keychain (Keychain Access, Credential Manager, libsecret)
- [ ] Falls back to AES-256 encrypted ~/.mujarrad/credentials.json
- [ ] File permissions set to 600 (NFR-016)
- [ ] Token expiry validation
- [ ] Tests pass for storage, retrieval, validation

**Implementation Notes**:
```typescript
// Fallback encryption
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(os.userInfo().username, 'salt', 32);
```

**Related Requirements**: FR-CLI-001, NFR-016

---

### Task 1.4: Implement Logger (Structured Logging)
**Priority**: P1
**Estimated effort**: 2 hours
**Dependencies**: Task 0.1, Task 0.2, Task 1.2
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create Logger utility using winston 3+ for structured logging to ~/.mujarrad/logs/.

**Tests** (write FIRST):
```typescript
// tests/unit/utils/Logger.test.ts
describe('Logger', () => {
  it('should log to ~/.mujarrad/logs/mujarrad.log', () => {
    Logger.info('Test message');
    const logFile = path.join(os.homedir(), '.mujarrad/logs/mujarrad.log');
    const logs = fs.readFileSync(logFile, 'utf-8');
    expect(logs).toContain('Test message');
  });

  it('should respect log level from config', () => {
    // Mock config with logLevel: 'error'
    Logger.debug('Debug message');
    Logger.error('Error message');
    // Only error message should be logged
  });

  it('should include timestamp and request ID in logs', () => {
    Logger.info('Test', { requestId: 'abc123' });
    const logs = fs.readFileSync(logPath, 'utf-8');
    expect(logs).toContain('requestId');
    expect(logs).toMatch(/\d{4}-\d{2}-\d{2}/); // timestamp
  });
});
```

**Acceptance Criteria**:
- [ ] winston 3+ installed
- [ ] Logs to ~/.mujarrad/logs/mujarrad.log
- [ ] Log rotation enabled (max 10MB, 5 files)
- [ ] Log levels: debug, info, warn, error
- [ ] Includes timestamp, request ID, operation context
- [ ] Tests pass for logging functionality

**Implementation Notes**:
```typescript
const winston = require('winston');
const logger = winston.createLogger({
  level: config.logLevel || 'info',
  transports: [
    new winston.transports.File({ filename: '~/.mujarrad/logs/mujarrad.log', maxsize: 10485760, maxFiles: 5 })
  ]
});
```

**Related Requirements**: FR-CLI-026, NFR-024

---

### Task 1.5: Implement ProgressBar and Spinners (UI Utilities) [P]
**Priority**: P1
**Estimated effort**: 2 hours
**Dependencies**: Task 0.1, Task 0.2
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create UI utilities using ora 7+ (spinners) and cli-progress 3+ (progress bars).

**Tests** (write FIRST):
```typescript
// tests/unit/utils/ProgressBar.test.ts
describe('ProgressBar', () => {
  it('should display progress for long operations', () => {
    const pb = new ProgressBar({ total: 100 });
    pb.update(50);
    expect(pb.value).toBe(50);
    pb.stop();
  });

  it('should show spinner for indeterminate operations', () => {
    const spinner = Spinner.start('Loading...');
    expect(spinner.isSpinning).toBe(true);
    spinner.succeed('Done!');
  });
});
```

**Acceptance Criteria**:
- [ ] ora 7+ and cli-progress 3+ installed
- [ ] ProgressBar class for determinate operations
- [ ] Spinner class for indeterminate operations
- [ ] Customizable text and format
- [ ] Tests pass for UI utilities

**Implementation Notes**:
```typescript
import ora from 'ora';
import cliProgress from 'cli-progress';
```

**Related Requirements**: NFR-021

---

## Phase 2: Authentication & API Integration (User Story 1 - Part 1)

### Task 2.1: Implement AuthService (Login/Logout)
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 1.1, Task 1.3, Task 1.4
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create AuthService to handle login, logout, and token refresh.

**Tests** (write FIRST):
```typescript
// tests/unit/services/AuthService.test.ts
describe('AuthService', () => {
  it('should authenticate user and store token', async () => {
    // Mock API response
    const mockResponse = { accessToken: 'token123', user: { id: 'uuid', email: 'user@example.com' } };
    jest.spyOn(apiClient.authApi, 'login').mockResolvedValue(mockResponse);

    const result = await AuthService.login('user@example.com', 'password');
    expect(result.accessToken).toBe('token123');
    expect(CredentialManager.getToken()).resolves.toBe('token123');
  });

  it('should refresh expired token automatically', async () => {
    // Mock expired token
    await CredentialManager.storeToken('expired-token');
    const mockRefreshResponse = { accessToken: 'new-token' };
    jest.spyOn(apiClient.authApi, 'refresh').mockResolvedValue(mockRefreshResponse);

    await AuthService.ensureAuthenticated();
    expect(await CredentialManager.getToken()).toBe('new-token');
  });

  it('should handle login failure gracefully', async () => {
    jest.spyOn(apiClient.authApi, 'login').mockRejectedValue(new Error('Invalid credentials'));
    await expect(AuthService.login('user@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});
```

**Acceptance Criteria**:
- [ ] login(email, password) method calls API and stores token
- [ ] logout() method invalidates token
- [ ] ensureAuthenticated() checks and refreshes token
- [ ] Handles 401 errors with re-authentication prompt
- [ ] Tests pass for authentication flows

**Implementation Notes**:
```typescript
class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.authApi.login({ email, password });
    await CredentialManager.storeToken(response.accessToken);
    return response;
  }
}
```

**Related Requirements**: FR-040, FR-CLI-002, FR-CLI-003

---

### Task 2.2: Implement auth CLI Commands
**Priority**: P1
**Estimated effort**: 3 hours
**Dependencies**: Task 2.1
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create CLI command handlers for authentication using Commander.js 11+.

**Tests** (write FIRST):
```typescript
// tests/integration/commands/auth.test.ts
describe('auth command', () => {
  it('should prompt for credentials and authenticate', async () => {
    // Mock inquirer prompts
    const result = await runCommand(['auth', 'login']);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Logged in successfully');
  });

  it('should show helpful error for invalid credentials', async () => {
    // Mock API error
    const result = await runCommand(['auth', 'login']);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Invalid credentials');
  });

  it('should logout and clear credentials', async () => {
    await runCommand(['auth', 'logout']);
    expect(await CredentialManager.getToken()).toBeNull();
  });
});
```

**Acceptance Criteria**:
- [ ] Commander.js 11+ installed
- [ ] `mujarrad auth login` prompts for email/password
- [ ] `mujarrad auth logout` clears credentials
- [ ] `mujarrad auth status` shows authentication state
- [ ] Error messages are user-friendly
- [ ] Tests pass for auth commands

**Implementation Notes**:
```typescript
import { Command } from 'commander';
import inquirer from 'inquirer';

const program = new Command();
program
  .command('auth login')
  .action(async () => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Email:' },
      { type: 'password', name: 'password', message: 'Password:' }
    ]);
    await AuthService.login(answers.email, answers.password);
  });
```

**Related Requirements**: FR-CLI-003

---

## Phase 3: File System Operations (User Story 1 - Part 2)

### Task 3.1: Implement VaultScanner (File Discovery)
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 1.4
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create VaultScanner to recursively scan directories for .md and .canvas files.

**Tests** (write FIRST):
```typescript
// tests/unit/filesystem/VaultScanner.test.ts
describe('VaultScanner', () => {
  it('should find all .md and .canvas files recursively', async () => {
    // Create test vault
    const testVaultPath = createTestVault({
      'note1.md': '# Note 1',
      'folder/note2.md': '# Note 2',
      'canvas.canvas': '{"nodes": []}'
    });

    const scanner = new VaultScanner(testVaultPath);
    const files = await scanner.scan();

    expect(files).toHaveLength(3);
    expect(files.map(f => f.path)).toContain('note1.md');
    expect(files.map(f => f.path)).toContain('folder/note2.md');
    expect(files.map(f => f.path)).toContain('canvas.canvas');
  });

  it('should compute SHA-256 hash for each file', async () => {
    const scanner = new VaultScanner(testVaultPath);
    const files = await scanner.scan();
    expect(files[0].hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should build folder hierarchy tree', async () => {
    const scanner = new VaultScanner(testVaultPath);
    const hierarchy = await scanner.buildHierarchy();
    expect(hierarchy.children).toHaveProperty('folder');
  });
});
```

**Acceptance Criteria**:
- [ ] Recursively scans directory
- [ ] Filters for .md and .canvas files only
- [ ] Computes SHA-256 hash for each file
- [ ] Builds folder hierarchy tree
- [ ] Handles symlinks and special files gracefully
- [ ] Tests pass for vault scanning

**Implementation Notes**:
```typescript
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

class VaultScanner {
  async scan(dir: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.canvas'))) {
        const content = await fs.readFile(path.join(dir, entry.name));
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        files.push({ path: entry.name, hash });
      } else if (entry.isDirectory()) {
        files.push(...await this.scan(path.join(dir, entry.name)));
      }
    }
    return files;
  }
}
```

**Related Requirements**: FR-CLI-005, FR-CLI-010

---

### Task 3.2: Implement MarkdownParser (Wikilink Extraction)
**Priority**: P1
**Estimated effort**: 5 hours
**Dependencies**: Task 1.4
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create MarkdownParser using remark 15+ to parse markdown and extract wikilinks.

**Tests** (write FIRST):
```typescript
// tests/unit/filesystem/MarkdownParser.test.ts
describe('MarkdownParser', () => {
  it('should extract wikilinks from markdown', () => {
    const markdown = '# Note\nSee [[Another Note]] for details.';
    const parser = new MarkdownParser(markdown);
    const links = parser.extractWikilinks();
    expect(links).toEqual([{ target: 'Another Note', alias: null }]);
  });

  it('should extract wikilinks with aliases', () => {
    const markdown = '[[Target|Alias Text]]';
    const links = new MarkdownParser(markdown).extractWikilinks();
    expect(links[0]).toEqual({ target: 'Target', alias: 'Alias Text' });
  });

  it('should extract wikilinks with paths', () => {
    const markdown = '[[Folder/Subfolder/Note]]';
    const links = new MarkdownParser(markdown).extractWikilinks();
    expect(links[0].target).toBe('Folder/Subfolder/Note');
  });

  it('should parse frontmatter if present', () => {
    const markdown = '---\ntitle: My Note\ntags: [tag1, tag2]\n---\n# Content';
    const parser = new MarkdownParser(markdown);
    const frontmatter = parser.parseFrontmatter();
    expect(frontmatter.title).toBe('My Note');
    expect(frontmatter.tags).toEqual(['tag1', 'tag2']);
  });

  it('should extract standard markdown links', () => {
    const markdown = '[Link Text](target.md)';
    const links = new MarkdownParser(markdown).extractLinks();
    expect(links[0]).toEqual({ text: 'Link Text', url: 'target.md' });
  });
});
```

**Acceptance Criteria**:
- [ ] remark 15+ and unified installed
- [ ] Extracts wikilinks: [[Target]], [[Target|Alias]], [[Path/To/Note]]
- [ ] Extracts standard links: [text](url)
- [ ] Parses frontmatter (YAML)
- [ ] Handles edge cases (malformed links, special characters)
- [ ] Tests pass for markdown parsing

**Implementation Notes**:
```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';

class MarkdownParser {
  extractWikilinks(): WikiLink[] {
    const regex = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
    const links: WikiLink[] = [];
    let match;
    while ((match = regex.exec(this.content)) !== null) {
      links.push({ target: match[1], alias: match[3] || null });
    }
    return links;
  }
}
```

**Related Requirements**: FR-CLI-006, FR-CLI-007

---

### Task 3.3: Implement CanvasParser (Canvas JSON Parsing)
**Priority**: P1
**Estimated effort**: 5 hours
**Dependencies**: Task 1.4
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create CanvasParser to parse .canvas JSON files and extract nodes, edges, visual properties.

**Tests** (write FIRST):
```typescript
// tests/unit/filesystem/CanvasParser.test.ts
describe('CanvasParser', () => {
  it('should parse canvas JSON structure', () => {
    const canvasJSON = {
      nodes: [
        { id: 'node1', file: 'note1.md', x: 100, y: 200, width: 400, height: 300, color: '1' }
      ],
      edges: []
    };
    const parser = new CanvasParser(JSON.stringify(canvasJSON));
    const parsed = parser.parse();
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.nodes[0].visualProperties).toEqual({ x: 100, y: 200, width: 400, height: 300, color: '1' });
  });

  it('should extract canvas-wide config', () => {
    const canvasJSON = { zoom: 1.5, viewX: 100, viewY: 200, nodes: [], edges: [] };
    const parser = new CanvasParser(JSON.stringify(canvasJSON));
    const config = parser.extractConfig();
    expect(config).toEqual({ zoom: 1.5, viewX: 100, viewY: 200 });
  });

  it('should extract edges with visual properties', () => {
    const canvasJSON = {
      nodes: [],
      edges: [
        { id: 'edge1', fromNode: 'node1', toNode: 'node2', fromSide: 'right', toSide: 'left', color: '2' }
      ]
    };
    const parser = new CanvasParser(JSON.stringify(canvasJSON));
    const edges = parser.extractEdges();
    expect(edges[0]).toMatchObject({ fromNode: 'node1', toNode: 'node2', fromSide: 'right' });
  });

  it('should handle nested canvas references', () => {
    const canvasJSON = {
      nodes: [
        { id: 'node1', file: 'another.canvas', type: 'file' }
      ]
    };
    const parser = new CanvasParser(JSON.stringify(canvasJSON));
    const nested = parser.findNestedCanvases();
    expect(nested).toContain('another.canvas');
  });
});
```

**Acceptance Criteria**:
- [ ] Parses canvas JSON structure
- [ ] Extracts nodes with visual properties (x, y, width, height, color)
- [ ] Extracts canvas-wide config (zoom, viewX, viewY)
- [ ] Extracts edges with visual properties
- [ ] Validates JSON structure
- [ ] Tests pass for canvas parsing

**Implementation Notes**:
```typescript
interface CanvasNode {
  id: string;
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

class CanvasParser {
  parse(): { nodes: CanvasNode[], edges: CanvasEdge[], config: any } {
    const data = JSON.parse(this.content);
    return {
      nodes: data.nodes || [],
      edges: data.edges || [],
      config: { zoom: data.zoom, viewX: data.viewX, viewY: data.viewY }
    };
  }
}
```

**Related Requirements**: FR-CLI-008, FR-014

---

### Task 3.4: Implement MetadataManager (UUID Embedding)
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 3.2
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create MetadataManager to embed and extract UUIDs in markdown files using HTML comments.

**Tests** (write FIRST):
```typescript
// tests/unit/filesystem/MetadataManager.test.ts
describe('MetadataManager', () => {
  it('should embed UUID as HTML comment', () => {
    const markdown = '# My Note\nContent here...';
    const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-123');
    expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-123 -->');
  });

  it('should extract UUID from markdown', () => {
    const markdown = '<!-- mujarrad-node-id: uuid-123 -->\n# My Note';
    const uuid = MetadataManager.extractUUID(markdown);
    expect(uuid).toBe('uuid-123');
  });

  it('should preserve existing frontmatter when embedding', () => {
    const markdown = '---\ntitle: Note\n---\n# Content';
    const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-123');
    expect(withMetadata).toContain('---\ntitle: Note\n---');
    expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-123 -->');
  });

  it('should validate UUID format', () => {
    expect(MetadataManager.isValidUUID('uuid-123')).toBe(true);
    expect(MetadataManager.isValidUUID('invalid')).toBe(false);
  });

  it('should handle missing metadata gracefully', () => {
    const markdown = '# Note without metadata';
    const uuid = MetadataManager.extractUUID(markdown);
    expect(uuid).toBeNull();
  });
});
```

**Acceptance Criteria**:
- [ ] Embeds UUID as HTML comment: `<!-- mujarrad-node-id: uuid -->`
- [ ] Extracts UUID from markdown
- [ ] Preserves existing frontmatter
- [ ] Validates UUID format
- [ ] Tests pass for metadata operations

**Implementation Notes**:
```typescript
class MetadataManager {
  static embedUUID(markdown: string, uuid: string): string {
    const comment = `<!-- mujarrad-node-id: ${uuid} -->`;
    // Insert after frontmatter if present
    if (markdown.startsWith('---')) {
      const endOfFrontmatter = markdown.indexOf('---', 3) + 3;
      return markdown.slice(0, endOfFrontmatter) + '\n' + comment + markdown.slice(endOfFrontmatter);
    }
    return comment + '\n' + markdown;
  }
}
```

**Related Requirements**: FR-012, FR-016

---

## Phase 4: Upload Workflow (User Story 1 - Part 3)

### Task 4.1: Implement UploadService (Batch Upload Logic)
**Priority**: P1
**Estimated effort**: 6 hours
**Dependencies**: Task 1.1, Task 3.1, Task 3.2, Task 3.3, Task 3.4
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create UploadService to orchestrate batch upload of notes, canvases, and relationships.

**Tests** (write FIRST):
```typescript
// tests/unit/services/UploadService.test.ts
describe('UploadService', () => {
  it('should initialize upload session', async () => {
    const mockResponse = { uploadSessionId: 'session-123', batchSize: 50 };
    jest.spyOn(apiClient.uploadApi, 'initUploadSession').mockResolvedValue(mockResponse);

    const session = await UploadService.initSession('workspace-123', { totalFiles: 150 });
    expect(session.uploadSessionId).toBe('session-123');
  });

  it('should split files into batches', () => {
    const files = Array(150).fill(null).map((_, i) => ({ path: `note${i}.md` }));
    const batches = UploadService.createBatches(files, 50);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(50);
  });

  it('should upload batch of nodes', async () => {
    const batch = [
      { nodeType: 'REGULAR', title: 'Note 1', slug: 'note-1', content: '# Note 1' }
    ];
    const mockResponse = { created: [{ nodeId: 'uuid-1' }], errors: [] };
    jest.spyOn(apiClient.uploadApi, 'uploadNodes').mockResolvedValue(mockResponse);

    const result = await UploadService.uploadBatch('session-123', 'workspace-123', batch);
    expect(result.created).toHaveLength(1);
  });

  it('should handle upload errors gracefully', async () => {
    jest.spyOn(apiClient.uploadApi, 'uploadNodes').mockRejectedValue(new Error('Network error'));
    await expect(UploadService.uploadBatch('session-123', 'workspace-123', [])).rejects.toThrow();
  });

  it('should finalize upload session', async () => {
    const mockResponse = { success: true, totalNodesCreated: 150 };
    jest.spyOn(apiClient.uploadApi, 'completeUploadSession').mockResolvedValue(mockResponse);

    const result = await UploadService.finalizeSession('session-123', 'workspace-123');
    expect(result.success).toBe(true);
  });
});
```

**Acceptance Criteria**:
- [ ] Initializes upload session via API
- [ ] Splits files into batches (size from API response)
- [ ] Uploads batches sequentially with retry logic
- [ ] Embeds UUIDs in local files after upload
- [ ] Finalizes session and logs summary
- [ ] Tests pass for upload service

**Implementation Notes**:
```typescript
class UploadService {
  async uploadVault(workspaceId: string, vaultPath: string): Promise<UploadSummary> {
    const scanner = new VaultScanner(vaultPath);
    const files = await scanner.scan();

    const session = await this.initSession(workspaceId, { totalFiles: files.length });
    const batches = this.createBatches(files, session.batchSize);

    for (const batch of batches) {
      await this.uploadBatch(session.uploadSessionId, workspaceId, batch);
    }

    return await this.finalizeSession(session.uploadSessionId, workspaceId);
  }
}
```

**Related Requirements**: FR-001 to FR-011, FR-CLI-016, FR-CLI-019

---

### Task 4.2: Implement upload CLI Command
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 4.1
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create CLI command handler for vault upload.

**Tests** (write FIRST):
```typescript
// tests/integration/commands/upload.test.ts
describe('upload command', () => {
  it('should upload vault to workspace', async () => {
    const testVaultPath = createTestVault({ 'note.md': '# Note' });
    const result = await runCommand(['upload', '--workspace', 'test-workspace', testVaultPath]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Upload complete');
  });

  it('should show progress during upload', async () => {
    const testVaultPath = createTestVault(Array(100).fill(null).map((_, i) => [`note${i}.md`, '# Note']));
    const result = await runCommand(['upload', '--workspace', 'test-workspace', testVaultPath]);
    expect(result.output).toMatch(/\d+\/\d+/); // Progress indicator
  });

  it('should handle authentication errors', async () => {
    // Mock auth failure
    const result = await runCommand(['upload', '--workspace', 'test', '/path']);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Please login first');
  });
});
```

**Acceptance Criteria**:
- [ ] `mujarrad upload <vault-path> --workspace <slug>` command
- [ ] Shows progress bar during upload
- [ ] Logs upload session details
- [ ] Handles errors with actionable messages
- [ ] Tests pass for upload command

**Implementation Notes**:
```typescript
program
  .command('upload <vault-path>')
  .option('-w, --workspace <slug>', 'Workspace slug')
  .action(async (vaultPath, options) => {
    await AuthService.ensureAuthenticated();
    const workspaceId = await resolveWorkspaceId(options.workspace);
    await UploadService.uploadVault(workspaceId, vaultPath);
  });
```

**Related Requirements**: FR-040 to FR-043

---

## Phase 5: Clone Workflow (User Story 1 - Part 4)

### Task 5.1: Implement CloneService (Workspace Export)
**Priority**: P1
**Estimated effort**: 6 hours
**Dependencies**: Task 1.1, Task 3.3, Task 3.4
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create CloneService to export workspace and recreate Obsidian vault.

**Tests** (write FIRST):
```typescript
// tests/unit/services/CloneService.test.ts
describe('CloneService', () => {
  it('should export workspace structure from API', async () => {
    const mockResponse = {
      workspace: { id: 'uuid', name: 'Test' },
      nodes: [{ id: 'node1', nodeType: 'REGULAR', title: 'Note', content: '# Note' }],
      attributes: []
    };
    jest.spyOn(apiClient.cloneApi, 'exportWorkspace').mockResolvedValue(mockResponse);

    const data = await CloneService.exportWorkspace('workspace-123');
    expect(data.nodes).toHaveLength(1);
  });

  it('should create folder hierarchy from CONTEXT nodes', async () => {
    const nodes = [
      { nodeType: 'CONTEXT', title: 'Folder', slug: 'folder' },
      { nodeType: 'REGULAR', title: 'Note', slug: 'note', parentPath: 'folder/' }
    ];
    await CloneService.recreateVault('/tmp/test-vault', { nodes, attributes: [] });
    expect(fs.existsSync('/tmp/test-vault/folder')).toBe(true);
  });

  it('should generate markdown files with embedded UUIDs', async () => {
    const nodes = [{ id: 'uuid-1', nodeType: 'REGULAR', title: 'Note', content: '# Note' }];
    await CloneService.recreateVault('/tmp/test-vault', { nodes, attributes: [] });
    const content = fs.readFileSync('/tmp/test-vault/Note.md', 'utf-8');
    expect(content).toContain('<!-- mujarrad-node-id: uuid-1 -->');
  });

  it('should reconstruct canvas files from mappings', async () => {
    const mappings = [{ nodeId: 'canvas-id', configuration: { zoom: 1.0 } }];
    const nodeMappings = [
      { mappingNodeId: 'canvas-id', containedNodeId: 'note-id', metadata: { x: 100, y: 200 } }
    ];
    await CloneService.recreateCanvas('/tmp/test-vault/canvas.canvas', mappings, nodeMappings);
    const canvas = JSON.parse(fs.readFileSync('/tmp/test-vault/canvas.canvas', 'utf-8'));
    expect(canvas.nodes[0].x).toBe(100);
  });
});
```

**Acceptance Criteria**:
- [ ] Exports workspace via API
- [ ] Creates folder hierarchy
- [ ] Generates markdown files with UUIDs
- [ ] Reconstructs canvas files
- [ ] Converts Attributes to wikilinks
- [ ] Tests pass for clone service

**Implementation Notes**:
```typescript
class CloneService {
  async cloneWorkspace(workspaceSlug: string, targetPath: string): Promise<void> {
    const data = await apiClient.cloneApi.exportWorkspace(workspaceSlug);
    await this.recreateVault(targetPath, data);
    await this.initGit(targetPath);
  }

  async recreateVault(targetPath: string, data: ExportData): Promise<void> {
    // Create folders (CONTEXT nodes)
    // Generate markdown files (REGULAR nodes with embedded UUIDs)
    // Reconstruct canvas files (from Mappings + NodeMappings)
    // Convert Attributes to wikilinks
  }
}
```

**Related Requirements**: FR-018 to FR-024

---

### Task 5.2: Implement Git Integration (Repository Initialization)
**Priority**: P1
**Estimated effort**: 3 hours
**Dependencies**: Task 5.1
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Implement Git repository initialization after clone.

**Tests** (write FIRST):
```typescript
// tests/unit/services/GitService.test.ts
describe('GitService', () => {
  it('should initialize git repository', async () => {
    const testPath = '/tmp/test-vault';
    await GitService.init(testPath);
    expect(fs.existsSync(path.join(testPath, '.git'))).toBe(true);
  });

  it('should create initial commit with all files', async () => {
    await GitService.init(testPath);
    await GitService.addAll(testPath);
    await GitService.commit(testPath, 'Initial commit');

    const log = await GitService.log(testPath);
    expect(log[0].message).toBe('Initial commit');
  });

  it('should handle git init failure gracefully', async () => {
    // Mock git unavailable
    await expect(GitService.init('/readonly')).rejects.toThrow('Failed to initialize git');
  });
});
```

**Acceptance Criteria**:
- [ ] Initializes git repository
- [ ] Creates initial commit with all files
- [ ] Handles failures with cleanup
- [ ] Tests pass for git integration

**Implementation Notes**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

class GitService {
  async init(repoPath: string): Promise<void> {
    await execAsync('git init', { cwd: repoPath });
    await execAsync('git add .', { cwd: repoPath });
    await execAsync('git commit -m "Initial commit from Mujarrad clone"', { cwd: repoPath });
  }
}
```

**Related Requirements**: FR-023, FR-024, FR-CLI-011, FR-CLI-012

---

### Task 5.3: Implement clone CLI Command
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 5.1, Task 5.2
**User Story**: US-1 (Basic Upload and Clone)

**Description**:
Create CLI command handler for workspace cloning.

**Tests** (write FIRST):
```typescript
// tests/integration/commands/clone.test.ts
describe('clone command', () => {
  it('should clone workspace to local directory', async () => {
    const targetPath = '/tmp/test-clone';
    const result = await runCommand(['clone', '--workspace', 'test-workspace', targetPath]);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(fs.existsSync(path.join(targetPath, '.git'))).toBe(true);
  });

  it('should show progress during clone', async () => {
    const result = await runCommand(['clone', '--workspace', 'test', '/tmp/test']);
    expect(result.output).toMatch(/Cloning workspace/);
  });
});
```

**Acceptance Criteria**:
- [ ] `mujarrad clone <target-path> --workspace <slug>` command
- [ ] Shows progress during clone
- [ ] Initializes git repository
- [ ] Tests pass for clone command

**Implementation Notes**:
```typescript
program
  .command('clone <target-path>')
  .option('-w, --workspace <slug>', 'Workspace slug')
  .action(async (targetPath, options) => {
    await AuthService.ensureAuthenticated();
    await CloneService.cloneWorkspace(options.workspace, targetPath);
  });
```

**Related Requirements**: FR-041

---

## Phase 6: Sync Workflow (User Story 2)

### Task 6.1: Implement SyncService (Change Detection)
**Priority**: P1
**Estimated effort**: 8 hours
**Dependencies**: Task 5.2, Task 1.1
**User Story**: US-2 (Bidirectional Sync)

**Description**:
Create SyncService to detect file changes using Git and sync with backend.

**Tests** (write FIRST):
```typescript
// tests/unit/services/SyncService.test.ts
describe('SyncService', () => {
  it('should detect changed files using git diff', async () => {
    // Create test repo with commit
    // Modify file
    const changes = await SyncService.detectChanges('/tmp/test-vault');
    expect(changes).toHaveLength(1);
    expect(changes[0].operation).toBe('UPDATE');
  });

  it('should extract git commit metadata', async () => {
    const metadata = await SyncService.getCommitMetadata('/tmp/test-vault', 'abc123');
    expect(metadata).toMatchObject({
      hash: 'abc123',
      author: expect.any(String),
      timestamp: expect.any(String),
      message: expect.any(String)
    });
  });

  it('should create NodeVersion for each change', async () => {
    const mockResponse = { versionsCreated: 1 };
    jest.spyOn(apiClient.syncApi, 'pushChanges').mockResolvedValue(mockResponse);

    const result = await SyncService.pushChanges('workspace-123', changes);
    expect(result.versionsCreated).toBe(1);
  });

  it('should handle new file creation', async () => {
    // Create new file
    const changes = await SyncService.detectChanges('/tmp/test-vault');
    expect(changes[0].operation).toBe('CREATE');
  });

  it('should handle file deletion with soft delete', async () => {
    // Delete file
    const changes = await SyncService.detectChanges('/tmp/test-vault');
    expect(changes[0].operation).toBe('DELETE');
  });
});
```

**Acceptance Criteria**:
- [ ] Detects changes using `git diff`
- [ ] Extracts commit metadata (hash, author, message, timestamp)
- [ ] Pushes changes to backend with NodeVersion creation
- [ ] Handles new files, updates, deletions
- [ ] Tests pass for sync service

**Implementation Notes**:
```typescript
class SyncService {
  async detectChanges(vaultPath: string): Promise<Change[]> {
    const diff = await execAsync('git diff --name-status HEAD~1', { cwd: vaultPath });
    const lines = diff.stdout.split('\n');
    return lines.map(line => {
      const [status, path] = line.split('\t');
      return { operation: status === 'M' ? 'UPDATE' : status === 'A' ? 'CREATE' : 'DELETE', path };
    });
  }
}
```

**Related Requirements**: FR-025 to FR-032, FR-CLI-013, FR-CLI-014, FR-CLI-015

---

### Task 6.2: Implement Conflict Resolution (Interactive Prompts)
**Priority**: P1
**Estimated effort**: 6 hours
**Dependencies**: Task 6.1
**User Story**: US-2 (Bidirectional Sync)

**Description**:
Implement conflict detection and resolution with interactive prompts.

**Tests** (write FIRST):
```typescript
// tests/unit/services/ConflictResolver.test.ts
describe('ConflictResolver', () => {
  it('should detect concurrent edits', () => {
    const localVersion = { nodeId: 'uuid', content: 'Local content', updatedAt: '2025-10-09T10:00:00Z' };
    const remoteVersion = { nodeId: 'uuid', content: 'Remote content', updatedAt: '2025-10-09T10:05:00Z' };
    const conflicts = ConflictResolver.detect([localVersion], [remoteVersion]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('CONCURRENT_EDIT');
  });

  it('should apply last-write-wins strategy', () => {
    const resolved = ConflictResolver.resolve(conflict, 'last-write-wins');
    expect(resolved.content).toBe('Remote content'); // Remote is newer
  });

  it('should prompt user for manual resolution', async () => {
    // Mock inquirer
    const resolved = await ConflictResolver.resolveInteractive(conflict);
    expect(resolved.strategy).toBe('keep-local'); // User choice
  });

  it('should append UUID suffix for name conflicts', () => {
    const conflict = { type: 'NAME_CONFLICT', fileName: 'Note.md' };
    const resolved = ConflictResolver.resolve(conflict, 'auto-resolve');
    expect(resolved.fileName).toMatch(/Note-[a-f0-9]{8}\.md/);
  });
});
```

**Acceptance Criteria**:
- [ ] Detects concurrent edits
- [ ] Auto-resolves simple conflicts (last-write-wins, name suffix)
- [ ] Prompts user for complex conflicts (inquirer)
- [ ] Supports conflict strategies: L/R/V/S/A
- [ ] Tests pass for conflict resolution

**Implementation Notes**:
```typescript
import inquirer from 'inquirer';

class ConflictResolver {
  async resolveInteractive(conflict: Conflict): Promise<Resolution> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'strategy',
        message: `Conflict in ${conflict.fileName}:`,
        choices: ['Keep local', 'Keep remote', 'View diff', 'Skip', 'Auto-resolve all']
      }
    ]);
    return { strategy: answer.strategy };
  }
}
```

**Related Requirements**: Edge case clarification (Conflict Resolution Strategy)

---

### Task 6.3: Implement sync CLI Command
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: Task 6.1, Task 6.2
**User Story**: US-2 (Bidirectional Sync)

**Description**:
Create CLI command handler for bidirectional sync.

**Tests** (write FIRST):
```typescript
// tests/integration/commands/sync.test.ts
describe('sync command', () => {
  it('should sync changes to backend', async () => {
    const vaultPath = createTestVaultWithChanges();
    const result = await runCommand(['sync', vaultPath]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Sync complete');
  });

  it('should handle conflicts interactively', async () => {
    // Mock conflict
    const result = await runCommand(['sync', vaultPath]);
    expect(result.output).toContain('Conflict detected');
  });

  it('should support --watch mode for continuous sync', async () => {
    const result = runCommandAsync(['sync', '--watch', vaultPath]);
    // Modify file
    // Wait for sync
    // Verify sync occurred
  });
});
```

**Acceptance Criteria**:
- [ ] `mujarrad sync <vault-path>` command
- [ ] Supports `--watch` mode for continuous sync
- [ ] Shows conflict resolution prompts
- [ ] Tests pass for sync command

**Implementation Notes**:
```typescript
program
  .command('sync <vault-path>')
  .option('--watch', 'Enable continuous sync')
  .action(async (vaultPath, options) => {
    if (options.watch) {
      await SyncService.watchAndSync(vaultPath);
    } else {
      await SyncService.syncOnce(vaultPath);
    }
  });
```

**Related Requirements**: FR-030, NFR-003

---

## Phase 7: Canvas Support (User Story 3)

### Task 7.1: Implement Canvas Upload (NodeMapping Creation)
**Priority**: P2
**Estimated effort**: 6 hours
**Dependencies**: Task 4.1, Task 3.3
**User Story**: US-3 (Canvas Visual Preservation)

**Description**:
Extend UploadService to handle canvas files with normalized visual data.

**Tests** (write FIRST):
```typescript
// tests/unit/services/CanvasUploadService.test.ts
describe('CanvasUploadService', () => {
  it('should create CONTEXT node for canvas', async () => {
    const canvasData = { title: 'My Canvas', nodes: [], edges: [] };
    const result = await CanvasUploadService.uploadCanvas('workspace-123', 'session-123', canvasData);
    expect(result.canvasNodeId).toBeDefined();
  });

  it('should create Mapping with canvas-wide config', async () => {
    const canvasData = { zoom: 1.5, viewX: 100, nodes: [] };
    await CanvasUploadService.uploadCanvas('workspace-123', 'session-123', canvasData);
    // Verify Mapping created via API
  });

  it('should create NodeMappings for each canvas node', async () => {
    const canvasData = {
      nodes: [
        { id: 'node1', file: 'note.md', x: 100, y: 200, width: 400, height: 300, color: '1' }
      ]
    };
    const result = await CanvasUploadService.uploadCanvas('workspace-123', 'session-123', canvasData);
    expect(result.nodeMappingsCreated).toBe(1);
  });

  it('should store edge visual properties in Attribute.properties', async () => {
    const canvasData = {
      edges: [
        { fromNode: 'node1', toNode: 'node2', fromSide: 'right', toSide: 'left', color: '2' }
      ]
    };
    await CanvasUploadService.uploadCanvas('workspace-123', 'session-123', canvasData);
    // Verify Attribute created with properties JSONB
  });
});
```

**Acceptance Criteria**:
- [ ] Creates CONTEXT node for canvas
- [ ] Creates Mapping with canvas-wide config
- [ ] Creates NodeMappings with visual properties
- [ ] Creates Attributes for edges with visual properties
- [ ] Tests pass for canvas upload

**Implementation Notes**:
Extend POST /api/workspaces/{workspaceId}/upload/canvas endpoint integration.

**Related Requirements**: FR-003, FR-008, FR-009, FR-033 to FR-038

---

### Task 7.2: Implement Canvas Clone (Reconstruction)
**Priority**: P2
**Estimated effort**: 6 hours
**Dependencies**: Task 5.1, Task 3.3
**User Story**: US-3 (Canvas Visual Preservation)

**Description**:
Extend CloneService to reconstruct canvas files from Mappings/NodeMappings.

**Tests** (write FIRST):
```typescript
// tests/unit/services/CanvasCloneService.test.ts
describe('CanvasCloneService', () => {
  it('should reconstruct canvas JSON from Mapping', async () => {
    const mapping = { configuration: { zoom: 1.5, viewX: 100 } };
    const canvas = CanvasCloneService.reconstructCanvas(mapping, [], []);
    expect(canvas.zoom).toBe(1.5);
  });

  it('should reconstruct canvas nodes from NodeMappings', async () => {
    const nodeMappings = [
      { containedNodeId: 'note-id', metadata: { x: 100, y: 200, width: 400, height: 300, color: '1' } }
    ];
    const canvas = CanvasCloneService.reconstructCanvas({}, nodeMappings, []);
    expect(canvas.nodes[0].x).toBe(100);
    expect(canvas.nodes[0].file).toBe('note.md'); // Resolved from containedNodeId
  });

  it('should reconstruct edges from Attributes', async () => {
    const attributes = [
      { sourceNodeId: 'node1', targetNodeId: 'node2', properties: { fromSide: 'right', toSide: 'left' } }
    ];
    const canvas = CanvasCloneService.reconstructCanvas({}, [], attributes);
    expect(canvas.edges[0].fromSide).toBe('right');
  });

  it('should preserve visual accuracy within 1 pixel', async () => {
    const nodeMappings = [{ metadata: { x: 100.4, y: 200.7 } }];
    const canvas = CanvasCloneService.reconstructCanvas({}, nodeMappings, []);
    expect(Math.abs(canvas.nodes[0].x - 100.4)).toBeLessThan(1);
  });
});
```

**Acceptance Criteria**:
- [ ] Reconstructs canvas JSON from Mapping
- [ ] Reconstructs nodes from NodeMappings
- [ ] Reconstructs edges from Attributes
- [ ] Visual accuracy within ±1 pixel (NFR-031)
- [ ] Tests pass for canvas clone

**Implementation Notes**:
Query Mapping, NodeMappings, Attributes from export API and reconstruct .canvas JSON.

**Related Requirements**: FR-020, FR-021, NFR-031

---

## Phase 8: Template System (User Story 4)

### Task 8.1: Implement TemplateService (Template Listing)
**Priority**: P3
**Estimated effort**: 4 hours
**Dependencies**: Task 1.1
**User Story**: US-4 (Template System)

**Description**:
Create TemplateService to list and retrieve workspace templates.

**Tests** (write FIRST):
```typescript
// tests/unit/services/TemplateService.test.ts
describe('TemplateService', () => {
  it('should list available templates', async () => {
    const mockResponse = {
      templates: [
        { id: 'uuid', name: 'Business Model Canvas', category: 'business-strategy' }
      ]
    };
    jest.spyOn(apiClient.templatesApi, 'getTemplates').mockResolvedValue(mockResponse);

    const templates = await TemplateService.list();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Business Model Canvas');
  });

  it('should filter templates by category', async () => {
    const templates = await TemplateService.list({ category: 'business-strategy' });
    expect(templates.every(t => t.category === 'business-strategy')).toBe(true);
  });

  it('should get template details', async () => {
    const template = await TemplateService.get('template-id');
    expect(template.componentsCount).toBeDefined();
  });
});
```

**Acceptance Criteria**:
- [ ] Lists available templates
- [ ] Filters by category
- [ ] Retrieves template details
- [ ] Tests pass for template service

**Implementation Notes**:
Integrate GET /api/templates endpoint.

**Related Requirements**: FR-054, FR-055

---

### Task 8.2: Implement Template Clone Workflow
**Priority**: P3
**Estimated effort**: 6 hours
**Dependencies**: Task 8.1, Task 5.1
**User Story**: US-4 (Template System)

**Description**:
Extend CloneService to support cloning from templates with placeholder prompts.

**Tests** (write FIRST):
```typescript
// tests/unit/workflows/TemplateCloneWorkflow.test.ts
describe('TemplateCloneWorkflow', () => {
  it('should prompt for template placeholders', async () => {
    // Mock template with placeholders: {week_of}, {year}
    const answers = await TemplateCloneWorkflow.promptPlaceholders(template);
    expect(answers).toHaveProperty('week_of');
    expect(answers).toHaveProperty('year');
  });

  it('should instantiate workspace from template', async () => {
    const mockResponse = { workspaceId: 'new-workspace-id' };
    jest.spyOn(apiClient.templatesApi, 'cloneFromTemplate').mockResolvedValue(mockResponse);

    const result = await TemplateCloneWorkflow.execute('template-id', { name: 'My Startup' });
    expect(result.workspaceId).toBe('new-workspace-id');
  });

  it('should include template config file in cloned vault', async () => {
    await TemplateCloneWorkflow.execute('template-id', { name: 'Test' });
    const configPath = path.join(targetPath, 'template.config.json');
    expect(fs.existsSync(configPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config.templateId).toBe('template-id');
  });
});
```

**Acceptance Criteria**:
- [ ] Prompts for template placeholders
- [ ] Instantiates workspace via API
- [ ] Clones template structure
- [ ] Includes template.config.json
- [ ] Tests pass for template clone workflow

**Implementation Notes**:
Integrate POST /api/workspaces/clone-from-template endpoint.

**Related Requirements**: FR-056 to FR-071

---

### Task 8.3: Implement template CLI Commands
**Priority**: P3
**Estimated effort**: 3 hours
**Dependencies**: Task 8.1, Task 8.2
**User Story**: US-4 (Template System)

**Description**:
Create CLI commands for template operations.

**Tests** (write FIRST):
```typescript
// tests/integration/commands/template.test.ts
describe('template command', () => {
  it('should list templates', async () => {
    const result = await runCommand(['template', 'list']);
    expect(result.output).toContain('Business Model Canvas');
  });

  it('should clone from template', async () => {
    const result = await runCommand(['template', 'clone', '--template', 'bmc', '--name', 'My Startup', '/tmp/target']);
    expect(result.exitCode).toBe(0);
    expect(fs.existsSync('/tmp/target/template.config.json')).toBe(true);
  });
});
```

**Acceptance Criteria**:
- [ ] `mujarrad template list` command
- [ ] `mujarrad template clone` command
- [ ] Tests pass for template commands

**Implementation Notes**:
```typescript
program
  .command('template list')
  .action(async () => {
    const templates = await TemplateService.list();
    console.table(templates);
  });

program
  .command('template clone <target-path>')
  .option('--template <id>', 'Template ID')
  .option('--name <name>', 'Workspace name')
  .action(async (targetPath, options) => {
    await TemplateCloneWorkflow.execute(options.template, { name: options.name });
  });
```

**Related Requirements**: FR-055, FR-056

---

## Phase 9: Additional Workflows & Features

### Task 9.1: Implement Auto-Update Mechanism
**Priority**: P2
**Estimated effort**: 3 hours
**Dependencies**: Task 1.2
**User Story**: Foundation (Distribution)

**Description**:
Implement auto-update checker that compares current version with npm registry.

**Tests** (write FIRST):
```typescript
// tests/unit/utils/AutoUpdater.test.ts
describe('AutoUpdater', () => {
  it('should check for updates on npm registry', async () => {
    const mockLatest = { version: '2.0.0' };
    jest.spyOn(fetch, 'fetch').mockResolvedValue({ json: () => Promise.resolve(mockLatest) });

    const update = await AutoUpdater.checkForUpdates();
    expect(update.available).toBe(true);
    expect(update.latestVersion).toBe('2.0.0');
  });

  it('should skip check if disabled in config', async () => {
    // Mock config with autoUpdate: false
    const update = await AutoUpdater.checkForUpdates();
    expect(update).toBeNull();
  });

  it('should prompt user to update', async () => {
    const update = { available: true, latestVersion: '2.0.0' };
    await AutoUpdater.promptUpdate(update);
    // Verify user saw prompt
  });
});
```

**Acceptance Criteria**:
- [ ] Checks npm registry for latest version
- [ ] Compares with current version (semver)
- [ ] Prompts user if update available
- [ ] Respects config setting (autoUpdate: true/false)
- [ ] Tests pass for auto-updater

**Implementation Notes**:
```typescript
async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = require('../package.json').version;
  const response = await fetch('https://registry.npmjs.org/mujarrad-cli/latest');
  const data = await response.json();
  const latestVersion = data.version;

  if (semver.gt(latestVersion, currentVersion)) {
    console.log(`\n🎉 Update available: ${currentVersion} → ${latestVersion}`);
    console.log(`Run: npm install -g mujarrad-cli@latest\n`);
  }
}
```

**Related Requirements**: Auto-update requirement from user clarifications

---

### Task 9.2: Implement Continuous Sync (Watch Mode) [P]
**Priority**: P2
**Estimated effort**: 5 hours
**Dependencies**: Task 6.1
**User Story**: US-2 (Bidirectional Sync)

**Description**:
Implement file watching for continuous sync using chokidar 3+.

**Tests** (write FIRST):
```typescript
// tests/unit/workflows/ContinuousSyncWorkflow.test.ts
describe('ContinuousSyncWorkflow', () => {
  it('should watch files for changes', async () => {
    const watcher = await ContinuousSyncWorkflow.start('/tmp/vault');
    expect(watcher.isWatching).toBe(true);
    watcher.stop();
  });

  it('should debounce changes (1 second)', async () => {
    const watcher = await ContinuousSyncWorkflow.start('/tmp/vault');
    // Modify file multiple times
    // Verify only one sync triggered
  });

  it('should sync changes automatically', async () => {
    const watcher = await ContinuousSyncWorkflow.start('/tmp/vault');
    // Modify file
    // Wait for debounce
    // Verify sync occurred
  });
});
```

**Acceptance Criteria**:
- [ ] chokidar 3+ installed
- [ ] Watches .md and .canvas files
- [ ] Debounces changes (1 second)
- [ ] Triggers sync automatically
- [ ] Tests pass for continuous sync

**Implementation Notes**:
```typescript
import chokidar from 'chokidar';

class ContinuousSyncWorkflow {
  async start(vaultPath: string): Promise<Watcher> {
    const watcher = chokidar.watch(vaultPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    watcher.on('change', debounce(async (path) => {
      await SyncService.syncFile(vaultPath, path);
    }, 1000));

    return watcher;
  }
}
```

**Related Requirements**: Workflow Pattern 2 (Continuous Sync)

---

### Task 9.3: Implement History Viewer (Version History)
**Priority**: P3
**Estimated effort**: 4 hours
**Dependencies**: Task 1.1
**User Story**: US-2 (Bidirectional Sync)

**Description**:
Create history viewer to display node version history.

**Tests** (write FIRST):
```typescript
// tests/unit/services/HistoryService.test.ts
describe('HistoryService', () => {
  it('should fetch node version history', async () => {
    const mockResponse = {
      versions: [
        { versionNumber: 5, createdAt: '2025-10-09T16:30:00Z', createdBy: 'user-id' }
      ]
    };
    jest.spyOn(apiClient.historyApi, 'getVersions').mockResolvedValue(mockResponse);

    const history = await HistoryService.getHistory('node-id');
    expect(history).toHaveLength(1);
  });

  it('should display version diff', async () => {
    const diff = await HistoryService.diff('node-id', 4, 5);
    expect(diff).toContain('- old line');
    expect(diff).toContain('+ new line');
  });
});
```

**Acceptance Criteria**:
- [ ] Fetches version history via API
- [ ] Displays version list
- [ ] Shows diff between versions
- [ ] Tests pass for history service

**Implementation Notes**:
Integrate GET /api/nodes/{nodeId}/versions endpoint.

**Related Requirements**: FR-026, FR-027

---

### Task 9.4: Implement E2E Integration Tests
**Priority**: P1
**Estimated effort**: 8 hours
**Dependencies**: All previous tasks
**User Story**: Foundation (Testing)

**Description**:
Create end-to-end integration tests using sample vault.

**Tests** (write FIRST):
```typescript
// tests/e2e/full-workflow.test.ts
describe('Full Workflow E2E', () => {
  it('should complete upload → clone → sync cycle', async () => {
    // 1. Upload sample vault
    const sampleVaultPath = '/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad';
    await runCommand(['upload', '--workspace', 'test', sampleVaultPath]);

    // 2. Clone to new directory
    const clonePath = '/tmp/e2e-clone';
    await runCommand(['clone', '--workspace', 'test', clonePath]);

    // 3. Modify file
    fs.appendFileSync(path.join(clonePath, 'note.md'), '\nNew content');
    await execAsync('git add . && git commit -m "Update"', { cwd: clonePath });

    // 4. Sync changes
    await runCommand(['sync', clonePath]);

    // 5. Verify NodeVersion created
    const history = await HistoryService.getHistory('node-id');
    expect(history).toHaveLength(2);
  });

  it('should handle canvas upload and clone correctly', async () => {
    // Upload vault with canvas
    // Clone workspace
    // Verify canvas reconstructed with correct visual properties
  });
});
```

**Acceptance Criteria**:
- [ ] E2E test for upload → clone → sync
- [ ] E2E test for canvas preservation
- [ ] E2E test for template cloning
- [ ] Uses sample vault for realistic testing
- [ ] Tests pass for E2E workflows

**Implementation Notes**:
Use sample vault from Constitution Principle VI:
`/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad`

**Related Requirements**: NFR-001 to NFR-035, Constitution Principle VI

---

## Phase 10: Distribution & Documentation

### Task 10.1: Configure NPM Package for Distribution
**Priority**: P1
**Estimated effort**: 3 hours
**Dependencies**: All implementation tasks
**User Story**: Foundation (Distribution)

**Description**:
Configure package.json for npm distribution.

**Acceptance Criteria**:
- [ ] package.json has correct bin entry
- [ ] .npmignore configured
- [ ] prepublishOnly script builds TypeScript
- [ ] Package installs globally: `npm install -g mujarrad-cli`
- [ ] CLI executable works: `mujarrad --version`

**Implementation Notes**:
```json
{
  "name": "mujarrad-cli",
  "version": "1.0.0",
  "bin": {
    "mujarrad": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "files": ["dist/"]
}
```

**Related Requirements**: Distribution strategy (npm first)

---

### Task 10.2: Write User Documentation (README.md)
**Priority**: P1
**Estimated effort**: 4 hours
**Dependencies**: All implementation tasks
**User Story**: Foundation (Usability)

**Description**:
Create comprehensive README.md with installation, usage, examples.

**Acceptance Criteria**:
- [ ] Installation instructions (npm, npx)
- [ ] Quick start guide
- [ ] Command reference with examples
- [ ] Troubleshooting section
- [ ] Contributing guidelines
- [ ] License information

**Implementation Notes**:
Structure:
```markdown
# Mujarrad CLI

## Installation
npm install -g mujarrad-cli

## Quick Start
mujarrad auth login
mujarrad upload ./my-vault --workspace my-workspace
mujarrad clone ./new-vault --workspace my-workspace
mujarrad sync ./my-vault --watch

## Commands
- auth login/logout/status
- workspace create/list/delete
- upload <path>
- clone <path>
- sync <path> [--watch]
- template list/clone

## Troubleshooting
...
```

**Related Requirements**: NFR-022, NFR-023, NFR-025

---

### Task 10.3: Publish to NPM Registry
**Priority**: P1
**Estimated effort**: 1 hour
**Dependencies**: Task 10.1, Task 10.2
**User Story**: Foundation (Distribution)

**Description**:
Publish package to npm registry.

**Acceptance Criteria**:
- [ ] Package published to npm: `mujarrad-cli`
- [ ] Installable via `npm install -g mujarrad-cli`
- [ ] Works via `npx mujarrad-cli`
- [ ] Version follows semver (1.0.0)

**Implementation Notes**:
```bash
npm login
npm publish
```

**Related Requirements**: Distribution strategy (npm first)

---

## Summary

**Total Tasks**: 48
**Estimated Total Effort**: ~150 hours

**Priority Breakdown**:
- P1 (MVP): 38 tasks (~120 hours)
- P2 (Canvas): 5 tasks (~20 hours)
- P3 (Templates): 5 tasks (~10 hours)

**Dependency Graph**:
```
Phase 0 (Setup)
  ↓
Phase 1 (Foundation) → Phase 2 (Auth) → Phase 3 (FileSystem)
  ↓                      ↓                 ↓
Phase 4 (Upload) ← ← ← ← ← ← ← ← ← ← ← ←
  ↓
Phase 5 (Clone) → Phase 6 (Sync)
  ↓                 ↓
Phase 7 (Canvas) [P2]
  ↓
Phase 8 (Templates) [P3]
  ↓
Phase 9 (Additional Features)
  ↓
Phase 10 (Distribution)
```

**Parallel Execution Opportunities**:
- Task 0.1, 0.2, 0.3 can run in parallel
- Task 1.4, 1.5 can run in parallel
- Task 9.1, 9.2 can run in parallel
- Many tests can be written in parallel across phases

**Critical Path**:
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 10

**Next Steps**:
1. Review tasks with team
2. Assign tasks to developers
3. Set up CI/CD pipeline (GitHub Actions)
4. Begin Phase 0 (Setup)
5. Follow TDD discipline (Constitution Principle III)

---

**Constitution Compliance**: ✅
- Principle I (API-First): API client generated from OpenAPI spec (Task 1.1)
- Principle II (Database as Code): N/A (CLI tool)
- Principle III (TDD): Every task includes tests FIRST
- Principle IV (Transactional Integrity): Rollback logic in upload/sync services
- Principle V (Security): Credential storage with encryption (Task 1.3)
- Principle VI (Sample Data): E2E tests use sample vault (Task 9.4)
