/**
 * SpacesResource — CRUD for Mujarrad spaces.
 */

import { HttpClient } from '../http.js';
import type {
  MujarradSpace,
  CreateSpaceInput,
  ApiResponse,
} from '../types.js';

export class SpacesResource {
  constructor(private http: HttpClient) {}

  async create(input: CreateSpaceInput): Promise<MujarradSpace> {
    const res = await this.http.post<ApiResponse<MujarradSpace>>(
      '/spaces',
      input
    );
    return res.data;
  }

  async get(spaceId: string): Promise<MujarradSpace> {
    const res = await this.http.get<ApiResponse<MujarradSpace>>(
      `/spaces/${spaceId}`
    );
    return res.data;
  }

  async getBySlug(slug: string): Promise<MujarradSpace> {
    const res = await this.http.get<ApiResponse<MujarradSpace>>(
      `/spaces/slug/${slug}`
    );
    return res.data;
  }

  async list(): Promise<MujarradSpace[]> {
    const res = await this.http.get<ApiResponse<MujarradSpace[]>>('/spaces');
    return res.data;
  }

  async delete(spaceId: string): Promise<void> {
    await this.http.delete(`/spaces/${spaceId}`);
  }
}
