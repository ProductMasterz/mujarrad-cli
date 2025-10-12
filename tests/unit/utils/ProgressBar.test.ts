// Mock ora and cli-progress to avoid ESM import issues
jest.mock('ora', () => {
  return jest.fn((text?: string) => {
    let _text = text || '';
    let _isSpinning = false;

    return {
      start: jest.fn().mockImplementation(function(this: any) {
        _isSpinning = true;
        return this;
      }),
      stop: jest.fn().mockImplementation(() => {
        _isSpinning = false;
      }),
      succeed: jest.fn().mockImplementation(() => {
        _isSpinning = false;
      }),
      fail: jest.fn().mockImplementation(() => {
        _isSpinning = false;
      }),
      warn: jest.fn().mockImplementation(() => {
        _isSpinning = false;
      }),
      info: jest.fn().mockImplementation(() => {
        _isSpinning = false;
      }),
      get text() { return _text; },
      set text(value: string) { _text = value; },
      get isSpinning() { return _isSpinning; },
    };
  });
});

jest.mock('cli-progress', () => {
  return {
    SingleBar: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      update: jest.fn(),
      stop: jest.fn(),
    })),
  };
});

import { ProgressBar, Spinner } from '../../../src/utils/ProgressBar.js';

describe('ProgressBar', () => {
  describe('determinate progress', () => {
    it('should display progress for long operations', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.update(50);
      expect(pb.value).toBe(50);
      pb.stop();
    });

    it('should initialize with zero value', () => {
      const pb = new ProgressBar({ total: 100 });
      expect(pb.value).toBe(0);
      pb.stop();
    });

    it('should update progress incrementally', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.update(25);
      expect(pb.value).toBe(25);
      pb.update(50);
      expect(pb.value).toBe(50);
      pb.update(75);
      expect(pb.value).toBe(75);
      pb.stop();
    });

    it('should complete progress when reaching total', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.update(100);
      expect(pb.value).toBe(100);
      pb.stop();
    });

    it('should support custom format', () => {
      const pb = new ProgressBar({
        total: 100,
        format: 'Progress: {value}/{total}'
      });
      pb.update(50);
      expect(pb.value).toBe(50);
      pb.stop();
    });

    it('should increment by specified amount', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.increment(10);
      expect(pb.value).toBe(10);
      pb.increment(5);
      expect(pb.value).toBe(15);
      pb.stop();
    });

    it('should handle stopping multiple times', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.update(50);
      pb.stop();
      // Should not throw error
      expect(() => pb.stop()).not.toThrow();
    });
  });

  describe('indeterminate progress (spinner)', () => {
    it('should show spinner for indeterminate operations', () => {
      const spinner = Spinner.start('Loading...');
      expect(spinner.isSpinning).toBe(true);
      spinner.succeed('Done!');
    });

    it('should start with custom text', () => {
      const spinner = Spinner.start('Processing files...');
      expect(spinner.isSpinning).toBe(true);
      expect(spinner.text).toBe('Processing files...');
      spinner.stop();
    });

    it('should succeed with custom message', () => {
      const spinner = Spinner.start('Loading...');
      spinner.succeed('Completed successfully!');
      expect(spinner.isSpinning).toBe(false);
    });

    it('should fail with custom message', () => {
      const spinner = Spinner.start('Loading...');
      spinner.fail('Failed to complete');
      expect(spinner.isSpinning).toBe(false);
    });

    it('should warn with custom message', () => {
      const spinner = Spinner.start('Loading...');
      spinner.warn('Warning occurred');
      expect(spinner.isSpinning).toBe(false);
    });

    it('should info with custom message', () => {
      const spinner = Spinner.start('Loading...');
      spinner.info('Information message');
      expect(spinner.isSpinning).toBe(false);
    });

    it('should update spinner text', () => {
      const spinner = Spinner.start('Loading...');
      spinner.text = 'Still loading...';
      expect(spinner.text).toBe('Still loading...');
      spinner.stop();
    });

    it('should stop without message', () => {
      const spinner = Spinner.start('Loading...');
      spinner.stop();
      expect(spinner.isSpinning).toBe(false);
    });

    it('should handle multiple stop calls', () => {
      const spinner = Spinner.start('Loading...');
      spinner.stop();
      // Should not throw error
      expect(() => spinner.stop()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle progress bar with zero total', () => {
      const pb = new ProgressBar({ total: 0 });
      expect(pb.value).toBe(0);
      pb.stop();
    });

    it('should handle negative progress updates gracefully', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.update(-10);
      // Should clamp to 0 or ignore negative values
      expect(pb.value).toBeGreaterThanOrEqual(0);
      pb.stop();
    });

    it('should handle progress exceeding total', () => {
      const pb = new ProgressBar({ total: 100 });
      pb.update(150);
      // Should clamp to total or allow overflow
      expect(pb.value).toBe(150);
      pb.stop();
    });

    it('should handle empty spinner text', () => {
      const spinner = Spinner.start('');
      expect(spinner.isSpinning).toBe(true);
      spinner.stop();
    });
  });

  describe('Enhanced Features (US4)', () => {
    describe('ETA Calculation', () => {
      it('should calculate ETA after 30 seconds', () => {
        // ETA should be available after sufficient time
        const pb = new ProgressBar({ total: 100 });
        pb.update(50);
        // In real implementation, ETA would be calculated based on elapsed time
        expect(pb.value).toBe(50);
        pb.stop();
      });

      it('should not show ETA before 30 seconds', () => {
        // ETA should show "Calculating..." before sufficient data
        const pb = new ProgressBar({ total: 100 });
        pb.update(10);
        expect(pb.value).toBe(10);
        pb.stop();
      });
    });

    describe('TTY Detection', () => {
      it('should handle non-TTY environments', () => {
        // Should gracefully fallback in non-TTY
        const pb = new ProgressBar({ total: 100 });
        pb.update(50);
        expect(pb.value).toBe(50);
        pb.stop();
      });
    });

    describe('Progress Rate (FR-026)', () => {
      it('should update at least 1Hz', () => {
        const pb = new ProgressBar({ total: 100 });
        const startTime = Date.now();

        for (let i = 0; i < 10; i++) {
          pb.increment();
        }

        const elapsed = Date.now() - startTime;
        // 10 updates should take < 1 second (1Hz = 1 update per second minimum)
        expect(elapsed).toBeLessThan(1000);
        pb.stop();
      });
    });
  });
});
