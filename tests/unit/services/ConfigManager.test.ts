/**
 * Unit tests for ConfigManager
 * Feature: 009-init-command-enhancement
 *
 * Testing Checklist (from handoff):
 * - Creates config directory if missing
 * - Loads existing config correctly
 * - Saves config atomically
 * - Handles corrupted config gracefully
 */

import { ConfigManager } from '../../../src/services/ConfigManager.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock filesystem
jest.mock('fs');
jest.mock('os');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;

describe('ConfigManager', () => {
  const mockHomedir = '/mock/home';
  const mockConfigPath = path.join(mockHomedir, '.mujarrad', 'spaces.json');

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOs.homedir.mockReturnValue(mockHomedir);
  });

  describe('constructor', () => {
    it('should load existing config if file exists', () => {
      const existingConfig = {
        spaces: {
          'test-space': {
            uuid: 'uuid-123',
            slug: 'test-space',
            displayName: 'Test Space',
            lastSync: '2025-10-18T10:00:00Z'
          }
        },
        version: '1.0'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

      const configManager = new ConfigManager();

      expect(mockedFs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(mockConfigPath, 'utf8');

      // Verify loaded config by checking getSpaceUuid
      const uuid = configManager.getSpaceUuid('test-space');
      expect(uuid).toBe('uuid-123');
    });

    it('should create default config if file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const configManager = new ConfigManager();

      const uuid = configManager.getSpaceUuid('non-existent');
      expect(uuid).toBeNull();
    });

    it('should handle corrupted config gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{ invalid json }');

      const configManager = new ConfigManager();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load config, using defaults:',
        expect.any(Error)
      );

      // Should fall back to default config
      const uuid = configManager.getSpaceUuid('any-space');
      expect(uuid).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should handle missing config file gracefully', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const configManager = new ConfigManager();

      // Should use default config without errors
      const spaces = configManager.listSpaces();
      expect(spaces).toEqual([]);
    });
  });

  describe('getSpaceUuid', () => {
    it('should return cached UUID for existing space', () => {
      const existingConfig = {
        spaces: {
          'my-space': {
            uuid: 'uuid-abc-123',
            slug: 'my-space'
          }
        },
        version: '1.0'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

      const configManager = new ConfigManager();
      const uuid = configManager.getSpaceUuid('my-space');

      expect(uuid).toBe('uuid-abc-123');
    });

    it('should return null for non-existent space', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const configManager = new ConfigManager();
      const uuid = configManager.getSpaceUuid('non-existent');

      expect(uuid).toBeNull();
    });
  });

  describe('setSpace', () => {
    it('should create config directory if missing', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => undefined);
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      const configManager = new ConfigManager();

      configManager.setSpace('new-space', {
        uuid: 'uuid-new',
        slug: 'new-space',
        displayName: 'New Space'
      });

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.join(mockHomedir, '.mujarrad'),
        { recursive: true }
      );
    });

    it('should save config atomically after setting space', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{"spaces":{},"version":"1.0"}');
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      const configManager = new ConfigManager();

      configManager.setSpace('test-space', {
        uuid: 'uuid-test',
        slug: 'test-space',
        displayName: 'Test Space',
        lastSync: '2025-10-18T12:00:00Z'
      });

      // Verify writeFileSync was called with correct path and content
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(String)
      );

      // Verify the written data contains the correct UUID
      const writtenData = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsedData = JSON.parse(writtenData);
      expect(parsedData.spaces['test-space'].uuid).toBe('uuid-test');
    });

    it('should update existing space config', () => {
      const existingConfig = {
        spaces: {
          'old-space': {
            uuid: 'uuid-old',
            slug: 'old-space'
          }
        },
        version: '1.0'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      const configManager = new ConfigManager();

      configManager.setSpace('old-space', {
        uuid: 'uuid-old',
        slug: 'old-space',
        displayName: 'Updated Display Name',
        lastSync: '2025-10-18T13:00:00Z'
      });

      // Verify the updated config was written
      expect(mockedFs.writeFileSync).toHaveBeenCalled();

      // Verify change persisted (by checking the written data)
      const writtenData = (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1];
      const parsedData = JSON.parse(writtenData);

      expect(parsedData.spaces['old-space'].displayName).toBe('Updated Display Name');
    });
  });

  describe('removeSpace', () => {
    it('should remove space from config', () => {
      const existingConfig = {
        spaces: {
          'space-to-remove': {
            uuid: 'uuid-remove',
            slug: 'space-to-remove'
          },
          'space-to-keep': {
            uuid: 'uuid-keep',
            slug: 'space-to-keep'
          }
        },
        version: '1.0'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      const configManager = new ConfigManager();

      configManager.removeSpace('space-to-remove');

      // Verify space was removed
      expect(configManager.getSpaceUuid('space-to-remove')).toBeNull();
      expect(configManager.getSpaceUuid('space-to-keep')).toBe('uuid-keep');
    });

    it('should save config after removal', () => {
      const existingConfig = {
        spaces: {
          'space-to-remove': {
            uuid: 'uuid-remove',
            slug: 'space-to-remove'
          }
        },
        version: '1.0'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));
      mockedFs.writeFileSync.mockImplementation(() => undefined);

      const configManager = new ConfigManager();

      configManager.removeSpace('space-to-remove');

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('listSpaces', () => {
    it('should return all cached spaces', () => {
      const existingConfig = {
        spaces: {
          'space-1': {
            uuid: 'uuid-1',
            slug: 'space-1',
            displayName: 'Space 1'
          },
          'space-2': {
            uuid: 'uuid-2',
            slug: 'space-2',
            displayName: 'Space 2'
          }
        },
        version: '1.0'
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

      const configManager = new ConfigManager();
      const spaces = configManager.listSpaces();

      expect(spaces).toHaveLength(2);
      expect(spaces).toContainEqual({
        uuid: 'uuid-1',
        slug: 'space-1',
        displayName: 'Space 1'
      });
      expect(spaces).toContainEqual({
        uuid: 'uuid-2',
        slug: 'space-2',
        displayName: 'Space 2'
      });
    });

    it('should return empty array for empty config', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const configManager = new ConfigManager();
      const spaces = configManager.listSpaces();

      expect(spaces).toEqual([]);
    });
  });
});
