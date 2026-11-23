import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import { requireClient } from '../api/session.js';
import { BUILTIN_PACKAGES, findPackage } from '../testing/packages/index.js';
import { runPackages, toJUnit } from '../testing/runner.js';
import { PackageResult, Requirement, TestPackage } from '../testing/types.js';
import { action, addApiOptions, ApiCommandOptions, orgRef, printJson, readJsonFile } from './common.js';

const REQUIREMENTS: Requirement[] = ['agent', 'http', 'slow'];

function parseWith(value?: string): Requirement[] {
  if (!value) return [];
  const list = value.split(',').map(s => s.trim()).filter(Boolean);
  for (const r of list) {
    if (!REQUIREMENTS.includes(r as Requirement)) throw new Error(`unknown --with value '${r}' (use ${REQUIREMENTS.join(', ')})`);
  }
  return list as Requirement[];
}

async function loadFilePackages(files: string[]): Promise<TestPackage[]> {
  const out: TestPackage[] = [];
  for (const f of files) {
    const data = await readJsonFile(f);
    for (const p of Array.isArray(data) ? data : [data]) {
      if (!p?.name || !p?.app || !Array.isArray(p?.steps)) throw new Error(`${f}: a test package needs name, app and steps`);
      out.push({ title: p.name, features: [], ...p });
    }
  }
  return out;
}

function printSummary(results: PackageResult[]): void {
  console.log('');
  const width = Math.max(...results.map(r => r.name.length), 4);
  for (const r of results) {
    const mark = r.status === 'passed' ? chalk.green('PASS') : r.status === 'failed' ? chalk.red('FAIL') : chalk.yellow('SKIP');
    const steps = r.steps.filter(s => s.ok).length;
    const bugs = r.steps.filter(s => s.knownBug?.state === 'still-failing').length;
    const detail = r.status === 'skipped' ? r.skipReason
      : `${steps}/${r.steps.length} steps${bugs ? `, ${bugs} known backend bug${bugs > 1 ? 's' : ''}` : ''}  ${(r.ms / 1000).toFixed(1)} s`;
    console.log(`${mark}  ${r.name.padEnd(width)}  ${chalk.gray(detail)}`);
  }
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const covered = new Set(results.filter(r => r.status === 'passed').flatMap(r => r.features));
  const known = results.flatMap(r => r.steps.filter(s => s.knownBug).map(s => ({ pkg: r.name, s })));
  console.log(`\n${failed ? chalk.red(`${failed} failed`) : chalk.green('all passed')}: ${passed} passed, ${failed} failed, ${skipped} skipped. ` +
    chalk.gray(`${covered.size} logic-tier features proven.`));
  for (const { pkg, s } of known) {
    const label = s.knownBug!.state === 'still-failing' ? chalk.yellow('known backend bug, still failing') : chalk.cyan('known bug now PASSES, remove the marker');
    console.log(`  ${label}: ${pkg} > ${s.it}`);
  }
}

/**
 * `mujarrad test`: test packages that build logic flows and endpoints the way forge's Logic lens
 * does, ship them to a backend, call the endpoints and assert the results.
 */
export function testCommand(program: Command): void {
  const test = program
    .command('test')
    .description('Test packages that exercise the logic tier end to end against a backend')
    .addHelpText('after', `
Each test package builds an App Package (model, flows, endpoints) as forge does, validates,
saves, releases and deploys it into a fresh BACKEND space, then calls its endpoints and runs its
flows and checks every answer. Spaces are deleted afterwards unless --keep.

Examples:
  $ mujarrad test list
  $ mujarrad test run                       # every built-in package that needs nothing extra
  $ mujarrad test run hello records
  $ mujarrad test run --with agent,slow     # also the agent and schedule packages
  $ mujarrad test run --file my-tests.json  # your own packages (see "mujarrad test show hello")
  $ mujarrad test run --junit report.xml

Credentials: as for every command (auth login, MUJARRAD_TOKEN, MUJARRAD_EMAIL/PASSWORD, ...).
`);

  test.command('list').alias('ls').description('List the built-in test packages and the features they prove')
    .option('--json', 'Print JSON')
    .action((opts: { json?: boolean }) => {
      if (opts.json) return printJson(BUILTIN_PACKAGES.map(p => ({ name: p.name, title: p.title, features: p.features, requires: p.requires || [] })));
      for (const p of BUILTIN_PACKAGES) {
        const req = p.requires?.length ? chalk.yellow(` [needs --with ${p.requires.join(',')}]`) : '';
        console.log(`${chalk.bold(p.name.padEnd(10))} ${p.title}${req}`);
        console.log(chalk.gray(`           ${p.steps.length} steps; ${p.features.join(', ')}`));
      }
    });

  test.command('show <name>').description('Print a built-in test package as JSON, to copy and adapt')
    .action(action(async (name: string) => {
      const p = findPackage(name);
      if (!p) throw new Error(`no built-in package '${name}' (see "mujarrad test list")`);
      printJson(p);
    }));

  addApiOptions(test.command('run [names...]').description('Run test packages against the backend'), { org: true })
    .option('--file <file...>', 'Run test packages from JSON files instead of the built-ins')
    .option('--with <list>', 'Also run packages that need: agent, http, slow')
    .option('--space <slug>', 'Use an existing BACKEND space instead of a fresh one per package')
    .option('--keep', 'Keep the spaces created for the run (to inspect them in forge)')
    .option('--junit <file>', 'Write a JUnit XML report')
    .option('--bail', 'Stop after the first failing package')
    .action(action(async (names: string[], opts: ApiCommandOptions & { file?: string[]; with?: string; space?: string; keep?: boolean; junit?: string; bail?: boolean }) => {
      let pkgs = opts.file?.length ? await loadFilePackages(opts.file) : BUILTIN_PACKAGES;
      if (names?.length) {
        const unknown = names.filter(n => !pkgs.some(p => p.name === n));
        if (unknown.length) throw new Error(`unknown package(s): ${unknown.join(', ')} (see "mujarrad test list")`);
        pkgs = pkgs.filter(p => names.includes(p.name));
      }
      const enabled = parseWith(opts.with);
      // Naming a package that needs a capability enables that capability.
      if (names?.length) for (const p of pkgs) for (const r of p.requires || []) if (!enabled.includes(r)) enabled.push(r);

      const client = await requireClient(opts);
      const org = await client.resolveOrganization(orgRef(opts));
      const me = await client.me();
      if (!opts.json) console.log(chalk.gray(`Backend ${client.baseUrl} · ${me.email} · organization ${org.slug}\n`));

      const results: PackageResult[] = [];
      for (const p of pkgs) {
        const [r] = await runPackages([p], {
          client, org, enabled, space: opts.space, keep: opts.keep,
          onStart: (pkg, c) => { if (!opts.json) console.log(chalk.bold(`▶ ${pkg.name}`) + chalk.gray(`  ${pkg.title}  (space ${c.space}, package ${c.key})`)); },
          onStep: (_pkg, s) => {
            if (opts.json) return;
            if (s.skipped) console.log(chalk.gray(`  - ${s.it} (skipped)`));
            else if (s.knownBug?.state === 'still-failing') {
              console.log(`  ${chalk.yellow('!')} ${s.it} ${chalk.yellow('[KNOWN BACKEND BUG, fails as expected]')}\n      ${chalk.gray(s.knownBug.reason)}\n      ${chalk.gray(s.error || '')}`);
            } else if (s.knownBug?.state === 'now-passing') {
              console.log(`  ${chalk.green('✓')} ${s.it} ${chalk.cyan('[known bug now passes: the backend looks fixed; remove the knownBug marker]')}`);
            } else if (s.ok) console.log(`  ${chalk.green('✓')} ${s.it} ${chalk.gray(`${s.ms} ms`)}`);
            else {
              console.log(`  ${chalk.red('✗')} ${s.it}\n      ${chalk.red(s.error || 'failed')}`);
              if (s.detail !== undefined) console.log(chalk.gray(`      got: ${JSON.stringify(s.detail).slice(0, 600)}`));
            }
          },
        });
        if (!opts.json && r.status === 'skipped') console.log(chalk.yellow(`○ ${p.name} skipped: ${r.skipReason}`));
        results.push(r);
        if (opts.bail && r.status === 'failed') break;
      }

      if (opts.junit) await fs.writeFile(opts.junit, toJUnit(results));
      if (opts.json) printJson(results);
      else printSummary(results);
      if (results.some(r => r.status === 'failed')) process.exit(1);
    }));
}
