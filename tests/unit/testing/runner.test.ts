import { getPath, interpolate, match, setPath } from '../../../src/testing/assert.js';
import { prepareApp, runKey, runPackage, toJUnit } from '../../../src/testing/runner.js';
import { BUILTIN_PACKAGES } from '../../../src/testing/packages/index.js';
import { TestPackage } from '../../../src/testing/types.js';

describe('match', () => {
  it('matches objects partially and arrays exactly', () => {
    expect(match({ a: 1, b: 2 }, { a: 1 })).toEqual([]);
    expect(match({ a: 1 }, { a: 2 })).toHaveLength(1);
    expect(match([1, 2], [1, 2])).toEqual([]);
    expect(match([1, 2], [1])).toHaveLength(1);
    expect(match({ items: [{ id: 'x', n: 1 }] }, { items: [{ id: 'x' }] })).toEqual([]);
  });

  it('supports dot-path keys', () => {
    expect(match({ trace: [1, 2, 3] }, { 'trace.length': 3 })).toEqual([]);
    expect(match({ a: { b: { c: 4 } } }, { 'a.b.c': { $gt: 3 } })).toEqual([]);
  });

  it('supports matchers', () => {
    expect(match('abc', { $contains: 'b' })).toEqual([]);
    expect(match([{ x: 1 }, { x: 2 }], { $some: { x: 2 } })).toEqual([]);
    expect(match([{ x: 1 }, { x: 2 }], { $every: { x: { $gte: 1 } } })).toEqual([]);
    expect(match([{ x: 1 }], { $contains: { x: 1 } })).toEqual([]);
    expect(match('a'.repeat(64), { $match: '^a{64}$' })).toEqual([]);
    expect(match(5, { $oneOf: [4, 5] })).toEqual([]);
    expect(match(null, { $exists: false })).toEqual([]);
    expect(match(undefined, { $exists: true })).toHaveLength(1);
    expect(match([], { $len: 0, $type: 'array' })).toEqual([]);
    expect(match(3, { $lt: 2 })).toHaveLength(1);
    expect(match(1, { $nope: 1 })[0]).toMatch(/unknown matcher/);
  });
});

describe('templating', () => {
  const vars = { space: 'sp', n: 3, obj: { id: 'i' } };

  it('keeps the type of a whole-string template and leaves ${} alone', () => {
    expect(interpolate({ a: '{{n}}', b: 'x-{{space}}', c: '${input.x}', d: '{{obj.id}}' }, vars))
      .toEqual({ a: 3, b: 'x-sp', c: '${input.x}', d: 'i' });
  });

  it('fails on unknown variables', () => {
    expect(() => interpolate('{{missing}}', vars)).toThrow(/unknown variable/);
  });

  it('reads and writes dot paths', () => {
    const doc: any = { flows: [{ steps: [{ config: { body: { v: 1 } } }] }] };
    setPath(doc, 'flows.0.steps.0.config.body.v', 2);
    expect(getPath(doc, 'flows.0.steps.0.config.body.v')).toBe(2);
    setPath(doc, 'flows.0.trigger', { kind: 'manual' });
    expect(doc.flows[0].trigger.kind).toBe('manual');
    setPath(doc, 'flows.0.trigger', null);
    expect(doc.flows[0].trigger).toBeUndefined();
  });
});

describe('package preparation', () => {
  it('makes unique, valid keys', () => {
    const k = runKey('A Very Long Name With Spaces And More Words Than Fit In Sixty Three Characters', 'abc123');
    expect(k).toMatch(/^[a-z0-9-]+$/);
    expect(k.length).toBeLessThanOrEqual(63);
    expect(k.endsWith('-abc123')).toBe(true);
  });

  it('replaces __SPACE__ and the key without touching the original', () => {
    const app = { package: { key: 'x' }, scopes: { spaces: ['__SPACE__'] } };
    const doc = prepareApp(app, 'my-space', 't-x-1');
    expect(doc.scopes.spaces).toEqual(['my-space']);
    expect(doc.package.key).toBe('t-x-1');
    expect(app.scopes.spaces).toEqual(['__SPACE__']);
  });

  it('every built-in package is well formed', () => {
    const names = new Set<string>();
    for (const p of BUILTIN_PACKAGES) {
      expect(names.has(p.name)).toBe(false);
      names.add(p.name);
      expect(p.app.package.key).toBeTruthy();
      expect(p.steps.length).toBeGreaterThan(0);
      expect(p.features.length).toBeGreaterThan(0);
      for (const s of p.steps) expect(s.it).toBeTruthy();
    }
  });
});

/** A fake client that serves one deployed app answering 200 {message} on GET /hello. */
function fakeClient() {
  const calls: string[] = [];
  const client: any = {
    baseUrl: 'http://fake',
    createSpace: jest.fn(async (i: any) => { calls.push('createSpace'); return { id: 'space-id', slug: i.slug }; }),
    deleteSpace: jest.fn(async () => { calls.push('deleteSpace'); }),
    validatePackage: jest.fn(async () => ({ valid: true, issues: [] })),
    savePackage: jest.fn(async () => ({ version: 1 })),
    publishRelease: jest.fn(async () => ({ release: 1, sha256: 'a'.repeat(64) })),
    deploy: jest.fn(async () => ({ activeRelease: 1 })),
    callApp: jest.fn(async (_o: string, _k: string, _m: string, path: string) =>
      path.startsWith('/hello?name=') ? { status: 200, body: { message: `Hello ${path.split('=')[1]}` }, headers: {}, runId: 'r1', ms: 5 }
        : { status: 400, body: { error: 'name is required' }, headers: {}, runId: 'r2', ms: 5 }),
  };
  return { client, calls };
}

describe('runPackage', () => {
  const org = { id: 'org-1', slug: 'acme', name: 'Acme' };
  const pkg: TestPackage = {
    name: 'mini', title: 'mini', features: ['respond'],
    app: { package: { key: 'mini' }, scopes: { spaces: ['__SPACE__'] }, flows: [], endpoints: [] },
    steps: [
      { it: 'ships', do: 'ship' },
      { it: 'greets', do: 'call', method: 'GET', path: '/hello?name=Ada', expect: { status: 200, body: { message: 'Hello Ada' } }, save: { msg: 'body.message' } },
      { it: 'uses a saved variable', do: 'call', method: 'GET', path: '/hello?name={{msg}}', expect: { status: 200 } },
      { it: 'fails on purpose', do: 'call', method: 'GET', path: '/hello', expect: { status: 200 } },
      { it: 'is skipped after a failure', do: 'sleep', ms: 1 },
    ],
  };

  it('creates a space, runs steps in order, stops at the first failure and cleans up', async () => {
    const { client, calls } = fakeClient();
    const seen: string[] = [];
    const r = await runPackage(pkg, { client, org, onStep: (_p, s) => seen.push(`${s.ok ? 'ok' : s.skipped ? 'skip' : 'fail'}:${s.it}`) });
    expect(r.status).toBe('failed');
    expect(seen).toEqual(['ok:ships', 'ok:greets', 'ok:uses a saved variable', 'fail:fails on purpose', 'skip:is skipped after a failure']);
    expect(r.steps[3].error).toMatch(/expected 200, got 400/);
    expect(client.savePackage.mock.calls[0][2].scopes.spaces[0]).toBe(r.space);
    expect(calls[0]).toBe('createSpace');
    expect(calls[calls.length - 1]).toBe('deleteSpace');
  });

  it('keeps the space with keep, and uses a given space without creating one', async () => {
    const { client } = fakeClient();
    await runPackage({ ...pkg, steps: pkg.steps.slice(0, 2) }, { client, org, space: 'given' });
    expect(client.createSpace).not.toHaveBeenCalled();
    expect(client.deleteSpace).not.toHaveBeenCalled();
  });

  it('skips packages whose requirements are not enabled', async () => {
    const { client } = fakeClient();
    const r = await runPackage({ ...pkg, requires: ['agent'] }, { client, org });
    expect(r.status).toBe('skipped');
    expect(client.createSpace).not.toHaveBeenCalled();
  });

  it('writes JUnit XML', async () => {
    const { client } = fakeClient();
    const r = await runPackage(pkg, { client, org });
    const xml = toJUnit([r]);
    expect(xml).toContain('<testsuite name="mini" tests="5" failures="1" skipped="1"');
    expect(xml).toContain('<failure message=');
  });
});
