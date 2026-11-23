import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import { ApiError } from '../api/client.js';

/** Global options every API command accepts. */
export interface ApiCommandOptions {
  apiUrl?: string;
  json?: boolean;
  org?: string;
}

export function addApiOptions(cmd: Command, { org = false } = {}): Command {
  cmd.option('--api-url <url>', 'Backend base URL (default: MUJARRAD_API_BASE_URL or config)');
  cmd.option('--json', 'Print machine-readable JSON');
  if (org) cmd.option('--org <id|slug>', 'Organization (default: MUJARRAD_ORG or your first organization)');
  return cmd;
}

export function orgRef(opts: ApiCommandOptions): string | undefined {
  return opts.org || process.env.MUJARRAD_ORG || undefined;
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

/** Prints a list as JSON or as aligned columns. */
export function printTable(rows: Record<string, unknown>[], columns: string[], json?: boolean): void {
  if (json) return printJson(rows);
  if (!rows.length) {
    console.log(chalk.gray('(none)'));
    return;
  }
  const cell = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const widths = columns.map(c => Math.max(c.length, ...rows.map(r => cell(r[c]).length)));
  console.log(chalk.bold(columns.map((c, i) => c.padEnd(widths[i])).join('  ')));
  for (const r of rows) console.log(columns.map((c, i) => cell(r[c]).padEnd(widths[i])).join('  '));
}

export async function readJsonFile(path: string): Promise<any> {
  const text = await fs.readFile(path, 'utf-8');
  try {
    return JSON.parse(text);
  } catch (e: any) {
    throw new Error(`${path} is not valid JSON: ${e.message}`);
  }
}

/** Parses a JSON argument, or reads it from a file when it starts with @. */
export async function jsonArg(value: string | undefined, fallback: unknown = {}): Promise<any> {
  if (value == null || value === '') return fallback;
  if (value.startsWith('@')) return readJsonFile(value.slice(1));
  try {
    return JSON.parse(value);
  } catch (e: any) {
    throw new Error(`not valid JSON: ${value} (${e.message})`);
  }
}

/** Runs a command action, printing errors (with the API's validation issues) and exiting 1. */
export function action<A extends any[]>(fn: (...args: A) => Promise<void>): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await fn(...args);
    } catch (error: any) {
      console.error(chalk.red('✗'), error.message);
      if (error instanceof ApiError && error.body && typeof error.body === 'object') {
        const issues = (error.body as any).issues;
        if (Array.isArray(issues)) {
          for (const i of issues) console.error(chalk.gray(`  - ${i.path ?? ''}: ${i.message ?? i.code}`));
        }
      }
      process.exit(1);
    }
  };
}
