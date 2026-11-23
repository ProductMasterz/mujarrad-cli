import { Command } from 'commander';
import chalk from 'chalk';
import { requireClient } from '../api/session.js';
import { action, addApiOptions, ApiCommandOptions, orgRef, printJson, printTable } from './common.js';

/** `mujarrad orgs` and `mujarrad spaces`: the organizations and spaces of the signed-in user. */
export function orgsCommand(program: Command): void {
  const orgs = program.command('orgs').description('Organizations you belong to');

  addApiOptions(orgs.command('list').alias('ls').description('List your organizations'))
    .action(action(async (opts: ApiCommandOptions) => {
      const client = await requireClient(opts);
      printTable(await client.listOrganizations() as any, ['id', 'slug', 'name', 'type'], opts.json);
    }));

  addApiOptions(orgs.command('create <name>').description('Create an organization').option('--slug <slug>', 'Organization slug'))
    .action(action(async (name: string, opts: ApiCommandOptions & { slug?: string }) => {
      const client = await requireClient(opts);
      const org = await client.createOrganization(name, opts.slug);
      if (opts.json) return printJson(org);
      console.log(chalk.green(`✓ Created organization ${org.slug} (${org.id})`));
    }));
}

export function spacesCommand(program: Command): void {
  const spaces = program.command('spaces').description('Spaces (where nodes and app data live)');

  addApiOptions(spaces.command('list').alias('ls').description('List spaces you can access'), { org: true })
    .option('--all', 'All spaces, not only those of the organization')
    .action(action(async (opts: ApiCommandOptions & { all?: boolean }) => {
      const client = await requireClient(opts);
      const orgId = opts.all ? undefined : (await client.resolveOrganization(orgRef(opts))).id;
      printTable(await client.listSpaces(orgId) as any, ['id', 'slug', 'name', 'projectType'], opts.json);
    }));

  addApiOptions(spaces.command('create <slug>').description('Create a space in an organization'), { org: true })
    .option('--name <name>', 'Display name (default: the slug)')
    .option('--type <projectType>', 'Project type; app data needs BACKEND', 'BACKEND')
    .action(action(async (slug: string, opts: ApiCommandOptions & { name?: string; type: string }) => {
      const client = await requireClient(opts);
      const org = await client.resolveOrganization(orgRef(opts));
      const space = await client.createSpace({ name: opts.name || slug, slug, projectType: opts.type, organizationId: org.id });
      if (opts.json) return printJson(space);
      console.log(chalk.green(`✓ Created ${opts.type} space ${space.slug} in ${org.slug}`));
    }));

  addApiOptions(spaces.command('get <slug>').description('Show a space'))
    .action(action(async (slug: string, opts: ApiCommandOptions) => {
      const client = await requireClient(opts);
      printJson(await client.getSpaceBySlug(slug));
    }));
}
