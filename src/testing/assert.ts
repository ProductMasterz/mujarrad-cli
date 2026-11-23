/** Assertion and templating helpers for test packages. Pure functions, unit tested. */

/** Reads a dot path (`body.items.0.id`) from a value. */
export function getPath(value: any, path: string): any {
  if (!path) return value;
  let cur = value;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[Array.isArray(cur) && /^\d+$/.test(part) ? Number(part) : part];
  }
  return cur;
}

/** Sets a dot path in place, creating objects on the way; `null` deletes the key. */
export function setPath(target: any, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = Array.isArray(cur) ? Number(parts[i]) : parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[p];
  }
  const last = Array.isArray(cur) ? Number(parts[parts.length - 1]) : parts[parts.length - 1];
  if (value === null) {
    if (Array.isArray(cur)) cur.splice(last as number, 1);
    else delete cur[last];
  } else {
    cur[last] = value;
  }
}

const WHOLE = /^\{\{\s*([\w.]+)\s*\}\}$/;
const ANY = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Replaces `{{name}}` with variables, deeply. A string that is exactly one template keeps the type. */
export function interpolate<T>(value: T, vars: Record<string, unknown>): T {
  if (typeof value === 'string') {
    const whole = value.match(WHOLE);
    if (whole) {
      const v = getPath(vars, whole[1]);
      if (v === undefined) throw new Error(`unknown variable {{${whole[1]}}}`);
      return v as any;
    }
    return value.replace(ANY, (_m, name) => {
      const v = getPath(vars, name);
      if (v === undefined) throw new Error(`unknown variable {{${name}}}`);
      return typeof v === 'object' ? JSON.stringify(v) : String(v);
    }) as any;
  }
  if (Array.isArray(value)) return value.map(v => interpolate(v, vars)) as any;
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = interpolate(v, vars);
    return out;
  }
  return value;
}

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

const short = (v: unknown) => {
  const s = JSON.stringify(v);
  return s === undefined ? 'undefined' : s.length > 200 ? s.slice(0, 200) + '…' : s;
};

/**
 * Checks `actual` against `expected` and returns the mismatches (empty when it matches).
 *
 * - Plain values must be equal (numbers compare by value, so 42 matches 42.0).
 * - Objects match key by key; keys not mentioned are ignored. A key may be a dot path.
 * - Arrays must have the same length and match element by element.
 * - Matchers: {$exists: bool}, {$eq}, {$ne}, {$gt}, {$gte}, {$lt}, {$lte}, {$contains: value|substring},
 *   {$len: n}, {$minLen: n}, {$type: 'string'|'number'|'object'|'array'|...}, {$match: 'regex'},
 *   {$oneOf: [...]}, {$every: expectation} (each array element), {$some: expectation}.
 */
export function match(actual: unknown, expected: unknown, path = '$'): string[] {
  if (expected !== null && typeof expected === 'object' && !Array.isArray(expected)) {
    const keys = Object.keys(expected as object);
    if (keys.length && keys.every(k => k.startsWith('$'))) return matchOps(actual, expected as Record<string, any>, path);
    if (actual === null || typeof actual !== 'object') return [`${path}: expected an object, got ${short(actual)}`];
    const errors: string[] = [];
    for (const k of keys) {
      const v = k.includes('.') ? getPath(actual, k) : (actual as any)[k];
      errors.push(...match(v, (expected as any)[k], `${path}.${k}`));
    }
    return errors;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${path}: expected an array, got ${short(actual)}`];
    if (actual.length !== expected.length) return [`${path}: expected ${expected.length} items, got ${actual.length}: ${short(actual)}`];
    return expected.flatMap((e, i) => match(actual[i], e, `${path}[${i}]`));
  }
  if (typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(actual - expected) < 1e-9 ? [] : [`${path}: expected ${expected}, got ${actual}`];
  }
  return actual === expected ? [] : [`${path}: expected ${short(expected)}, got ${short(actual)}`];
}

function matchOps(actual: any, ops: Record<string, any>, path: string): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(`${path}: ${msg}, got ${short(actual)}`);
  for (const [op, want] of Object.entries(ops)) {
    switch (op) {
      case '$exists':
        if ((actual !== undefined && actual !== null) !== Boolean(want)) fail(want ? 'expected a value' : 'expected no value');
        break;
      case '$eq': errors.push(...match(actual, want, path)); break;
      case '$ne': if (!match(actual, want, path).length) fail(`expected anything but ${short(want)}`); break;
      case '$gt': if (!(typeof actual === 'number' && actual > want)) fail(`expected > ${want}`); break;
      case '$gte': if (!(typeof actual === 'number' && actual >= want)) fail(`expected >= ${want}`); break;
      case '$lt': if (!(typeof actual === 'number' && actual < want)) fail(`expected < ${want}`); break;
      case '$lte': if (!(typeof actual === 'number' && actual <= want)) fail(`expected <= ${want}`); break;
      case '$len': if (!(actual != null && actual.length === want)) fail(`expected length ${want}`); break;
      case '$minLen': if (!(actual != null && actual.length >= want)) fail(`expected length >= ${want}`); break;
      case '$type': if (typeOf(actual) !== want) fail(`expected type ${want}`); break;
      case '$match': if (!(typeof actual === 'string' && new RegExp(want).test(actual))) fail(`expected to match /${want}/`); break;
      case '$oneOf': if (!(want as any[]).some(w => !match(actual, w, path).length)) fail(`expected one of ${short(want)}`); break;
      case '$contains':
        if (typeof actual === 'string') {
          if (!actual.includes(String(want))) fail(`expected to contain ${short(want)}`);
        } else if (Array.isArray(actual)) {
          if (!actual.some(a => !match(a, want, path).length)) fail(`expected an item matching ${short(want)}`);
        } else if (actual && typeof actual === 'object') {
          errors.push(...match(actual, want, path));
        } else fail(`expected to contain ${short(want)}`);
        break;
      case '$every':
        if (!Array.isArray(actual)) fail('expected an array');
        else actual.forEach((a, i) => errors.push(...match(a, want, `${path}[${i}]`)));
        break;
      case '$some':
        if (!Array.isArray(actual) || !actual.some(a => !match(a, want, path).length)) fail(`expected some item matching ${short(want)}`);
        break;
      default:
        errors.push(`${path}: unknown matcher ${op}`);
    }
  }
  return errors;
}
