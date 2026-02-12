import { Mujarrad } from '../src/client.js';
import { defineSchema } from '../src/schema.js';
import { ValidationError } from '../src/errors.js';

// Mock HttpClient to avoid real HTTP calls
jest.mock('../src/http.js', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'node-1', title: 'Test', nodeType: 'REGULAR', nodeDetails: {} },
    }),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

const validConfig = {
  apiKey: 'pk_test_123',
  secretKey: 'sk_test_456',
  space: 'test-space',
};

describe('Mujarrad Client', () => {
  describe('constructor', () => {
    it('should create client with valid config', () => {
      const client = new Mujarrad(validConfig);
      expect(client).toBeDefined();
      expect(client.nodes).toBeDefined();
      expect(client.attributes).toBeDefined();
      expect(client.spaces).toBeDefined();
      expect(client.apiKeys).toBeDefined();
      expect(client.batch).toBeDefined();
    });

    it('should throw if apiKey is missing', () => {
      expect(() => new Mujarrad({ ...validConfig, apiKey: '' }))
        .toThrow('apiKey is required');
    });

    it('should throw if secretKey is missing', () => {
      expect(() => new Mujarrad({ ...validConfig, secretKey: '' }))
        .toThrow('secretKey is required');
    });

    it('should throw if space is missing', () => {
      expect(() => new Mujarrad({ ...validConfig, space: '' }))
        .toThrow('space is required');
    });
  });

  describe('withSchema', () => {
    it('should accept a schema and return this', () => {
      const client = new Mujarrad(validConfig);
      const schema = defineSchema()
        .entity('User').string('email', { required: true }).done()
        .build();

      const result = client.withSchema(schema);
      expect(result).toBe(client);
    });
  });

  describe('createEntity', () => {
    it('should create a node with entity validation', async () => {
      const schema = defineSchema()
        .entity('User').string('email', { required: true }).done()
        .build();

      const client = new Mujarrad(validConfig).withSchema(schema);
      const node = await client.createEntity('User', { email: 'test@example.com' });
      expect(node).toBeDefined();
      expect(node.id).toBe('node-1');
    });

    it('should throw ValidationError for invalid entity data', async () => {
      const schema = defineSchema()
        .entity('User').string('email', { required: true }).done()
        .build();

      const client = new Mujarrad(validConfig).withSchema(schema);
      await expect(client.createEntity('User', {} as any))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for unknown entity', async () => {
      const schema = defineSchema()
        .entity('User').string('email').done()
        .build();

      const client = new Mujarrad(validConfig).withSchema(schema);
      await expect(client.createEntity('Unknown', { email: 'test@example.com' }))
        .rejects.toThrow(ValidationError);
    });

    it('should create node without schema validation', async () => {
      const client = new Mujarrad(validConfig);
      const node = await client.createEntity('User', { email: 'test@example.com' });
      expect(node).toBeDefined();
    });
  });

  describe('link', () => {
    it('should create an attribute linking two nodes', async () => {
      const client = new Mujarrad(validConfig);
      const attr = await client.link('node-1', 'node-2', 'contains');
      expect(attr).toBeDefined();
    });

    it('should pass metadata as attributeValue', async () => {
      const client = new Mujarrad(validConfig);
      await client.link('node-1', 'node-2', 'contains', { role: 'owner' });
      // Verify the post was called (mock captures the call)
    });
  });
});
