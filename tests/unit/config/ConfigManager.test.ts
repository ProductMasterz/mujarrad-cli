import { ConfigManager } from '../../../src/config/ConfigManager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  const testConfigDir = path.join(os.tmpdir(), '.mujarrad-test');
  const testConfigPath = path.join(testConfigDir, 'config.json');

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    await fs.mkdir(testConfigDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should load config from ~/.mujarrad/config.json', async () => {
    // Create test config
    const testConfig = {
      apiBaseUrl: 'https://test.api.com',
      defaultSpace: 'test-space',
      autoSync: false,
      logLevel: 'info'
    };

    await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

    const configManager = new ConfigManager(testConfigDir);
    const config = await configManager.load();

    expect(config.apiBaseUrl).toBe('https://test.api.com');
    expect(config.defaultSpace).toBe('test-space');
    expect(config.autoSync).toBe(false);
    expect(config.logLevel).toBe('info');
  });

  it('should create default config if none exists', async () => {
    const configManager = new ConfigManager(testConfigDir);
    const config = await configManager.load();

    // Should have default values
    expect(config.apiBaseUrl).toBeDefined();
    expect(config.logLevel).toBeDefined();
    expect(config.autoSync).toBeDefined();

    // Verify file was created
    const fileExists = await fs.access(testConfigPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('should validate required config fields', async () => {
    // Create invalid config (missing required fields)
    const invalidConfig = {
      logLevel: 'debug'
      // Missing apiBaseUrl
    };

    await fs.writeFile(testConfigPath, JSON.stringify(invalidConfig, null, 2));

    const configManager = new ConfigManager(testConfigDir);

    // Should use defaults for missing required fields
    const config = await configManager.load();
    expect(config.apiBaseUrl).toBeDefined(); // Should have default
  });

  it('should support environment variable overrides', async () => {
    // Set environment variable
    process.env.MUJARRAD_API_BASE_URL = 'https://env.api.com';
    process.env.MUJARRAD_LOG_LEVEL = 'debug';

    const configManager = new ConfigManager(testConfigDir);
    const config = await configManager.load();

    expect(config.apiBaseUrl).toBe('https://env.api.com');
    expect(config.logLevel).toBe('debug');

    // Clean up
    delete process.env.MUJARRAD_API_BASE_URL;
    delete process.env.MUJARRAD_LOG_LEVEL;
  });

  it('should merge environment variables with file config', async () => {
    // Create config file
    const fileConfig = {
      apiBaseUrl: 'https://file.api.com',
      defaultSpace: 'file-space',
      autoSync: true,
      logLevel: 'info'
    };

    await fs.writeFile(testConfigPath, JSON.stringify(fileConfig, null, 2));

    // Set environment variable (should override file config)
    process.env.MUJARRAD_API_BASE_URL = 'https://env.api.com';

    const configManager = new ConfigManager(testConfigDir);
    const config = await configManager.load();

    expect(config.apiBaseUrl).toBe('https://env.api.com'); // From env
    expect(config.defaultSpace).toBe('file-space'); // From file
    expect(config.logLevel).toBe('info'); // From file

    // Clean up
    delete process.env.MUJARRAD_API_BASE_URL;
  });

  it('should save config to file', async () => {
    const configManager = new ConfigManager(testConfigDir);

    const newConfig: import('../../../src/config/types.js').Config = {
      apiBaseUrl: 'https://new.api.com',
      defaultSpace: 'new-space',
      autoSync: true,
      logLevel: 'debug' as 'debug'
    };

    await configManager.save(newConfig);

    // Verify file was written
    const savedContent = await fs.readFile(testConfigPath, 'utf-8');
    const savedConfig = JSON.parse(savedContent);

    expect(savedConfig.apiBaseUrl).toBe('https://new.api.com');
    expect(savedConfig.defaultSpace).toBe('new-space');
  });
});
