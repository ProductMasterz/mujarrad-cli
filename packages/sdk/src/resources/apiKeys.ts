/**
 * ApiKeysResource — CRUD + rotation for Mujarrad API keys.
 */

import { HttpClient } from '../http.js';
import type { MujarradApiKey, ApiResponse } from '../types.js';

export class ApiKeysResource {
  constructor(private http: HttpClient) {}

  async create(name?: string): Promise<MujarradApiKey> {
    const res = await this.http.post<ApiResponse<MujarradApiKey>>(
      '/api-keys',
      name ? { name } : undefined
    );
    return res.data;
  }

  async list(): Promise<MujarradApiKey[]> {
    const res = await this.http.get<ApiResponse<MujarradApiKey[]>>('/api-keys');
    return res.data;
  }

  async delete(keyId: string): Promise<void> {
    await this.http.delete(`/api-keys/${keyId}`);
  }

  async rotate(keyId: string): Promise<MujarradApiKey> {
    const res = await this.http.post<ApiResponse<MujarradApiKey>>(
      `/api-keys/${keyId}/rotate`
    );
    return res.data;
  }
}
