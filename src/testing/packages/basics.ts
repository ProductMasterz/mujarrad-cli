import { TestPackage } from '../types.js';

/** forge's starter package ("Hello app"), exactly as the Logic lens creates it. */
export const hello: TestPackage = {
  name: 'hello',
  title: "Forge's starter app: transform, decision, respond, endpoint auth",
  features: ['transform', 'decision', 'respond', 'endpoint trigger', 'auth: authenticated', 'manual run', 'run records'],
  app: {
    package: { key: 'hello', name: 'Hello app' },
    scopes: { spaces: ['__SPACE__'] },
    model: { enforcement: 'STRICT', types: [] },
    flows: [
      {
        key: 'say-hello',
        trigger: { kind: 'endpoint' },
        steps: [
          { id: 'greet', kind: 'transform', config: { set: { message: 'Hello ${input.name}' } } },
          { id: 'check', kind: 'decision', config: { expression: "input.name != null && input.name != ''" } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { message: '${state.message}' } } },
          { id: 'missing', kind: 'respond', config: { status: 400, body: { error: 'name is required' } } },
        ],
        wires: [
          { from: 'greet', to: 'check', on: 'success' },
          { from: 'check', to: 'ok', on: 'tag:true' },
          { from: 'check', to: 'missing', on: 'tag:false' },
        ],
      },
    ],
    endpoints: [{ method: 'GET', path: '/hello', flow: 'say-hello', auth: 'authenticated' }],
  },
  steps: [
    { it: 'the backend accepts the package as valid', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: 'GET /hello?name=Ada answers 200 with the greeting (decision true)', do: 'call', method: 'GET', path: '/hello?name=Ada',
      expect: { status: 200, body: { message: 'Hello Ada' }, runId: { $type: 'string' } } },
    { it: 'GET /hello without a name answers 400 (decision false)', do: 'call', method: 'GET', path: '/hello',
      expect: { status: 400, body: { error: 'name is required' } } },
    { it: 'an anonymous caller is refused on an authenticated endpoint (401)', do: 'call', method: 'GET', path: '/hello?name=Ada', anonymous: true,
      expect: { status: 401 } },
    { it: 'the flow runs manually with an input', do: 'run', flow: 'say-hello', input: { name: 'Grace' },
      expect: { status: 'SUCCEEDED', trigger: 'manual', response: { status: 200, body: { message: 'Hello Grace' } } } },
    { it: 'every call left a run record', do: 'runs',
      expect: { $minLen: 3, $some: { flow: 'say-hello', trigger: 'endpoint', status: 'SUCCEEDED' } } },
    { it: "the last run's trace lists the steps it took", do: 'getRun', id: '{{lastRunId}}',
      expect: { status: 'SUCCEEDED', trace: { $some: { step: 'greet' } } } },
  ],
};

/** Records of a model type through every fabric step, with each endpoint auth policy. */
export const records: TestPackage = {
  name: 'records',
  title: 'Model + fabric CRUD: create, get, query, update, delete with auth policies',
  features: ['model materialization', 'STRICT enforcement', 'fabric.create', 'fabric.get', 'fabric.query', 'fabric.update', 'fabric.delete',
    'calc', 'error wires', 'path params', 'auth: public', 'auth: space-viewer', 'auth: space-editor', 'auth: space-admin'],
  app: {
    package: { key: 'notes', name: 'Notes' },
    scopes: { spaces: ['__SPACE__'] },
    model: {
      enforcement: 'STRICT',
      types: [{
        key: 'Note', space: '__SPACE__',
        attributes: { title: { type: 'string', required: true }, body: { type: 'string' }, stars: { type: 'number' } },
      }],
    },
    flows: [
      {
        key: 'create-note', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'save', kind: 'fabric.create', out: 'note',
            config: { type: 'Note', title: '${input.title}', attributes: { title: '${input.title}', body: '${input.body}', stars: '${input.stars}' } } },
          { id: 'created', kind: 'respond', config: { status: 201, body: { id: '${state.note.id}', title: '${state.note.title}' } } },
          { id: 'refused', kind: 'respond', config: { status: 422, body: { error: 'note refused' } } },
        ],
        wires: [{ from: 'save', to: 'created', on: 'success' }, { from: 'save', to: 'refused', on: 'error' }],
      },
      {
        key: 'get-note', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'load', kind: 'fabric.get', out: 'note', config: { type: 'Note', id: '${input.id}' } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: '${state.note}' } },
          { id: 'missing', kind: 'respond', config: { status: 404, body: { error: 'no such note' } } },
        ],
        wires: [{ from: 'load', to: 'ok', on: 'success' }, { from: 'load', to: 'missing', on: 'error' }],
      },
      {
        key: 'list-notes', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'find', kind: 'fabric.query', out: 'items', config: { type: 'Note', where: {}, limit: 50 } },
          { id: 'count', kind: 'calc', config: { expression: 'size(state.items)', out: 'count' } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { count: '${state.count}', items: '${state.items}' } } },
        ],
        wires: [{ from: 'find', to: 'count' }, { from: 'count', to: 'ok' }],
      },
      {
        key: 'rate-note', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'change', kind: 'fabric.update', out: 'note', config: { type: 'Note', id: '${input.id}', attributes: { stars: '${input.stars}' } } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { id: '${state.note.id}', stars: '${state.note.stars}' } } },
          { id: 'missing', kind: 'respond', config: { status: 404, body: { error: 'no such note' } } },
        ],
        wires: [{ from: 'change', to: 'ok', on: 'success' }, { from: 'change', to: 'missing', on: 'error' }],
      },
      {
        key: 'delete-note', trigger: { kind: 'endpoint' },
        steps: [
          { id: 'remove', kind: 'fabric.delete', config: { type: 'Note', id: '${input.id}' } },
          { id: 'ok', kind: 'respond', config: { status: 200, body: { deleted: true } } },
          { id: 'missing', kind: 'respond', config: { status: 404, body: { error: 'no such note' } } },
        ],
        wires: [{ from: 'remove', to: 'ok', on: 'success' }, { from: 'remove', to: 'missing', on: 'error' }],
      },
    ],
    endpoints: [
      { method: 'POST', path: '/notes', flow: 'create-note', auth: 'authenticated' },
      { method: 'GET', path: '/notes/{id}', flow: 'get-note', auth: 'public' },
      { method: 'GET', path: '/notes', flow: 'list-notes', auth: 'space-viewer' },
      { method: 'PATCH', path: '/notes/{id}', flow: 'rate-note', auth: 'space-editor' },
      { method: 'DELETE', path: '/notes/{id}', flow: 'delete-note', auth: 'space-admin' },
    ],
  },
  steps: [
    { it: 'the backend accepts the package as valid', do: 'validate' },
    { it: 'deploying materializes the Note type', do: 'ship', save: { contextType: 'deployment.model.0.contextTypeId' } },
    { it: 'the deployment lists the created model type', do: 'deployment',
      expect: { activeRelease: 1, model: [{ type: 'Note', action: { $oneOf: ['created', 'kept', 'updated'] } }] } },
    { it: 'POST /notes creates a record (fabric.create, 201)', do: 'call', method: 'POST', path: '/notes',
      body: { title: 'First', body: 'hello', stars: 3 }, expect: { status: 201, body: { id: { $type: 'string' }, title: 'First' } },
      save: { note: 'body.id' } },
    { it: 'anyone reads it on the public endpoint (fabric.get, path param)', do: 'call', method: 'GET', path: '/notes/{{note}}', anonymous: true,
      expect: { status: 200, body: { id: '{{note}}', title: 'First', stars: 3 } } },
    { it: 'STRICT enforcement rejects a note without its required title: 422 naming the violation, and the run rolls back', do: 'call', method: 'POST', path: '/notes',
      body: { body: 'no title' }, expect: { status: 422, body: { error: 'SCHEMA_VALIDATION_FAILED', message: { $contains: 'title' }, runId: { $type: 'string' } } } },
    { it: "the failed run's record names the schema error", do: 'getRun', id: '{{lastRunId}}',
      expect: { status: 'FAILED', error: { $contains: 'SCHEMA_VALIDATION_FAILED' } } },
    { it: 'PATCH needs space-editor: anonymous is refused (401)', do: 'call', method: 'PATCH', path: '/notes/{{note}}', anonymous: true,
      body: { stars: 5 }, expect: { status: 401 } },
    { it: 'the owner updates it (fabric.update)', do: 'call', method: 'PATCH', path: '/notes/{{note}}', body: { stars: 5 },
      expect: { status: 200, body: { id: '{{note}}', stars: 5 } } },
    { it: 'the change is stored', do: 'call', method: 'GET', path: '/notes/{{note}}', expect: { status: 200, body: { stars: 5 } } },
    { it: 'the space-viewer list endpoint finds only it, so the rejected write left nothing (fabric.query + calc)', do: 'call', method: 'GET', path: '/notes',
      expect: { status: 200, body: { count: 1, items: [{ id: '{{note}}', title: 'First' }] } } },
    { it: 'space-viewer refuses anonymous callers (401)', do: 'call', method: 'GET', path: '/notes', anonymous: true, expect: { status: 401 } },
    { it: 'the space-admin endpoint deletes it (fabric.delete)', do: 'call', method: 'DELETE', path: '/notes/{{note}}',
      expect: { status: 200, body: { deleted: true } } },
    { it: 'a deleted note reads as 404 through the error wire', do: 'call', method: 'GET', path: '/notes/{{note}}', anonymous: true,
      expect: { status: 404, body: { error: 'no such note' } } },
    { it: 'the list is empty again', do: 'call', method: 'GET', path: '/notes', expect: { status: 200, body: { count: 0 } } },
    { it: 'updating an unknown id answers 404', do: 'call', method: 'PATCH', path: '/notes/00000000-0000-0000-0000-000000000000',
      body: { stars: 1 }, expect: { status: 404 } },
  ],
};

/** validate, calc, two parallel branches joined, then a decision. */
export const branching: TestPackage = {
  name: 'branching',
  title: 'validate, calc, parallel branches with join, decision',
  features: ['validate', 'calc', 'join', 'decision', 'parallel branches', 'error wires'],
  app: {
    package: { key: 'quote', name: 'Quote' },
    scopes: { spaces: ['__SPACE__'] },
    model: { enforcement: 'STRICT', types: [] },
    flows: [{
      key: 'quote', trigger: { kind: 'endpoint' },
      steps: [
        { id: 'read', kind: 'transform', config: { set: { qty: '${input.qty}', price: '${input.price}' } } },
        { id: 'check', kind: 'validate', config: { schema: { qty: { type: 'number', required: true }, price: { type: 'number', required: true } } } },
        { id: 'bad', kind: 'respond', config: { status: 400, body: { error: 'qty and price are required numbers' } } },
        { id: 'subtotal', kind: 'calc', config: { expression: 'state.qty * state.price', out: 'subtotal' } },
        { id: 'tax', kind: 'calc', config: { expression: 'state.qty * state.price / 10', out: 'tax' } },
        { id: 'both', kind: 'join', config: {} },
        { id: 'total', kind: 'calc', config: { expression: 'state.subtotal + state.tax', out: 'total' } },
        { id: 'big', kind: 'decision', config: { expression: 'state.total >= 100' } },
        { id: 'large', kind: 'respond', config: { status: 200, body: { tier: 'large', subtotal: '${state.subtotal}', tax: '${state.tax}', total: '${state.total}' } } },
        { id: 'small', kind: 'respond', config: { status: 200, body: { tier: 'small', total: '${state.total}' } } },
      ],
      wires: [
        { from: 'read', to: 'check', on: 'success' },
        { from: 'check', to: 'bad', on: 'error' },
        { from: 'check', to: 'subtotal', on: 'success' },
        { from: 'check', to: 'tax', on: 'success' },
        { from: 'subtotal', to: 'both', on: 'success' },
        { from: 'tax', to: 'both', on: 'success' },
        { from: 'both', to: 'total', on: 'success' },
        { from: 'total', to: 'big', on: 'success' },
        { from: 'big', to: 'large', on: 'tag:true' },
        { from: 'big', to: 'small', on: 'tag:false' },
      ],
    }],
    endpoints: [{ method: 'POST', path: '/quote', flow: 'quote', auth: 'authenticated' }],
  },
  steps: [
    { it: 'the backend accepts the package as valid', do: 'validate' },
    { it: 'it is saved, released and deployed', do: 'ship' },
    { it: 'both branches run, join waits for them, decision true (large)', do: 'call', method: 'POST', path: '/quote',
      body: { qty: 10, price: 20 }, expect: { status: 200, body: { tier: 'large', subtotal: 200, tax: 20, total: 220 } }, save: { largeRun: 'runId' } },
    { it: 'decision false (small)', do: 'call', method: 'POST', path: '/quote',
      body: { qty: 2, price: 5 }, expect: { status: 200, body: { tier: 'small', total: 11 } } },
    { it: 'validate fails over to the error wire (400)', do: 'call', method: 'POST', path: '/quote',
      body: { qty: 'many' }, expect: { status: 400, body: { error: { $contains: 'required' } } } },
    { it: 'the trace shows both branches and the join', do: 'getRun', id: '{{largeRun}}',
      expect: { trace: { $some: { step: 'both' } }, 'trace.length': { $gte: 7 } } },
  ],
};
