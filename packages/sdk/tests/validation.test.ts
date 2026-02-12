import { SchemaValidator } from '../src/validation.js';
import { defineSchema } from '../src/schema.js';

function createValidator() {
  const schema = defineSchema()
    .entity('User').type('CONTEXT')
      .string('email', { required: true })
      .string('name')
      .number('age')
      .boolean('active')
      .done()
    .entity('Task')
      .string('title', { required: true })
      .enum('status', ['todo', 'in_progress', 'done'])
      .date('dueDate')
      .json('metadata')
      .done()
    .relationship('user_tasks', { source: 'User', target: 'Task', verb: 'contains' })
    .build();

  return new SchemaValidator(schema);
}

describe('SchemaValidator', () => {
  describe('validateNode', () => {
    it('should return no errors for valid data', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', { email: 'test@example.com' });
      expect(errors).toEqual([]);
    });

    it('should return error for missing required field', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', {});
      expect(errors).toContain('User.email is required');
    });

    it('should return error for empty string on required field', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', { email: '' });
      expect(errors).toContain('User.email is required');
    });

    it('should return error for unknown entity', () => {
      const validator = createValidator();
      const errors = validator.validateNode('Unknown', { foo: 'bar' });
      expect(errors).toContain('Unknown entity: "Unknown"');
    });

    it('should validate string type', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', { email: 'test@example.com', name: 123 });
      expect(errors).toContain('User.name must be a string');
    });

    it('should validate number type', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', { email: 'test@example.com', age: 'thirty' });
      expect(errors).toContain('User.age must be a number');
    });

    it('should validate boolean type', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', { email: 'test@example.com', active: 'yes' });
      expect(errors).toContain('User.active must be a boolean');
    });

    it('should validate enum type', () => {
      const validator = createValidator();
      const errors = validator.validateNode('Task', { title: 'Test', status: 'invalid' });
      expect(errors).toContain('Task.status must be one of: todo, in_progress, done');
    });

    it('should validate date type', () => {
      const validator = createValidator();
      const errors = validator.validateNode('Task', { title: 'Test', dueDate: 'not-a-date' });
      expect(errors).toContain('Task.dueDate must be a valid date string');
    });

    it('should accept valid date strings', () => {
      const validator = createValidator();
      const errors = validator.validateNode('Task', { title: 'Test', dueDate: '2025-01-01' });
      expect(errors).toEqual([]);
    });

    it('should validate json type', () => {
      const validator = createValidator();
      const errors = validator.validateNode('Task', { title: 'Test', metadata: 'not-json' });
      expect(errors).toContain('Task.metadata must be an object');
    });

    it('should accept valid json objects', () => {
      const validator = createValidator();
      const errors = validator.validateNode('Task', { title: 'Test', metadata: { key: 'val' } });
      expect(errors).toEqual([]);
    });

    it('should skip validation for undefined optional fields', () => {
      const validator = createValidator();
      const errors = validator.validateNode('User', { email: 'test@example.com' });
      expect(errors).toEqual([]);
    });
  });

  describe('validateRelationship', () => {
    it('should return true for valid relationship', () => {
      const validator = createValidator();
      expect(validator.validateRelationship('User', 'Task', 'contains')).toBe(true);
    });

    it('should return false for invalid source', () => {
      const validator = createValidator();
      expect(validator.validateRelationship('Unknown', 'Task', 'contains')).toBe(false);
    });

    it('should return false for invalid target', () => {
      const validator = createValidator();
      expect(validator.validateRelationship('User', 'Unknown', 'contains')).toBe(false);
    });

    it('should return false for invalid verb', () => {
      const validator = createValidator();
      expect(validator.validateRelationship('User', 'Task', 'owns')).toBe(false);
    });
  });

  describe('getEntity', () => {
    it('should return entity definition', () => {
      const validator = createValidator();
      const entity = validator.getEntity('User');
      expect(entity).toBeDefined();
      expect(entity!.name).toBe('User');
      expect(entity!.nodeType).toBe('CONTEXT');
    });

    it('should return undefined for unknown entity', () => {
      const validator = createValidator();
      expect(validator.getEntity('Unknown')).toBeUndefined();
    });
  });
});
