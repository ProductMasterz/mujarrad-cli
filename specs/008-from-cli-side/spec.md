# Feature Specification: CLI Observability, Documentation & Alpha Release Management

**Feature Branch**: `008-from-cli-side`
**Created**: 2025-10-12
**Status**: Draft
**Input**: User description: "from CLI side there are a lot missing things, like logging of what is happening behind seen, logging tracking to be able export details about what has happened in the most recent operations to be able to debug. During installation of npm package it should show some progress with the logo of Mujarrad. Also there has to be some CLI documentation so that the user understands what is happening. And finally we have to test every command here before releasing each packge to trial and error until we have a stable version to push we need to declare that current is alpha version so that no body rely on it yet."

## User Scenarios & Testing

### User Story 1 - Debug Failed Operations (Priority: P1)

A developer encounters an error during vault upload and needs to understand what went wrong. They need access to detailed logs showing exactly what operations were attempted, what succeeded, and where the failure occurred.

**Why this priority**: Debugging is critical for alpha users and developers. Without detailed logs, users cannot troubleshoot issues independently, leading to frustration and inability to use the CLI effectively.

**Independent Test**: Can be fully tested by running any CLI command that produces errors (e.g., upload with invalid credentials), then checking that detailed logs are created and contain operation timestamps, API requests/responses, and error stack traces.

**Acceptance Scenarios**:

1. **Given** a user runs an upload command that fails, **When** they check the log file location, **Then** they see a timestamped log file with details of all operations attempted
2. **Given** a user encounters an error, **When** they open the log file, **Then** they see API request/response details, timestamps, and stack traces
3. **Given** a user wants to report a bug, **When** they export the log file, **Then** they can attach it to a bug report with all necessary debugging information
4. **Given** a user runs multiple commands, **When** they check logs, **Then** each command execution is clearly separated with session identifiers

---

### User Story 2 - Understand CLI Installation Progress (Priority: P1)

A user installs the Mujarrad CLI via npm and wants visual feedback showing installation progress and confirming the package is authentic and properly installed.

**Why this priority**: First impressions matter. Users need confidence that the installation is working and seeing the Mujarrad branding reinforces they're installing the correct package.

**Independent Test**: Can be fully tested by running `npm install -g mujarrad-cli` and observing that the Mujarrad logo appears during installation with progress indicators.

**Acceptance Scenarios**:

1. **Given** a user runs `npm install -g mujarrad-cli`, **When** installation begins, **Then** they see the Mujarrad logo displayed in the terminal
2. **Given** installation is in progress, **When** packages are being downloaded, **Then** a progress indicator shows percentage complete
3. **Given** installation completes successfully, **When** the process finishes, **Then** a success message with version number appears
4. **Given** installation fails, **When** an error occurs, **Then** a helpful error message with troubleshooting steps is shown

---

### User Story 3 - Learn CLI Commands and Usage (Priority: P1)

A new user wants to understand what commands are available, what each command does, and how to use them correctly without referring to external documentation.

**Why this priority**: In-CLI documentation is essential for user onboarding and reducing the learning curve. Users should be able to discover functionality without leaving the terminal.

**Independent Test**: Can be fully tested by running `mujarrad --help` and `mujarrad <command> --help` to verify all commands are documented with clear descriptions, examples, and options.

**Acceptance Scenarios**:

1. **Given** a user runs `mujarrad --help`, **When** the help displays, **Then** they see a list of all available commands with brief descriptions
2. **Given** a user runs `mujarrad upload --help`, **When** command-specific help displays, **Then** they see detailed usage, required/optional parameters, and examples
3. **Given** a user runs a command incorrectly, **When** validation fails, **Then** they see helpful error messages suggesting correct usage
4. **Given** a user wants examples, **When** they view command help, **Then** they see real-world usage examples for common scenarios

---

### User Story 4 - Monitor Real-Time Operation Progress (Priority: P2)

A user uploading a large vault wants to see real-time progress updates showing which files are being processed, upload speed, and estimated time remaining.

**Why this priority**: Long-running operations need progress feedback to prevent users from thinking the CLI has frozen. This improves user confidence and experience.

**Independent Test**: Can be fully tested by running `mujarrad upload` on a vault with 100+ files and observing progress bars, file counts, and status updates in real-time.

**Acceptance Scenarios**:

1. **Given** a user uploads a vault, **When** processing begins, **Then** they see a progress bar showing percentage complete
2. **Given** an upload is in progress, **When** files are being processed, **Then** they see "Processing: 45/100 files (45%)" with current file name
3. **Given** a long-running operation, **When** 30 seconds have elapsed, **Then** they see estimated time remaining
4. **Given** an operation completes, **When** all work is done, **Then** they see a summary of files processed, time taken, and success/failure counts

---

### User Story 5 - Export Operation History for Debugging (Priority: P2)

A developer needs to export all logs from recent operations to share with support or for team debugging, including all API requests, responses, and errors from the last 24 hours.

**Why this priority**: Collaborative debugging requires easy log export. Developers need to share detailed operation history without manually copying log files.

**Independent Test**: Can be fully tested by running `mujarrad logs export` and verifying it creates an exportable archive with all recent operation logs formatted for analysis.

**Acceptance Scenarios**:

1. **Given** a user runs `mujarrad logs export`, **When** the command executes, **Then** a compressed archive of all logs is created in the current directory
2. **Given** logs are exported, **When** the user opens the archive, **Then** logs are organized by date and operation type
3. **Given** a user wants to export specific time ranges, **When** they use `mujarrad logs export --since "24h"`, **Then** only logs from the last 24 hours are included
4. **Given** a user exports logs, **When** sensitive data exists, **Then** credentials and tokens are automatically redacted in the export

---

### User Story 6 - Understand Alpha Version Status (Priority: P1)

A new user installing the CLI needs clear warnings that this is an alpha version, what that means for stability, and how to report issues they encounter.

**Why this priority**: Setting expectations is critical for alpha software. Users need to know the software is unstable and how to contribute feedback.

**Independent Test**: Can be fully tested by running `mujarrad --version` and verifying clear alpha warnings are displayed, plus checking that all command outputs include alpha disclaimers.

**Acceptance Scenarios**:

1. **Given** a user runs `mujarrad --version`, **When** version info displays, **Then** it clearly shows "v1.0.0-alpha.1" with a warning message
2. **Given** a user runs any command for the first time, **When** the command executes, **Then** they see a one-time alpha disclaimer message
3. **Given** an alpha warning is shown, **When** the user reads it, **Then** it includes links to report issues and known limitations
4. **Given** a user acknowledges the alpha warning, **When** they run subsequent commands, **Then** the warning doesn't appear again unless they reset CLI settings

---

### User Story 7 - Initialize and Upload Vault (Priority: P1)

A user wants to upload their Obsidian vault to Mujarrad. The system needs to first initialize (prepare) the vault by scanning files, validating structure, and checking prerequisites before performing the actual upload operation.

**Why this priority**: The upload process is a core workflow that needs proper preparation. Combining initialization and upload into a single command (`mujarrad init`) provides a seamless user experience while internally performing both preparation and upload steps.

**Independent Test**: Can be fully tested by running `mujarrad init <vault-path> --workspace <slug>` on a sample vault and verifying it performs vault scanning, validation, and upload in sequence with appropriate progress feedback.

**Acceptance Scenarios**:

1. **Given** a user runs `mujarrad init ./my-vault --workspace my-workspace`, **When** the command executes, **Then** it first scans and validates the vault structure before uploading
2. **Given** initialization is in progress, **When** vault scanning happens, **Then** progress shows "Initializing vault: scanning files..."
3. **Given** validation completes successfully, **When** upload begins, **Then** progress shows "Uploading: X/Y files complete"
4. **Given** the combined operation completes, **When** all steps finish, **Then** a summary shows both initialization and upload statistics

**Command Design Note**: The `init` command performs both initialization (preparation) and upload operations. In the current alpha version, these are not separated into distinct commands. Future versions may split these into `mujarrad init` (preparation only) and `mujarrad upload` (upload only) for more granular control.

---

### User Story 8 - Validate Commands Before Release (Priority: P1)

A developer preparing a new release needs to run comprehensive tests on all CLI commands to ensure they work correctly before publishing to npm.

**Why this priority**: Pre-release validation prevents broken commands from reaching users. Without automated testing, each release risks introducing regressions.

**Independent Test**: Can be fully tested by running `npm run test:all-commands` and verifying it executes integration tests for every CLI command with real API calls (against staging environment).

**Acceptance Scenarios**:

1. **Given** a developer runs `npm run test:all-commands`, **When** tests execute, **Then** every CLI command is tested with real API calls
2. **Given** tests are running, **When** a command fails, **Then** the test suite shows exactly which command failed and why
3. **Given** all tests pass, **When** validation completes, **Then** a summary report shows all commands tested and their status
4. **Given** a test fails, **When** a developer investigates, **Then** detailed logs show the API request/response that caused the failure

---

### Edge Cases

- What happens when log files grow beyond a reasonable size (>100MB)?
- How does the system handle logging when disk space is full?
- What happens when multiple CLI instances are running simultaneously and writing to the same log file?
- How does progress tracking work for operations that fail partway through?
- What happens when npm installation is interrupted mid-process?
- How does the CLI behave when running in a CI/CD environment with no TTY?
- What happens when a user tries to export logs but no operations have been performed yet?
- How does the system handle log rotation and cleanup of old files?

## Requirements

### Functional Requirements

#### Logging & Debugging

- **FR-001**: System MUST create a log file for every CLI command execution with unique session ID
- **FR-002**: System MUST log all API requests with full request details (URL, method, headers, body)
- **FR-003**: System MUST log all API responses with status code, headers, and body
- **FR-004**: System MUST log operation timestamps with millisecond precision
- **FR-005**: System MUST log error stack traces with file names and line numbers
- **FR-006**: System MUST log file system operations (reads, writes, deletes)
- **FR-007**: System MUST log authentication attempts and results
- **FR-008**: System MUST provide configurable log levels (debug, info, warn, error)
- **FR-009**: System MUST store logs in `~/.mujarrad/logs/` directory
- **FR-010**: System MUST rotate log files daily and keep 30 days of history
- **FR-011**: System MUST limit individual log file size to 50MB maximum
- **FR-012**: System MUST redact sensitive data (tokens, passwords) in logs by default
- **FR-013**: System MUST allow users to export logs as compressed archives
- **FR-014**: System MUST include log export command: `mujarrad logs export [options]`
- **FR-015**: System MUST support filtering log exports by date range, command type, and log level

#### Installation Experience

- **FR-016**: System MUST display Mujarrad logo during npm package installation
- **FR-017**: System MUST show progress indicators during installation
- **FR-018**: System MUST display installation progress percentage
- **FR-019**: System MUST show success message with installed version number
- **FR-020**: System MUST provide troubleshooting guidance on installation errors
- **FR-021**: System MUST use npm postinstall script to display welcome message

#### Progress Tracking

- **FR-022**: System MUST display progress bars for operations taking longer than 3 seconds
- **FR-023**: System MUST show current file being processed during batch operations
- **FR-024**: System MUST display "X/Y items complete (Z%)" format for progress
- **FR-025**: System MUST show estimated time remaining for operations longer than 30 seconds
- **FR-026**: System MUST update progress indicators at least once per second
- **FR-027**: System MUST provide operation summaries after completion (files processed, time taken, success/error counts)
- **FR-028**: System MUST gracefully handle progress display in non-TTY environments (CI/CD)

#### CLI Documentation

- **FR-029**: System MUST provide comprehensive `--help` output for every command
- **FR-030**: System MUST include command descriptions, usage syntax, and option details in help
- **FR-031**: System MUST provide at least 2 real-world examples per command in help output
- **FR-032**: System MUST show common error messages with solutions in help text
- **FR-033**: System MUST include links to online documentation in help output
- **FR-034**: System MUST validate command arguments and provide helpful error messages
- **FR-035**: System MUST suggest correct usage when commands are used incorrectly
- **FR-036**: System MUST provide command completion hints (e.g., "Did you mean 'upload'?")

#### Alpha Version Management

- **FR-037**: System MUST use semantic versioning with alpha suffix (e.g., "1.0.0-alpha.1")
- **FR-038**: System MUST display alpha warning on first command execution
- **FR-039**: System MUST include alpha disclaimer in `--version` output
- **FR-040**: System MUST provide link to issue tracker in alpha warnings
- **FR-041**: System MUST track whether user has acknowledged alpha disclaimer
- **FR-042**: System MUST include "Known Issues" section in help output during alpha phase
- **FR-043**: System MUST display alpha warning in package.json description field

#### Pre-Release Validation

- **FR-044**: System MUST provide integration test suite for all CLI commands
- **FR-045**: System MUST test against staging API environment before release
- **FR-046**: System MUST validate all command outputs and exit codes
- **FR-047**: System MUST test error scenarios and edge cases
- **FR-048**: System MUST verify all help documentation is up-to-date
- **FR-049**: System MUST check for broken links in documentation
- **FR-050**: System MUST validate version numbers are correctly updated
- **FR-051**: System MUST provide npm script `test:all-commands` for full validation
- **FR-052**: System MUST generate test report with pass/fail status for each command

#### Vault Initialization & Upload

- **FR-053**: System MUST provide `mujarrad init` command that performs both vault preparation and upload
- **FR-054**: System MUST scan vault directory structure before beginning upload during init
- **FR-055**: System MUST validate vault structure (check for markdown files, canvas files) during initialization
- **FR-056**: System MUST check prerequisites (authentication status, workspace existence) before upload
- **FR-057**: System MUST display separate progress indicators for initialization phase and upload phase
- **FR-058**: System MUST show file counts and validation results during initialization
- **FR-059**: System MUST provide combined statistics showing both initialization and upload results
- **FR-060**: System MUST fail gracefully if validation fails, showing specific issues found
- **FR-061**: System MUST accept workspace parameter: `mujarrad init <vault-path> --workspace <slug>`
- **FR-062**: System MUST log all initialization and upload operations to debug logs

### Non-Functional Requirements

- **NFR-001**: Log writes MUST NOT block CLI operations (use asynchronous logging)
- **NFR-002**: Progress updates MUST render without flickering or artifacts
- **NFR-003**: Installation postinstall script MUST complete within 5 seconds
- **NFR-004**: Log export command MUST compress logs to reduce file size by at least 70%
- **NFR-005**: Help output MUST render correctly on terminals with minimum 80 character width
- **NFR-006**: System MUST handle log rotation without interrupting active CLI sessions
- **NFR-007**: Integration test suite MUST complete within 10 minutes
- **NFR-008**: Alpha disclaimer MUST be visible without scrolling on standard terminal size

### Key Entities

- **LogSession**: Represents a single CLI command execution with unique session ID, start/end timestamps, command executed, exit code, and associated log entries
- **LogEntry**: Individual log record with timestamp, log level, source (component/module), message, and optional metadata (API request/response, error stack trace, file paths)
- **LogExport**: Compressed archive of log files with metadata (export date, time range, included sessions, redaction status)
- **AlphaDisclaimer**: Tracks user acknowledgment with timestamp and version acknowledged, stored in CLI config
- **TestReport**: Summary of pre-release validation with test suite version, execution timestamp, environment details, per-command test results, and overall pass/fail status

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can identify the cause of 90% of CLI errors using log files without external support
- **SC-002**: New users complete first successful command within 5 minutes of installation using in-CLI help
- **SC-003**: 100% of users see alpha disclaimer before using CLI for the first time
- **SC-004**: Bug reports include complete debugging logs in 80% of cases
- **SC-005**: Installation completion confirmation appears within 30 seconds of npm install starting
- **SC-006**: Long-running operations (>30 seconds) show progress updates at least once per second
- **SC-007**: Pre-release validation catches 95% of regressions before they reach npm
- **SC-008**: Log export command executes in under 10 seconds for 7 days of logs
- **SC-009**: Help documentation includes examples for 100% of CLI commands
- **SC-010**: Users report 30% fewer "CLI not responding" issues due to visible progress indicators

## Scope

### In Scope

- Detailed operation logging with API request/response tracking
- Visual installation progress with Mujarrad branding
- Comprehensive in-CLI documentation and help system
- Real-time progress indicators for long-running operations
- Log export functionality with compression and filtering
- Alpha version warnings and disclaimers
- Pre-release integration testing framework
- Log file management (rotation, size limits, cleanup)

### Out of Scope

- Remote log collection or centralized logging service
- Interactive log viewer or log analysis tools
- Real-time log streaming to external services
- Automated crash reporting or error tracking
- Performance profiling or APM integration
- Log-based analytics or metrics dashboard
- Version migration tools between alpha releases
- Beta or stable release planning (deferred to future features)

## Assumptions

- Users have basic terminal/command-line knowledge
- Users installing CLI have internet access for npm registry
- Users understand the implications of "alpha" software
- Log files will be stored locally on user machines
- Integration tests will run against a dedicated staging API environment
- npm postinstall scripts are not blocked by security policies
- Terminal supports ANSI color codes for progress indicators
- Users have at least 1GB free disk space for logs
- Average CLI session generates less than 5MB of logs
- Users are comfortable sharing logs for debugging purposes

## Dependencies

- Existing winston logging infrastructure (already in project)
- ora and cli-progress packages (already in project)
- npm package lifecycle scripts (postinstall hooks)
- Access to staging API environment for integration tests
- Git version control for test result tracking
- Commander.js help system integration
- File system access for log storage (~/.mujarrad/logs/)

## Risks & Mitigations

### Risks

1. **Log file growth**: Users may accumulate large amounts of log data over time
   - **Mitigation**: Implement automatic log rotation and 30-day retention policy

2. **Performance impact**: Detailed logging may slow down CLI operations
   - **Mitigation**: Use asynchronous logging and batch log writes

3. **Sensitive data exposure**: Logs may accidentally contain passwords or tokens
   - **Mitigation**: Implement automatic redaction of common sensitive patterns

4. **Installation script failures**: Postinstall scripts may fail in restricted environments
   - **Mitigation**: Make postinstall non-blocking and handle failures gracefully

5. **Test environment instability**: Integration tests depend on staging API availability
   - **Mitigation**: Implement test retry logic and mock fallbacks

6. **Alpha disclaimer fatigue**: Users may ignore warnings over time
   - **Mitigation**: Only show disclaimer once per installation, not every command

### Clarifications Needed

None - all requirements have reasonable defaults based on industry-standard practices for CLI tools.

## Notes

- This specification focuses on improving CLI observability and user experience before moving to beta
- Log format should be structured (JSON) for easy parsing by external tools
- Progress indicators should degrade gracefully in CI/CD environments without TTY
- Alpha warnings should be prominent but not obtrusive to daily usage
- Integration tests should cover both success and failure scenarios for every command
- Consider adding `mujarrad doctor` command in future for self-diagnostics
