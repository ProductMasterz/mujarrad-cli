/**
 * Test packages: declarative suites that build an App Package (model, flows, endpoints) the way
 * forge's Logic lens does, ship it to a live backend, call it, and assert the results.
 *
 * In step fields, `{{name}}` is replaced by a variable: `space`, `org`, `orgSlug`, `key`,
 * `release`, `lastRunId`, and whatever earlier steps saved with `save`. A string that is exactly
 * one `{{name}}` keeps the variable's type. App documents use `__SPACE__` for the space slug and
 * keep their own `${...}` templates untouched.
 */

/** Optional capabilities a test package needs from the backend; skipped unless enabled. */
export type Requirement = 'agent' | 'http' | 'slow';

export interface TestPackage {
  name: string;
  title: string;
  /** Logic-tier features this package proves, for the coverage table. */
  features: string[];
  requires?: Requirement[];
  /** The App Package under test. `package.key` is replaced with a unique key per run. */
  app: any;
  steps: TestStep[];
}

/** Partial match: plain values compare equal; objects match key by key; `$` keys are matchers. */
export type Expectation = any;

interface BaseStep {
  /** What the step proves, printed on PASS/FAIL. */
  it: string;
  /** Variables to save from the step's result, as dot paths (e.g. {"payment": "body.payment"}). */
  save?: Record<string, string>;
  /**
   * Marks a guard for a known backend bug: the step asserts the CORRECT behaviour and is expected
   * to fail until the backend is fixed. Its failure is reported as a known bug and does not fail
   * the package or stop later steps; when it starts passing, the report says the marker can go.
   */
  knownBug?: string;
}

export type TestStep = BaseStep & (
  | { do: 'validate'; app?: any; stored?: boolean; expect?: Expectation }
  | { do: 'push'; expect?: Expectation }
  | { do: 'release'; note?: string; expect?: Expectation }
  | { do: 'deploy'; release?: number | string; expect?: Expectation }
  | { do: 'ship' }
  | { do: 'rollback'; release?: number | string; expect?: Expectation }
  | { do: 'deployment'; expect?: Expectation }
  | { do: 'releases'; expect?: Expectation }
  | { do: 'versions'; expect?: Expectation }
  /** Change the working app document: dot paths to new values (`null` deletes). */
  | { do: 'edit'; set: Record<string, unknown> }
  | { do: 'call'; method: string; path: string; body?: unknown; anonymous?: boolean; expect?: Expectation }
  | { do: 'run'; flow: string; input?: unknown; dryRun?: boolean; draft?: boolean; expect?: Expectation }
  | { do: 'runs'; expect?: Expectation }
  | { do: 'getRun'; id: string; expect?: Expectation }
  /** Poll run records until one matches, e.g. a node-event or schedule run. */
  | { do: 'waitForRun'; match: Expectation; timeoutMs?: number }
  /** Create a record of a model type through the normal node API, outside the app. */
  | { do: 'createRecord'; type: string; title: string; attributes?: Record<string, unknown>; expect?: Expectation }
  | { do: 'sleep'; ms: number }
);

export interface StepResult {
  it: string;
  do: string;
  ok: boolean;
  skipped?: boolean;
  ms: number;
  error?: string;
  detail?: unknown;
  /** Set on a knownBug step: 'still-failing' (expected) or 'now-passing' (bug fixed; drop the marker). */
  knownBug?: { reason: string; state: 'still-failing' | 'now-passing' };
}

export interface PackageResult {
  name: string;
  title: string;
  features: string[];
  status: 'passed' | 'failed' | 'skipped';
  skipReason?: string;
  space?: string;
  key?: string;
  ms: number;
  steps: StepResult[];
}
