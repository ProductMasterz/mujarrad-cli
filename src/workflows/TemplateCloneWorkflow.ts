import { TemplatesApi, SpacesApi, TemplateInstantiateRequest, SpaceCreateRequest } from '../api/generated/api.js';
import { CloneService, CloneSummary } from '../services/CloneService.js';
import { Logger } from '../utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Template clone workflow options
 */
export interface TemplateCloneOptions {
  /** Name for the new space */
  spaceName: string;
  /** Optional description for the new space */
  spaceDescription?: string;
  /** Placeholder values for template instantiation */
  placeholders?: { [key: string]: string };
}

/**
 * Template clone result
 */
export interface TemplateCloneResult {
  /** Whether the clone succeeded */
  success: boolean;
  /** New space ID */
  spaceId: string;
  /** New space slug */
  spaceSlug?: string;
  /** Total nodes cloned */
  totalNodes: number;
  /** Total errors encountered */
  totalErrors: number;
  /** Clone duration in milliseconds */
  duration: number;
}

/**
 * Template configuration stored in vault
 */
export interface TemplateConfig {
  /** Template ID used */
  templateId: string;
  /** Template name */
  templateName: string;
  /** New space ID */
  spaceId: string;
  /** Placeholder values used */
  placeholders: { [key: string]: string };
  /** Timestamp of template clone */
  clonedAt: string;
}

/**
 * TemplateCloneWorkflow - Orchestrates template-based space creation
 *
 * Workflow:
 * 1. Get template details
 * 2. Create new space
 * 3. Instantiate template structure in space (via API)
 * 4. Clone space to local vault (using CloneService)
 * 5. Write template.config.json to .mujarrad directory
 *
 * Implements:
 * - FR-056: Clone space from template
 * - FR-057: Apply clone requirements to template instantiation
 * - FR-058: Include template placeholder content
 * - FR-059: Copy template structure to new space
 * - FR-060: Preserve canvas visual configuration
 *
 * Task 8.2: Template Clone Workflow (User Story 4)
 */
export class TemplateCloneWorkflow {
  private logger: Logger;

  constructor(
    private templatesApi: TemplatesApi,
    private spacesApi: SpacesApi,
    private cloneService: CloneService
  ) {
    this.logger = new Logger();
  }

  /**
   * Execute template clone workflow
   *
   * @param templateId - Template UUID
   * @param options - Clone options (space name, placeholders)
   * @param targetPath - Target vault path
   * @returns Template clone result
   * @throws Error if template instantiation or clone fails
   */
  async execute(
    templateId: string,
    options: TemplateCloneOptions,
    targetPath: string
  ): Promise<TemplateCloneResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting template clone workflow', {
        templateId,
        spaceName: options.spaceName,
        targetPath
      });

      // Step 1: Get template details
      const templateResponse = await this.templatesApi.getTemplate(templateId);
      const template = (templateResponse.data as any).data || templateResponse.data;

      this.logger.info('Retrieved template details', {
        templateId,
        templateName: template.name,
        contextTemplatesCount: template.contextTemplatesCount
      });

      // Step 2: Create new space
      const spaceRequest: SpaceCreateRequest = {
        title: options.spaceName,
        description: options.spaceDescription || `Space created from template: ${template.name}`
      };

      const spaceResponse = await this.spacesApi.createSpace(spaceRequest);
      const space = (spaceResponse.data as any).data || spaceResponse.data;

      this.logger.info('Created new space', {
        spaceId: space.id,
        spaceName: space.name,
        spaceSlug: space.slug
      });

      // Step 3: Instantiate template in space
      const instantiateRequest: TemplateInstantiateRequest = {
        templateId,
        placeholderValues: options.placeholders || {}
      };

      try {
        await this.templatesApi.instantiateTemplate(space.id, instantiateRequest);

        this.logger.info('Template instantiated successfully', {
          spaceId: space.id,
          templateId,
          placeholders: options.placeholders
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to instantiate template', {
          templateId,
          spaceId: space.id,
          error: errorMessage
        });
        throw new Error(`Failed to instantiate template: ${errorMessage}`);
      }

      // Step 4: Clone space to local vault
      const cloneSummary: CloneSummary = await this.cloneService.cloneSpace(
        space.slug,
        targetPath,
        false // Don't include version history for template clones
      );

      this.logger.info('Space cloned to local vault', {
        spaceSlug: space.slug,
        targetPath,
        totalNodes: cloneSummary.totalNodes,
        success: cloneSummary.success
      });

      // Step 5: Write template.config.json
      await this.writeTemplateConfig(targetPath, {
        templateId,
        templateName: template.name,
        spaceId: space.id,
        placeholders: options.placeholders || {},
        clonedAt: new Date().toISOString()
      });

      this.logger.info('Template config written', {
        targetPath,
        configPath: path.join(targetPath, '.mujarrad', 'template.config.json')
      });

      const duration = Date.now() - startTime;

      return {
        success: cloneSummary.success,
        spaceId: space.id,
        spaceSlug: space.slug,
        totalNodes: cloneSummary.totalNodes,
        totalErrors: cloneSummary.totalErrors,
        duration
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Template clone workflow failed', {
        templateId,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Write template.config.json to vault
   *
   * @param targetPath - Target vault path
   * @param config - Template configuration
   */
  private async writeTemplateConfig(targetPath: string, config: TemplateConfig): Promise<void> {
    const configDir = path.join(targetPath, '.mujarrad');
    const configPath = path.join(configDir, 'template.config.json');

    // Ensure .mujarrad directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Write config file
    await fs.writeFile(
      configPath,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
  }

  /**
   * Extract placeholder keys from template content
   *
   * Finds all {placeholder} patterns in content and returns unique keys
   *
   * @param content - Template content with placeholders
   * @returns Array of unique placeholder keys
   */
  static extractPlaceholders(content: string): string[] {
    const placeholderRegex = /\{(\w+)\}/g;
    const matches = content.matchAll(placeholderRegex);
    const placeholders = new Set<string>();

    for (const match of matches) {
      placeholders.add(match[1]);
    }

    return Array.from(placeholders);
  }
}
