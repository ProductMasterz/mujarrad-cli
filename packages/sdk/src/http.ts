/**
 * Mujarrad SDK HTTP Client
 *
 * Thin axios wrapper with API key auth, retry with exponential backoff,
 * and error mapping to typed SDK errors.
 *
 * Auth pattern: X-API-Key + X-API-Secret headers (not JWT).
 * Retry pattern ported from mujarrad-cli/src/utils/RetryHandler.ts.
 * Error mapping ported from mujarrad-cli/src/utils/ErrorHandler.ts.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { MujarradConfig, RetryOptions } from './types.js';
import {
  MujarradError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
} from './errors.js';

const DEFAULT_BASE_URL = 'https://mujarrad.onrender.com/api';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY: RetryOptions = { maxAttempts: 3, baseDelay: 1000 };

export class HttpClient {
  private client: AxiosInstance;
  private retryOptions: Required<RetryOptions>;

  constructor(config: MujarradConfig) {
    this.retryOptions = {
      maxAttempts: config.retryOptions?.maxAttempts ?? DEFAULT_RETRY.maxAttempts!,
      baseDelay: config.retryOptions?.baseDelay ?? DEFAULT_RETRY.baseDelay!,
    };

    this.client = axios.create({
      baseURL: config.baseUrl || DEFAULT_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'X-API-Secret': config.secretKey,
      },
    });
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>(() => this.client.get(url, config));
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>(() => this.client.post(url, data, config));
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>(() => this.client.put(url, data, config));
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestWithRetry<T>(() => this.client.delete(url, config));
  }

  private async requestWithRetry<T>(fn: () => Promise<AxiosResponse<T>>): Promise<T> {
    const { maxAttempts, baseDelay } = this.retryOptions;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fn();
        return response.data;
      } catch (error: unknown) {
        const sdkError = this.mapError(error);

        if (!sdkError.canRetry || attempt === maxAttempts - 1) {
          throw sdkError;
        }

        const delay = this.calculateDelay(error, attempt, baseDelay);
        await this.sleep(delay);
      }
    }

    throw new NetworkError('All retry attempts exhausted.');
  }

  private mapError(error: unknown): MujarradError {
    if (!axios.isAxiosError(error)) {
      if (error instanceof MujarradError) return error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new NetworkError(message);
    }

    if (!error.response) {
      return new NetworkError(error.message || 'Network error');
    }

    const status = error.response.status;
    const data = error.response.data;
    const message = data?.message || data?.error || error.message || 'Unknown error';

    switch (status) {
      case 400:
        return new ValidationError(message, Array.isArray(data?.errors) ? data.errors : []);
      case 401:
        return new AuthenticationError(message);
      case 404:
        return new NotFoundError(message);
      case 429: {
        const retryAfter = error.response.headers?.['retry-after'];
        const seconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
        return new RateLimitError(message, isNaN(seconds as number) ? undefined : seconds);
      }
      default:
        if (status >= 500) {
          return new ServerError(message, status);
        }
        return new MujarradError(message, status, false);
    }
  }

  private calculateDelay(error: unknown, attempt: number, baseDelay: number): number {
    if (axios.isAxiosError(error)) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        if (!isNaN(seconds)) return seconds * 1000;
      }
    }
    return baseDelay * Math.pow(2, attempt);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
