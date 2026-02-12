/**
 * Mujarrad Client
 *
 * Main entry point for the Mujarrad SDK.
 *
 * Usage:
 *   const client = new Mujarrad({
 *     apiKey: 'pk_live_...',
 *     secretKey: 'sk_live_...',
 *     space: 'my-space',
 *   });
 *
 *   const node = await client.nodes.create({ title: 'Hello' });
 *   await client.link(sourceId, targetId, 'contains');
 */

import { HttpClient } from './http.js';
import { NodesResource } from './resources/nodes.js';
import { AttributesResource } from './resources/attributes.js';
import { SpacesResource } from './resources/spaces.js';
import { ApiKeysResource } from './resources/apiKeys.js';
import { BatchResource } from './resources/batch.js';
import { SchemaValidator } from './validation.js';
import { ValidationError } from './errors.js';
import type {
  MujarradConfig,
  SchemaConfig,
  MujarradNode,
  MujarradAttribute,
} from './types.js';

export class Mujarrad {
  readonly nodes: NodesResource;
  readonly attributes: AttributesResource;
  readonly spaces: SpacesResource;
  readonly apiKeys: ApiKeysResource;
  readonly batch: BatchResource;

  private schema?: SchemaConfig;
  private validator?: SchemaValidator;
  private http: HttpClient;

  constructor(config: MujarradConfig) {
    if (!config.apiKey) throw new Error('apiKey is required');
    if (!config.secretKey) throw new Error('secretKey is required');
    if (!config.space) throw new Error('space is required');

    this.http = new HttpClient(config);
    this.nodes = new NodesResource(this.http, config.space);
    this.attributes = new AttributesResource(this.http, config.space);
    this.spaces = new SpacesResource(this.http);
    this.apiKeys = new ApiKeysResource(this.http);
    this.batch = new BatchResource(this.http, config.space);
  }

  withSchema(schema: SchemaConfig): this {
    this.schema = schema;
    this.validator = new SchemaValidator(schema);
    return this;
  }

  async createEntity<T extends Record<string, unknown>>(
    entityName: string,
    data: T
  ): Promise<MujarradNode<T>> {
    if (this.validator) {
      const errors = this.validator.validateNode(entityName, data);
      if (errors.length > 0) {
        throw new ValidationError(`Validation failed for ${entityName}`, errors);
      }
    }

    const entity = this.schema?.entities.find(e => e.name === entityName);
    return this.nodes.create<T>({
      title: (data as Record<string, unknown>).title as string || entityName,
      nodeType: entity?.nodeType || 'REGULAR',
      nodeDetails: data,
    });
  }

  async link(
    sourceId: string,
    targetId: string,
    verb: string,
    metadata?: Record<string, string>
  ): Promise<MujarradAttribute> {
    return this.attributes.create(sourceId, {
      targetNodeId: targetId,
      attributeName: verb,
      attributeValue: metadata ? JSON.stringify(metadata) : undefined,
    });
  }
}
