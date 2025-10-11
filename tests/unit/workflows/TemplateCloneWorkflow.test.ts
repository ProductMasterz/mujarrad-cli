import { TemplateCloneWorkflow } from '../../../src/workflows/TemplateCloneWorkflow.js';
import { TemplatesApi, WorkspacesApi } from '../../../src/api/generated/api.js';
import { CloneService } from '../../../src/services/CloneService.js';
import { Logger } from '../../../src/utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * TemplateCloneWorkflow Tests (TDD - Tests First)
 *
 * Task 8.2: Implement Template Clone Workflow
 * User Story 4: Template System
 *
 * Tests FR-056 to FR-071
 */

// Mock the dependencies
jest.mock('../../../src/api/generated/api.js');
jest.mock('../../../src/services/CloneService.js');
jest.mock('../../../src/utils/Logger.js');
jest.mock('fs/promises');

describe('TemplateCloneWorkflow', () => {
  let workflow: TemplateCloneWorkflow;
  let mockTemplatesApi: jest.Mocked<TemplatesApi>;
  let mockWorkspacesApi: jest.Mocked<WorkspacesApi>;
  let mockCloneService: jest.Mocked<CloneService>;
  const mockTargetPath = '/tmp/test-vault';

  beforeEach(() => {
    // Create mock instances
    mockTemplatesApi = new TemplatesApi() as jest.Mocked<TemplatesApi>;
    mockWorkspacesApi = new WorkspacesApi() as jest.Mocked<WorkspacesApi>;
    mockCloneService = new CloneService(jest.fn() as any) as jest.Mocked<CloneService>;

    workflow = new TemplateCloneWorkflow(mockTemplatesApi, mockWorkspacesApi, mockCloneService);

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'info').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Mock fs methods
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should instantiate workspace from template', async () => {
      const mockWorkspaceResponse = {
        data: {
          data: {
            id: 'new-workspace-uuid',
            name: 'My Startup',
            slug: 'my-startup',
            description: 'Workspace created from template'
          }
        }
      };

      const mockTemplateResponse = {
        data: {
          data: {
            id: 'template-uuid-001',
            name: 'Business Model Canvas',
            sourceWorkspaceId: 'source-workspace-uuid',
            contextTemplatesCount: 9
          }
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockTemplateResponse);
      mockWorkspacesApi.createWorkspace = jest.fn().mockResolvedValue(mockWorkspaceResponse);
      mockTemplatesApi.instantiateTemplate = jest.fn().mockResolvedValue({
        data: {
          data: {
            workspaceId: 'new-workspace-uuid',
            status: 'COMPLETED'
          }
        }
      });
      mockCloneService.cloneWorkspace = jest.fn().mockResolvedValue({
        success: true,
        totalNodes: 15,
        totalErrors: 0,
        duration: 1000
      });

      const result = await workflow.execute('template-uuid-001', {
        workspaceName: 'My Startup',
        workspaceDescription: 'Test workspace',
        placeholders: {}
      }, mockTargetPath);

      expect(result.workspaceId).toBe('new-workspace-uuid');
      expect(result.success).toBe(true);
      expect(mockTemplatesApi.getTemplate).toHaveBeenCalledWith('template-uuid-001');
      expect(mockWorkspacesApi.createWorkspace).toHaveBeenCalled();
      expect(mockTemplatesApi.instantiateTemplate).toHaveBeenCalledWith(
        'new-workspace-uuid',
        expect.objectContaining({
          templateId: 'template-uuid-001',
          placeholderValues: {}
        })
      );
    });

    it('should include template config file in cloned vault', async () => {
      const mockWorkspaceResponse = {
        data: {
          data: {
            id: 'new-workspace-uuid',
            name: 'Test Workspace',
            slug: 'test-workspace'
          }
        }
      };

      const mockTemplateResponse = {
        data: {
          data: {
            id: 'template-uuid-001',
            name: 'Business Model Canvas',
            sourceWorkspaceId: 'source-workspace-uuid'
          }
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockTemplateResponse);
      mockWorkspacesApi.createWorkspace = jest.fn().mockResolvedValue(mockWorkspaceResponse);
      mockTemplatesApi.instantiateTemplate = jest.fn().mockResolvedValue({
        data: { data: { workspaceId: 'new-workspace-uuid', status: 'COMPLETED' } }
      });
      mockCloneService.cloneWorkspace = jest.fn().mockResolvedValue({
        success: true,
        totalNodes: 10,
        totalErrors: 0,
        duration: 500
      });

      await workflow.execute('template-uuid-001', {
        workspaceName: 'Test',
        placeholders: {}
      }, mockTargetPath);

      // Verify template.config.json was written
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(mockTargetPath, '.mujarrad'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(mockTargetPath, '.mujarrad', 'template.config.json'),
        expect.any(String),
        'utf-8'
      );

      // Verify config content
      const writeFileCall = (fs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].endsWith('template.config.json')
      );
      expect(writeFileCall).toBeDefined();
      const config = JSON.parse(writeFileCall[1]);
      expect(config.templateId).toBe('template-uuid-001');
      expect(config.templateName).toBe('Business Model Canvas');
      expect(config.workspaceId).toBe('new-workspace-uuid');
    });

    it('should handle template with placeholders', async () => {
      const mockWorkspaceResponse = {
        data: {
          data: {
            id: 'new-workspace-uuid',
            name: 'Week of 2025-01-01',
            slug: 'week-of-2025-01-01'
          }
        }
      };

      const mockTemplateResponse = {
        data: {
          data: {
            id: 'template-uuid-002',
            name: 'Weekly Planning Template',
            sourceWorkspaceId: 'source-workspace-uuid'
          }
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockTemplateResponse);
      mockWorkspacesApi.createWorkspace = jest.fn().mockResolvedValue(mockWorkspaceResponse);
      mockTemplatesApi.instantiateTemplate = jest.fn().mockResolvedValue({
        data: { data: { workspaceId: 'new-workspace-uuid', status: 'COMPLETED' } }
      });
      mockCloneService.cloneWorkspace = jest.fn().mockResolvedValue({
        success: true,
        totalNodes: 5,
        totalErrors: 0,
        duration: 300
      });

      const placeholders = {
        week_of: '2025-01-01',
        year: '2025'
      };

      const result = await workflow.execute('template-uuid-002', {
        workspaceName: 'Week of 2025-01-01',
        placeholders
      }, mockTargetPath);

      expect(result.success).toBe(true);
      expect(mockTemplatesApi.instantiateTemplate).toHaveBeenCalledWith(
        'new-workspace-uuid',
        expect.objectContaining({
          templateId: 'template-uuid-002',
          placeholderValues: placeholders
        })
      );
    });

    it('should handle instantiation failure', async () => {
      const mockWorkspaceResponse = {
        data: {
          data: {
            id: 'new-workspace-uuid',
            name: 'Test Workspace',
            slug: 'test-workspace'
          }
        }
      };

      const mockTemplateResponse = {
        data: {
          data: {
            id: 'template-uuid-001',
            name: 'Business Model Canvas'
          }
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockTemplateResponse);
      mockWorkspacesApi.createWorkspace = jest.fn().mockResolvedValue(mockWorkspaceResponse);
      mockTemplatesApi.instantiateTemplate = jest.fn().mockRejectedValue(
        new Error('Instantiation failed')
      );

      await expect(
        workflow.execute('template-uuid-001', {
          workspaceName: 'Test',
          placeholders: {}
        }, mockTargetPath)
      ).rejects.toThrow('Failed to instantiate template: Instantiation failed');
    });

    it('should handle clone failure', async () => {
      const mockWorkspaceResponse = {
        data: {
          data: {
            id: 'new-workspace-uuid',
            name: 'Test Workspace',
            slug: 'test-workspace'
          }
        }
      };

      const mockTemplateResponse = {
        data: {
          data: {
            id: 'template-uuid-001',
            name: 'Business Model Canvas'
          }
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockTemplateResponse);
      mockWorkspacesApi.createWorkspace = jest.fn().mockResolvedValue(mockWorkspaceResponse);
      mockTemplatesApi.instantiateTemplate = jest.fn().mockResolvedValue({
        data: { data: { workspaceId: 'new-workspace-uuid', status: 'COMPLETED' } }
      });
      mockCloneService.cloneWorkspace = jest.fn().mockResolvedValue({
        success: false,
        totalNodes: 0,
        totalErrors: 1,
        duration: 100
      });

      const result = await workflow.execute('template-uuid-001', {
        workspaceName: 'Test',
        placeholders: {}
      }, mockTargetPath);

      expect(result.success).toBe(false);
      expect(result.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('extractPlaceholders', () => {
    it('should extract placeholder keys from template content', () => {
      const content = 'Week of {week_of} in {year}. Project: {project_name}';
      const placeholders = TemplateCloneWorkflow.extractPlaceholders(content);

      expect(placeholders).toEqual(['week_of', 'year', 'project_name']);
    });

    it('should return empty array when no placeholders found', () => {
      const content = 'Regular content without placeholders';
      const placeholders = TemplateCloneWorkflow.extractPlaceholders(content);

      expect(placeholders).toEqual([]);
    });

    it('should handle duplicate placeholders', () => {
      const content = '{week} starts {week} and ends {week}';
      const placeholders = TemplateCloneWorkflow.extractPlaceholders(content);

      // Should return unique placeholders
      expect(placeholders).toEqual(['week']);
    });
  });
});
