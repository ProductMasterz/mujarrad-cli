import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Hand-written client for the current Mujarrad backend API (Mujarrad-Backend `Production`).
 *
 * The generated client in ./generated targets the old /api/workspaces surface, which the
 * backend no longer serves. New code uses this client instead.
 *
 * Auth: a JWT from /api/auth/login (Authorization: Bearer) or a B2B API key pair
 * (X-API-Key + X-API-Secret).
 */

export interface ClientAuth {
  token?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
}

export interface ClientOptions extends ClientAuth {
  baseUrl: string;
  timeoutMs?: number;
}

export interface ApiUser {
  id: string;
  username?: string;
  email: string;
  emailVerified?: boolean;
}

export interface AuthResult {
  token: string;
  user: ApiUser;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type?: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  projectType?: string;
  organizationId?: string;
  [key: string]: unknown;
}

/** Raw HTTP outcome of a call to a deployed app endpoint. Never throws on HTTP status. */
export interface AppCallResult {
  status: number;
  body: any;
  headers: Record<string, string>;
  runId: string | null;
  ms: number;
}

/** Error carrying the HTTP status and parsed body of a failed API call. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
    public readonly method: string,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Unwraps the `{success, data}` envelope some endpoints use; returns other bodies as they are. */
export function unwrap<T>(body: any): T {
  if (body && typeof body === 'object' && !Array.isArray(body) && 'success' in body && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

/** Returns the items of a list response, whether it is an array or a `{content: []}` page. */
export function items<T>(body: any): T[] {
  const b = unwrap<any>(body);
  if (Array.isArray(b)) return b;
  if (b && Array.isArray(b.content)) return b.content;
  return [];
}

function describeError(status: number, body: any): string {
  if (body && typeof body === 'object') {
    const err = body.error;
    if (typeof err === 'string') return err;
    if (err && typeof err.message === 'string') return err.message;
    if (typeof body.message === 'string') return body.message;
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.title === 'string') return body.title;
    if (Array.isArray(body.issues) && body.issues.length) {
      return body.issues.map((i: any) => `${i.path ?? ''} ${i.message ?? i.code ?? ''}`.trim()).join('; ');
    }
  }
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 300);
  return `HTTP ${status}`;
}

const enc = encodeURIComponent;

export class MujarradClient {
  readonly baseUrl: string;
  private http: AxiosInstance;
  private auth: ClientAuth;

  constructor(options: ClientOptions, http?: AxiosInstance) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.auth = { token: options.token, apiKey: options.apiKey, apiSecret: options.apiSecret };
    this.http = http ?? axios.create({
      baseURL: this.baseUrl,
      timeout: options.timeoutMs ?? 60_000,
      validateStatus: () => true,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  setToken(token: string | null): void {
    this.auth.token = token;
  }

  hasCredentials(): boolean {
    return Boolean(this.auth.token || (this.auth.apiKey && this.auth.apiSecret));
  }

  private authHeaders(anonymous = false): Record<string, string> {
    if (anonymous) return {};
    if (this.auth.token) return { Authorization: `Bearer ${this.auth.token}` };
    if (this.auth.apiKey && this.auth.apiSecret) {
      return { 'X-API-Key': this.auth.apiKey, 'X-API-Secret': this.auth.apiSecret };
    }
    return {};
  }

  /** Sends a request and returns the raw outcome without throwing on HTTP errors. */
  async raw(method: string, path: string, body?: unknown, opts: { anonymous?: boolean; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<AppCallResult> {
    const started = Date.now();
    const config: AxiosRequestConfig = {
      method: method as any,
      url: path,
      headers: { ...this.authHeaders(opts.anonymous), ...(opts.headers ?? {}) },
      data: body === undefined ? undefined : body,
      validateStatus: () => true,
      timeout: opts.timeoutMs,
    };
    const res = await this.http.request(config);
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers ?? {})) {
      if (v != null) headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
    }
    let data: any = res.data;
    if (typeof data === 'string' && data.length) {
      try { data = JSON.parse(data); } catch { /* keep text */ }
    }
    if (data === '') data = null;
    return { status: res.status, body: data, headers, runId: headers['x-logic-run'] ?? null, ms: Date.now() - started };
  }

  /** Sends a request and returns the body, throwing ApiError on a non-2xx status. */
  async request<T = any>(method: string, path: string, body?: unknown, opts: { anonymous?: boolean; timeoutMs?: number } = {}): Promise<T> {
    const res = await this.raw(method, path, body, opts);
    if (res.status < 200 || res.status >= 300) {
      throw new ApiError(`${method} ${path} failed (${res.status}): ${describeError(res.status, res.body)}`, res.status, res.body, method, path);
    }
    return res.body as T;
  }

  // ---- auth -------------------------------------------------------------

  async login(email: string, password: string): Promise<AuthResult> {
    return unwrap<AuthResult>(await this.request('POST', '/api/auth/login', { email, password }, { anonymous: true }));
  }

  async register(input: { username: string; email: string; password: string; fullName?: string }): Promise<AuthResult> {
    return unwrap<AuthResult>(await this.request('POST', '/api/auth/register', input, { anonymous: true }));
  }

  async me(): Promise<ApiUser> {
    return unwrap<ApiUser>(await this.request('GET', '/api/auth/me'));
  }

  async logout(): Promise<void> {
    await this.raw('POST', '/api/auth/logout');
  }

  async health(): Promise<any> {
    return this.request('GET', '/api/health', undefined, { anonymous: true });
  }

  // ---- organizations and spaces ----------------------------------------

  async listOrganizations(): Promise<Organization[]> {
    return items<Organization>(await this.request('GET', '/api/organizations?size=100'));
  }

  async getOrganization(id: string): Promise<Organization> {
    return unwrap<Organization>(await this.request('GET', `/api/organizations/${enc(id)}`));
  }

  async createOrganization(name: string, slug?: string): Promise<Organization> {
    return unwrap<Organization>(await this.request('POST', '/api/organizations', slug ? { name, slug } : { name }));
  }

  /** Finds an organization by id or slug; with no reference, the user's first organization. */
  async resolveOrganization(ref?: string | null): Promise<Organization> {
    const orgs = await this.listOrganizations();
    if (!orgs.length) throw new Error('This account belongs to no organization.');
    if (!ref) return orgs[0];
    const found = orgs.find(o => o.id === ref || o.slug === ref || o.name === ref);
    if (!found) throw new Error(`Organization '${ref}' not found among: ${orgs.map(o => o.slug).join(', ')}`);
    return found;
  }

  async listSpaces(orgId?: string): Promise<Space[]> {
    const q = orgId ? `&orgId=${enc(orgId)}` : '';
    return items<Space>(await this.request('GET', `/api/spaces?size=100${q}`));
  }

  async getSpaceBySlug(slug: string): Promise<Space> {
    return unwrap<Space>(await this.request('GET', `/api/spaces/slug/${enc(slug)}`));
  }

  async createSpace(input: { name: string; slug: string; projectType?: string; organizationId?: string; description?: string }): Promise<Space> {
    return unwrap<Space>(await this.request('POST', '/api/spaces', { projectType: 'BACKEND', ...input }));
  }

  async deleteSpace(id: string): Promise<void> {
    await this.request('DELETE', `/api/spaces/${enc(id)}`);
  }

  // ---- logic tier (specs/038-logic-tier) --------------------------------

  private pkg(orgId: string, key?: string): string {
    const base = `/api/organizations/${enc(orgId)}/logic/packages`;
    return key ? `${base}/${enc(key)}` : base;
  }

  getCatalog(): Promise<any> {
    return this.request('GET', '/api/logic/catalog');
  }

  /** Stateless validation of a package document: `{valid, issues[]}`. */
  validatePackage(document: unknown): Promise<{ valid: boolean; issues: any[] }> {
    return this.request('POST', '/api/logic/validate', document);
  }

  async listPackages(orgId: string): Promise<any[]> {
    return items(await this.request('GET', this.pkg(orgId)));
  }

  getPackage(orgId: string, key: string): Promise<any> {
    return this.request('GET', this.pkg(orgId, key));
  }

  savePackage(orgId: string, key: string, document: unknown): Promise<any> {
    return this.request('PUT', this.pkg(orgId, key), document);
  }

  async listVersions(orgId: string, key: string): Promise<any[]> {
    return items(await this.request('GET', `${this.pkg(orgId, key)}/versions`));
  }

  validateStored(orgId: string, key: string): Promise<{ valid: boolean; issues: any[] }> {
    return this.request('POST', `${this.pkg(orgId, key)}/validate`, {});
  }

  publishRelease(orgId: string, key: string, note?: string): Promise<any> {
    return this.request('POST', `${this.pkg(orgId, key)}/releases`, note ? { note } : {});
  }

  async listReleases(orgId: string, key: string): Promise<any[]> {
    return items(await this.request('GET', `${this.pkg(orgId, key)}/releases`));
  }

  getRelease(orgId: string, key: string, release: number): Promise<any> {
    return this.request('GET', `${this.pkg(orgId, key)}/releases/${release}`);
  }

  deploy(orgId: string, key: string, release: number): Promise<any> {
    return this.request('PUT', `${this.pkg(orgId, key)}/deployment`, { release });
  }

  getDeployment(orgId: string, key: string): Promise<any> {
    return this.request('GET', `${this.pkg(orgId, key)}/deployment`);
  }

  rollback(orgId: string, key: string, release?: number): Promise<any> {
    return this.request('POST', `${this.pkg(orgId, key)}/deployment/rollback`, release != null ? { release } : {});
  }

  runFlow(orgId: string, key: string, flow: string, opts: { input?: unknown; dryRun?: boolean; draft?: boolean } = {}): Promise<any> {
    return this.request('POST', `${this.pkg(orgId, key)}/flows/${enc(flow)}/runs`,
      { input: opts.input ?? {}, dryRun: Boolean(opts.dryRun), draft: Boolean(opts.draft) });
  }

  async listRuns(orgId: string, key: string): Promise<any[]> {
    return items(await this.request('GET', `${this.pkg(orgId, key)}/runs`));
  }

  getRun(orgId: string, key: string, runId: string): Promise<any> {
    return this.request('GET', `${this.pkg(orgId, key)}/runs/${enc(runId)}`);
  }

  /** URL path of a deployed app endpoint on the shared server. */
  appPath(orgSlug: string, packageKey: string, path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `/api/apps/${enc(orgSlug)}/${enc(packageKey)}${p}`;
  }

  /** Calls a deployed app endpoint and returns the raw outcome (status, body, run id). */
  callApp(orgSlug: string, packageKey: string, method: string, path: string, body?: unknown, opts: { anonymous?: boolean; headers?: Record<string, string> } = {}): Promise<AppCallResult> {
    const m = method.toUpperCase();
    return this.raw(m, this.appPath(orgSlug, packageKey, path), m === 'GET' || m === 'DELETE' ? undefined : body, opts);
  }
}
