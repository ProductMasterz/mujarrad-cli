import nock from 'nock';
import { HttpClient } from '../src/http.js';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
} from '../src/errors.js';

const BASE_URL = 'https://test-api.mujarrad.com/api';

function createClient(overrides = {}) {
  return new HttpClient({
    apiKey: 'pk_test_123',
    secretKey: 'sk_test_456',
    space: 'test-space',
    baseUrl: BASE_URL,
    retryOptions: { maxAttempts: 1, baseDelay: 10 },
    ...overrides,
  });
}

describe('HttpClient', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('auth headers', () => {
    it('should send X-API-Key and X-API-Secret headers', async () => {
      const scope = nock(BASE_URL)
        .get('/test')
        .matchHeader('X-API-Key', 'pk_test_123')
        .matchHeader('X-API-Secret', 'sk_test_456')
        .reply(200, { success: true, data: 'ok' });

      const client = createClient();
      await client.get('/test');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('HTTP methods', () => {
    it('should handle GET requests', async () => {
      nock(BASE_URL).get('/nodes').reply(200, { data: [1, 2, 3] });
      const client = createClient();
      const result = await client.get('/nodes');
      expect(result).toEqual({ data: [1, 2, 3] });
    });

    it('should handle POST requests', async () => {
      nock(BASE_URL).post('/nodes', { title: 'test' }).reply(201, { data: { id: '1' } });
      const client = createClient();
      const result = await client.post('/nodes', { title: 'test' });
      expect(result).toEqual({ data: { id: '1' } });
    });

    it('should handle PUT requests', async () => {
      nock(BASE_URL).put('/nodes/1', { title: 'updated' }).reply(200, { data: { id: '1' } });
      const client = createClient();
      const result = await client.put('/nodes/1', { title: 'updated' });
      expect(result).toEqual({ data: { id: '1' } });
    });

    it('should handle DELETE requests', async () => {
      nock(BASE_URL).delete('/nodes/1').reply(204);
      const client = createClient();
      await client.delete('/nodes/1');
    });
  });

  describe('error mapping', () => {
    it('should map 400 to ValidationError', async () => {
      nock(BASE_URL).get('/fail').reply(400, { message: 'Bad request' });
      const client = createClient();
      await expect(client.get('/fail')).rejects.toThrow(ValidationError);
    });

    it('should map 401 to AuthenticationError', async () => {
      nock(BASE_URL).get('/fail').reply(401, { message: 'Unauthorized' });
      const client = createClient();
      await expect(client.get('/fail')).rejects.toThrow(AuthenticationError);
    });

    it('should map 404 to NotFoundError', async () => {
      nock(BASE_URL).get('/fail').reply(404, { message: 'Not found' });
      const client = createClient();
      await expect(client.get('/fail')).rejects.toThrow(NotFoundError);
    });

    it('should map 429 to RateLimitError', async () => {
      nock(BASE_URL).get('/fail').reply(429, { message: 'Rate limited' });
      const client = createClient();
      await expect(client.get('/fail')).rejects.toThrow(RateLimitError);
    });

    it('should map 500 to ServerError', async () => {
      nock(BASE_URL).get('/fail').reply(500, { message: 'Internal error' });
      const client = createClient();
      await expect(client.get('/fail')).rejects.toThrow(ServerError);
    });

    it('should map network errors to NetworkError', async () => {
      nock(BASE_URL).get('/fail').replyWithError('ECONNREFUSED');
      const client = createClient();
      await expect(client.get('/fail')).rejects.toThrow(NetworkError);
    });
  });

  describe('retry logic', () => {
    it('should retry on server errors', async () => {
      const scope = nock(BASE_URL)
        .get('/retry')
        .reply(500, { message: 'fail' })
        .get('/retry')
        .reply(200, { data: 'ok' });

      const client = createClient({
        retryOptions: { maxAttempts: 2, baseDelay: 10 },
      });
      const result = await client.get('/retry');
      expect(result).toEqual({ data: 'ok' });
      expect(scope.isDone()).toBe(true);
    });

    it('should not retry on 400 errors', async () => {
      nock(BASE_URL).get('/no-retry').reply(400, { message: 'bad' });
      const client = createClient({
        retryOptions: { maxAttempts: 3, baseDelay: 10 },
      });
      await expect(client.get('/no-retry')).rejects.toThrow(ValidationError);
    });

    it('should not retry on 401 errors', async () => {
      nock(BASE_URL).get('/no-retry').reply(401, { message: 'unauth' });
      const client = createClient({
        retryOptions: { maxAttempts: 3, baseDelay: 10 },
      });
      await expect(client.get('/no-retry')).rejects.toThrow(AuthenticationError);
    });

    it('should exhaust retries and throw last error', async () => {
      nock(BASE_URL)
        .get('/exhaust')
        .times(3)
        .reply(500, { message: 'down' });

      const client = createClient({
        retryOptions: { maxAttempts: 3, baseDelay: 10 },
      });
      await expect(client.get('/exhaust')).rejects.toThrow(ServerError);
    });
  });
});
