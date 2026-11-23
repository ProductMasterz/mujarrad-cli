import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import { MujarradClient, Organization } from '../api/client.js';
import { requireClient } from '../api/session.js';
import { action, addApiOptions, ApiCommandOptions, jsonArg, orgRef, printJson, printTable, readJsonFile } from './common.js';

/**
 * `mujarrad logic`: App Packages on the backend's logic tier (Mujarrad-Backend specs/038-logic-tier).
 * Everything the forge Logic lens does, from the command line: validate, save drafts, publish
 * releases, deploy, roll back, run flows, read run traces and call the deployed endpoints.
 */

type Opts = ApiCommandOptions;

async function ctx(opts: Opts): Promise<{ client: MujarradClient; org: Organization }> {
  const client = await requireClient(opts);
  const org = await client.resolveOrganization(orgRef(opts));
  return { client, org };
}

/** Loads a package file, replacing the __SPACE__ placeholder and overriding the key when asked. */
export async function loadPackageFile(file: string, { space, key }: { space?: string; key?: string } = {}): Promise<any> {
  let text = await fs.readFile(file, 'utf-8');
  if (space) text = text.split('__SPACE__').join(space);
  let doc: any;
  try {
    doc = JSON.parse(text);
  } catch (e: any) {
    throw new Error(`${file} is not valid JSON: ${e.message}`);
  }
  if (key) doc.package = { ...(doc.package || {}), key };
  if (!doc?.package?.key) throw new Error(`${file} has no package.key (pass --key)`);
  return doc;
}

function printIssues(result: { valid: boolean; issues?: any[] }, json?: boolean): void {
  if (json) return printJson(result);
  if (result.valid) console.log(chalk.green('✓ Valid'));
  else console.log(chalk.red('✗ Invalid'));
  for (const i of result.issues || []) {
    const sev = i.severity === 'warning' ? chalk.yellow('warning') : chalk.red('error');
    console.log(`  ${sev} ${i.path ?? ''} ${chalk.gray(i.code ?? '')} ${i.message ?? ''}`);
  }
}

export function logicCommand(program: Command): void {
  const logic = program
    .command('logic')
    .description('App Packages on the logic tier: validate, release, deploy, run and call endpoints')
    .addHelpText('after', `
Examples:
  $ mujarrad logic catalog
  $ mujarrad logic validate app.json --space my-space
  $ mujarrad logic ship app.json --space my-space        # save, release and deploy
  $ mujarrad logic call hello GET /hello?name=Ada
  $ mujarrad logic run hello say-hello --input '{"name":"Ada"}' --dry-run
  $ mujarrad logic runs hello

Package files may use __SPACE__ wherever a space slug goes; --space replaces it.
`);

  const cmd = (spec: string, desc: string, org = true) => addApiOptions(logic.command(spec).description(desc), { org });

  cmd('catalog', 'Step kinds, trigger kinds, endpoint auth policies and attribute types the backend supports', false)
    .action(action(async (opts: Opts) => {
      const client = await requireClient(opts);
      const catalog = await client.getCatalog();
      if (opts.json) return printJson(catalog);
      printTable((catalog.stepKinds || []).map((k: any) => ({ kind: k.kind, available: k.available, required: (k.requiredConfig || []).join(','), description: k.description })),
        ['kind', 'available', 'required', 'description']);
      console.log(`\nTriggers: ${(catalog.triggerKinds || []).map((t: any) => t.kind ?? t).join(', ')}`);
      console.log(`Endpoint auth: ${(catalog.endpointAuth || []).map((t: any) => t.policy ?? t.kind ?? t).join(', ')}`);
    }));

  cmd('validate [file]', 'Validate a package file (stateless), or a stored draft with --stored <key>')
    .option('--space <slug>', 'Replace __SPACE__ in the file')
    .option('--stored <key>', 'Validate the stored draft of this package instead')
    .action(action(async (file: string | undefined, opts: Opts & { space?: string; stored?: string }) => {
      if (opts.stored) {
        const { client, org } = await ctx(opts);
        const result = await client.validateStored(org.id, opts.stored);
        printIssues(result, opts.json);
        if (!result.valid) process.exit(1);
        return;
      }
      if (!file) throw new Error('give a package file, or --stored <key>');
      const client = await requireClient(opts);
      const result = await client.validatePackage(await loadPackageFile(file, { space: opts.space }));
      printIssues(result, opts.json);
      if (!result.valid) process.exit(1);
    }));

  cmd('list', 'List the packages of the organization')
    .action(action(async (opts: Opts) => {
      const { client, org } = await ctx(opts);
      const list = await client.listPackages(org.id);
      printTable(list.map((p: any) => ({ key: p.key, name: p.name, version: p.version, valid: p.valid, updatedAt: p.updatedAt })),
        ['key', 'name', 'version', 'valid', 'updatedAt'], opts.json);
    }));

  cmd('get <key>', 'Print the stored draft of a package')
    .option('--out <file>', 'Write the document to a file')
    .action(action(async (key: string, opts: Opts & { out?: string }) => {
      const { client, org } = await ctx(opts);
      const pkg = await client.getPackage(org.id, key);
      const doc = pkg.document ?? pkg;
      if (opts.out) {
        await fs.writeFile(opts.out, JSON.stringify(doc, null, 2) + '\n');
        console.log(chalk.green(`✓ Wrote ${opts.out}`));
      } else {
        printJson(doc);
      }
    }));

  cmd('push <file>', 'Save a package file as the draft (creates the package or a new version)')
    .option('--space <slug>', 'Replace __SPACE__ in the file')
    .option('--key <key>', 'Override package.key')
    .action(action(async (file: string, opts: Opts & { space?: string; key?: string }) => {
      const { client, org } = await ctx(opts);
      const doc = await loadPackageFile(file, opts);
      const saved = await client.savePackage(org.id, doc.package.key, doc);
      if (opts.json) return printJson(saved);
      console.log(chalk.green(`✓ Saved draft of ${doc.package.key}`) + chalk.gray(saved?.version != null ? ` (version ${saved.version})` : ''));
    }));

  cmd('versions <key>', 'List the saved draft versions of a package')
    .action(action(async (key: string, opts: Opts) => {
      const { client, org } = await ctx(opts);
      printTable(await client.listVersions(org.id, key), ['version', 'createdAt', 'createdBy'], opts.json);
    }));

  cmd('release <key>', 'Publish the current draft as an immutable, hashed release')
    .option('--note <note>', 'Release note')
    .action(action(async (key: string, opts: Opts & { note?: string }) => {
      const { client, org } = await ctx(opts);
      const rel = await client.publishRelease(org.id, key, opts.note);
      if (opts.json) return printJson(rel);
      console.log(chalk.green(`✓ Release ${rel.release} of ${key}`) + chalk.gray(` sha256 ${rel.sha256}`));
    }));

  cmd('releases <key>', 'List the releases of a package')
    .action(action(async (key: string, opts: Opts) => {
      const { client, org } = await ctx(opts);
      printTable(await client.listReleases(org.id, key), ['release', 'packageVersion', 'sha256', 'integrity', 'note', 'publishedAt'], opts.json);
    }));

  cmd('deploy <key>', 'Deploy a release (default: the latest) and materialize its model')
    .option('--release <n>', 'Release number', (v) => parseInt(v, 10))
    .action(action(async (key: string, opts: Opts & { release?: number }) => {
      const { client, org } = await ctx(opts);
      let release = opts.release;
      if (release == null) {
        const releases = await client.listReleases(org.id, key);
        if (!releases.length) throw new Error(`${key} has no release yet; run "mujarrad logic release ${key}"`);
        release = Math.max(...releases.map((r: any) => Number(r.release)));
      }
      const dep = await client.deploy(org.id, key, release);
      if (opts.json) return printJson(dep);
      console.log(chalk.green(`✓ Deployed ${key} release ${release}`));
      console.log(chalk.gray(`  endpoints: ${client.baseUrl}${client.appPath(org.slug, key, '/')}`));
    }));

  cmd('deployment <key>', 'Show the active deployment of a package')
    .action(action(async (key: string, opts: Opts) => {
      const { client, org } = await ctx(opts);
      printJson(await client.getDeployment(org.id, key));
    }));

  cmd('rollback <key>', 'Roll the deployment back (to the previous release, or --release n)')
    .option('--release <n>', 'Release number', (v) => parseInt(v, 10))
    .action(action(async (key: string, opts: Opts & { release?: number }) => {
      const { client, org } = await ctx(opts);
      const dep = await client.rollback(org.id, key, opts.release);
      if (opts.json) return printJson(dep);
      console.log(chalk.green(`✓ ${key} now runs release ${dep.activeRelease ?? '?'}`));
    }));

  cmd('ship <file>', 'Validate, save, release and deploy a package file in one step')
    .option('--space <slug>', 'Replace __SPACE__ in the file')
    .option('--key <key>', 'Override package.key')
    .option('--note <note>', 'Release note')
    .action(action(async (file: string, opts: Opts & { space?: string; key?: string; note?: string }) => {
      const { client, org } = await ctx(opts);
      const doc = await loadPackageFile(file, opts);
      const key = doc.package.key;
      const v = await client.validatePackage(doc);
      if (!v.valid) {
        printIssues(v, opts.json);
        process.exit(1);
      }
      await client.savePackage(org.id, key, doc);
      const rel = await client.publishRelease(org.id, key, opts.note);
      const dep = await client.deploy(org.id, key, rel.release);
      if (opts.json) return printJson({ release: rel, deployment: dep });
      console.log(chalk.green(`✓ ${key}: saved, released (${rel.release}) and deployed`));
      console.log(chalk.gray(`  endpoints: ${client.baseUrl}${client.appPath(org.slug, key, '/')}`));
    }));

  cmd('run <key> <flow>', 'Run a flow manually (the deployed release, or the draft with --draft)')
    .option('--input <json>', 'Input as JSON, or @file.json', '{}')
    .option('--dry-run', 'Roll back every write the run makes')
    .option('--draft', 'Run the current draft instead of the deployed release')
    .action(action(async (key: string, flow: string, opts: Opts & { input: string; dryRun?: boolean; draft?: boolean }) => {
      const { client, org } = await ctx(opts);
      const run = await client.runFlow(org.id, key, flow, { input: await jsonArg(opts.input), dryRun: opts.dryRun, draft: opts.draft });
      if (opts.json) return printJson(run);
      const ok = String(run.status).toUpperCase() === 'SUCCEEDED';
      console.log((ok ? chalk.green('✓') : chalk.red('✗')) + ` run ${run.runId ?? ''} ${run.status ?? ''}${run.dryRun ? ' (dry run)' : ''}`);
      if (run.error) console.log(chalk.red(`  ${typeof run.error === 'string' ? run.error : JSON.stringify(run.error)}`));
      if (run.response != null) printJson(run.response);
      else if (run.state !== undefined) printJson(run.state);
      if (!ok) process.exit(1);
    }));

  cmd('runs <key> [runId]', 'List recent runs of a package, or show one run with its trace')
    .action(action(async (key: string, runId: string | undefined, opts: Opts) => {
      const { client, org } = await ctx(opts);
      if (runId) return printJson(await client.getRun(org.id, key, runId));
      const runs = await client.listRuns(org.id, key);
      printTable(runs.map((r: any) => ({ runId: r.runId, flow: r.flow, trigger: r.trigger, source: r.source, status: r.status, startedAt: r.startedAt })),
        ['runId', 'flow', 'trigger', 'source', 'status', 'startedAt'], opts.json);
    }));

  cmd('call <key> <method> <path>', 'Call a deployed app endpoint, e.g. call hello GET /hello?name=Ada')
    .option('--body <json>', 'Request body as JSON, or @file.json')
    .option('--anonymous', 'Call without credentials (tests public endpoints)')
    .option('--fail', 'Exit 1 when the status is not 2xx')
    .action(action(async (key: string, method: string, path: string, opts: Opts & { body?: string; anonymous?: boolean; fail?: boolean }) => {
      const { client, org } = await ctx(opts);
      const body = opts.body ? await jsonArg(opts.body) : undefined;
      const res = await client.callApp(org.slug, key, method, path, body, { anonymous: opts.anonymous });
      if (opts.json) printJson({ status: res.status, runId: res.runId, ms: res.ms, body: res.body });
      else {
        const color = res.status < 300 ? chalk.green : res.status < 500 ? chalk.yellow : chalk.red;
        console.log(color(`${res.status}`) + chalk.gray(`  ${res.ms} ms${res.runId ? `  run ${res.runId}` : ''}`));
        if (res.body != null) typeof res.body === 'string' ? console.log(res.body) : printJson(res.body);
      }
      if (opts.fail && (res.status < 200 || res.status >= 300)) process.exit(1);
    }));
}

/** Exported for tests. */
export { readJsonFile };
