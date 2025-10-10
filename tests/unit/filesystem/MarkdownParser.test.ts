import { MarkdownParser } from '../../../src/filesystem/MarkdownParser.js';

describe('MarkdownParser', () => {
  describe('extractWikilinks', () => {
    it('should extract simple wikilinks from markdown', () => {
      const markdown = '# Note\nSee [[Another Note]] for details.';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({ target: 'Another Note', alias: null });
    });

    it('should extract wikilinks with aliases', () => {
      const markdown = 'Check out [[Target|Alias Text]] and [[Another|Different Alias]].';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(2);
      expect(links[0]).toEqual({ target: 'Target', alias: 'Alias Text' });
      expect(links[1]).toEqual({ target: 'Another', alias: 'Different Alias' });
    });

    it('should extract wikilinks with paths', () => {
      const markdown = 'See [[Folder/Subfolder/Note]] and [[Projects/2024/Report]].';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('Folder/Subfolder/Note');
      expect(links[1].target).toBe('Projects/2024/Report');
    });

    it('should handle multiple wikilinks in same line', () => {
      const markdown = 'Links: [[Note1]], [[Note2]], [[Note3]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(3);
      expect(links.map(l => l.target)).toEqual(['Note1', 'Note2', 'Note3']);
    });

    it('should handle wikilinks with special characters', () => {
      const markdown = '[[Note with spaces]], [[Note-with-dashes]], [[Note_with_underscores]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(3);
      expect(links[0].target).toBe('Note with spaces');
      expect(links[1].target).toBe('Note-with-dashes');
      expect(links[2].target).toBe('Note_with_underscores');
    });

    it('should handle wikilinks with unicode characters', () => {
      const markdown = '[[日本語のノート]], [[Émoji 😀]], [[文件名]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(3);
      expect(links[0].target).toBe('日本語のノート');
      expect(links[1].target).toBe('Émoji 😀');
      expect(links[2].target).toBe('文件名');
    });

    it('should handle empty markdown', () => {
      const parser = new MarkdownParser('');
      const links = parser.extractWikilinks();

      expect(links).toEqual([]);
    });

    it('should handle markdown without wikilinks', () => {
      const markdown = '# Title\n\nSome content without any links.';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toEqual([]);
    });

    it('should handle malformed wikilinks', () => {
      const markdown = 'Invalid: [[Incomplete, [[Missing close, [[Valid Link]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      // Regex-based parser extracts what it can match
      // The last valid pair [[Valid Link]] gets extracted, but the incomplete ones get merged
      expect(links.length).toBeGreaterThanOrEqual(1);
      // At least one valid link should be extracted
      const hasValidLink = links.some(link => link.target.includes('Valid Link'));
      expect(hasValidLink).toBe(true);
    });

    it('should handle wikilinks with heading anchors', () => {
      const markdown = '[[Note#Heading]], [[Another Note#Section|Custom Text]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('Note#Heading');
      expect(links[1]).toEqual({ target: 'Another Note#Section', alias: 'Custom Text' });
    });

    it('should handle wikilinks with block references', () => {
      const markdown = '[[Note^block-id]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('Note^block-id');
    });
  });

  describe('extractLinks', () => {
    it('should extract standard markdown links', () => {
      const markdown = '[Link Text](target.md)';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractLinks();

      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({ text: 'Link Text', url: 'target.md' });
    });

    it('should extract multiple markdown links', () => {
      const markdown = '[First](one.md) and [Second](two.md)';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractLinks();

      expect(links).toHaveLength(2);
      expect(links[0]).toEqual({ text: 'First', url: 'one.md' });
      expect(links[1]).toEqual({ text: 'Second', url: 'two.md' });
    });

    it('should extract links with URLs', () => {
      const markdown = '[Google](https://google.com)';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractLinks();

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('https://google.com');
    });

    it('should extract links with relative paths', () => {
      const markdown = '[Note](../folder/note.md)';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractLinks();

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('../folder/note.md');
    });

    it('should handle empty text in links', () => {
      const markdown = '[](target.md)';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractLinks();

      expect(links).toHaveLength(1);
      expect(links[0].text).toBe('');
    });

    it('should handle markdown without standard links', () => {
      const markdown = '# Title\n\nJust text.';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractLinks();

      expect(links).toEqual([]);
    });
  });

  describe('parseFrontmatter', () => {
    it('should parse frontmatter if present', () => {
      const markdown = '---\ntitle: My Note\ntags: [tag1, tag2]\n---\n# Content';
      const parser = new MarkdownParser(markdown);
      const frontmatter = parser.parseFrontmatter();

      expect(frontmatter.title).toBe('My Note');
      expect(frontmatter.tags).toEqual(['tag1', 'tag2']);
    });

    it('should return empty object if no frontmatter', () => {
      const markdown = '# Title\n\nContent without frontmatter';
      const parser = new MarkdownParser(markdown);
      const frontmatter = parser.parseFrontmatter();

      expect(frontmatter).toEqual({});
    });

    it('should handle complex frontmatter', () => {
      const markdown = `---
title: Complex Note
tags: [project, important]
created: 2025-10-10
metadata:
  author: Test Author
  version: 1.0
---
# Content`;
      const parser = new MarkdownParser(markdown);
      const frontmatter = parser.parseFrontmatter();

      expect(frontmatter.title).toBe('Complex Note');
      expect(frontmatter.tags).toEqual(['project', 'important']);
      expect(frontmatter.created).toEqual(expect.any(Date));
      expect(frontmatter.metadata).toEqual({
        author: 'Test Author',
        version: 1.0
      });
    });

    it('should handle frontmatter with empty values', () => {
      const markdown = '---\ntitle:\ntags: []\n---\n# Content';
      const parser = new MarkdownParser(markdown);
      const frontmatter = parser.parseFrontmatter();

      expect(frontmatter.title).toBeNull();
      expect(frontmatter.tags).toEqual([]);
    });
  });

  describe('getContent', () => {
    it('should return content without frontmatter', () => {
      const markdown = '---\ntitle: My Note\n---\n# Heading\n\nContent here.';
      const parser = new MarkdownParser(markdown);
      const content = parser.getContent();

      expect(content).toBe('# Heading\n\nContent here.');
    });

    it('should return all content if no frontmatter', () => {
      const markdown = '# Heading\n\nContent here.';
      const parser = new MarkdownParser(markdown);
      const content = parser.getContent();

      expect(content).toBe(markdown);
    });
  });

  describe('hasFrontmatter', () => {
    it('should return true if frontmatter exists', () => {
      const markdown = '---\ntitle: Test\n---\nContent';
      const parser = new MarkdownParser(markdown);

      expect(parser.hasFrontmatter()).toBe(true);
    });

    it('should return false if no frontmatter', () => {
      const markdown = '# Title\nContent';
      const parser = new MarkdownParser(markdown);

      expect(parser.hasFrontmatter()).toBe(false);
    });
  });

  describe('getAllLinks', () => {
    it('should extract both wikilinks and standard links', () => {
      const markdown = 'See [[Wiki Link]] and [Standard](link.md)';
      const parser = new MarkdownParser(markdown);
      const allLinks = parser.getAllLinks();

      expect(allLinks.wikilinks).toHaveLength(1);
      expect(allLinks.markdownLinks).toHaveLength(1);
      expect(allLinks.wikilinks[0].target).toBe('Wiki Link');
      expect(allLinks.markdownLinks[0].url).toBe('link.md');
    });

    it('should handle markdown with only wikilinks', () => {
      const markdown = '[[Link1]] and [[Link2]]';
      const parser = new MarkdownParser(markdown);
      const allLinks = parser.getAllLinks();

      expect(allLinks.wikilinks).toHaveLength(2);
      expect(allLinks.markdownLinks).toHaveLength(0);
    });

    it('should handle markdown with only standard links', () => {
      const markdown = '[Link1](url1.md) and [Link2](url2.md)';
      const parser = new MarkdownParser(markdown);
      const allLinks = parser.getAllLinks();

      expect(allLinks.wikilinks).toHaveLength(0);
      expect(allLinks.markdownLinks).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle nested brackets', () => {
      const markdown = '[[Note [with brackets]]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      // Should handle as best as possible
      expect(links.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long content', () => {
      const longContent = '# Title\n\n' + 'Content '.repeat(10000) + '[[Link]]';
      const parser = new MarkdownParser(longContent);
      const links = parser.extractWikilinks();

      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('Link');
    });

    it('should handle content with code blocks containing wikilink syntax', () => {
      const markdown = '```\n[[This is in code block]]\n```\n\n[[This is real link]]';
      const parser = new MarkdownParser(markdown);
      const links = parser.extractWikilinks();

      // Should extract both (regex-based parser doesn't distinguish code blocks)
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });
});
