/**
 * BatchResource — Bulk upload for Mujarrad nodes.
 */

import { HttpClient } from '../http.js';
import type { CreateNodeInput, BatchUploadResult, ApiResponse } from '../types.js';

export class BatchResource {
  constructor(
    private http: HttpClient,
    private spaceSlug: string
  ) {}

  async upload<T = Record<string, unknown>>(nodes: CreateNodeInput<T>[]): Promise<BatchUploadResult> {
    const res = await this.http.post<ApiResponse<BatchUploadResult>>(
      `/spaces/${this.spaceSlug}/upload/batch`,
      { nodes }
    );
    return res.data;
  }
}
