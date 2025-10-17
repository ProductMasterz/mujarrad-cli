import { TemplateService } from '../../../src/services/TemplateService.js';
import { TemplatesApi } from '../../../src/api/generated/api.js';
import { Logger } from '../../../src/utils/Logger.js';

/**
 * TemplateService Tests (TDD - Tests First)
 *
 * Task 8.1: Implement TemplateService (Template Listing)
 * User Story 4: Template System
 *
 * Tests FR-054, FR-055
 */

// Mock the API and Logger
jest.mock('../../../src/api/generated/api.js');
jest.mock('../../../src/utils/logger.js');

describe('TemplateService', () => {
  let templateService: TemplateService;
  let mockTemplatesApi: jest.Mocked<TemplatesApi>;

  beforeEach(() => {
    // Create mock TemplatesApi instance
    mockTemplatesApi = new TemplatesApi() as jest.Mocked<TemplatesApi>;
    templateService = new TemplateService(mockTemplatesApi);

    // Mock logger methods
    jest.spyOn(Logger.prototype, 'info').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list available templates', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: [
              {
                id: 'template-uuid-001',
                name: 'Business Model Canvas',
                tags: ['business', 'strategy'],
                isPublic: true,
                usageCount: 127,
                contextTemplatesCount: 9
              },
              {
                id: 'template-uuid-002',
                name: 'Value Proposition Canvas',
                tags: ['business', 'value'],
                isPublic: true,
                usageCount: 85,
                contextTemplatesCount: 5
              }
            ]
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.list();

      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Business Model Canvas');
      expect(templates[0].contextTemplatesCount).toBe(9);
      expect(templates[1].name).toBe('Value Proposition Canvas');
      expect(mockTemplatesApi.listTemplates).toHaveBeenCalledTimes(1);
    });

    it('should filter templates by tags', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: [
              {
                id: 'template-uuid-001',
                name: 'Business Model Canvas',
                tags: ['business', 'strategy'],
                isPublic: true,
                usageCount: 127,
                contextTemplatesCount: 9
              }
            ]
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.list({ tags: ['business'] });

      expect(templates).toHaveLength(1);
      expect(templates[0].tags).toContain('business');
      expect(mockTemplatesApi.listTemplates).toHaveBeenCalledWith('public', 'business', 0, 20);
    });

    it('should filter templates by isPublic flag', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: [
              {
                id: 'template-uuid-001',
                name: 'Private Template',
                tags: ['test'],
                isPublic: false,
                usageCount: 0,
                contextTemplatesCount: 1
              }
            ]
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.list({ isPublic: false });

      expect(templates).toHaveLength(1);
      expect(templates[0].isPublic).toBe(false);
      expect(mockTemplatesApi.listTemplates).toHaveBeenCalledWith('public', undefined, 0, 20);
    });

    it('should return empty array when no templates found', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: []
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.list();

      expect(templates).toHaveLength(0);
      expect(templates).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('Network error');
      mockTemplatesApi.listTemplates = jest.fn().mockRejectedValue(apiError);

      await expect(templateService.list()).rejects.toThrow('Failed to list templates: Network error');
    });
  });

  describe('get', () => {
    it('should get template details by ID', async () => {
      const mockResponse = {
        data: {
          id: 'template-uuid-001',
          creatorId: 'user-uuid',
          sourceSpaceId: 'space-uuid',
          name: 'Business Model Canvas',
          description: '9-block business model framework',
          tags: ['business', 'strategy'],
          isPublic: true,
          usageCount: 127,
          contextTemplatesCount: 9,
          createdAt: '2025-10-09T10:00:00Z',
          updatedAt: '2025-10-11T08:30:00Z',
          deleted: false
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockResponse);

      const template = await templateService.get('template-uuid-001');

      expect(template.id).toBe('template-uuid-001');
      expect(template.name).toBe('Business Model Canvas');
      expect(template.contextTemplatesCount).toBe(9);
      expect(template.description).toBe('9-block business model framework');
      expect(mockTemplatesApi.getTemplate).toHaveBeenCalledWith('template-uuid-001');
    });

    it('should throw error for non-existent template', async () => {
      const apiError = new Error('Template not found');
      mockTemplatesApi.getTemplate = jest.fn().mockRejectedValue(apiError);

      await expect(templateService.get('non-existent-id')).rejects.toThrow('Failed to get template non-existent-id: Template not found');
    });

    it('should handle template with no context templates', async () => {
      const mockResponse = {
        data: {
          id: 'template-uuid-minimal',
          creatorId: 'user-uuid',
          sourceSpaceId: 'space-uuid',
          name: 'Minimal Template',
          description: 'Simple template',
          tags: ['test'],
          isPublic: false,
          usageCount: 0,
          contextTemplatesCount: 0,
          createdAt: '2025-10-11T08:00:00Z',
          updatedAt: '2025-10-11T08:00:00Z',
          deleted: false
        }
      };

      mockTemplatesApi.getTemplate = jest.fn().mockResolvedValue(mockResponse);

      const template = await templateService.get('template-uuid-minimal');

      expect(template.contextTemplatesCount).toBe(0);
      expect(template.name).toBe('Minimal Template');
    });
  });

  describe('search', () => {
    it('should search templates by name', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: [
              {
                id: 'template-uuid-001',
                name: 'Business Model Canvas',
                tags: ['business'],
                isPublic: true,
                usageCount: 127,
                contextTemplatesCount: 9
              }
            ]
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.search('Business');

      expect(templates).toHaveLength(1);
      expect(templates[0].name).toContain('Business');
    });

    it('should return empty array when search yields no results', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: []
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.search('NonExistent');

      expect(templates).toHaveLength(0);
    });
  });

  describe('getPopular', () => {
    it('should get popular templates sorted by usage count', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: [
              {
                id: 'template-uuid-001',
                name: 'Business Model Canvas',
                tags: ['business'],
                isPublic: true,
                usageCount: 127,
                contextTemplatesCount: 9
              },
              {
                id: 'template-uuid-002',
                name: 'Value Proposition Canvas',
                tags: ['business'],
                isPublic: true,
                usageCount: 85,
                contextTemplatesCount: 5
              }
            ]
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.getPopular(5);

      expect(templates).toHaveLength(2);
      expect(templates[0].usageCount).toBeGreaterThanOrEqual(templates[1].usageCount);
    });

    it('should limit results to specified count', async () => {
      const mockResponse = {
        data: {
          data: {
            templates: Array.from({ length: 10 }, (_, i) => ({
              id: `template-uuid-${i}`,
              name: `Template ${i}`,
              tags: ['test'],
              isPublic: true,
              usageCount: 100 - i,
              contextTemplatesCount: 1
            }))
          }
        }
      };

      mockTemplatesApi.listTemplates = jest.fn().mockResolvedValue(mockResponse);

      const templates = await templateService.getPopular(3);

      expect(templates.length).toBeLessThanOrEqual(3);
    });
  });
});
