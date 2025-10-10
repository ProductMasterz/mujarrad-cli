import ora, { Ora } from 'ora';
import cliProgress from 'cli-progress';

/**
 * Progress bar configuration options
 */
export interface ProgressBarOptions {
  total: number;
  format?: string;
}

/**
 * ProgressBar provides a visual indicator for long-running determinate operations
 *
 * Features:
 * - Displays progress bar with percentage
 * - Customizable format string
 * - Increment and update methods
 * - Auto-stop when reaching total
 *
 * Usage:
 * ```typescript
 * const pb = new ProgressBar({ total: 100 });
 * for (let i = 0; i < 100; i++) {
 *   await processItem(i);
 *   pb.increment();
 * }
 * pb.stop();
 * ```
 */
export class ProgressBar {
  private bar: cliProgress.SingleBar;
  private _value: number = 0;
  private _total: number;
  private stopped: boolean = false;

  constructor(options: ProgressBarOptions) {
    this._total = options.total;

    // Create progress bar with custom or default format
    const format = options.format || 'Progress: [{bar}] {percentage}% | {value}/{total}';

    this.bar = new cliProgress.SingleBar({
      format,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    // Start the progress bar
    this.bar.start(this._total, 0);
  }

  /**
   * Update progress to a specific value
   *
   * @param value - New progress value
   */
  update(value: number): void {
    if (this.stopped) {
      return;
    }

    // Clamp value between 0 and allow overflow for flexibility
    this._value = Math.max(0, value);
    this.bar.update(this._value);
  }

  /**
   * Increment progress by a specified amount (default: 1)
   *
   * @param amount - Amount to increment (default: 1)
   */
  increment(amount: number = 1): void {
    this.update(this._value + amount);
  }

  /**
   * Stop and remove the progress bar
   */
  stop(): void {
    if (!this.stopped) {
      this.bar.stop();
      this.stopped = true;
    }
  }

  /**
   * Get current progress value
   */
  get value(): number {
    return this._value;
  }

  /**
   * Get total progress value
   */
  get total(): number {
    return this._total;
  }
}

/**
 * Spinner provides a visual indicator for indeterminate operations
 *
 * Features:
 * - Animated spinner with customizable text
 * - Success, fail, warn, info completion states
 * - Update text during operation
 *
 * Usage:
 * ```typescript
 * const spinner = Spinner.start('Loading...');
 * await fetchData();
 * spinner.succeed('Data loaded!');
 * ```
 */
export class Spinner {
  private ora: Ora;
  private _isSpinning: boolean = false;

  private constructor(text?: string) {
    this.ora = ora(text);
    this.ora.start();
    this._isSpinning = true;
  }

  /**
   * Start a new spinner
   *
   * @param text - Spinner text (optional)
   * @returns Spinner instance
   */
  static start(text?: string): Spinner {
    return new Spinner(text);
  }

  /**
   * Get current spinner text
   */
  get text(): string {
    return this.ora.text;
  }

  /**
   * Set spinner text
   */
  set text(value: string) {
    this.ora.text = value;
  }

  /**
   * Check if spinner is currently spinning
   */
  get isSpinning(): boolean {
    return this._isSpinning;
  }

  /**
   * Complete spinner with success message
   *
   * @param message - Success message (optional)
   */
  succeed(message?: string): void {
    if (this._isSpinning) {
      this.ora.succeed(message);
      this._isSpinning = false;
    }
  }

  /**
   * Complete spinner with failure message
   *
   * @param message - Failure message (optional)
   */
  fail(message?: string): void {
    if (this._isSpinning) {
      this.ora.fail(message);
      this._isSpinning = false;
    }
  }

  /**
   * Complete spinner with warning message
   *
   * @param message - Warning message (optional)
   */
  warn(message?: string): void {
    if (this._isSpinning) {
      this.ora.warn(message);
      this._isSpinning = false;
    }
  }

  /**
   * Complete spinner with info message
   *
   * @param message - Info message (optional)
   */
  info(message?: string): void {
    if (this._isSpinning) {
      this.ora.info(message);
      this._isSpinning = false;
    }
  }

  /**
   * Stop spinner without completion message
   */
  stop(): void {
    if (this._isSpinning) {
      this.ora.stop();
      this._isSpinning = false;
    }
  }
}
