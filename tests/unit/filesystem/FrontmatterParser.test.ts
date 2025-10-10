import { FrontmatterParser } from '../../../src/filesystem/FrontmatterParser.js';

describe('FrontmatterParser', () => {
  describe('parse', () => {
    it('should parse YAML frontmatter', () => {
      const markdown = '---\ntitle: My Note\ntags: [tag1, tag2]\n---\n# Content';
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      expect(data.title).toBe('My Note');
      expect(data.tags).toEqual(['tag1', 'tag2']);
      expect(content).toBe('# Content');
    });

    it('should handle markdown without frontmatter', () => {
      const markdown = '# Note without frontmatter';
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      expect(data).toEqual({});
      expect(content).toBe(markdown);
    });

    it('should parse frontmatter with multiple data types', () => {
      const markdown = `---
title: Complex Note
tags: [typescript, jest]
created: 2025-10-10
count: 42
enabled: true
---
# Actual content here`;
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      expect(data.title).toBe('Complex Note');
      expect(data.tags).toEqual(['typescript', 'jest']);
      // gray-matter auto-parses dates to Date objects
      expect(data.created).toBeInstanceOf(Date);
      expect(data.count).toBe(42);
      expect(data.enabled).toBe(true);
      expect(content.trim()).toBe('# Actual content here');
    });

    it('should handle frontmatter with nested objects', () => {
      const markdown = `---
title: Nested
metadata:
  author: John Doe
  version: 1.0
---
Content`;
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      expect(data.title).toBe('Nested');
      expect(data.metadata).toEqual({ author: 'John Doe', version: 1.0 });
      expect(content).toBe('Content');
    });

    it('should handle empty frontmatter', () => {
      const markdown = '---\n---\n# Content';
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      expect(data).toEqual({});
      expect(content).toBe('# Content');
    });

    it('should handle markdown with only frontmatter', () => {
      const markdown = '---\ntitle: Only Frontmatter\n---';
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      expect(data.title).toBe('Only Frontmatter');
      expect(content).toBe('');
    });

    it('should handle malformed frontmatter gracefully', () => {
      const markdown = '---\ninvalid: yaml: syntax\n---\n# Content';
      const parser = new FrontmatterParser();
      // Should not throw, but may return empty data
      const result = parser.parse(markdown);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('content');
    });
  });

  describe('stringify', () => {
    it('should convert data and content back to markdown with frontmatter', () => {
      const data = { title: 'My Note', tags: ['tag1', 'tag2'] };
      const content = '# Content';
      const parser = new FrontmatterParser();
      const markdown = parser.stringify(content, data);
      expect(markdown).toContain('---');
      expect(markdown).toContain('title: My Note');
      expect(markdown).toContain('tags:');
      expect(markdown).toContain('# Content');
    });

    it('should handle empty data', () => {
      const data = {};
      const content = '# Content only';
      const parser = new FrontmatterParser();
      const markdown = parser.stringify(content, data);
      expect(markdown).toBe('# Content only');
    });

    it('should preserve content without adding frontmatter when data is empty', () => {
      const parser = new FrontmatterParser();
      const markdown = parser.stringify('Plain content', {});
      expect(markdown).toBe('Plain content');
    });
  });

  describe('hasFrontmatter', () => {
    it('should return true when frontmatter exists', () => {
      const markdown = '---\ntitle: Test\n---\nContent';
      const parser = new FrontmatterParser();
      expect(parser.hasFrontmatter(markdown)).toBe(true);
    });

    it('should return false when no frontmatter exists', () => {
      const markdown = '# Just content';
      const parser = new FrontmatterParser();
      expect(parser.hasFrontmatter(markdown)).toBe(false);
    });

    it('should return false for empty string', () => {
      const parser = new FrontmatterParser();
      expect(parser.hasFrontmatter('')).toBe(false);
    });
  });

  describe('updateFrontmatter', () => {
    it('should update existing frontmatter field', () => {
      const markdown = '---\ntitle: Old Title\ntags: [tag1]\n---\n# Content';
      const parser = new FrontmatterParser();
      const updated = parser.updateFrontmatter(markdown, { title: 'New Title' });
      const result = parser.parse(updated);
      expect(result.data.title).toBe('New Title');
      expect(result.data.tags).toEqual(['tag1']);
      expect(result.content.trim()).toBe('# Content');
    });

    it('should add new frontmatter field', () => {
      const markdown = '---\ntitle: Test\n---\n# Content';
      const parser = new FrontmatterParser();
      const updated = parser.updateFrontmatter(markdown, { author: 'John Doe' });
      const result = parser.parse(updated);
      expect(result.data.title).toBe('Test');
      expect(result.data.author).toBe('John Doe');
    });

    it('should create frontmatter if none exists', () => {
      const markdown = '# Content without frontmatter';
      const parser = new FrontmatterParser();
      const updated = parser.updateFrontmatter(markdown, { title: 'New Note' });
      const result = parser.parse(updated);
      expect(result.data.title).toBe('New Note');
      expect(result.content.trim()).toBe('# Content without frontmatter');
    });
  });

  describe('integration with MetadataManager concept', () => {
    it('should preserve frontmatter when adding HTML comment metadata', () => {
      const markdown = '---\ntitle: Note\n---\n# Content';
      const parser = new FrontmatterParser();
      const { data, content } = parser.parse(markdown);
      
      // Simulate MetadataManager adding UUID as HTML comment
      const withMetadata = `---\ntitle: ${data.title}\n---\n<!-- mujarrad-node-id: uuid-123 -->\n${content}`;
      
      const reparsed = parser.parse(withMetadata);
      expect(reparsed.data.title).toBe('Note');
      expect(reparsed.content).toContain('<!-- mujarrad-node-id: uuid-123 -->');
      expect(reparsed.content).toContain('# Content');
    });
  });
});
