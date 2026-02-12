/**
 * AttributesResource — CRUD + promote/demote for Mujarrad attributes.
 */

import { HttpClient } from '../http.js';
import type {
  MujarradAttribute,
  CreateAttributeInput,
  UpdateAttributeInput,
  ApiResponse,
} from '../types.js';

export class AttributesResource {
  constructor(
    private http: HttpClient,
    private spaceSlug: string
  ) {}

  async create(nodeId: string, input: CreateAttributeInput): Promise<MujarradAttribute> {
    const res = await this.http.post<ApiResponse<MujarradAttribute>>(
      `/nodes/${nodeId}/attributes`,
      input
    );
    return res.data;
  }

  async list(nodeId: string): Promise<MujarradAttribute[]> {
    const res = await this.http.get<ApiResponse<MujarradAttribute[]>>(
      `/nodes/${nodeId}/attributes`
    );
    return res.data;
  }

  async update(attributeId: string, input: UpdateAttributeInput): Promise<MujarradAttribute> {
    const res = await this.http.put<ApiResponse<MujarradAttribute>>(
      `/attributes/${attributeId}`,
      input
    );
    return res.data;
  }

  async delete(attributeId: string): Promise<void> {
    await this.http.delete(`/attributes/${attributeId}`);
  }

  async promote(attributeId: string): Promise<MujarradAttribute> {
    const res = await this.http.post<ApiResponse<MujarradAttribute>>(
      `/spaces/${this.spaceSlug}/attributes/${attributeId}/promote`
    );
    return res.data;
  }

  async demote(attributeId: string): Promise<void> {
    await this.http.delete(
      `/spaces/${this.spaceSlug}/attributes/${attributeId}/promote`
    );
  }
}
