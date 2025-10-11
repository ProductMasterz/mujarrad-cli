import { TemplatesApi, WorkspacesApi, TemplateInstantiateRequest, WorkspaceCreateRequest } from '../api/generated/api.js';
import { CloneService, CloneSummary } from '../services/CloneService.js';
import { Logger } from '../utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Template clone workflow options
 */
export interface TemplateCloneOptions {
  /** Name for the new workspace */
  workspaceName: string;
  /** Optional description for the new workspace */
  workspaceDescription?: string;
  /** Placeholder values for template instantiation */
  placeholders?: { [key: string]: string };
}

/**
 * Template clone result
 */
export interface TemplateCloneResult {
  /** Whether the clone succeeded */
  success: boolean;
  /** New workspace ID */
  workspaceId: string;
  /** New workspace slug */
  workspaceSlug?: string;
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
  /** New workspace ID */
  workspaceId: string;
  /** Placeholder values used */
  placeholders: { [key: string]: string };
  /** Timestamp of template clone */
  clonedAt: string;
}

/**
 * TemplateCloneWorkflow - Orchestrates template-based workspace creation
 *
 * Workflow:
 * 1. Get template details
 * 2. Create new workspace
 * 3. Instantiate template structure in workspace (via API)
 * 4. Clone workspace to local vault (using CloneService)
 * 5. Write template.config.json to .mujarrad directory
 *
 * Implements:
 * - FR-056: Clone workspace from template
 * - FR-057: Apply clone requirements to template instantiation
 * - FR-058: Include template placeholder content
 * - FR-059: Copy template structure to new workspace
 * - FR-060: Preserve canvas visual configuration
 *
 * Task 8.2: Template Clone Workflow (User Story 4)
 */
export class TemplateCloneWorkflow {
  private logger: Logger;

  constructor(
    private templatesApi: TemplatesApi,
    private workspacesApi: WorkspacesApi,
    private cloneService: CloneService
  ) {
    this.logger = new Logger();
  }

  /**
   * Execute template clone workflow
   *
   * @param templateId - Template UUID
   * @param options - Clone options (workspace name, placeholders)
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
        workspaceName: options.workspaceName,
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

      // Step 2: Create new workspace
      const workspaceRequest: WorkspaceCreateRequest = {
        title: options.workspaceName,
        description: options.workspaceDescription || `Workspace created from template: ${template.name}`
      };

      const workspaceResponse = await this.workspacesApi.createWorkspace(workspaceRequest);
      const workspace = (workspaceResponse.data as any).data || workspaceResponse.data;

      this.logger.info('Created new workspace', {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug
      });

      // Step 3: Instantiate template in workspace
      const instantiateRequest: TemplateInstantiateRequest = {
        templateId,
        placeholderValues: options.placeholders || {}
      };

      try {
        await this.templatesApi.instantiateTemplate(workspace.id, instantiateRequest);

        this.logger.info('Template instantiated successfully', {
          workspaceId: workspace.id,
          templateId,
          placeholders: options.placeholders
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('Failed to instantiate template', {
          templateId,
          workspaceId: workspace.id,
          error: errorMessage
        });
        throw new Error(`Failed to instantiate template: ${errorMessage}`);
      }

      // Step 4: Clone workspace to local vault
      const cloneSummary: CloneSummary = await this.cloneService.cloneWorkspace(
        workspace.slug,
        targetPath,
        false // Don't include version history for template clones
      );

      this.logger.info('Workspace cloned to local vault', {
        workspaceSlug: workspace.slug,
        targetPath,
        totalNodes: cloneSummary.totalNodes,
        success: cloneSummary.success
      });

      // Step 5: Write template.config.json
      await this.writeTemplateConfig(targetPath, {
        templateId,
        templateName: template.name,
        workspaceId: workspace.id,
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
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
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
