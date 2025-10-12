# Data Model: CLI Observability & Alpha Release Management

**Feature**: 008-from-cli-side
**Date**: 2025-10-12
**Status**: Phase 1 Complete

## Overview

This document defines the data entities, state models, and validation rules for the CLI observability feature. These entities represent in-memory state and file-system persisted data (logs, config) - they do NOT represent database tables since this is a CLI-only feature.

---

## Entity Definitions

### 1. LogSession

**Purpose**: Represents a single CLI command execution session with unique identifier and lifecycle tracking.

**Storage**: In-memory during execution, persisted to log files as metadata field

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| sessionId | string (UUID v4) | Yes | Unique identifier for CLI session | Must be valid UUID v4 format |
| commandName | string | Yes | CLI command executed (e.g., "upload", "auth login") | Non-empty string, max 100 chars |
| startTime | string (ISO 8601) | Yes | Session start timestamp | Valid ISO 8601 format with milliseconds |
| endTime | string (ISO 8601) | No | Session end timestamp | Valid ISO 8601, must be >= startTime |
| exitCode | number | No | Process exit code (0 = success, non-zero = error) | Integer, typically 0-255 |
| metadata | object | No | Additional session context | See SessionMetadata schema below |

**SessionMetadata Schema**:
```typescript
interface SessionMetadata {
  cliVersion: string;           // e.g., "1.0.0-alpha.1"
  nodeVersion: string;           // e.g., "18.19.0"
  platform: string;              // process.platform (darwin, linux, win32)
  workingDirectory: string;      // process.cwd()
  environment: 'development' | 'production' | 'ci';
  userId?: string;               // If authenticated
  workspaceSlug?: string;        // If command targets a workspace
}
```

**State Transitions**:
```
CREATED → RUNNING → COMPLETED (exit code 0)
                  → FAILED (exit code non-zero)
                  → INTERRUPTED (SIGINT, SIGTERM)
```

**Relationships**:
- One LogSession has many LogEntry records (1:N)
- One LogSession associated with zero or one AlphaDisclaimer acknowledgment event

**TypeScript Interface**:
```typescript
export interface LogSession {
  sessionId: string;
  commandName: string;
  startTime: string;
  endTime?: string;
  exitCode?: number;
  metadata?: SessionMetadata;
}

export interface SessionMetadata {
  cliVersion: string;
  nodeVersion: string;
  platform: string;
  workingDirectory: string;
  environment: 'development' | 'production' | 'ci';
  userId?: string;
  workspaceSlug?: string;
}
```

**Validation Rules**:
```typescript
function validateLogSession(session: LogSession): ValidationResult {
  // sessionId must be valid UUID v4
  if (!isValidUUID(session.sessionId)) {
    return { valid: false, error: 'Invalid session ID format' };
  }

  // commandName required and non-empty
  if (!session.commandName || session.commandName.trim().length === 0) {
    return { valid: false, error: 'Command name is required' };
  }

  // startTime must be valid ISO 8601
  if (!isValidISO8601(session.startTime)) {
    return { valid: false, error: 'Invalid start time format' };
  }

  // endTime must be after startTime if present
  if (session.endTime && new Date(session.endTime) < new Date(session.startTime)) {
    return { valid: false, error: 'End time must be after start time' };
  }

  return { valid: true };
}
```

**Lifecycle Management**:
```typescript
class SessionManager {
  createSession(commandName: string): LogSession {
    return {
      sessionId: crypto.randomUUID(),
      commandName,
      startTime: new Date().toISOString(),
      metadata: {
        cliVersion: getVersion(),
        nodeVersion: process.version,
        platform: process.platform,
        workingDirectory: process.cwd(),
        environment: detectEnvironment()
      }
    };
  }

  endSession(session: LogSession, exitCode: number): LogSession {
    return {
      ...session,
      endTime: new Date().toISOString(),
      exitCode
    };
  }
}
```

---

### 2. LogEntry

**Purpose**: Individual log record within a session, representing a single logging event with structured metadata.

**Storage**: Persisted to `~/.mujarrad/logs/mujarrad-{pid}-YYYY-MM-DD.log` as JSON lines

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| timestamp | string (ISO 8601) | Yes | Log entry creation time | Valid ISO 8601 with milliseconds |
| level | string (enum) | Yes | Log level | Must be: debug, info, warn, error |
| sessionId | string (UUID v4) | Yes | Associated session ID | Must match parent LogSession.sessionId |
| source | string | Yes | Module/component name | Non-empty, e.g., "AuthService", "UploadService" |
| message | string | Yes | Human-readable log message | Non-empty, max 1000 chars |
| metadata | object | No | Structured additional data | See LogEntryMetadata schema |

**LogEntryMetadata Schema**:
```typescript
interface LogEntryMetadata {
  // API request details (if applicable)
  apiRequest?: {
    method: string;              // GET, POST, PUT, DELETE
    url: string;                 // Full URL
    headers: Record<string, string>;  // Redacted headers
    body?: any;                  // Request payload (redacted)
  };

  // API response details (if applicable)
  apiResponse?: {
    status: number;              // HTTP status code
    headers: Record<string, string>;
    body?: any;                  // Response payload
    duration: number;            // Request duration in ms
  };

  // Error details (if applicable)
  error?: {
    name: string;                // Error class name
    message: string;             // Error message
    stack?: string;              // Stack trace
    code?: string;               // Error code (e.g., ENOENT, ECONNREFUSED)
  };

  // File system operation details (if applicable)
  filePath?: string;             // File being operated on
  operation?: string;            // Operation type: read, write, delete, upload
  fileSize?: number;             // File size in bytes
  filesProcessed?: number;       // Count of files processed so far
  filesTotal?: number;           // Total files to process
}
```

**TypeScript Interface**:
```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  sessionId: string;
  source: string;
  message: string;
  metadata?: LogEntryMetadata;
}

export interface LogEntryMetadata {
  apiRequest?: ApiRequest;
  apiResponse?: ApiResponse;
  error?: ErrorDetails;
  filePath?: string;
  operation?: string;
  fileSize?: number;
  filesProcessed?: number;
  filesTotal?: number;
}
```

**Validation Rules**:
```typescript
function validateLogEntry(entry: LogEntry, session: LogSession): ValidationResult {
  // Level must be valid
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (!validLevels.includes(entry.level)) {
    return { valid: false, error: 'Invalid log level' };
  }

  // Timestamp must be within session timeframe
  const entryTime = new Date(entry.timestamp);
  const sessionStart = new Date(session.startTime);
  const sessionEnd = session.endTime ? new Date(session.endTime) : new Date();

  if (entryTime < sessionStart || entryTime > sessionEnd) {
    return { valid: false, error: 'Log entry timestamp outside session timeframe' };
  }

  // SessionId must match
  if (entry.sessionId !== session.sessionId) {
    return { valid: false, error: 'Session ID mismatch' };
  }

  return { valid: true };
}
```

**Winston Integration**:
```typescript
// Logs are automatically formatted by winston with these fields
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  )
});

// Create child logger with session ID
const sessionLogger = logger.child({ sessionId: session.sessionId });

// All logs include session context automatically
sessionLogger.info('File uploaded', {
  source: 'UploadService',
  metadata: {
    filePath: '/path/to/file.md',
    operation: 'upload',
    fileSize: 1024
  }
});
```

**Log File Format** (JSON Lines):
```json
{"timestamp":"2025-10-12T14:30:00.123Z","level":"info","sessionId":"abc123","source":"AuthService","message":"User authenticated","metadata":{"userId":"user-123"}}
{"timestamp":"2025-10-12T14:30:01.456Z","level":"debug","sessionId":"abc123","source":"UploadService","message":"Uploading file","metadata":{"filePath":"/vault/note.md","fileSize":2048}}
{"timestamp":"2025-10-12T14:30:02.789Z","level":"error","sessionId":"abc123","source":"UploadService","message":"Upload failed","metadata":{"error":{"name":"AxiosError","message":"Network error","code":"ECONNREFUSED"}}}
```

---

### 3. AlphaDisclaimer

**Purpose**: Tracks user acknowledgment of alpha/beta version disclaimers with version-level granularity.

**Storage**: Persisted to `~/.mujarrad/config.json` as part of Config object

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| acknowledgedVersion | string (semver) | Yes | Version acknowledged (e.g., "1.0.0-alpha.1") | Valid semantic version |
| acknowledgedAt | string (ISO 8601) | Yes | Timestamp of acknowledgment | Valid ISO 8601 |
| versionLevel | string (enum) | Yes | Prerelease level acknowledged | Must be: alpha, beta, stable |

**TypeScript Interface**:
```typescript
export type VersionLevel = 'alpha' | 'beta' | 'stable';

export interface AlphaDisclaimer {
  acknowledgedVersion: string;
  acknowledgedAt: string;
  versionLevel: VersionLevel;
}
```

**Storage Location**: `~/.mujarrad/config.json`
```json
{
  "apiBaseUrl": "https://mujarrad.onrender.com",
  "autoSync": false,
  "logLevel": "info",
  "disclaimerAcknowledgment": {
    "acknowledgedVersion": "1.0.0-alpha.1",
    "acknowledgedAt": "2025-10-12T14:30:00.000Z",
    "versionLevel": "alpha"
  }
}
```

**Lifecycle**:
```
[No acknowledgment] → PROMPTED → ACKNOWLEDGED → [Version level changes] → PROMPTED again
```

**Business Logic**:
```typescript
function shouldShowDisclaimer(
  currentVersion: string,
  acknowledgment?: AlphaDisclaimer
): boolean {
  // First run - no acknowledgment exists
  if (!acknowledgment) {
    return true;
  }

  const current = parseVersion(currentVersion);
  const acknowledged = parseVersion(acknowledgment.acknowledgedVersion);

  // Show disclaimer if transitioning to different prerelease level
  if (current.level !== acknowledged.level) {
    return true;
  }

  // Don't show for same level updates (alpha.1 → alpha.2)
  return false;
}

function parseVersion(version: string): { level: VersionLevel } {
  if (version.includes('alpha')) return { level: 'alpha' };
  if (version.includes('beta')) return { level: 'beta' };
  return { level: 'stable' };
}
```

**Validation Rules**:
```typescript
function validateAlphaDisclaimer(disclaimer: AlphaDisclaimer): ValidationResult {
  // Version must be valid semver
  if (!isValidSemver(disclaimer.acknowledgedVersion)) {
    return { valid: false, error: 'Invalid semantic version format' };
  }

  // Timestamp must be valid ISO 8601
  if (!isValidISO8601(disclaimer.acknowledgedAt)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  // Version level must match version string
  const parsedLevel = parseVersion(disclaimer.acknowledgedVersion).level;
  if (parsedLevel !== disclaimer.versionLevel) {
    return { valid: false, error: 'Version level mismatch' };
  }

  return { valid: true };
}
```

---

### 4. LogExport

**Purpose**: Metadata for compressed log archive exports with integrity tracking.

**Storage**: In-memory during export operation, saved as `export-metadata.json` inside archive

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| exportedAt | string (ISO 8601) | Yes | Export creation timestamp | Valid ISO 8601 |
| timeRange | object | Yes | Log file date range included | See TimeRange schema |
| includedSessions | number | Yes | Count of sessions in export | Non-negative integer |
| compressionRatio | number | Yes | Compression efficiency (0-1) | Between 0 and 1 |
| archivePath | string | Yes | Output file path | Valid file system path |
| toolVersion | string | Yes | CLI version that created export | Valid semver |
| uncompressedSize | number | Yes | Total size before compression (bytes) | Positive integer |
| compressedSize | number | Yes | Archive size after compression (bytes) | Positive integer, <= uncompressedSize |

**TimeRange Schema**:
```typescript
interface TimeRange {
  from: string;  // ISO 8601 - earliest log entry
  to: string;    // ISO 8601 - latest log entry
}
```

**TypeScript Interface**:
```typescript
export interface LogExport {
  exportedAt: string;
  timeRange: TimeRange;
  includedSessions: number;
  compressionRatio: number;
  archivePath: string;
  toolVersion: string;
  uncompressedSize: number;
  compressedSize: number;
}

export interface TimeRange {
  from: string;
  to: string;
}
```

**Archive Structure**:
```
mujarrad-logs-2025-10-12.zip
├── export-metadata.json    # LogExport entity serialized
├── README.txt               # Human-readable instructions
└── logs/
    ├── mujarrad-12345-2025-10-10.log
    ├── mujarrad-12345-2025-10-11.log
    └── mujarrad-12345-2025-10-12.log
```

**export-metadata.json Format**:
```json
{
  "exportedAt": "2025-10-12T16:45:00.000Z",
  "timeRange": {
    "from": "2025-10-10T00:00:00.000Z",
    "to": "2025-10-12T23:59:59.999Z"
  },
  "includedSessions": 47,
  "compressionRatio": 0.82,
  "archivePath": "/Users/user/mujarrad-logs-2025-10-12.zip",
  "toolVersion": "1.0.0-alpha.1",
  "uncompressedSize": 52428800,
  "compressedSize": 9437184
}
```

**Validation Rules**:
```typescript
function validateLogExport(logExport: LogExport): ValidationResult {
  // Compression ratio must be between 0 and 1
  if (logExport.compressionRatio < 0 || logExport.compressionRatio > 1) {
    return { valid: false, error: 'Invalid compression ratio' };
  }

  // Compressed size must be <= uncompressed size
  if (logExport.compressedSize > logExport.uncompressedSize) {
    return { valid: false, error: 'Compressed size cannot exceed uncompressed size' };
  }

  // Time range 'to' must be after 'from'
  if (new Date(logExport.timeRange.to) < new Date(logExport.timeRange.from)) {
    return { valid: false, error: 'Invalid time range' };
  }

  // Archive path must exist
  if (!fs.existsSync(logExport.archivePath)) {
    return { valid: false, error: 'Archive file not found' };
  }

  return { valid: true };
}
```

**Business Logic**:
```typescript
async function createLogExport(
  logDir: string,
  outputPath: string,
  options: ExportOptions
): Promise<LogExport> {
  const logFiles = await findLogFiles(logDir, options.since);
  const uncompressedSize = await calculateTotalSize(logFiles);

  await compressLogs(logFiles, outputPath);

  const compressedSize = (await fs.stat(outputPath)).size;
  const compressionRatio = 1 - (compressedSize / uncompressedSize);

  return {
    exportedAt: new Date().toISOString(),
    timeRange: {
      from: options.since || findEarliestTimestamp(logFiles),
      to: new Date().toISOString()
    },
    includedSessions: await countSessions(logFiles),
    compressionRatio,
    archivePath: outputPath,
    toolVersion: getVersion(),
    uncompressedSize,
    compressedSize
  };
}
```

---

### 5. TestReport

**Purpose**: Integration test execution results for pre-release validation.

**Storage**: Output to `tests/reports/test-report-{timestamp}.json` and human-readable markdown

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| reportId | string (UUID v4) | Yes | Unique test report identifier | Valid UUID v4 |
| executedAt | string (ISO 8601) | Yes | Test execution timestamp | Valid ISO 8601 |
| environment | string (enum) | Yes | Test environment | Must be: staging, production |
| results | array | Yes | Test case results | See TestResult schema |
| overallStatus | string (enum) | Yes | Aggregate status | Must be: PASS, FAIL |
| duration | number | Yes | Total execution time (ms) | Positive integer |
| cliVersion | string | Yes | CLI version being tested | Valid semver |

**TestResult Schema**:
```typescript
interface TestResult {
  commandName: string;      // e.g., "auth login", "upload"
  testCaseName: string;     // e.g., "should authenticate with valid credentials"
  status: 'PASS' | 'FAIL';
  duration: number;         // Test duration in ms
  error?: {
    message: string;
    stack?: string;
  };
}
```

**TypeScript Interface**:
```typescript
export type TestEnvironment = 'staging' | 'production';
export type TestStatus = 'PASS' | 'FAIL';

export interface TestReport {
  reportId: string;
  executedAt: string;
  environment: TestEnvironment;
  results: TestResult[];
  overallStatus: TestStatus;
  duration: number;
  cliVersion: string;
}

export interface TestResult {
  commandName: string;
  testCaseName: string;
  status: TestStatus;
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}
```

**Output Formats**:

**JSON** (`test-report-2025-10-12T14-30-00.json`):
```json
{
  "reportId": "abc-123-def-456",
  "executedAt": "2025-10-12T14:30:00.000Z",
  "environment": "staging",
  "results": [
    {
      "commandName": "auth login",
      "testCaseName": "should authenticate with valid credentials",
      "status": "PASS",
      "duration": 1234
    },
    {
      "commandName": "upload",
      "testCaseName": "should upload vault with 100 files",
      "status": "FAIL",
      "duration": 5678,
      "error": {
        "message": "Network timeout",
        "stack": "Error: Network timeout\n  at UploadService..."
      }
    }
  ],
  "overallStatus": "FAIL",
  "duration": 67890,
  "cliVersion": "1.0.0-alpha.1"
}
```

**Markdown** (`test-report-2025-10-12T14-30-00.md`):
```markdown
# Integration Test Report

**Report ID**: abc-123-def-456
**Executed**: 2025-10-12T14:30:00.000Z
**Environment**: staging
**CLI Version**: 1.0.0-alpha.1
**Overall Status**: ❌ FAIL
**Total Duration**: 67.89s

## Test Results

### ✅ auth login
- ✅ should authenticate with valid credentials (1.23s)

### ❌ upload
- ❌ should upload vault with 100 files (5.68s)
  - Error: Network timeout

## Summary

- Total Tests: 2
- Passed: 1 (50%)
- Failed: 1 (50%)
- Duration: 67.89s
```

**Validation Rules**:
```typescript
function validateTestReport(report: TestReport): ValidationResult {
  // All test results must have valid status
  for (const result of report.results) {
    if (!['PASS', 'FAIL'].includes(result.status)) {
      return { valid: false, error: `Invalid test status: ${result.status}` };
    }
  }

  // Overall status must match individual results
  const hasFailures = report.results.some(r => r.status === 'FAIL');
  const expectedStatus = hasFailures ? 'FAIL' : 'PASS';

  if (report.overallStatus !== expectedStatus) {
    return { valid: false, error: 'Overall status mismatch' };
  }

  // Duration must be >= sum of individual test durations
  const sumDuration = report.results.reduce((sum, r) => sum + r.duration, 0);
  if (report.duration < sumDuration) {
    return { valid: false, error: 'Invalid total duration' };
  }

  return { valid: true };
}
```

---

## Entity Relationships

```
LogSession (1) ──────── (*) LogEntry
    │
    │ (associated with)
    │
    ▼
AlphaDisclaimer (0..1)

LogExport (standalone)
    │
    │ (references)
    │
    ▼
LogEntry files (*)

TestReport (standalone)
    │
    │ (contains)
    │
    ▼
TestResult (*)
```

---

## File System Layout

```
~/.mujarrad/
├── config.json              # Contains AlphaDisclaimer
├── logs/
│   ├── mujarrad-12345-2025-10-10.log    # LogEntry JSON lines (process 12345)
│   ├── mujarrad-12345-2025-10-11.log
│   ├── mujarrad-67890-2025-10-12.log    # Different process
│   └── .audit-12345.json                # Winston rotation audit (per process)
└── exports/
    └── mujarrad-logs-2025-10-12.zip     # LogExport archive

tests/reports/
├── test-report-2025-10-12T14-30-00.json   # TestReport JSON
└── test-report-2025-10-12T14-30-00.md     # TestReport Markdown
```

---

## State Diagrams

### LogSession State Machine

```
┌─────────┐
│ CREATED │
└────┬────┘
     │ (command starts)
     ▼
┌─────────┐
│ RUNNING │
└────┬────┘
     │
     ├──(exit code 0)───────► [ COMPLETED ]
     │
     ├──(exit code != 0)────► [ FAILED ]
     │
     └──(SIGINT/SIGTERM)────► [ INTERRUPTED ]
```

### AlphaDisclaimer Lifecycle

```
┌────────────────┐
│ No Acknowledge │
└───────┬────────┘
        │ (first run or level change)
        ▼
┌────────────┐
│  PROMPTED  │
└─────┬──────┘
      │ (user accepts)
      ▼
┌──────────────┐
│ ACKNOWLEDGED │──────┐
└──────┬───────┘      │ (same level update: alpha.1 → alpha.2)
       │              │
       │ (level       └──► [No prompt, stay ACKNOWLEDGED]
       │  change:
       │  alpha → beta)
       │
       └──────────────────► Back to PROMPTED
```

### LogExport Creation Flow

```
START
  │
  ▼
[ Scan log directory ]
  │
  ▼
[ Filter by date range ]
  │
  ▼
[ Calculate uncompressed size ]
  │
  ▼
[ Create ZIP archive ]
  │
  ▼
[ Add metadata.json ]
  │
  ▼
[ Add README.txt ]
  │
  ▼
[ Add log files ]
  │
  ▼
[ Finalize archive ]
  │
  ▼
[ Calculate compressed size ]
  │
  ▼
[ Return LogExport metadata ]
  │
  ▼
END
```

---

## Summary

**Total Entities**: 5
- **LogSession**: CLI command execution tracking
- **LogEntry**: Individual log records with structured metadata
- **AlphaDisclaimer**: Version disclaimer acknowledgment
- **LogExport**: Compressed log archive metadata
- **TestReport**: Integration test results

**Storage Locations**:
- `~/.mujarrad/logs/`: Log files (JSON lines)
- `~/.mujarrad/config.json`: Config including AlphaDisclaimer
- `~/.mujarrad/exports/`: Compressed log archives
- `tests/reports/`: Test execution reports

**Key Patterns**:
- Session-based logging with UUID correlation
- File-based persistence (no database)
- JSON serialization for all entities
- Validation at entity boundaries
- State machines for lifecycle management
