/**
 * Simple HTTP Client for Mujarrad API
 * Uses API Key authentication
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'https://mujarrad.onrender.com/api';

export interface MujarradNode<T = any> {
  id: string;
  spaceId: string;
  nodeType: 'REGULAR' | 'CONTEXT' | 'ASSUMPTION' | 'TEMPLATE';
  title: string;
  slug: string;
  content?: string;
  nodeDetails: T;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetails {
  description?: string;
  status: string;
  priority: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  completedAt?: string;
  tags?: string[];
}

export interface MilestoneDetails {
  description?: string;
  dueDate: string;
  status: string;
}

export interface UserDetails {
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface MujarradAttribute {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  attributeName: string;
  attributeType: string;
  attributeTypeMode: 'TYPED' | 'SCHEMALESS';
  attributeValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export class MujarradClient {
  private client: AxiosInstance;
  private spaceSlug: string;
  private apiPublicKey: string;
  private apiSecretKey: string;

  constructor(apiPublicKey: string, apiSecretKey: string, spaceSlug: string) {
    this.apiPublicKey = apiPublicKey;
    this.apiSecretKey = apiSecretKey;
    this.spaceSlug = spaceSlug;
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiPublicKey,
        'X-API-Secret': this.apiSecretKey,
      },
    });
  }

  // Node Operations
  async createNode<T>(
    title: string,
    nodeType: 'REGULAR' | 'CONTEXT' | 'ASSUMPTION' | 'TEMPLATE',
    nodeDetails: T
  ): Promise<MujarradNode<T>> {
    try {
      const response = await this.client.post<ApiResponse<MujarradNode<T>>>(
        `/spaces/${this.spaceSlug}/nodes`,
        {
          title,
          nodeType,
          nodeDetails,
        }
      );
      // Handle both response.data and direct response
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('Error creating node:', error.response?.data || error.message);
      throw error;
    }
  }

  async getNode<T>(nodeId: string): Promise<MujarradNode<T>> {
    const response = await this.client.get<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}`
    );
    return response.data?.data || response.data;
  }

  async listNodes<T>(filters?: { nodeType?: string }): Promise<MujarradNode<T>[]> {
    const params: any = {};
    if (filters?.nodeType) params.nodeType = filters.nodeType;

    const response = await this.client.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes`,
      { params }
    );
    return response.data?.data || response.data;
  }

  async updateNode<T>(nodeId: string, updates: Partial<MujarradNode<T>>): Promise<MujarradNode<T>> {
    const response = await this.client.put<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}`,
      updates
    );
    return response.data.data;
  }

  async deleteNode(nodeId: string): Promise<void> {
    await this.client.delete(`/spaces/${this.spaceSlug}/nodes/${nodeId}`);
  }

  // Graph Traversal
  async getAncestors<T>(nodeId: string): Promise<MujarradNode<T>[]> {
    const response = await this.client.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}/ancestors`
    );
    return response.data.data;
  }

  async getDescendants<T>(nodeId: string): Promise<MujarradNode<T>[]> {
    const response = await this.client.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}/descendants`
    );
    return response.data.data;
  }

  // Attribute (Relationship) Operations
  async createAttribute(
    sourceNodeId: string,
    targetNodeId: string,
    attributeName: string,
    metadata?: Record<string, any>
  ): Promise<MujarradAttribute> {
    const response = await this.client.post<ApiResponse<MujarradAttribute>>(
      `/nodes/${sourceNodeId}/attributes`,
      {
        targetNodeId,
        attributeName,
        attributeType: 'custom',
        attributeTypeMode: 'TYPED',
        attributeValue: metadata ? JSON.stringify(metadata) : undefined,
      }
    );
    return response.data.data;
  }

  async getAttributes(nodeId: string): Promise<MujarradAttribute[]> {
    const response = await this.client.get<ApiResponse<MujarradAttribute[]>>(
      `/nodes/${nodeId}/attributes`
    );
    return response.data.data;
  }

  // Space Operations
  async getSpaceBySlug(slug: string): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>(`/spaces/slug/${slug}`);
    return response.data.data;
  }

  async createSpace(name: string, slug: string): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/spaces', {
      name,
      slug,
    });
    return response.data.data;
  }
}