/**
 * Mujarrad Schema Validator
 *
 * Validates node content against entity definitions and relationships.
 * Inspired by AQWUM-Core primitives/base.ts validateContent pattern.
 */

import type {
  SchemaConfig,
  EntityDefinition,
  FieldDefinition,
} from './types.js';

export class SchemaValidator {
  constructor(private schema: SchemaConfig) {}

  validateNode(entityName: string, content: Record<string, unknown>): string[] {
    const entity = this.schema.entities.find(e => e.name === entityName);
    if (!entity) {
      return [`Unknown entity: "${entityName}"`];
    }
    return this.validateFields(entity, content);
  }

  validateRelationship(source: string, target: string, verb: string): boolean {
    return this.schema.relationships.some(
      r => r.source === source && r.target === target && r.verb === verb
    );
  }

  getEntity(name: string): EntityDefinition | undefined {
    return this.schema.entities.find(e => e.name === name);
  }

  private validateFields(entity: EntityDefinition, content: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const field of entity.fields) {
      const value = content[field.name];

      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${entity.name}.${field.name} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        const typeError = this.validateFieldType(entity.name, field, value);
        if (typeError) errors.push(typeError);
      }
    }

    return errors;
  }

  private validateFieldType(entityName: string, field: FieldDefinition, value: unknown): string | null {
    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${entityName}.${field.name} must be a string`;
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return `${entityName}.${field.name} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${entityName}.${field.name} must be a boolean`;
        }
        break;
      case 'date':
        if (typeof value !== 'string' || isNaN(Date.parse(value))) {
          return `${entityName}.${field.name} must be a valid date string`;
        }
        break;
      case 'enum':
        if (!field.enumValues?.includes(value as string)) {
          return `${entityName}.${field.name} must be one of: ${field.enumValues?.join(', ')}`;
        }
        break;
      case 'json':
        if (typeof value !== 'object') {
          return `${entityName}.${field.name} must be an object`;
        }
        break;
    }
    return null;
  }
}
