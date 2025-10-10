import { randomUUID } from 'crypto';

/**
 * MetadataManager handles UUID embedding and extraction in markdown files
 *
 * Features:
 * - Embeds UUIDs as HTML comments: `<!-- mujarrad-node-id: uuid -->`
 * - Extracts UUIDs from markdown content
 * - Preserves frontmatter when embedding
 * - Validates UUID format
 * - Generates UUID v4 identifiers
 *
 * UUID Format:
 * - HTML comment: `<!-- mujarrad-node-id: {uuid} -->`
 * - Placed after frontmatter if present, otherwise at beginning
 * - Non-intrusive to markdown rendering
 *
 * Usage:
 * ```typescript
 * // Embed UUID
 * const uuid = MetadataManager.generateUUID();
 * const withMetadata = MetadataManager.embedUUID(markdown, uuid);
 *
 * // Extract UUID
 * const extractedUUID = MetadataManager.extractUUID(markdown);
 *
 * // Validate UUID
 * const isValid = MetadataManager.isValidUUID(uuid);
 *
 * // Check presence
 * const hasUUID = MetadataManager.hasUUID(markdown);
 *
 * // Remove UUID
 * const cleaned = MetadataManager.removeUUID(markdown);
 * ```
 *
 * Follows Constitution Principle III: TDD approach with comprehensive tests
 * Implements FR-012: UUID embedding as HTML comments
 * Implements FR-016: UUID extraction and validation
 */
export class MetadataManager {
  /**
   * Embed UUID as HTML comment in markdown
   *
   * Placement:
   * - After frontmatter if present
   * - At beginning of document otherwise
   *
   * If UUID already exists, replaces it with new UUID
   *
   * @param markdown - Markdown content
   * @param uuid - UUID to embed
   * @returns Markdown with embedded UUID
   */
  static embedUUID(markdown: string, uuid: string): string {
    // Remove existing UUID if present
    const cleanedMarkdown = this.removeUUID(markdown);

    const comment = `<!-- mujarrad-node-id: ${uuid} -->`;

    // Check if markdown has frontmatter
    if (cleanedMarkdown.startsWith('---')) {
      // Find end of frontmatter
      const endOfFrontmatter = cleanedMarkdown.indexOf('---', 3);
      if (endOfFrontmatter !== -1) {
        const actualEnd = endOfFrontmatter + 3;
        const beforeFrontmatter = cleanedMarkdown.slice(0, actualEnd);
        const afterFrontmatter = cleanedMarkdown.slice(actualEnd);

        // Insert UUID after frontmatter
        return beforeFrontmatter + '\n' + comment + (afterFrontmatter ? '\n' + afterFrontmatter.trimStart() : '');
      }
    }

    // No frontmatter - insert at beginning
    if (cleanedMarkdown === '') {
      return comment + '\n';
    }

    return comment + '\n' + cleanedMarkdown;
  }

  /**
   * Extract UUID from markdown content
   *
   * Looks for HTML comment: `<!-- mujarrad-node-id: {uuid} -->`
   *
   * @param markdown - Markdown content
   * @returns Extracted UUID or null if not found
   */
  static extractUUID(markdown: string): string | null {
    // Regex to match UUID comment (flexible spacing)
    const regex = /<!--\s*mujarrad-node-id:\s*([^\s]+)\s*-->/;
    const match = markdown.match(regex);

    if (match && match[1]) {
      return match[1];
    }

    return null;
  }

  /**
   * Validate UUID format
   *
   * Accepts:
   * - UUID v4 format: 8-4-4-4-12 hex digits
   * - Simple alphanumeric with hyphens
   *
   * Rejects:
   * - Empty strings
   * - Whitespace
   * - Special characters (except hyphens)
   *
   * @param uuid - UUID to validate
   * @returns True if valid UUID format
   */
  static isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }

    // Trim and check for empty
    const trimmed = uuid.trim();
    if (trimmed !== uuid || trimmed === '') {
      return false;
    }

    // Check for valid characters (alphanumeric + hyphens only)
    const validCharsPattern = /^[a-zA-Z0-9-]+$/;
    if (!validCharsPattern.test(uuid)) {
      return false;
    }

    // Must have at least one character
    return uuid.length > 0;
  }

  /**
   * Check if markdown has UUID embedded
   *
   * @param markdown - Markdown content
   * @returns True if UUID is present
   */
  static hasUUID(markdown: string): boolean {
    return this.extractUUID(markdown) !== null;
  }

  /**
   * Remove UUID comment from markdown
   *
   * Removes all occurrences of UUID comments
   * Cleans up extra newlines
   *
   * @param markdown - Markdown content
   * @returns Markdown with UUID removed
   */
  static removeUUID(markdown: string): string {
    // Remove all UUID comments (global flag)
    const regex = /<!--\s*mujarrad-node-id:\s*[^\s]+\s*-->\s*\n?/g;
    let cleaned = markdown.replace(regex, '');

    // Clean up multiple consecutive newlines
    cleaned = cleaned.replace(/\n\n+/g, '\n\n');

    // Trim leading newlines
    cleaned = cleaned.replace(/^\n+/, '');

    return cleaned;
  }

  /**
   * Generate UUID v4
   *
   * Uses crypto.randomUUID() for secure random UUIDs
   * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   *
   * @returns Generated UUID v4
   */
  static generateUUID(): string {
    return randomUUID();
  }

  /**
   * Embed UUID and return both modified markdown and UUID
   *
   * Convenience method that generates UUID if not provided
   *
   * @param markdown - Markdown content
   * @param uuid - Optional UUID (generates if not provided)
   * @returns Object with modified markdown and UUID
   */
  static embedWithGeneration(markdown: string, uuid?: string): { markdown: string; uuid: string } {
    const actualUUID = uuid || this.generateUUID();
    const modifiedMarkdown = this.embedUUID(markdown, actualUUID);

    return {
      markdown: modifiedMarkdown,
      uuid: actualUUID
    };
  }

  /**
   * Extract UUID or generate new one if not present
   *
   * Convenience method for ensuring UUID presence
   *
   * @param markdown - Markdown content
   * @returns Extracted or generated UUID
   */
  static ensureUUID(markdown: string): string {
    const existing = this.extractUUID(markdown);
    return existing || this.generateUUID();
  }
}
