# Test Fixtures

This directory contains test fixture data for unit and integration tests.

## Template Fixtures

### `template-business-model-canvas.json`
Complete Business Model Canvas template with all 9 context templates (Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure).

**Use cases**:
- Testing template listing and filtering
- Testing template cloning with complex folder structures
- Integration tests with realistic business framework data
- Performance testing with multi-context templates

**Sample data source**: Based on the live Obsidian vault at `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad` (Constitution Principle VI)

**Structure**:
- 9 ContextTemplate entities
- 2 sample nodes demonstrating typical BMC content
- Tags: `["business", "strategy", "canvas", "planning"]`
- Public template (isPublic: true)
- High usage count (127) for testing sorting/popularity

### `template-minimal.json`
Minimal template with no context templates for testing edge cases.

**Use cases**:
- Testing template with empty contextTemplates array
- Testing private templates (isPublic: false)
- Testing newly created templates (usageCount: 0)
- Unit test edge cases (minimal data)

**Structure**:
- 0 ContextTemplate entities
- Tags: `["test"]`
- Private template (isPublic: false)
- Zero usage count

## Usage in Tests

### Unit Tests
```typescript
import businessModelCanvas from '../fixtures/template-business-model-canvas.json';

describe('TemplateService', () => {
  it('should parse template with context templates', () => {
    const template = businessModelCanvas;
    expect(template.contextTemplates).toHaveLength(9);
    expect(template.contextTemplates[0].name).toBe('Customer Segments');
  });
});
```

### Integration Tests
```typescript
import minimalTemplate from '../fixtures/template-minimal.json';

describe('Template Clone Workflow', () => {
  it('should handle template with no context templates', async () => {
    jest.spyOn(apiClient.templatesApi, 'getTemplate').mockResolvedValue(minimalTemplate);
    const result = await TemplateCloneWorkflow.execute('template-uuid-minimal-001', { name: 'Test' });
    expect(result.folders).toHaveLength(0); // No folders created
  });
});
```

## Adding New Fixtures

When adding new test fixtures:

1. **Follow naming convention**: `template-{name}-{variant}.json` or `{entity}-{scenario}.json`
2. **Document in this README**: Add section describing the fixture and its use cases
3. **Use realistic data**: Base on actual Obsidian vault structure where possible
4. **Include edge cases**: Empty arrays, null values, boundary conditions
5. **Adhere to schema**: Match entity definitions from `specs/007-obsidian-mapper-i/data-model.md`

## Sample Data Disclaimer

All domain-specific content in these fixtures (Business Model Canvas frameworks, entrepreneurship concepts) is SAMPLE DATA ONLY from the live Obsidian vault at `/Users/mac/Developer/Software-Projects/Wider Projects/Wider-Mujarrad`.

This sample data:
- **MUST NOT** be included in production builds
- **MAY** be used for integration and performance testing
- **MUST** include this disclaimer when referenced in specifications

See Constitution Principle VI (Sample Data & Live Reference) for governance details.
