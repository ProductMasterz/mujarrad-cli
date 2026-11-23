import { randomBytes } from 'crypto';
import { MujarradClient, Organization } from '../api/client.js';
import { getPath, interpolate, match, setPath } from './assert.js';
import { PackageResult, Requirement, StepResult, TestPackage, TestStep } from './types.js';

export interface RunOptions {
  client: MujarradClient;
  org: Organization;
  /** Optional capabilities to include (packages needing others are skipped). */
  enabled?: Requirement[];
  /** Use this space instead of creating a fresh one per package. */
  space?: string;
  /** Keep the spaces the runner created (default: delete them afterwards). */
  keep?: boolean;
  /** Called after each step, for live output. */
  onStep?: (pkg: TestPackage, step: StepResult) => void;
  onStart?: (pkg: TestPackage, ctx: { space: string; key: string }) => void;
}

const suffix = () => randomBytes(3).toString('hex');

/** Unique, valid package key for one run: lowercase-dash, at most 63 chars. */
export function runKey(name: string, sfx = suffix()): string {
  const base = `t-${name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 54).replace(/-+$/, '');
  return `${base}-${sfx}`;
}

/** Deep copy of the app document with __SPACE__ replaced and the key set. */
export function prepareApp(app: any, space: string, key: string): any {
  const doc = JSON.parse(JSON.stringify(app).split('__SPACE__').join(space));
  doc.package = { ...(doc.package || {}), key };
  return doc;
}

function missingRequirements(pkg: TestPackage, enabled: Requirement[]): Requirement[] {
  return (pkg.requires || []).filter(r => !enabled.includes(r));
}

class StepFailure extends Error {
  constructor(message: string, public readonly detail?: unknown) {
    super(message);
  }
}

function expectOrFail(actual: unknown, expected: unknown, what: string): void {
  if (expected === undefined) return;
  const errors = match(actual, expected);
  if (errors.length) throw new StepFailure(`${what} did not match:\n      ${errors.slice(0, 6).join('\n      ')}`, actual);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Runs one test package end to end and returns its result. Never throws. */
export async function runPackage(pkg: TestPackage, opts: RunOptions): Promise<PackageResult> {
  const started = Date.now();
  const result: PackageResult = { name: pkg.name, title: pkg.title, features: pkg.features, status: 'passed', ms: 0, steps: [] };
  const missing = missingRequirements(pkg, opts.enabled || []);
  if (missing.length) {
    result.status = 'skipped';
    result.skipReason = `needs ${missing.join(', ')} (enable with --with ${missing.join(',')})`;
    return result;
  }

  const { client, org } = opts;
  const key = runKey(pkg.name);
  let space = opts.space;
  let createdSpaceId: string | null = null;
  try {
    if (!space) {
      const created = await client.createSpace({ name: `CLI test ${pkg.name}`, slug: key, projectType: 'BACKEND', organizationId: org.id });
      space = created.slug;
      createdSpaceId = created.id;
    }
  } catch (e: any) {
    result.status = 'failed';
    result.steps.push({ it: 'create a BACKEND space for the app', do: 'setup', ok: false, ms: Date.now() - started, error: e.message });
    result.ms = Date.now() - started;
    return result;
  }
  result.space = space;
  result.key = key;
  opts.onStart?.(pkg, { space: space!, key });

  const vars: Record<string, unknown> = { space, org: org.id, orgSlug: org.slug, key };
  let doc = prepareApp(pkg.app, space!, key);
  let failed = false;

  for (const raw of pkg.steps) {
    if (failed) {
      const skipped: StepResult = { it: raw.it, do: raw.do, ok: false, skipped: true, ms: 0 };
      result.steps.push(skipped);
      opts.onStep?.(pkg, skipped);
      continue;
    }
    const t0 = Date.now();
    const sr: StepResult = { it: raw.it, do: raw.do, ok: true, ms: 0 };
    try {
      const step = interpolate(raw, vars) as TestStep;
      const out = await execute(step, { client, org, key, vars, getDoc: () => doc, setDoc: (d) => { doc = d; } });
      if (step.save) {
        for (const [name, path] of Object.entries(step.save)) {
          const v = getPath(out, path);
          if (v === undefined) throw new StepFailure(`could not save ${name}: nothing at ${path}`, out);
          vars[name] = v;
        }
      }
    } catch (e: any) {
      sr.ok = false;
      sr.error = e.message;
      if (e instanceof StepFailure) sr.detail = e.detail;
      failed = true;
    }
    sr.ms = Date.now() - t0;
    result.steps.push(sr);
    opts.onStep?.(pkg, sr);
  }

  if (failed) result.status = 'failed';
  if (createdSpaceId && !opts.keep) {
    try { await client.deleteSpace(createdSpaceId); } catch { /* best effort */ }
  }
  result.ms = Date.now() - started;
  return result;
}

interface ExecCtx {
  client: MujarradClient;
  org: Organization;
  key: string;
  vars: Record<string, unknown>;
  getDoc: () => any;
  setDoc: (d: any) => void;
}

async function execute(step: TestStep, ctx: ExecCtx): Promise<any> {
  const { client, org, key, vars } = ctx;
  switch (step.do) {
    case 'validate': {
      const res = step.stored
        ? await client.validateStored(org.id, key)
        : await client.validatePackage(step.app ? prepareApp(step.app, String(vars.space), key) : ctx.getDoc());
      expectOrFail(res, step.expect ?? { valid: true }, 'validation');
      return res;
    }
    case 'push': {
      const res = await client.savePackage(org.id, key, ctx.getDoc());
      expectOrFail(res, step.expect, 'saved package');
      return res;
    }
    case 'release': {
      const res = await client.publishRelease(org.id, key, step.note);
      vars.release = res.release;
      expectOrFail(res, step.expect, 'release');
      return res;
    }
    case 'deploy': {
      const release = step.release != null ? Number(step.release) : Number(vars.release);
      if (!release) throw new StepFailure('no release to deploy; add a release step first');
      const res = await client.deploy(org.id, key, release);
      expectOrFail(res, step.expect, 'deployment');
      return res;
    }
    case 'ship': {
      const v = await client.validatePackage(ctx.getDoc());
      if (!v.valid) throw new StepFailure(`package is invalid: ${JSON.stringify(v.issues)}`, v);
      await client.savePackage(org.id, key, ctx.getDoc());
      const rel = await client.publishRelease(org.id, key);
      vars.release = rel.release;
      return { release: rel, deployment: await client.deploy(org.id, key, rel.release) };
    }
    case 'rollback': {
      const res = await client.rollback(org.id, key, step.release != null ? Number(step.release) : undefined);
      expectOrFail(res, step.expect, 'deployment after rollback');
      return res;
    }
    case 'deployment': {
      const res = await client.getDeployment(org.id, key);
      expectOrFail(res, step.expect, 'deployment');
      return res;
    }
    case 'releases': {
      const res = await client.listReleases(org.id, key);
      expectOrFail(res, step.expect, 'releases');
      return res;
    }
    case 'versions': {
      const res = await client.listVersions(org.id, key);
      expectOrFail(res, step.expect, 'versions');
      return res;
    }
    case 'edit': {
      const doc = JSON.parse(JSON.stringify(ctx.getDoc()));
      for (const [path, value] of Object.entries(step.set)) setPath(doc, path, value);
      ctx.setDoc(doc);
      return doc;
    }
    case 'call': {
      const res = await client.callApp(org.slug, key, step.method, step.path, step.body, { anonymous: step.anonymous });
      if (res.runId) vars.lastRunId = res.runId;
      const out = { status: res.status, body: res.body, headers: res.headers, runId: res.runId, ms: res.ms };
      const errors = step.expect === undefined ? [] : match(out, step.expect);
      if (errors.length) {
        throw new StepFailure(`${step.method} ${step.path} did not match:\n      ${errors.slice(0, 6).join('\n      ')}`,
          { status: res.status, body: res.body, runId: res.runId });
      }
      return out;
    }
    case 'run': {
      const res = await client.runFlow(org.id, key, step.flow, { input: step.input, dryRun: step.dryRun, draft: step.draft });
      if (res?.runId) vars.lastRunId = res.runId;
      expectOrFail(res, step.expect ?? { status: 'SUCCEEDED' }, `run of ${step.flow}`);
      return res;
    }
    case 'runs': {
      const res = await client.listRuns(org.id, key);
      expectOrFail(res, step.expect, 'run records');
      return res;
    }
    case 'getRun': {
      const res = await client.getRun(org.id, key, step.id);
      expectOrFail(res, step.expect, 'run record');
      return res;
    }
    case 'waitForRun': {
      const deadline = Date.now() + (step.timeoutMs ?? 20_000);
      let last: any[] = [];
      while (Date.now() < deadline) {
        last = await client.listRuns(org.id, key);
        const hit = last.find(r => !match(r, step.match).length);
        if (hit) return hit;
        await sleep(1000);
      }
      throw new StepFailure(`no run matched ${JSON.stringify(step.match)} within ${step.timeoutMs ?? 20_000} ms`,
        last.slice(0, 5).map(r => ({ flow: r.flow, trigger: r.trigger, status: r.status })));
    }
    case 'createRecord': {
      const dep = await client.getDeployment(org.id, key);
      const model = (dep?.model || []).find((m: any) => m.type === step.type);
      if (!model?.contextTypeId) throw new StepFailure(`type ${step.type} is not in the deployed model`, dep?.model);
      const node = await client.request('POST', `/api/spaces/${encodeURIComponent(model.space)}/nodes`, {
        title: step.title, nodeType: 'REGULAR', contextTypeId: model.contextTypeId, nodeDetails: step.attributes ?? {},
      });
      const created = node?.data ?? node;
      expectOrFail(created, step.expect, 'created record');
      return created;
    }
    case 'sleep':
      await sleep(step.ms);
      return null;
    default:
      throw new StepFailure(`unknown step kind ${(step as any).do}`);
  }
}

/** Runs several packages one after another. */
export async function runPackages(pkgs: TestPackage[], opts: RunOptions): Promise<PackageResult[]> {
  const results: PackageResult[] = [];
  for (const p of pkgs) results.push(await runPackage(p, opts));
  return results;
}

/** JUnit XML for CI systems. */
export function toJUnit(results: PackageResult[]): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const suites = results.map(r => {
    const cases = r.steps.map(s => {
      const inner = s.skipped ? '<skipped/>' : s.ok ? '' : `<failure message="${esc(s.error || 'failed')}"/>`;
      return `    <testcase classname="${esc(r.name)}" name="${esc(s.it)}" time="${(s.ms / 1000).toFixed(3)}">${inner}</testcase>`;
    });
    if (r.status === 'skipped') cases.push(`    <testcase classname="${esc(r.name)}" name="${esc(r.title)}"><skipped message="${esc(r.skipReason || '')}"/></testcase>`);
    const failures = r.steps.filter(s => !s.ok && !s.skipped).length;
    const skipped = r.steps.filter(s => s.skipped).length + (r.status === 'skipped' ? 1 : 0);
    return `  <testsuite name="${esc(r.name)}" tests="${cases.length}" failures="${failures}" skipped="${skipped}" time="${(r.ms / 1000).toFixed(3)}">\n${cases.join('\n')}\n  </testsuite>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="mujarrad logic tests">\n${suites.join('\n')}\n</testsuites>\n`;
}
