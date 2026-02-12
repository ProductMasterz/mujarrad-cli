/**
 * Mujarrad Schema Builder
 *
 * Fluent API for defining entity schemas and relationships.
 * Inspired by AQWUM-Core SubType Registry pattern.
 *
 * Usage:
 *   const schema = defineSchema()
 *     .entity('User').type('CONTEXT').string('email', { required: true }).done()
 *     .entity('Task').string('title', { required: true }).enum('status', ['todo', 'done']).done()
 *     .relationship('user_tasks', { source: 'User', target: 'Task', verb: 'contains' })
 *     .build();
 */

import type {
  SchemaConfig,
  EntityDefinition,
  FieldDefinition,
  RelationshipDefinition,
  MujarradNodeType,
  FieldType,
} from './types.js';

interface FieldOptions {
  required?: boolean;
  defaultValue?: unknown;
}

export class EntityBuilder {
  private entityName: string;
  private nodeType: MujarradNodeType = 'REGULAR';
  private fields: FieldDefinition[] = [];
  private parent: SchemaBuilder;

  constructor(name: string, parent: SchemaBuilder) {
    this.entityName = name;
    this.parent = parent;
  }

  type(nodeType: MujarradNodeType): this {
    this.nodeType = nodeType;
    return this;
  }

  string(name: string, options?: FieldOptions): this {
    return this.field(name, 'string', options);
  }

  number(name: string, options?: FieldOptions): this {
    return this.field(name, 'number', options);
  }

  boolean(name: string, options?: FieldOptions): this {
    return this.field(name, 'boolean', options);
  }

  date(name: string, options?: FieldOptions): this {
    return this.field(name, 'date', options);
  }

  json(name: string, options?: FieldOptions): this {
    return this.field(name, 'json', options);
  }

  enum(name: string, values: string[], options?: FieldOptions): this {
    this.fields.push({
      name,
      type: 'enum',
      required: options?.required,
      defaultValue: options?.defaultValue,
      enumValues: values,
    });
    return this;
  }

  done(): SchemaBuilder {
    this.parent.addEntity({
      name: this.entityName,
      nodeType: this.nodeType,
      fields: this.fields,
    });
    return this.parent;
  }

  private field(name: string, type: FieldType, options?: FieldOptions): this {
    this.fields.push({
      name,
      type,
      required: options?.required,
      defaultValue: options?.defaultValue,
    });
    return this;
  }
}

export class SchemaBuilder {
  private entities: EntityDefinition[] = [];
  private relationships: RelationshipDefinition[] = [];

  entity(name: string): EntityBuilder {
    return new EntityBuilder(name, this);
  }

  relationship(name: string, config: { source: string; target: string; verb: string }): this {
    this.relationships.push({
      name,
      source: config.source,
      target: config.target,
      verb: config.verb,
    });
    return this;
  }

  addEntity(entity: EntityDefinition): void {
    this.entities.push(entity);
  }

  build(): SchemaConfig {
    return {
      entities: [...this.entities],
      relationships: [...this.relationships],
    };
  }
}

export function defineSchema(): SchemaBuilder {
  return new SchemaBuilder();
}
