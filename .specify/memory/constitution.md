<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0 (new principle added)
Modified Principles: N/A
Added Sections:
  - Core Principles: Added Principle VI (Sample Data & Live Reference)
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check section already references this file
  ✅ spec-template.md - No changes needed (sample data note is implementation detail)
  ✅ tasks-template.md - Testing tasks should reference sample vault for integration tests
Follow-up TODOs:
  - Update test plan to incorporate sample vault for realistic data scenarios
  - Consider adding sample vault path to application-dev.yml for test data loading
-->

# Mujarrad Backend Constitution

## Core Principles

### I. API-First Design

All features MUST be designed as REST API endpoints before implementation. API contracts (OpenAPI specifications) MUST be defined, reviewed, and approved before any service logic is written. The API contract serves as the single source of truth for both backend implementation and CLI tool integration.

**Rationale**: The backend serves a separate CLI tool. Clear API contracts prevent integration issues and enable parallel development of backend and CLI.

**Non-Negotiable Requirements**:
- OpenAPI 3.0 specification MUST exist in `specs/{feature}/contracts/` before coding begins
- API changes MUST increment contract version semantically
- Breaking changes require MAJOR version bump and deprecation period

### II. Database Schema as Code

All database changes MUST be versioned migrations in `src/main/resources/db/migration/`. Direct database modifications are forbidden. Schema changes require review for backward compatibility and rollback safety.

**Rationale**: PostgreSQL serves as system of record. Uncontrolled schema changes cause data loss and deployment failures.

**Non-Negotiable Requirements**:
- Flyway/Liquibase migrations MUST be sequentially numbered
- Migrations MUST be idempotent and include rollback scripts
- JSONB fields (NodeMapping.metadata, Mapping.configuration, Attribute.properties, NodeVersion.properties) MUST have documented schemas

### III. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation. The development cycle is: Write failing test → Implement minimal code → Test passes → Refactor. No feature is complete without unit tests (80% coverage minimum), integration tests (database operations), and contract tests (API endpoints).

**Rationale**: Complex data models (Node, Attribute, Mapping, NodeMapping) and bidirectional sync logic are error-prone. TDD prevents regressions and documents intended behavior.

**Non-Negotiable Requirements**:
- Unit tests MUST cover all service layer methods
- Integration tests MUST verify database constraints and JSONB operations
- Contract tests MUST validate OpenAPI specification compliance
- TestContainers MUST be used for database integration tests

### IV. Transactional Integrity

All operations that modify multiple entities MUST execute within database transactions. Partial failures MUST trigger rollback. Operations spanning multiple API calls MUST use session entities (UploadSession, SyncSession) to track progress and enable recovery.

**Rationale**: NFR-011 requires all-or-nothing semantics. Batch uploads of 1000 files cannot leave database in inconsistent state if file 847 fails.

**Non-Negotiable Requirements**:
- `@Transactional` annotation required on all write operations
- Batch operations MUST support resume via session tracking
- Error responses MUST indicate whether rollback occurred

### V. Security by Default

Authentication MUST be enforced on all endpoints except health checks. API tokens MUST be stored hashed. Space access MUST be verified before any operation. User-provided data MUST be validated and sanitized before database operations.

**Rationale**: NFR-017, NFR-018, NFR-020 require HTTPS, no plaintext credentials, and space-level access control.

**Non-Negotiable Requirements**:
- Spring Security MUST protect all `/api/**` endpoints
- Passwords/tokens MUST use BCrypt or Argon2
- Space ownership MUST be verified in service layer (not just controller)
- SQL injection prevention via JPA prepared statements

### VI. Sample Data & Live Reference

All domain-specific content (business modeling, project management, entrepreneurship frameworks) referenced in specifications is SAMPLE DATA ONLY. This content originates from a live Obsidian vault that serves as both reference documentation and realistic test data source.

**Rationale**: Business Model Canvas, Value Proposition Canvas, and similar frameworks mentioned in specs are examples demonstrating the system's capabilities, not production data. The sample vault provides real-world structure for integration testing and ensures specifications remain grounded in actual use cases.

**Non-Negotiable Requirements**:
- Sample vault location: `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad`
- Sample data MUST NOT be committed to this repository or included in production builds
- Integration tests MAY reference sample vault for realistic test scenarios (e.g., uploading 1000-file vault)
- Specifications using domain examples (BMC, VPC) MUST include disclaimer: "Sample data for demonstration only"
- Production deployments MUST NOT include sample business content in seed data

**Sample Vault Contents**:
- Business Model Canvas (`.canvas` files and structured notes)
- Value Proposition Canvas
- Entrepreneurship and project management frameworks
- Nested folder structures (realistic depth and breadth)
- Wikilink relationships (demonstrating graph complexity)

**Testing Usage**:
```java
// Example integration test using sample vault
@Test
void shouldUploadRealWorldBusinessModelCanvasVault() {
    Path sampleVault = Paths.get("/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad");
    List<File> files = Files.walk(sampleVault)
        .filter(p -> p.toString().endsWith(".md") || p.toString().endsWith(".canvas"))
        .map(Path::toFile)
        .collect(Collectors.toList());

    UploadSessionResponse response = uploadService.uploadBatch(spaceId, files);

    // Verify realistic performance with actual business content
    assertThat(response.getProcessedFiles()).isGreaterThan(50);
    assertThat(response.getStatus()).isEqualTo(SessionStatus.COMPLETED);
}
```

## API Design Standards

### REST Conventions

- Resource naming: plural nouns (`/spaces`, `/nodes`, not `/space`, `/node`)
- HTTP verbs: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
- Status codes: 200 (success), 201 (created), 204 (no content), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)
- Error responses MUST include `code`, `message`, `timestamp` fields per spec (lines 911-921)

### Versioning Strategy

- URI versioning: `/api/v1/spaces`, `/api/v2/spaces`
- Version increments:
  - v1 → v2: Breaking change (field removed, type changed, endpoint removed)
  - v1.1: Non-breaking addition (new optional field, new endpoint)
- Deprecation: 6-month notice before removal, documented in OpenAPI `deprecated: true`

### Response Format

All successful responses MUST follow:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "ISO-8601"
}
```

All error responses MUST follow:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "ISO-8601"
  }
}
```

### Performance Requirements

- API response time MUST be <500ms p95 (NFR-004)
- Pagination MUST be supported for list endpoints (default page size: 20, max: 100)
- JSONB queries MUST use GIN indexes for performance

## Quality & Testing Requirements

### Test Coverage

- **Unit Tests**: 80% line coverage minimum, 90% for service layer
- **Integration Tests**: All repository methods with database interactions
- **Contract Tests**: All API endpoints validated against OpenAPI spec
- **Performance Tests**: Upload 1000 files in <5 minutes (NFR-001), clone 1000 nodes in <3 minutes (NFR-002)

### Code Quality Gates

All pull requests MUST pass:
1. Compilation with zero warnings
2. All tests passing (unit + integration + contract)
3. Code coverage threshold met
4. Static analysis (SpotBugs, Checkstyle)
5. Security scan (OWASP Dependency Check)

### Documentation Requirements

- Every public API endpoint MUST have OpenAPI documentation
- Every service method MUST have Javadoc explaining purpose, parameters, return value, exceptions
- Database migrations MUST include comments explaining schema changes
- README MUST be updated when new environment variables are added

## Governance

### Amendment Process

Constitution changes require:
1. Proposal documented in issue/PR with rationale
2. Review by at least 2 team members
3. Version bump according to semantic versioning:
   - **MAJOR**: Principle removed or redefined (breaking governance change)
   - **MINOR**: New principle added or existing principle materially expanded
   - **PATCH**: Clarifications, wording improvements, typo fixes
4. Update all dependent templates (plan, spec, tasks) for consistency
5. Sync Impact Report prepended to constitution file

### Compliance Review

- All PRs MUST reference constitution principles being followed
- Violations MUST be justified in "Complexity Tracking" section of plan.md
- Architectural Decision Records (ADRs) MUST document when principles conflict and how trade-offs were resolved

### Enforcement

- Constitution supersedes all other project practices
- CI pipeline MUST fail if quality gates not met
- Deployment to production requires passing all NFR performance benchmarks

### Living Document

This constitution evolves with the project. When principles prove impractical or new requirements emerge, amend rather than ignore. Technical debt is acceptable with explicit justification and repayment plan.

**Version**: 1.1.0 | **Ratified**: 2025-10-09 | **Last Amended**: 2025-10-09
