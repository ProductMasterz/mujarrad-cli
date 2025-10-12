# Mujarrad-CLI Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-10

## Active Technologies
- TypeScript 5.3+ with Node.js 18+ + axios (HTTP client), chalk (CLI formatting), commander (CLI framework), simple-git (Git operations), gray-matter (frontmatter parsing) (007-obsidian-mapper-i)
- TypeScript 5.3+ with Node.js 18+ + winston (logging), commander (CLI), ora (spinners), cli-progress (progress bars), chalk (colors), axios (HTTP), jest (testing) (008-from-cli-side)
- File system (~/.mujarrad/logs/ for logs, ~/.mujarrad/config.json for CLI config) (008-from-cli-side)
- TypeScript 5.3+ with Node.js 18+ + Commander.js (CLI framework), Axios (HTTP client), Inquirer (interactive prompts), Ora (spinners), cli-progress (progress bars), Chalk (colors), simple-git (Git operations - optional), gray-matter (frontmatter parsing), @napi-rs/keyring (credential storage), winston (logging) (009-init-command-enhancement)
- Local filesystem (~/.mujarrad/cache/ for node mappings, ~/.mujarrad/logs/ for conflict logs), remote PostgreSQL database via REST API (009-init-command-enhancement)

## Project Structure
```
src/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Specify Commands (Feature Development Workflow)
- `/speckit.specify [feature description]` - Create feature specification from natural language
- `/speckit.clarify` - Clarify and refine existing specification requirements  
- `/speckit.plan` - Generate detailed implementation plan from specification
- `/speckit.implement` - Start feature implementation with TDD approach
- `/speckit.tasks` - View and manage implementation tasks
- `/speckit.analyze` - Analyze current codebase and suggest improvements
- `/speckit.checklist` - Generate quality checklists for current phase

## Specify Workflow
1. **Specify**: Start with natural language feature description
2. **Clarify**: Resolve any ambiguous requirements 
3. **Plan**: Create detailed implementation roadmap
4. **Implement**: Execute with test-driven development
5. **Tasks**: Track progress and manage implementation tasks

## Code Style
TypeScript 5.3+ with Node.js 18+: Follow standard conventions

## Recent Changes
- 009-init-command-enhancement: Added TypeScript 5.3+ with Node.js 18+ + Commander.js (CLI framework), Axios (HTTP client), Inquirer (interactive prompts), Ora (spinners), cli-progress (progress bars), Chalk (colors), simple-git (Git operations - optional), gray-matter (frontmatter parsing), @napi-rs/keyring (credential storage), winston (logging)
- 008-from-cli-side: Added TypeScript 5.3+ with Node.js 18+ + winston (logging), commander (CLI), ora (spinners), cli-progress (progress bars), chalk (colors), axios (HTTP), jest (testing)
- 007-obsidian-mapper-i: Added TypeScript 5.3+ with Node.js 18+ + axios (HTTP client), chalk (CLI formatting), commander (CLI framework), simple-git (Git operations), gray-matter (frontmatter parsing)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
