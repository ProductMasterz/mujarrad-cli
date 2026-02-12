/**
 * Mujarrad SDK Types
 *
 * TypeScript interfaces mirroring the Mujarrad Backend data model.
 */

// --- Configuration ---

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
}

export interface MujarradConfig {
  apiKey: string;
  secretKey: string;
  space: string;
  baseUrl?: string;
  timeout?: number;
  retryOptions?: RetryOptions;
}

// --- Node Types ---

export type MujarradNodeType = 'REGULAR' | 'CONTEXT' | 'ASSUMPTION' | 'TEMPLATE';

export interface MujarradNode<T = Record<string, unknown>> {
  id: string;
  spaceId: string;
  nodeType: MujarradNodeType;
  title: string;
  slug: string;
  content?: string;
  nodeDetails: T;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNodeInput<T = Record<string, unknown>> {
  title: string;
  nodeType?: MujarradNodeType;
  content?: string;
  nodeDetails?: T;
}

export interface UpdateNodeInput<T = Record<string, unknown>> {
  title?: string;
  nodeType?: MujarradNodeType;
  content?: string;
  nodeDetails?: T;
}

export interface ListNodesOptions {
  page?: number;
  size?: number;
  nodeType?: MujarradNodeType;
}

// --- Attribute Types ---

export type AttributeTypeMode = 'TYPED' | 'SCHEMALESS';

export interface MujarradAttribute {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  attributeName: string;
  attributeType: string;
  attributeTypeMode: AttributeTypeMode;
  attributeValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttributeInput {
  targetNodeId: string;
  attributeName: string;
  attributeType?: string;
  attributeTypeMode?: AttributeTypeMode;
  attributeValue?: string;
}

export interface UpdateAttributeInput {
  attributeName?: string;
  attributeType?: string;
  attributeTypeMode?: AttributeTypeMode;
  attributeValue?: string;
}

// --- Space Types ---

export interface MujarradSpace {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSpaceInput {
  name: string;
  slug?: string;
}

// --- API Key Types ---

export interface MujarradApiKey {
  id: string;
  name: string;
  publicKey: string;
  secretKey?: string;
  createdAt: string;
}

// --- Batch Types ---

export interface BatchUploadResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors?: string[];
}

// --- Schema Types ---

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required?: boolean;
  enumValues?: string[];
  defaultValue?: unknown;
}

export interface EntityDefinition {
  name: string;
  nodeType: MujarradNodeType;
  fields: FieldDefinition[];
}

export interface RelationshipDefinition {
  name: string;
  source: string;
  target: string;
  verb: string;
}

export interface SchemaConfig {
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
}

// --- API Response ---

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}
