import { RetryHandler } from '../../../src/utils/RetryHandler.js';

describe('RetryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('withRetry', () => {
    it('should retry failed requests up to 3 times', async () => {
      let attempts = 0;
      const mockFn = jest.fn(() => {
        attempts++;
        if (attempts < 3) throw new Error('Network error');
        return Promise.resolve({ data: 'success' });
      });

      const result = await RetryHandler.withRetry(mockFn, { maxAttempts: 3 }) as any;
      expect(attempts).toBe(3);
      expect(result.data).toBe('success');
    });

    it('should use exponential backoff delays (1s, 2s, 4s)', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay: any) => {
        delays.push(delay);
        // Execute immediately for test
        fn();
        return {} as any;
      });

      try {
        await RetryHandler.withRetry(() => Promise.reject(new Error('error')), { maxAttempts: 3 });
      } catch (e) {
        // Expected to fail
      }

      expect(delays).toEqual([1000, 2000]);
      
      global.setTimeout = originalSetTimeout;
    });

    it('should succeed on first attempt without retries', async () => {
      const mockFn = jest.fn(() => Promise.resolve({ data: 'success' }));

      const result = await RetryHandler.withRetry(mockFn) as any;

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result.data).toBe('success');
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const mockFn = jest.fn(() => Promise.reject({ status: 404, message: 'Not found' }));
      
      await expect(RetryHandler.withRetry(mockFn)).rejects.toMatchObject({ status: 404 });
      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on 400 Bad Request', async () => {
      const mockFn = jest.fn(() => Promise.reject({ status: 400, message: 'Bad request' }));
      
      await expect(RetryHandler.withRetry(mockFn)).rejects.toMatchObject({ status: 400 });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      const mockFn = jest.fn(() => Promise.reject({ status: 401, message: 'Unauthorized' }));
      
      await expect(RetryHandler.withRetry(mockFn)).rejects.toMatchObject({ status: 401 });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 rate limit', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '1' } })
        .mockResolvedValueOnce({ data: 'success' });

      const result = await RetryHandler.withRetry(mockFn) as any;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.data).toBe('success');
    });

    it('should respect Retry-After header for 429 responses', async () => {
      const delays: number[] = [];
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay: any) => {
        delays.push(delay);
        fn();
        return {} as any;
      });

      const mockFn = jest.fn()
        .mockRejectedValueOnce({ status: 429, headers: { 'retry-after': '5' } })
        .mockResolvedValueOnce({ data: 'success' });

      await RetryHandler.withRetry(mockFn);
      
      // Should use Retry-After value (5 seconds = 5000ms)
      expect(delays[0]).toBe(5000);
    });

    it('should retry on 5xx server errors', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Internal server error' })
        .mockResolvedValueOnce({ data: 'success' });

      const result = await RetryHandler.withRetry(mockFn) as any;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.data).toBe('success');
    });

    it('should retry on 503 Service Unavailable', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce({ status: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce({ data: 'success' });

      const result = await RetryHandler.withRetry(mockFn) as any;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.data).toBe('success');
    });

    it('should retry on network errors (no status)', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ data: 'success' });

      const result = await RetryHandler.withRetry(mockFn) as any;

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.data).toBe('success');
    });

    it('should throw last error after all retries exhausted', async () => {
      const mockFn = jest.fn(() => Promise.reject(new Error('Persistent failure')));

      await expect(RetryHandler.withRetry(mockFn, { maxAttempts: 3 }))
        .rejects.toThrow('Persistent failure');
      
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should support custom maxAttempts', async () => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return {} as any;
      });

      let attempts = 0;
      const mockFn = jest.fn(() => {
        attempts++;
        throw new Error('Always fails');
      });

      try {
        await RetryHandler.withRetry(mockFn, { maxAttempts: 5 });
      } catch (e) {
        // Expected
      }

      expect(attempts).toBe(5);
    });

    it('should support custom baseDelay', async () => {
      const delays: number[] = [];
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay: any) => {
        delays.push(delay);
        fn();
        return {} as any;
      });

      const mockFn = jest.fn(() => Promise.reject(new Error('error')));

      try {
        await RetryHandler.withRetry(mockFn, { maxAttempts: 3, baseDelay: 500 });
      } catch (e) {
        // Expected
      }

      // With baseDelay=500: 500, 1000, 2000 (but only 2 delays for 3 attempts)
      expect(delays).toEqual([500, 1000]);
    });

    it('should handle errors with response property (axios-style)', async () => {
      const mockFn = jest.fn(() => 
        Promise.reject({ 
          response: { status: 404, data: { error: 'Not found' } } 
        })
      );

      await expect(RetryHandler.withRetry(mockFn)).rejects.toMatchObject({
        response: { status: 404 }
      });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
