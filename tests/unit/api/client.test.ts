import { MujarradClient, ApiError, items, unwrap } from '../../../src/api/client.js';

/** A fake axios instance that records requests and answers from a route table. */
function fakeHttp(routes: Record<string, { status: number; data?: any; headers?: Record<string, string> }>) {
  const calls: any[] = [];
  return {
    calls,
    request: jest.fn(async (config: any) => {
      calls.push(config);
      const key = `${config.method} ${config.url}`;
      const hit = routes[key];
      if (!hit) return { status: 404, data: { title: `no route ${key}` }, headers: {} };
      return { status: hit.status, data: hit.data ?? '', headers: hit.headers ?? {} };
    }),
  };
}

describe('MujarradClient', () => {
  it('signs in anonymously and returns the token and user', async () => {
    const http = fakeHttp({ 'POST /api/auth/login': { status: 200, data: { token: 't1', user: { id: 'u', email: 'a@b.c', username: 'ada' } } } });
    const client = new MujarradClient({ baseUrl: 'http://x/', token: 'old' }, http as any);
    const res = await client.login('a@b.c', 'secret123');
    expect(res.token).toBe('t1');
    expect(http.calls[0].headers.Authorization).toBeUndefined();
    expect(http.calls[0].data).toEqual({ email: 'a@b.c', password: 'secret123' });
  });

  it('sends a bearer token, or the API key pair', async () => {
    const http = fakeHttp({ 'GET /api/auth/me': { status: 200, data: { id: 'u', email: 'a@b.c' } } });
    await new MujarradClient({ baseUrl: 'http://x', token: 'jwt' }, http as any).me();
    expect(http.calls[0].headers.Authorization).toBe('Bearer jwt');
    await new MujarradClient({ baseUrl: 'http://x', apiKey: 'k', apiSecret: 's' }, http as any).me();
    expect(http.calls[1].headers['X-API-Key']).toBe('k');
    expect(http.calls[1].headers['X-API-Secret']).toBe('s');
  });

  it('throws ApiError with the problem detail on failure', async () => {
    const http = fakeHttp({ 'GET /api/logic/catalog': { status: 403, data: { title: 'Forbidden', detail: 'nope' } } });
    const client = new MujarradClient({ baseUrl: 'http://x', token: 't' }, http as any);
    await expect(client.getCatalog()).rejects.toThrow(ApiError);
    await expect(client.getCatalog()).rejects.toThrow(/403.*nope/);
  });

  it('reads paged organization lists and resolves by slug', async () => {
    const http = fakeHttp({ 'GET /api/organizations?size=100': { status: 200, data: { content: [{ id: '1', slug: 'a', name: 'A' }, { id: '2', slug: 'b', name: 'B' }] } } });
    const client = new MujarradClient({ baseUrl: 'http://x', token: 't' }, http as any);
    expect((await client.resolveOrganization()).id).toBe('1');
    expect((await client.resolveOrganization('b')).id).toBe('2');
    await expect(client.resolveOrganization('zzz')).rejects.toThrow(/not found/);
  });

  it('calls logic package endpoints under the organization', async () => {
    const http = fakeHttp({
      'PUT /api/organizations/o1/logic/packages/hello': { status: 201, data: { key: 'hello', version: 1 } },
      'POST /api/organizations/o1/logic/packages/hello/releases': { status: 201, data: { release: 1, sha256: 'x' } },
      'PUT /api/organizations/o1/logic/packages/hello/deployment': { status: 200, data: { activeRelease: 1 } },
      'POST /api/organizations/o1/logic/packages/hello/flows/say-hello/runs': { status: 200, data: { runId: 'r', status: 'SUCCEEDED' } },
    });
    const client = new MujarradClient({ baseUrl: 'http://x', token: 't' }, http as any);
    await client.savePackage('o1', 'hello', { package: { key: 'hello' } });
    await client.publishRelease('o1', 'hello');
    await client.deploy('o1', 'hello', 1);
    const run = await client.runFlow('o1', 'hello', 'say-hello', { input: { name: 'Ada' }, dryRun: true });
    expect(run.status).toBe('SUCCEEDED');
    expect(http.calls[2].data).toEqual({ release: 1 });
    expect(http.calls[3].data).toEqual({ input: { name: 'Ada' }, dryRun: true, draft: false });
  });

  it('returns app endpoint outcomes without throwing, with the run id', async () => {
    const http = fakeHttp({ 'POST /api/apps/acme/hello/claims': { status: 422, data: '{"reason":"no"}', headers: { 'X-Logic-Run': 'run-1' } } });
    const client = new MujarradClient({ baseUrl: 'http://x', token: 't' }, http as any);
    const res = await client.callApp('acme', 'hello', 'post', 'claims', { a: 1 }, { anonymous: true });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ reason: 'no' });
    expect(res.runId).toBe('run-1');
    expect(http.calls[0].headers.Authorization).toBeUndefined();
  });

  it('does not send a body on GET app calls', async () => {
    const http = fakeHttp({ 'GET /api/apps/acme/hello/x': { status: 204 } });
    const client = new MujarradClient({ baseUrl: 'http://x', token: 't' }, http as any);
    const res = await client.callApp('acme', 'hello', 'GET', '/x', { ignored: true });
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    expect(http.calls[0].data).toBeUndefined();
  });
});

describe('response helpers', () => {
  it('unwraps the success envelope and pages', () => {
    expect(unwrap({ success: true, data: { a: 1 } })).toEqual({ a: 1 });
    expect(unwrap({ a: 1 })).toEqual({ a: 1 });
    expect(items({ content: [1, 2] })).toEqual([1, 2]);
    expect(items([3])).toEqual([3]);
    expect(items(null)).toEqual([]);
  });
});
