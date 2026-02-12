import nock from 'nock';
import { HttpClient } from '../../src/http.js';
import { NodesResource } from '../../src/resources/nodes.js';

const BASE_URL = 'https://test-api.mujarrad.com/api';
const SPACE_SLUG = 'test-space';

function createNodes() {
  const http = new HttpClient({
    apiKey: 'pk_test',
    secretKey: 'sk_test',
    space: SPACE_SLUG,
    baseUrl: BASE_URL,
    retryOptions: { maxAttempts: 1 },
  });
  return new NodesResource(http, SPACE_SLUG);
}

const mockNode = {
  id: 'node-1',
  spaceId: 'space-1',
  nodeType: 'REGULAR',
  title: 'Test Node',
  slug: 'test-node',
  nodeDetails: { foo: 'bar' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('NodesResource', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should create a node', async () => {
    nock(BASE_URL)
      .post(`/spaces/${SPACE_SLUG}/nodes`, { title: 'Test Node' })
      .reply(201, { success: true, data: mockNode });

    const nodes = createNodes();
    const result = await nodes.create({ title: 'Test Node' });
    expect(result.id).toBe('node-1');
    expect(result.title).toBe('Test Node');
  });

  it('should get a node', async () => {
    nock(BASE_URL)
      .get(`/spaces/${SPACE_SLUG}/nodes/node-1`)
      .reply(200, { success: true, data: mockNode });

    const nodes = createNodes();
    const result = await nodes.get('node-1');
    expect(result.id).toBe('node-1');
  });

  it('should update a node', async () => {
    nock(BASE_URL)
      .put(`/spaces/${SPACE_SLUG}/nodes/node-1`, { title: 'Updated' })
      .reply(200, { success: true, data: { ...mockNode, title: 'Updated' } });

    const nodes = createNodes();
    const result = await nodes.update('node-1', { title: 'Updated' });
    expect(result.title).toBe('Updated');
  });

  it('should delete a node', async () => {
    nock(BASE_URL)
      .delete(`/spaces/${SPACE_SLUG}/nodes/node-1`)
      .reply(204);

    const nodes = createNodes();
    await nodes.delete('node-1');
  });

  it('should list nodes', async () => {
    nock(BASE_URL)
      .get(`/spaces/${SPACE_SLUG}/nodes`)
      .reply(200, { success: true, data: [mockNode] });

    const nodes = createNodes();
    const result = await nodes.list();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('node-1');
  });

  it('should list nodes with options', async () => {
    nock(BASE_URL)
      .get(`/spaces/${SPACE_SLUG}/nodes`)
      .query({ page: 0, size: 10, nodeType: 'CONTEXT' })
      .reply(200, { success: true, data: [] });

    const nodes = createNodes();
    const result = await nodes.list({ page: 0, size: 10, nodeType: 'CONTEXT' });
    expect(result).toEqual([]);
  });

  it('should get ancestors', async () => {
    nock(BASE_URL)
      .get(`/spaces/${SPACE_SLUG}/nodes/node-1/ancestors`)
      .reply(200, { success: true, data: [mockNode] });

    const nodes = createNodes();
    const result = await nodes.ancestors('node-1');
    expect(result).toHaveLength(1);
  });

  it('should get descendants', async () => {
    nock(BASE_URL)
      .get(`/spaces/${SPACE_SLUG}/nodes/node-1/descendants`)
      .reply(200, { success: true, data: [mockNode] });

    const nodes = createNodes();
    const result = await nodes.descendants('node-1');
    expect(result).toHaveLength(1);
  });
});
