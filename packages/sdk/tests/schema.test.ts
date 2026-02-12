import { defineSchema, SchemaBuilder, EntityBuilder } from '../src/schema.js';

describe('Schema Builder', () => {
  describe('defineSchema', () => {
    it('should return a SchemaBuilder instance', () => {
      const builder = defineSchema();
      expect(builder).toBeInstanceOf(SchemaBuilder);
    });
  });

  describe('entity', () => {
    it('should return an EntityBuilder', () => {
      const builder = defineSchema();
      const entityBuilder = builder.entity('User');
      expect(entityBuilder).toBeInstanceOf(EntityBuilder);
    });

    it('should default entity nodeType to REGULAR', () => {
      const schema = defineSchema()
        .entity('Task').string('title').done()
        .build();

      expect(schema.entities[0].nodeType).toBe('REGULAR');
    });

    it('should set entity nodeType', () => {
      const schema = defineSchema()
        .entity('User').type('CONTEXT').string('email').done()
        .build();

      expect(schema.entities[0].nodeType).toBe('CONTEXT');
    });
  });

  describe('field types', () => {
    it('should add string fields', () => {
      const schema = defineSchema()
        .entity('User').string('name', { required: true }).done()
        .build();

      expect(schema.entities[0].fields[0]).toEqual({
        name: 'name',
        type: 'string',
        required: true,
        defaultValue: undefined,
      });
    });

    it('should add number fields', () => {
      const schema = defineSchema()
        .entity('Product').number('price').done()
        .build();

      expect(schema.entities[0].fields[0].type).toBe('number');
    });

    it('should add boolean fields', () => {
      const schema = defineSchema()
        .entity('Task').boolean('completed', { defaultValue: false }).done()
        .build();

      const field = schema.entities[0].fields[0];
      expect(field.type).toBe('boolean');
      expect(field.defaultValue).toBe(false);
    });

    it('should add date fields', () => {
      const schema = defineSchema()
        .entity('Event').date('startDate').done()
        .build();

      expect(schema.entities[0].fields[0].type).toBe('date');
    });

    it('should add json fields', () => {
      const schema = defineSchema()
        .entity('Config').json('settings').done()
        .build();

      expect(schema.entities[0].fields[0].type).toBe('json');
    });

    it('should add enum fields with values', () => {
      const schema = defineSchema()
        .entity('Task').enum('status', ['todo', 'in_progress', 'done']).done()
        .build();

      const field = schema.entities[0].fields[0];
      expect(field.type).toBe('enum');
      expect(field.enumValues).toEqual(['todo', 'in_progress', 'done']);
    });
  });

  describe('relationships', () => {
    it('should add relationships', () => {
      const schema = defineSchema()
        .entity('User').string('name').done()
        .entity('Task').string('title').done()
        .relationship('user_tasks', { source: 'User', target: 'Task', verb: 'contains' })
        .build();

      expect(schema.relationships).toHaveLength(1);
      expect(schema.relationships[0]).toEqual({
        name: 'user_tasks',
        source: 'User',
        target: 'Task',
        verb: 'contains',
      });
    });
  });

  describe('build', () => {
    it('should build a complete schema', () => {
      const schema = defineSchema()
        .entity('User').type('CONTEXT').string('email', { required: true }).done()
        .entity('Task').string('title', { required: true }).enum('status', ['todo', 'done']).done()
        .relationship('user_tasks', { source: 'User', target: 'Task', verb: 'contains' })
        .build();

      expect(schema.entities).toHaveLength(2);
      expect(schema.relationships).toHaveLength(1);
      expect(schema.entities[0].name).toBe('User');
      expect(schema.entities[1].name).toBe('Task');
    });

    it('should build an empty schema', () => {
      const schema = defineSchema().build();
      expect(schema.entities).toEqual([]);
      expect(schema.relationships).toEqual([]);
    });
  });
});
