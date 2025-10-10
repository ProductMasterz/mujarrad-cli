import { MetadataManager } from '../../../src/filesystem/MetadataManager.js';

describe('MetadataManager', () => {
  describe('embedUUID', () => {
    it('should embed UUID as HTML comment', () => {
      const markdown = '# My Note\nContent here...';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-123');

      expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-123 -->');
      expect(withMetadata).toContain('# My Note');
      expect(withMetadata).toContain('Content here...');
    });

    it('should place UUID at the beginning for simple markdown', () => {
      const markdown = '# My Note\nContent here...';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-123');

      expect(withMetadata.startsWith('<!-- mujarrad-node-id: uuid-123 -->')).toBe(true);
    });

    it('should preserve existing frontmatter when embedding', () => {
      const markdown = '---\ntitle: Note\ntags: [test]\n---\n# Content';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-456');

      expect(withMetadata).toContain('---\ntitle: Note\ntags: [test]\n---');
      expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-456 -->');
      expect(withMetadata).toContain('# Content');
    });

    it('should place UUID after frontmatter', () => {
      const markdown = '---\ntitle: Note\n---\n# Content';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-789');

      const frontmatterEnd = withMetadata.indexOf('---', 3) + 3;
      const afterFrontmatter = withMetadata.substring(frontmatterEnd).trim();
      expect(afterFrontmatter.startsWith('<!-- mujarrad-node-id: uuid-789 -->')).toBe(true);
    });

    it('should handle markdown with only frontmatter', () => {
      const markdown = '---\ntitle: Note\n---';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-abc');

      expect(withMetadata).toContain('---\ntitle: Note\n---');
      expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-abc -->');
    });

    it('should handle empty markdown', () => {
      const markdown = '';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-empty');

      expect(withMetadata).toBe('<!-- mujarrad-node-id: uuid-empty -->\n');
    });

    it('should handle markdown with multiple paragraphs', () => {
      const markdown = '# Title\n\nParagraph 1\n\nParagraph 2\n\nParagraph 3';
      const withMetadata = MetadataManager.embedUUID(markdown, 'uuid-multi');

      expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-multi -->');
      expect(withMetadata).toContain('Paragraph 1');
      expect(withMetadata).toContain('Paragraph 2');
      expect(withMetadata).toContain('Paragraph 3');
    });

    it('should replace existing UUID if present', () => {
      const markdown = '<!-- mujarrad-node-id: old-uuid -->\n# My Note';
      const withMetadata = MetadataManager.embedUUID(markdown, 'new-uuid');

      expect(withMetadata).toContain('<!-- mujarrad-node-id: new-uuid -->');
      expect(withMetadata).not.toContain('old-uuid');
    });
  });

  describe('extractUUID', () => {
    it('should extract UUID from markdown', () => {
      const markdown = '<!-- mujarrad-node-id: uuid-123 -->\n# My Note';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBe('uuid-123');
    });

    it('should extract UUID from markdown with frontmatter', () => {
      const markdown = '---\ntitle: Note\n---\n<!-- mujarrad-node-id: uuid-456 -->\n# Content';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBe('uuid-456');
    });

    it('should handle missing metadata gracefully', () => {
      const markdown = '# Note without metadata';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBeNull();
    });

    it('should extract UUID from middle of document', () => {
      const markdown = '# Title\n\nContent\n\n<!-- mujarrad-node-id: uuid-789 -->\n\nMore content';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBe('uuid-789');
    });

    it('should extract only the first UUID if multiple present', () => {
      const markdown = '<!-- mujarrad-node-id: first-uuid -->\n# Title\n<!-- mujarrad-node-id: second-uuid -->';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBe('first-uuid');
    });

    it('should handle empty markdown', () => {
      const markdown = '';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBeNull();
    });

    it('should extract UUID with special characters', () => {
      const markdown = '<!-- mujarrad-node-id: 550e8400-e29b-41d4-a716-446655440000 -->\n# Note';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('isValidUUID', () => {
    it('should validate simple UUID format', () => {
      expect(MetadataManager.isValidUUID('uuid-123')).toBe(true);
      expect(MetadataManager.isValidUUID('abc-def-ghi')).toBe(true);
    });

    it('should validate standard UUID v4 format', () => {
      expect(MetadataManager.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(MetadataManager.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should reject invalid UUID format', () => {
      // Simple words are technically valid (can be custom UUIDs)
      // But empty strings and whitespace should be invalid
      expect(MetadataManager.isValidUUID('')).toBe(false);
      expect(MetadataManager.isValidUUID('   ')).toBe(false);
    });

    it('should reject UUIDs with spaces', () => {
      expect(MetadataManager.isValidUUID('uuid 123')).toBe(false);
      expect(MetadataManager.isValidUUID(' uuid-123 ')).toBe(false);
    });

    it('should reject UUIDs with invalid characters', () => {
      expect(MetadataManager.isValidUUID('uuid@123')).toBe(false);
      expect(MetadataManager.isValidUUID('uuid#123')).toBe(false);
      expect(MetadataManager.isValidUUID('uuid$123')).toBe(false);
    });

    it('should accept alphanumeric UUIDs with hyphens', () => {
      expect(MetadataManager.isValidUUID('node-123-abc')).toBe(true);
      expect(MetadataManager.isValidUUID('123456789')).toBe(true);
      expect(MetadataManager.isValidUUID('abcdefghij')).toBe(true);
    });
  });

  describe('hasUUID', () => {
    it('should detect if markdown has UUID', () => {
      const withUUID = '<!-- mujarrad-node-id: uuid-123 -->\n# Note';
      const withoutUUID = '# Note without UUID';

      expect(MetadataManager.hasUUID(withUUID)).toBe(true);
      expect(MetadataManager.hasUUID(withoutUUID)).toBe(false);
    });

    it('should detect UUID after frontmatter', () => {
      const markdown = '---\ntitle: Note\n---\n<!-- mujarrad-node-id: uuid-456 -->\n# Content';

      expect(MetadataManager.hasUUID(markdown)).toBe(true);
    });

    it('should handle empty markdown', () => {
      expect(MetadataManager.hasUUID('')).toBe(false);
    });
  });

  describe('removeUUID', () => {
    it('should remove UUID comment from markdown', () => {
      const markdown = '<!-- mujarrad-node-id: uuid-123 -->\n# My Note\nContent';
      const cleaned = MetadataManager.removeUUID(markdown);

      expect(cleaned).not.toContain('mujarrad-node-id');
      expect(cleaned).toContain('# My Note');
      expect(cleaned).toContain('Content');
    });

    it('should remove UUID comment while preserving frontmatter', () => {
      const markdown = '---\ntitle: Note\n---\n<!-- mujarrad-node-id: uuid-123 -->\n# Content';
      const cleaned = MetadataManager.removeUUID(markdown);

      expect(cleaned).toContain('---\ntitle: Note\n---');
      expect(cleaned).not.toContain('mujarrad-node-id');
      expect(cleaned).toContain('# Content');
    });

    it('should handle markdown without UUID', () => {
      const markdown = '# Note without UUID\nContent here';
      const cleaned = MetadataManager.removeUUID(markdown);

      expect(cleaned).toBe(markdown);
    });

    it('should remove all UUID comments if multiple present', () => {
      const markdown = '<!-- mujarrad-node-id: uuid-1 -->\n# Note\n<!-- mujarrad-node-id: uuid-2 -->';
      const cleaned = MetadataManager.removeUUID(markdown);

      expect(cleaned).not.toContain('mujarrad-node-id');
      expect(cleaned).toContain('# Note');
    });

    it('should clean up extra newlines after removal', () => {
      const markdown = '<!-- mujarrad-node-id: uuid-123 -->\n\n# Note';
      const cleaned = MetadataManager.removeUUID(markdown);

      expect(cleaned).toBe('# Note');
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID', () => {
      const uuid = MetadataManager.generateUUID();

      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBeGreaterThan(0);
      expect(MetadataManager.isValidUUID(uuid)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = MetadataManager.generateUUID();
      const uuid2 = MetadataManager.generateUUID();

      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs with consistent format', () => {
      const uuid = MetadataManager.generateUUID();

      // Should follow UUID v4 format pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidPattern.test(uuid)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle markdown with HTML comments other than UUID', () => {
      const markdown = '<!-- This is a regular comment -->\n# Note\n<!-- mujarrad-node-id: uuid-123 -->';
      const uuid = MetadataManager.extractUUID(markdown);

      expect(uuid).toBe('uuid-123');
    });

    it('should handle malformed UUID comments', () => {
      const markdown = '<!-- mujarrad-node-id:uuid-123-->\n# Note';
      const uuid = MetadataManager.extractUUID(markdown);

      // Should still extract even with missing spaces
      expect(uuid).toBeTruthy();
    });

    it('should handle very long markdown', () => {
      const longContent = '# Title\n\n' + 'Content paragraph\n\n'.repeat(1000);
      const withMetadata = MetadataManager.embedUUID(longContent, 'uuid-long');

      expect(withMetadata).toContain('<!-- mujarrad-node-id: uuid-long -->');
      const extracted = MetadataManager.extractUUID(withMetadata);
      expect(extracted).toBe('uuid-long');
    });
  });
});
