import nock from 'nock';
import { HttpClient } from '../../src/http.js';
import { AttributesResource } from '../../src/resources/attributes.js';

const BASE_URL = 'https://test-api.mujarrad.com/api';
const SPACE_SLUG = 'test-space';

function createAttributes() {
  const http = new HttpClient({
    apiKey: 'pk_test',
    secretKey: 'sk_test',
    space: SPACE_SLUG,
    baseUrl: BASE_URL,
    retryOptions: { maxAttempts: 1 },
  });
  return new AttributesResource(http, SPACE_SLUG);
}

const mockAttr = {
  id: 'attr-1',
  sourceNodeId: 'node-1',
  targetNodeId: 'node-2',
  attributeName: 'contains',
  attributeType: 'relationship',
  attributeTypeMode: 'SCHEMALESS',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('AttributesResource', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should create an attribute', async () => {
    nock(BASE_URL)
      .post('/nodes/node-1/attributes')
      .reply(201, { success: true, data: mockAttr });

    const attrs = createAttributes();
    const result = await attrs.create('node-1', {
      targetNodeId: 'node-2',
      attributeName: 'contains',
    });
    expect(result.id).toBe('attr-1');
    expect(result.attributeName).toBe('contains');
  });

  it('should list attributes for a node', async () => {
    nock(BASE_URL)
      .get('/nodes/node-1/attributes')
      .reply(200, { success: true, data: [mockAttr] });

    const attrs = createAttributes();
    const result = await attrs.list('node-1');
    expect(result).toHaveLength(1);
  });

  it('should update an attribute', async () => {
    nock(BASE_URL)
      .put('/attributes/attr-1')
      .reply(200, { success: true, data: { ...mockAttr, attributeName: 'owns' } });

    const attrs = createAttributes();
    const result = await attrs.update('attr-1', { attributeName: 'owns' });
    expect(result.attributeName).toBe('owns');
  });

  it('should delete an attribute', async () => {
    nock(BASE_URL)
      .delete('/attributes/attr-1')
      .reply(204);

    const attrs = createAttributes();
    await attrs.delete('attr-1');
  });

  it('should promote an attribute', async () => {
    nock(BASE_URL)
      .post(`/spaces/${SPACE_SLUG}/attributes/attr-1/promote`)
      .reply(200, { success: true, data: mockAttr });

    const attrs = createAttributes();
    const result = await attrs.promote('attr-1');
    expect(result.id).toBe('attr-1');
  });

  it('should demote an attribute', async () => {
    nock(BASE_URL)
      .delete(`/spaces/${SPACE_SLUG}/attributes/attr-1/promote`)
      .reply(204);

    const attrs = createAttributes();
    await attrs.demote('attr-1');
  });
});
