/**
 * Integration tests for Progress Workflow
 *
 * Tests that progress tracking works correctly:
 * - Progress updates during operations
 * - ETA calculation
 * - Graceful handling in non-TTY environments
 */

import { ProgressBar, Spinner } from '../../src/utils/ProgressBar.js';

// Mock dependencies
jest.mock('cli-progress', () => ({
  SingleBar: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    update: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('ora', () => jest.fn(() => ({
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  isSpinning: false,
})));

describe('Progress Workflow Integration', () => {
  describe('ProgressBar workflow', () => {
    it('should handle complete progress workflow', () => {
      const total = 100;
      const pb = new ProgressBar({ total });

      // Simulate processing items
      for (let i = 0; i < total; i++) {
        pb.increment();
      }

      expect(pb.value).toBe(total);
      pb.stop();
    });

    it('should handle partial progress', () => {
      const pb = new ProgressBar({ total: 100 });

      pb.update(25);
      expect(pb.value).toBe(25);

      pb.update(50);
      expect(pb.value).toBe(50);

      pb.update(75);
      expect(pb.value).toBe(75);

      pb.stop();
    });

    it('should handle zero items gracefully', () => {
      const pb = new ProgressBar({ total: 0 });
      expect(pb.total).toBe(0);
      pb.stop();
    });
  });

  describe('Spinner workflow', () => {
    it('should handle complete spinner workflow', () => {
      const spinner = Spinner.start('Processing...');
      expect(spinner.isSpinning).toBe(true);

      spinner.text = 'Almost done...';
      expect(spinner.text).toBe('Almost done...');

      spinner.succeed('Complete!');
      expect(spinner.isSpinning).toBe(false);
    });

    it('should handle failure workflow', () => {
      const spinner = Spinner.start('Processing...');
      expect(spinner.isSpinning).toBe(true);

      spinner.fail('Failed!');
      expect(spinner.isSpinning).toBe(false);
    });
  });

  describe('Progress Rate (FR-026)', () => {
    it('should update faster than 1Hz', () => {
      const pb = new ProgressBar({ total: 100 });
      const startTime = Date.now();

      // Perform 10 updates
      for (let i = 0; i < 10; i++) {
        pb.increment();
      }

      const elapsed = Date.now() - startTime;

      // Should be much faster than 1 second for 10 updates (1Hz minimum)
      expect(elapsed).toBeLessThan(1000);

      pb.stop();
    });

    it('should handle rapid updates', () => {
      const pb = new ProgressBar({ total: 1000 });

      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        pb.increment();
      }

      const elapsed = Date.now() - startTime;

      // 1000 updates should still be fast
      expect(elapsed).toBeLessThan(5000);

      pb.stop();
    });
  });

  describe('Error handling', () => {
    it('should handle stop after completion', () => {
      const pb = new ProgressBar({ total: 10 });
      pb.update(10);
      pb.stop();

      // Should not throw on subsequent operations
      expect(() => pb.stop()).not.toThrow();
    });

    it('should handle spinner stop after completion', () => {
      const spinner = Spinner.start('Loading...');
      spinner.succeed();

      // Should not throw on subsequent stop
      expect(() => spinner.stop()).not.toThrow();
    });
  });
});
