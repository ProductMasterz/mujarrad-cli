import { TemplatesApi, WorkspaceTemplateResponse } from '../api/generated/api.js';
import { Logger } from '../utils/Logger.js';

/**
 * TemplateService - Workspace Template Management
 *
 * Handles workspace template operations:
 * - List available templates
 * - Get template details
 * - Search templates
 * - Get popular templates
 *
 * Implements:
 * - FR-054: Template storage and retrieval
 * - FR-055: Template listing
 *
 * Task 8.1: Template Listing (User Story 4)
 */

export interface TemplateListOptions {
  tags?: string[];
  isPublic?: boolean;
  scope?: 'public' | 'private' | 'all';
  page?: number;
  size?: number;
}

export class TemplateService {
  private templatesApi: TemplatesApi;
  private logger: Logger;

  constructor(templatesApi?: TemplatesApi) {
    this.templatesApi = templatesApi || new TemplatesApi();
    this.logger = new Logger();
  }

  /**
   * List available workspace templates
   *
   * @param options - Filter options (tags, isPublic, scope, pagination)
   * @returns Array of workspace templates
   * @throws Error if API call fails
   */
  async list(options: TemplateListOptions = {}): Promise<WorkspaceTemplateResponse[]> {
    try {
      this.logger.info('Listing workspace templates', { options });

      const { tags, isPublic, scope = 'public', page = 0, size = 20 } = options;

      // Convert tags array to comma-separated string
      const tagsParam = tags ? tags.join(',') : undefined;

      // Call API
      const response = await this.templatesApi.listTemplates(
        scope as any, // API expects enum value
        tagsParam,
        page,
        size
      );

      // API response structure: { success, data: { templates, totalPages, totalElements } }
      const templates = (response.data as any).data?.templates || [];

      // Client-side filtering for isPublic if specified (API might not support this filter)
      let filteredTemplates = templates;
      if (isPublic !== undefined) {
        filteredTemplates = templates.filter((t: WorkspaceTemplateResponse) => t.isPublic === isPublic);
      }

      this.logger.info(`Found ${filteredTemplates.length} templates`, {
        total: filteredTemplates.length,
        page,
        size
      });

      return filteredTemplates;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to list templates', { error: errorMessage });
      throw new Error(`Failed to list templates: ${errorMessage}`);
    }
  }

  /**
   * Get template details by ID
   *
   * @param templateId - Template UUID
   * @returns Template with full details including context templates
   * @throws Error if template not found or API call fails
   */
  async get(templateId: string): Promise<WorkspaceTemplateResponse> {
    try {
      this.logger.info('Getting template details', { templateId });

      const response = await this.templatesApi.getTemplate(templateId);
      // API response structure: { success, data: WorkspaceTemplateResponse, timestamp }
      const template = (response.data as any).data || response.data;

      this.logger.info('Retrieved template', {
        templateId,
        name: template.name,
        contextTemplatesCount: template.contextTemplatesCount
      });

      return template;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get template', { templateId, error: errorMessage });
      throw new Error(`Failed to get template ${templateId}: ${errorMessage}`);
    }
  }

  /**
   * Search templates by name
   *
   * @param query - Search query (partial name match)
   * @returns Array of matching templates
   */
  async search(query: string): Promise<WorkspaceTemplateResponse[]> {
    try {
      this.logger.info('Searching templates', { query });

      // Get all public templates (API doesn't have dedicated search endpoint)
      const allTemplates = await this.list({ scope: 'public' });

      // Client-side filtering by name
      const results = allTemplates.filter((template: WorkspaceTemplateResponse) =>
        template.name.toLowerCase().includes(query.toLowerCase())
      );

      this.logger.info(`Found ${results.length} matching templates`, {
        query,
        results: results.length
      });

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to search templates', { query, error: errorMessage });
      throw new Error(`Failed to search templates: ${errorMessage}`);
    }
  }

  /**
   * Get popular templates sorted by usage count
   *
   * @param limit - Maximum number of templates to return (default: 10)
   * @returns Array of popular templates sorted by usageCount DESC
   */
  async getPopular(limit: number = 10): Promise<WorkspaceTemplateResponse[]> {
    try {
      this.logger.info('Getting popular templates', { limit });

      // Get all public templates
      const allTemplates = await this.list({ scope: 'public', size: 100 });

      // Sort by usageCount descending
      const sorted = allTemplates.sort((a, b) => b.usageCount - a.usageCount);

      // Limit results
      const popular = sorted.slice(0, limit);

      this.logger.info(`Retrieved ${popular.length} popular templates`, {
        limit,
        topTemplate: popular[0]?.name
      });

      return popular;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get popular templates', { error: errorMessage });
      throw new Error(`Failed to get popular templates: ${errorMessage}`);
    }
  }
}
