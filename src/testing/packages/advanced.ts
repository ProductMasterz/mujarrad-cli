import { TestPackage } from '../types.js';

const scope = { spaces: ['__SPACE__'] };

/** split and repeat call other flows of the package. */
export const subflows: TestPackage = {
  name: 'subflows',
  title: 'split and repeat sub-flows',
  features: ['split', 'repeat', 'sub-flow results', 'manual trigger'],
  app: {
    package: { key: 'subflows', name: 'Sub-flows' },
    scopes: scope,
    model: { enforcement: 'STRICT', types: [] },
    flows: [
      {
        key: 'square', trigger: { kind: 'manual' },
        steps: [
          { id: 'sq', kind: 'calc', config: { expression: 'input.item * input.item', out: 'sq' } },
          { id: 'out', kind: 'respond', config: { status: 200, body: { n: '${input.item}', square: '${state.sq}', index: '${input.index}' } } },
        ],
        wires: [{ from: 'sq', to: 'out' }],
      },
      {
        key: 'tick', trigger: { kind: 'manual' },
        steps: [{ id: 'out', kind: 'respond', config: { status: 200, body: { tick: '${input.index}', label: '${input.label}' } } }],
        wires: [],
      },
      {
        key: 'squares', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'each', kind: 'split', out: 'squares', config: { items: '${input.items}', flow: 'square' } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { squares: '${state.squares}' } } },
        ],
        wires: [{ from: 'each', to: 'ok', on: 'success' }],
      },
      {
        key: 'ticks', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'loop', kind: 'repeat', out: 'ticks', config: { times: '${input.times}', flow: 'tick', input: { label: 'go' } } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { ticks: '${state.ticks}' } } },
        ],
        wires: [{ from: 'loop', to: 'ok', on: 'success' }],
      },
    ],
    endpoints: [
      { method: 'POST', path: '/squares', flow: 'squares', auth: 'authenticated' },
      { method: 'POST', path: '/ticks', flow: 'ticks', auth: 'authenticated' },
      { method: 'GET', path: '/ticks', flow: 'ticks', auth: 'authenticated' },
    ],
  },
  steps: [
    { it: 'the backend accepts the package as valid', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: 'split runs the sub-flow once per item and collects the results in order', do: 'call', method: 'POST', path: '/squares',
      body: { items: [1, 2, 3] },
      expect: { status: 200, body: { squares: [{ n: 1, square: 1, index: 0 }, { n: 2, square: 4, index: 1 }, { n: 3, square: 9, index: 2 }] } } },
    { it: 'split over an empty list gives an empty list', do: 'call', method: 'POST', path: '/squares', body: { items: [] },
      expect: { status: 200, body: { squares: { $len: 0 } } } },
    { it: 'repeat runs the sub-flow N times with its config input', do: 'call', method: 'POST', path: '/ticks', body: { times: 3 },
      expect: { status: 200, body: { ticks: [{ tick: 0, label: 'go' }, { tick: 1, label: 'go' }, { tick: 2, label: 'go' }] } } },
    { it: 'repeat refuses more than 100 iterations (the run fails)', do: 'call', method: 'POST', path: '/ticks', body: { times: 101 },
      expect: { status: 500 } },
    { it: 'a sub-flow runs on its own as a manual run', do: 'run', flow: 'square', input: { item: 7, index: 0 },
      expect: { status: 'SUCCEEDED', response: { body: { square: 49 } } } },
    { it: 'repeat driven by a query string (GET /ticks?times=3) runs 3 times', do: 'call', method: 'GET', path: '/ticks?times=3',
      knownBug: 'query-string values arrive as strings ("3"), so repeat.times is refused; the backend should coerce them (backend bug 4)',
      expect: { status: 200, body: { ticks: [{ tick: 0, label: 'go' }, { tick: 1, label: 'go' }, { tick: 2, label: 'go' }] } } },
  ],
};

/** fabric.link with a declared relationship, idempotent on a second call. */
export const links: TestPackage = {
  name: 'links',
  title: 'Relationships: fabric.link between two model types',
  features: ['model relationships', 'fabric.link', 'link idempotency'],
  app: {
    package: { key: 'library', name: 'Library' },
    scopes: scope,
    model: {
      enforcement: 'STRICT',
      types: [
        { key: 'Author', space: '__SPACE__', attributes: { name: { type: 'string', required: true } } },
        { key: 'Book', space: '__SPACE__', attributes: { title: { type: 'string', required: true } },
          relationships: [{ name: 'writtenBy', target: 'Author', cardinality: 'MANY_TO_ONE' }] },
      ],
    },
    flows: [{
      key: 'publish', trigger: { kind: 'endpoint' },
      steps: [
        { id: 'author', kind: 'fabric.create', out: 'author', config: { type: 'Author', title: '${input.author}', attributes: { name: '${input.author}' } } },
        { id: 'book', kind: 'fabric.create', out: 'book', config: { type: 'Book', title: '${input.title}', attributes: { title: '${input.title}' } } },
        { id: 'link', kind: 'fabric.link', out: 'link', config: { type: 'Book', from: '${state.book.id}', name: 'writtenBy', to: '${state.author.id}' } },
        { id: 'again', kind: 'fabric.link', out: 'again', config: { type: 'Book', from: '${state.book.id}', name: 'writtenBy', to: '${state.author.id}' } },
        { id: 'ok', kind: 'respond', config: { status: 201, body: { book: '${state.book.id}', author: '${state.author.id}', created: '${state.link.created}', again: '${state.again.created}', name: '${state.link.name}' } } },
      ],
      wires: [
        { from: 'author', to: 'book' }, { from: 'book', to: 'link' }, { from: 'link', to: 'again' }, { from: 'again', to: 'ok' },
      ],
    }],
    endpoints: [{ method: 'POST', path: '/books', flow: 'publish', auth: 'authenticated' }],
  },
  steps: [
    { it: 'the backend accepts the package as valid', do: 'validate' },
    { it: 'deploying creates both types and the relationship', do: 'ship' },
    { it: 'the link is created once; linking again is a no-op', do: 'call', method: 'POST', path: '/books',
      body: { title: 'Dune', author: 'Frank Herbert' },
      expect: { status: 201, body: { book: { $type: 'string' }, author: { $type: 'string' }, created: true, again: false, name: 'writtenBy' } } },
    { it: 'the validator refuses a link over an undeclared relationship', do: 'edit',
      set: { 'flows.0.steps.2.config.name': 'illustratedBy' } },
    { it: '...so the edited package is invalid', do: 'validate', expect: { valid: false } },
  ],
};

/** node-event triggers fire on changes made outside the app, never on the app's own writes. */
export const events: TestPackage = {
  name: 'events',
  title: 'node-event trigger: runs on outside changes, loop-safe for its own writes',
  features: ['node-event trigger', 'trigger loop safety', 'service identity'],
  app: {
    package: { key: 'orders', name: 'Orders' },
    scopes: scope,
    model: {
      enforcement: 'STRICT',
      types: [
        { key: 'Order', space: '__SPACE__', attributes: { title: { type: 'string', required: true }, total: { type: 'number' } } },
        { key: 'Audit', space: '__SPACE__', attributes: { order: { type: 'string' }, event: { type: 'string' } } },
      ],
    },
    flows: [
      {
        key: 'audit-order', trigger: { kind: 'node-event', type: 'Order', on: 'created' },
        steps: [{ id: 'log', kind: 'fabric.create', config: { type: 'Audit', title: 'order created', attributes: { order: '${input.id}', event: '${input.event}' } } }],
        wires: [],
      },
      {
        key: 'place-order', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'save', kind: 'fabric.create', out: 'order', config: { type: 'Order', title: '${input.title}', attributes: { title: '${input.title}', total: '${input.total}' } } },
          { id: 'ok', kind: 'respond', config: { status: 201, body: { id: '${state.order.id}' } } },
        ],
        wires: [{ from: 'save', to: 'ok' }],
      },
      {
        key: 'audits', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'find', kind: 'fabric.query', out: 'items', config: { type: 'Audit', where: {}, limit: 50 } },
          { id: 'count', kind: 'calc', config: { expression: 'size(state.items)', out: 'count' } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { count: '${state.count}', items: '${state.items}' } } },
        ],
        wires: [{ from: 'find', to: 'count' }, { from: 'count', to: 'ok' }],
      },
    ],
    endpoints: [
      { method: 'POST', path: '/orders', flow: 'place-order', auth: 'authenticated' },
      { method: 'GET', path: '/audits', flow: 'audits', auth: 'authenticated' },
    ],
  },
  steps: [
    { it: 'the backend accepts the package as valid', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: "an order placed by the app's own flow is stored", do: 'call', method: 'POST', path: '/orders',
      body: { title: 'From the app', total: 10 }, expect: { status: 201 } },
    { it: '(give a trigger time to fire, if it wrongly would)', do: 'sleep', ms: 3000 },
    { it: "writes made by a logic run do not fire triggers (no loop)", do: 'call', method: 'GET', path: '/audits',
      expect: { status: 200, body: { count: 0 } } },
    { it: 'an order created outside the app through the node API', do: 'createRecord', type: 'Order', title: 'Imported',
      attributes: { title: 'Imported', total: 99 }, save: { orderId: 'id' } },
    { it: 'fires the node-event flow asynchronously', do: 'waitForRun', timeoutMs: 30000,
      match: { flow: 'audit-order', trigger: 'node-event', status: 'SUCCEEDED' } },
    { it: 'which wrote an audit record for that order', do: 'call', method: 'GET', path: '/audits',
      expect: { status: 200, body: { count: 1, items: [{ order: '{{orderId}}', event: 'created' }] } } },
  ],
};

/** Drafts, versions, releases, deploy, rollback, draft and dry runs. */
export const lifecycle: TestPackage = {
  name: 'lifecycle',
  title: 'Drafts, versions, hashed releases, deploy, rollback, draft and dry runs',
  features: ['draft versions', 'stored validation', 'release hashing', 'idempotent release', 'deploy', 'rollback', 'draft run', 'dry run rollback'],
  app: {
    package: { key: 'counter', name: 'Counter' },
    scopes: scope,
    model: { enforcement: 'STRICT', types: [{ key: 'Tick', space: '__SPACE__', attributes: { label: { type: 'string', required: true } } }] },
    flows: [
      {
        key: 'version', trigger: { kind: 'endpoint' },
        steps: [{ id: 'say', kind: 'respond', config: { status: 200, body: { version: 'v1' } } }], wires: [],
      },
      {
        key: 'add', trigger: { kind: 'manual' },
        steps: [
          { id: 'save', kind: 'fabric.create', out: 'tick', config: { type: 'Tick', title: '${input.label}', attributes: { label: '${input.label}' } } },
          { id: 'ok', kind: 'respond', config: { status: 201, body: { id: '${state.tick.id}' } } },
        ],
        wires: [{ from: 'save', to: 'ok' }],
      },
      {
        key: 'count', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'find', kind: 'fabric.query', out: 'items', config: { type: 'Tick', where: {}, limit: 50 } },
          { id: 'n', kind: 'calc', config: { expression: 'size(state.items)', out: 'count' } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { count: '${state.count}' } } },
        ],
        wires: [{ from: 'find', to: 'n' }, { from: 'n', to: 'ok' }],
      },
    ],
    endpoints: [
      { method: 'GET', path: '/version', flow: 'version', auth: 'authenticated' },
      { method: 'GET', path: '/count', flow: 'count', auth: 'authenticated' },
    ],
  },
  steps: [
    { it: 'the draft is saved', do: 'push' },
    { it: 'it has one version', do: 'versions', expect: { $len: 1 } },
    { it: 'the stored draft validates on the server', do: 'validate', stored: true },
    { it: 'release 1 is published with a SHA-256', do: 'release', expect: { release: 1, sha256: { $match: '^[0-9a-f]{64}$' } } },
    { it: 'publishing unchanged content is idempotent', do: 'release', expect: { release: 1 } },
    { it: 'release 1 is deployed', do: 'deploy', release: 1, expect: { activeRelease: 1 } },
    { it: 'the endpoint serves v1', do: 'call', method: 'GET', path: '/version', expect: { status: 200, body: { version: 'v1' } } },
    { it: 'the draft is edited to v2', do: 'edit', set: { 'flows.0.steps.0.config.body.version': 'v2' } },
    { it: 'and saved as a second version', do: 'push' },
    { it: 'the draft history has two versions', do: 'versions', expect: { $len: 2 } },
    { it: 'the live endpoint still serves the deployed v1', do: 'call', method: 'GET', path: '/version', expect: { status: 200, body: { version: 'v1' } } },
    { it: 'a draft run already sees v2', do: 'run', flow: 'version', draft: true,
      expect: { status: 'SUCCEEDED', source: { $contains: 'draft' }, response: { body: { version: 'v2' } } } },
    { it: 'release 2 is published', do: 'release', expect: { release: 2 } },
    { it: 'and deployed', do: 'deploy', release: 2, expect: { activeRelease: 2 } },
    { it: 'the endpoint now serves v2', do: 'call', method: 'GET', path: '/version', expect: { status: 200, body: { version: 'v2' } } },
    { it: 'rolling back returns to release 1', do: 'rollback', expect: { activeRelease: 1 } },
    { it: 'the endpoint serves v1 again', do: 'call', method: 'GET', path: '/version', expect: { status: 200, body: { version: 'v1' } } },
    { it: 'both releases are listed with verified integrity', do: 'releases',
      expect: { $len: 2, $every: { integrity: 'verified', sha256: { $match: '^[0-9a-f]{64}$' } } } },
    { it: 'a dry run succeeds', do: 'run', flow: 'add', input: { label: 'dry' }, dryRun: true, expect: { status: 'SUCCEEDED', dryRun: true } },
    { it: '...but rolls back its write', do: 'call', method: 'GET', path: '/count', expect: { status: 200, body: { count: 0 } } },
    { it: 'a real manual run writes', do: 'run', flow: 'add', input: { label: 'real' }, expect: { status: 'SUCCEEDED', response: { status: 201 } } },
    { it: '...and the record is there', do: 'call', method: 'GET', path: '/count', expect: { status: 200, body: { count: 1 } } },
    { it: 'runs record manual, dry and endpoint triggers', do: 'runs',
      expect: { $some: { trigger: 'manual', dryRun: true }, $minLen: 6 } },
  ],
};

/** The rules the validator ports from Abstract-Logic, plus wait and limits. */
export const validator: TestPackage = {
  name: 'validator',
  title: 'Graph rules and limits the validator enforces; wait step',
  features: ['validator: one entry step', 'validator: reachability', 'validator: cycles', 'validator: decision wires', 'validator: join inputs',
    'validator: unknown sub-flow', 'validator: JEXL sandbox', 'wait'],
  app: {
    package: { key: 'rules', name: 'Rules' },
    scopes: scope,
    model: { enforcement: 'STRICT', types: [] },
    flows: [{
      key: 'pause', trigger: { kind: 'endpoint' },
      steps: [
        { id: 'nap', kind: 'wait', config: { seconds: 1 } },
        { id: 'ok', kind: 'respond', config: { status: 200, body: { woke: true } } },
      ],
      wires: [{ from: 'nap', to: 'ok' }],
    }],
    endpoints: [{ method: 'GET', path: '/pause', flow: 'pause', auth: 'authenticated' }],
  },
  steps: [
    { it: 'the base package is valid', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: 'wait pauses inside the run (about 1 s)', do: 'call', method: 'GET', path: '/pause',
      expect: { status: 200, body: { woke: true }, ms: { $gte: 900 } } },
    { it: 'waits longer than 10 s are refused', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [{ id: 'nap', kind: 'wait', config: { seconds: 60 } }], wires: [] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'two entry steps are refused', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [
          { id: 'a', kind: 'transform', config: { set: { x: 1 } } }, { id: 'b', kind: 'transform', config: { set: { y: 1 } } }], wires: [] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'a cycle is refused (loops need repeat or split)', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [
          { id: 'start', kind: 'transform', config: { set: { x: 1 } } },
          { id: 'a', kind: 'transform', config: { set: { x: 1 } } }, { id: 'b', kind: 'transform', config: { set: { y: 1 } } }],
          wires: [{ from: 'start', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'a decision must wire both tag:true and tag:false', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [
          { id: 'd', kind: 'decision', config: { expression: 'true' } }, { id: 'y', kind: 'respond', config: { status: 200 } }],
          wires: [{ from: 'd', to: 'y', on: 'tag:true' }] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'a join needs at least two inputs', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [
          { id: 'a', kind: 'transform', config: { set: { x: 1 } } }, { id: 'j', kind: 'join', config: {} }],
          wires: [{ from: 'a', to: 'j' }] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'a split calling an unknown flow is refused', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [
          { id: 's', kind: 'split', config: { items: '${input.items}', flow: 'nope' } }], wires: [] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'JEXL that calls methods is refused by the sandbox', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] },
        flows: [{ key: 'f', trigger: { kind: 'endpoint' }, steps: [
          { id: 'd', kind: 'decision', config: { expression: "''.getClass().forName('java.lang.Runtime') != null" } },
          { id: 'y', kind: 'respond', config: { status: 200 } }, { id: 'n', kind: 'respond', config: { status: 400 } }],
          wires: [{ from: 'd', to: 'y', on: 'tag:true' }, { from: 'd', to: 'n', on: 'tag:false' }] }], endpoints: [] },
      expect: { valid: false } },
    { it: 'an endpoint pointing at an unknown flow is refused', do: 'validate',
      app: { package: { key: 'x' }, scopes: scope, model: { types: [] }, flows: [],
        endpoints: [{ method: 'GET', path: '/x', flow: 'ghost', auth: 'public' }] },
      expect: { valid: false } },
  ],
};

/** The backend's reference sample app: an Abstract-Logic program exported to an App Package. Needs an agent executor. */
export const expenses: TestPackage = {
  name: 'expenses',
  title: 'Expense approval (Abstract-Logic sample) with a delegated agent step',
  features: ['agent', 'agent tags', 'Abstract-Logic export'],
  requires: ['agent'],
  app: {
    package: { key: 'expenses', name: 'Expense approval' },
    scopes: scope,
    model: {
      types: [
        { space: '__SPACE__', key: 'Payment', attributes: { title: { type: 'string', required: true }, amount: { type: 'number', required: true }, status: { type: 'string' } } },
      ],
    },
    flows: [
      {
        key: 'main', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'read-claim', kind: 'transform', config: { set: { title: '${input.title}', amount: '${input.amount}' } } },
          { id: 'check-claim', kind: 'validate', config: { schema: { title: { type: 'string', required: true }, amount: { type: 'number', required: true } } } },
          { id: 'bad-claim', kind: 'respond', config: { status: 400, body: { error: 'title and a numeric amount are required' } } },
          { id: 'review', kind: 'agent', config: { instructions: 'Review the expense claim ${input.title} for ${input.amount}. Answer with tag approve if it is a normal business expense, otherwise tag reject.' } },
          { id: 'rejected', kind: 'respond', config: { status: 422, body: { status: 'rejected', reason: '${state.review.reason}' } } },
          { id: 'under-limit', kind: 'decision', config: { expression: 'state.amount < 100' } },
          { id: 'pay', kind: 'fabric.create', out: 'payment', config: { type: 'Payment', title: '${state.title}', attributes: { title: '${state.title}', amount: '${state.amount}', status: 'paid' } } },
          { id: 'paid', kind: 'respond', config: { status: 201, body: { status: 'paid', payment: '${state.payment.id}' } } },
          { id: 'escalate', kind: 'fabric.create', out: 'payment', config: { type: 'Payment', title: '${state.title}', attributes: { title: '${state.title}', amount: '${state.amount}', status: 'needs-manager' } } },
          { id: 'held', kind: 'respond', config: { status: 202, body: { status: 'needs-manager', payment: '${state.payment.id}' } } },
        ],
        wires: [
          { from: 'read-claim', to: 'check-claim', on: 'success' },
          { from: 'check-claim', to: 'review', on: 'success' },
          { from: 'check-claim', to: 'bad-claim', on: 'error' },
          { from: 'review', to: 'under-limit', on: 'tag:approve' },
          { from: 'review', to: 'rejected', on: 'tag:reject' },
          { from: 'under-limit', to: 'pay', on: 'tag:true' },
          { from: 'under-limit', to: 'escalate', on: 'tag:false' },
          { from: 'pay', to: 'paid', on: 'success' },
          { from: 'escalate', to: 'held', on: 'success' },
        ],
      },
    ],
    endpoints: [{ method: 'POST', path: '/claims', flow: 'main', auth: 'authenticated' }],
  },
  steps: [
    { it: 'the exported package is valid', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: 'small claim: agent approves, under the limit, paid (201)', do: 'call', method: 'POST', path: '/claims',
      body: { title: 'Taxi', amount: 42 }, expect: { status: 201, body: { status: 'paid', payment: { $type: 'string' } } } },
    { it: 'large claim: held for a manager (202)', do: 'call', method: 'POST', path: '/claims',
      body: { title: 'Laptop', amount: 1500 }, expect: { status: 202, body: { status: 'needs-manager' } } },
    { it: "agent rejection comes back with the agent's reason (422)", do: 'call', method: 'POST', path: '/claims',
      body: { title: 'Casino night', amount: 30 }, expect: { status: 422, body: { status: 'rejected', reason: { $type: 'string' } } } },
    { it: 'an incomplete claim is refused by the validate step (400)', do: 'call', method: 'POST', path: '/claims',
      body: { title: 'No amount' }, expect: { status: 400 } },
  ],
};

/** A schedule trigger fires within a minute of deploy. Slow, and it undeploys the schedule at the end. */
export const schedule: TestPackage = {
  name: 'schedule',
  title: 'schedule trigger (6-field cron, UTC)',
  features: ['schedule trigger'],
  requires: ['slow'],
  app: {
    package: { key: 'cron', name: 'Cron' },
    scopes: scope,
    model: { enforcement: 'STRICT', types: [] },
    flows: [{
      key: 'beat', trigger: { kind: 'schedule', cron: '*/15 * * * * *' },
      steps: [{ id: 'mark', kind: 'transform', config: { set: { at: '${input.firedAt}' } } }], wires: [],
    }],
    endpoints: [],
  },
  steps: [
    { it: 'the backend accepts the cron expression', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: 'the scheduler fires the flow (checks every 30 s)', do: 'waitForRun', timeoutMs: 90000,
      match: { flow: 'beat', trigger: 'schedule', status: 'SUCCEEDED' } },
    { it: 'the schedule is switched off again (manual trigger)', do: 'edit', set: { 'flows.0.trigger': { kind: 'manual' } } },
    { it: '...and that release is deployed', do: 'ship' },
  ],
};
