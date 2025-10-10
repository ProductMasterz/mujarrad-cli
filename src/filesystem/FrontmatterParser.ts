import matter from 'gray-matter';

/**
 * Result of parsing markdown with frontmatter
 */
export interface ParseResult {
  data: Record<string, any>;
  content: string;
}

/**
 * FrontmatterParser handles parsing and manipulation of YAML frontmatter in markdown files
 *
 * Features:
 * - Parse YAML frontmatter from markdown
 * - Convert data and content back to markdown with frontmatter
 * - Check if markdown has frontmatter
 * - Update frontmatter fields while preserving content
 *
 * Uses gray-matter library for robust YAML parsing
 *
 * Usage:
 * ```typescript
 * const parser = new FrontmatterParser();
 * const { data, content } = parser.parse(markdown);
 * console.log(data.title); // Access frontmatter fields
 * ```
 */
export class FrontmatterParser {
  /**
   * Parse markdown content and extract frontmatter
   *
   * @param markdown - Markdown content with optional YAML frontmatter
   * @returns Object containing frontmatter data and content
   */
  parse(markdown: string): ParseResult {
    try {
      const result = matter(markdown);
      return {
        data: result.data,
        content: result.content
      };
    } catch (error) {
      // If parsing fails (malformed YAML), return empty data
      return {
        data: {},
        content: markdown
      };
    }
  }

  /**
   * Convert content and data back to markdown with frontmatter
   *
   * @param content - Markdown content
   * @param data - Frontmatter data object
   * @returns Markdown string with frontmatter
   */
  stringify(content: string, data: Record<string, any>): string {
    // If data is empty, return content without frontmatter
    if (!data || Object.keys(data).length === 0) {
      return content;
    }

    return matter.stringify(content, data);
  }

  /**
   * Check if markdown contains frontmatter
   *
   * @param markdown - Markdown content to check
   * @returns True if frontmatter exists
   */
  hasFrontmatter(markdown: string): boolean {
    if (!markdown || markdown.trim() === '') {
      return false;
    }

    // Check if markdown starts with frontmatter delimiter
    return markdown.trimStart().startsWith('---');
  }

  /**
   * Update frontmatter fields while preserving existing data and content
   *
   * @param markdown - Original markdown with or without frontmatter
   * @param updates - Object containing fields to update or add
   * @returns Updated markdown with modified frontmatter
   */
  updateFrontmatter(markdown: string, updates: Record<string, any>): string {
    const { data, content } = this.parse(markdown);
    
    // Merge existing data with updates
    const updatedData = {
      ...data,
      ...updates
    };

    return this.stringify(content, updatedData);
  }
}
