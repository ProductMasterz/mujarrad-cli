import { FrontmatterParser } from './FrontmatterParser.js';

/**
 * Wikilink structure (Obsidian-style)
 */
export interface WikiLink {
  /** Target note/file name */
  target: string;
  /** Optional display alias */
  alias: string | null;
}

/**
 * Standard markdown link structure
 */
export interface MarkdownLink {
  /** Link text */
  text: string;
  /** Link URL or path */
  url: string;
}

/**
 * Combined link extraction result
 */
export interface AllLinks {
  /** Obsidian-style wikilinks */
  wikilinks: WikiLink[];
  /** Standard markdown links */
  markdownLinks: MarkdownLink[];
}

/**
 * MarkdownParser extracts wikilinks, standard links, and frontmatter from markdown
 *
 * Features:
 * - Wikilink extraction: [[Target]], [[Target|Alias]], [[Path/To/Note]]
 * - Supports heading anchors: [[Note#Heading]]
 * - Supports block references: [[Note^block-id]]
 * - Standard markdown link extraction: [text](url)
 * - Frontmatter parsing using gray-matter
 * - Unicode support for links
 *
 * Usage:
 * ```typescript
 * const parser = new MarkdownParser(markdown);
 * const wikilinks = parser.extractWikilinks();
 * const links = parser.extractLinks();
 * const frontmatter = parser.parseFrontmatter();
 * const allLinks = parser.getAllLinks();
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-CLI-006: Wikilink extraction
 * Implements FR-CLI-007: Markdown link extraction
 */
export class MarkdownParser {
  private content: string;
  private frontmatterParser: FrontmatterParser;

  constructor(markdown: string) {
    this.content = markdown;
    this.frontmatterParser = new FrontmatterParser();
  }

  /**
   * Extract Obsidian-style wikilinks from markdown
   *
   * Supports formats:
   * - [[Target]]
   * - [[Target|Alias]]
   * - [[Path/To/Note]]
   * - [[Note#Heading]]
   * - [[Note^block-id]]
   *
   * @returns Array of wikilinks with target and optional alias
   */
  extractWikilinks(): WikiLink[] {
    // Regex to match wikilinks: [[target]] or [[target|alias]]
    // Non-greedy matching to handle multiple links correctly
    const regex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
    const links: WikiLink[] = [];
    let match;

    while ((match = regex.exec(this.content)) !== null) {
      links.push({
        target: match[1].trim(),
        alias: match[2] ? match[2].trim() : null
      });
    }

    return links;
  }

  /**
   * Extract standard markdown links from content
   *
   * Supports format: [text](url)
   *
   * @returns Array of markdown links with text and URL
   */
  extractLinks(): MarkdownLink[] {
    // Regex to match markdown links: [text](url)
    const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const links: MarkdownLink[] = [];
    let match;

    while ((match = regex.exec(this.content)) !== null) {
      links.push({
        text: match[1],
        url: match[2]
      });
    }

    return links;
  }

  /**
   * Parse YAML frontmatter from markdown
   *
   * @returns Frontmatter data object
   */
  parseFrontmatter(): Record<string, any> {
    const result = this.frontmatterParser.parse(this.content);
    return result.data;
  }

  /**
   * Get markdown content without frontmatter
   *
   * @returns Content string with frontmatter removed
   */
  getContent(): string {
    const result = this.frontmatterParser.parse(this.content);
    return result.content;
  }

  /**
   * Check if markdown has frontmatter
   *
   * @returns True if frontmatter exists
   */
  hasFrontmatter(): boolean {
    return this.frontmatterParser.hasFrontmatter(this.content);
  }

  /**
   * Extract all links (both wikilinks and standard markdown links)
   *
   * @returns Object containing both wikilinks and markdown links
   */
  getAllLinks(): AllLinks {
    return {
      wikilinks: this.extractWikilinks(),
      markdownLinks: this.extractLinks()
    };
  }
}
