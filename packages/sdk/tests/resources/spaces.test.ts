import nock from 'nock';
import { HttpClient } from '../../src/http.js';
import { SpacesResource } from '../../src/resources/spaces.js';

const BASE_URL = 'https://test-api.mujarrad.com/api';

function createSpaces() {
  const http = new HttpClient({
    apiKey: 'pk_test',
    secretKey: 'sk_test',
    space: 'test-space',
    baseUrl: BASE_URL,
    retryOptions: { maxAttempts: 1 },
  });
  return new SpacesResource(http);
}

const mockSpace = {
  id: 'space-1',
  name: 'Test Space',
  slug: 'test-space',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('SpacesResource', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should create a space', async () => {
    nock(BASE_URL)
      .post('/spaces', { name: 'Test Space' })
      .reply(201, { success: true, data: mockSpace });

    const spaces = createSpaces();
    const result = await spaces.create({ name: 'Test Space' });
    expect(result.id).toBe('space-1');
    expect(result.name).toBe('Test Space');
  });

  it('should get a space by ID', async () => {
    nock(BASE_URL)
      .get('/spaces/space-1')
      .reply(200, { success: true, data: mockSpace });

    const spaces = createSpaces();
    const result = await spaces.get('space-1');
    expect(result.id).toBe('space-1');
  });

  it('should get a space by slug', async () => {
    nock(BASE_URL)
      .get('/spaces/slug/test-space')
      .reply(200, { success: true, data: mockSpace });

    const spaces = createSpaces();
    const result = await spaces.getBySlug('test-space');
    expect(result.slug).toBe('test-space');
  });

  it('should list spaces', async () => {
    nock(BASE_URL)
      .get('/spaces')
      .reply(200, { success: true, data: [mockSpace] });

    const spaces = createSpaces();
    const result = await spaces.list();
    expect(result).toHaveLength(1);
  });

  it('should delete a space', async () => {
    nock(BASE_URL)
      .delete('/spaces/space-1')
      .reply(204);

    const spaces = createSpaces();
    await spaces.delete('space-1');
  });
});
