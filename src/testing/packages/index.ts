import { TestPackage } from '../types.js';
import { hello, records, branching } from './basics.js';
import { subflows, links, events, lifecycle, validator, expenses, schedule } from './advanced.js';

/** Built-in test packages, in the order `mujarrad test run` runs them. */
export const BUILTIN_PACKAGES: TestPackage[] = [hello, records, branching, subflows, links, events, lifecycle, validator, expenses, schedule];

export function findPackage(name: string): TestPackage | undefined {
  return BUILTIN_PACKAGES.find(p => p.name === name);
}
