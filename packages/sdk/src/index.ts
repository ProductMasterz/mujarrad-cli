/**
 * @mujarrad/sdk — Public API
 */

// Main client
export { Mujarrad } from './client.js';

// Schema
export { defineSchema, SchemaBuilder, EntityBuilder } from './schema.js';
export { SchemaValidator } from './validation.js';

// Resources
export { NodesResource } from './resources/nodes.js';
export { AttributesResource } from './resources/attributes.js';
export { SpacesResource } from './resources/spaces.js';
export { ApiKeysResource } from './resources/apiKeys.js';
export { BatchResource } from './resources/batch.js';

// Errors
export {
  MujarradError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  NetworkError,
} from './errors.js';

// Types
export type {
  MujarradConfig,
  RetryOptions,
  MujarradNode,
  MujarradNodeType,
  CreateNodeInput,
  UpdateNodeInput,
  ListNodesOptions,
  MujarradAttribute,
  AttributeTypeMode,
  CreateAttributeInput,
  UpdateAttributeInput,
  MujarradSpace,
  CreateSpaceInput,
  MujarradApiKey,
  BatchUploadResult,
  FieldType,
  FieldDefinition,
  EntityDefinition,
  RelationshipDefinition,
  SchemaConfig,
  ApiResponse,
} from './types.js';
