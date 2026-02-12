/**
 * NodesResource — CRUD + graph traversal for Mujarrad nodes.
 */

import { HttpClient } from '../http.js';
import type {
  MujarradNode,
  CreateNodeInput,
  UpdateNodeInput,
  ListNodesOptions,
  ApiResponse,
} from '../types.js';

export class NodesResource {
  constructor(
    private http: HttpClient,
    private spaceSlug: string
  ) {}

  async create<T = Record<string, unknown>>(input: CreateNodeInput<T>): Promise<MujarradNode<T>> {
    const res = await this.http.post<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes`,
      input
    );
    return res.data;
  }

  async get<T = Record<string, unknown>>(nodeId: string): Promise<MujarradNode<T>> {
    const res = await this.http.get<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}`
    );
    return res.data;
  }

  async update<T = Record<string, unknown>>(nodeId: string, input: UpdateNodeInput<T>): Promise<MujarradNode<T>> {
    const res = await this.http.put<ApiResponse<MujarradNode<T>>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}`,
      input
    );
    return res.data;
  }

  async delete(nodeId: string): Promise<void> {
    await this.http.delete(`/spaces/${this.spaceSlug}/nodes/${nodeId}`);
  }

  async list<T = Record<string, unknown>>(options?: ListNodesOptions): Promise<MujarradNode<T>[]> {
    const params: Record<string, string | number> = {};
    if (options?.page !== undefined) params.page = options.page;
    if (options?.size !== undefined) params.size = options.size;
    if (options?.nodeType) params.nodeType = options.nodeType;

    const res = await this.http.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes`,
      { params }
    );
    return res.data;
  }

  async ancestors<T = Record<string, unknown>>(nodeId: string): Promise<MujarradNode<T>[]> {
    const res = await this.http.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}/ancestors`
    );
    return res.data;
  }

  async descendants<T = Record<string, unknown>>(nodeId: string): Promise<MujarradNode<T>[]> {
    const res = await this.http.get<ApiResponse<MujarradNode<T>[]>>(
      `/spaces/${this.spaceSlug}/nodes/${nodeId}/descendants`
    );
    return res.data;
  }
}
