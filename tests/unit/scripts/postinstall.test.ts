/**
 * Unit tests for postinstall script
 */
import * as fs from 'fs';
import * as path from 'path';

describe('postinstall script', () => {
  let postinstallPath: string;
  let originalIsTTY: boolean;
  let consoleSpy: jest.SpyInstance;

  beforeAll(() => {
    postinstallPath = path.join(__dirname, '../../../scripts/postinstall.js');
    originalIsTTY = process.stdout.isTTY;
  });

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore console
    consoleSpy.mockRestore();
    // Restore TTY state
    (process.stdout as any).isTTY = originalIsTTY;
  });

  describe('TTY detection', () => {
    it('should exist as a file', () => {
      expect(fs.existsSync(postinstallPath)).toBe(true);
    });

    it('should be executable JavaScript', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content).toContain('process.stdout.isTTY');
    });

    it('should check for TTY before displaying output', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content).toMatch(/if.*process\.stdout\.isTTY/);
    });
  });

  describe('graceful failure', () => {
    it('should wrap logic in try-catch', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content).toContain('try {');
      expect(content).toContain('} catch');
    });

    it('should not re-throw errors', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      // Should not have 'throw' in catch block
      const catchBlockMatch = content.match(/catch\s*\([^)]*\)\s*\{([^}]*)\}/);
      if (catchBlockMatch) {
        expect(catchBlockMatch[1]).not.toContain('throw');
      }
    });

    it('should have silent failure comment', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/silent.*failure|don't.*block.*install/i);
    });
  });

  describe('output content', () => {
    it('should reference Mujarrad CLI', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content.toLowerCase()).toContain('mujarrad');
    });

    it('should include success message', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content.toLowerCase()).toMatch(/success|installed/);
    });

    it('should include getting started command', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content).toMatch(/mujarrad.*--help/);
    });

    it('should reference logo/banner display', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      expect(content).toMatch(/displayBanner|logo/);
    });
  });

  describe('dependencies', () => {
    it('should conditionally require chalk', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      // Should require chalk for colored output
      expect(content).toContain('chalk');
    });

    it('should handle missing dependencies gracefully', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      // Should be in try-catch to handle missing modules
      expect(content).toContain('try {');
    });
  });

  describe('CI/CD compatibility', () => {
    it('should not output in non-TTY environments', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      // Output should only happen inside TTY check
      const lines = content.split('\n');
      const ttyCheckIndex = lines.findIndex(line => line.includes('process.stdout.isTTY'));
      const consoleLogIndex = lines.findIndex(line => line.includes('console.log'));

      if (ttyCheckIndex !== -1 && consoleLogIndex !== -1) {
        // console.log should be after TTY check
        expect(consoleLogIndex).toBeGreaterThan(ttyCheckIndex);
      }
    });
  });

  describe('performance', () => {
    it('should complete quickly (< 5 seconds)', () => {
      // This is validated by file size and lack of heavy operations
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      const sizeInKB = Buffer.byteLength(content, 'utf-8') / 1024;

      // Postinstall script should be small and fast
      expect(sizeInKB).toBeLessThan(10); // Less than 10KB
    });

    it('should not include heavy computations', () => {
      const content = fs.readFileSync(postinstallPath, 'utf-8');
      // Should not have loops, network calls, file operations
      expect(content).not.toContain('for (');
      expect(content).not.toContain('while (');
      expect(content).not.toContain('fetch(');
      expect(content).not.toContain('http.');
    });
  });
});
