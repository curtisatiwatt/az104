import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudSync, CLOUD_KEYS } from '../cloud-sync.js';
import { defaultState, STORAGE_KEY } from '../core.js';
import { deriveKeys, decryptEnvelope, encryptEnvelope, newSyncKey } from '../sync-crypto.js';
import { emptyEnvelope, envelopeState } from '../sync-model.js';
import { questions } from '../data/questions.js';
import { lessons, weeks } from '../data/curriculum.js';
import { labs } from '../data/labs.js';

test('disconnect during AES-GCM decryption cannot apply a stale remote result', async t => {
  const f = fixture(t), a = f.client(), b = f.client();
  const key = await a.sync.create(); await b.sync.connect(key);
  a.change(state => { state.tasks[taskA] = true; }); await a.sync.sync();
  const entered = deferred(), release = deferred();
  const nativeDecrypt = crypto.subtle.decrypt.bind(crypto.subtle);
  t.mock.method(crypto.subtle, 'decrypt', async (...args) => {
    const plaintext = await nativeDecrypt(...args);
    entered.resolve(); await release.promise;
    return plaintext;
  });
  const pending = b.sync.sync(); await entered.promise;
  b.sync.disconnect();
  const state = copy(b.state), notifications = b.statuses.length;
  release.resolve(); await pending;
  assert.deepEqual(b.state, state);
  assert.equal(b.statuses.length, notifications);
  assert.equal(b.sync.info.status, 'local');
});

test('disposing during saved-key derivation cannot restart sync or install browser timers', async t => {
  const f = fixture(t, { browser: true }), a = f.client();
  await a.sync.create();
  const reloaded = f.client({ storage: a.storage });
  const entered = deferred(), release = deferred();
  const nativeDerive = crypto.subtle.deriveKey.bind(crypto.subtle);
  t.mock.method(crypto.subtle, 'deriveKey', async (...args) => {
    const key = await nativeDerive(...args);
    entered.resolve(); await release.promise;
    return key;
  });
  const starting = reloaded.sync.start(); await entered.promise;
  reloaded.sync.dispose();
  const calls = f.server.calls.length, notices = reloaded.statuses.length;
  release.resolve(); await starting;
  assert.equal(reloaded.sync.info.connected, false);
  assert.equal(f.server.calls.length, calls);
  assert.equal(reloaded.statuses.length, notices);
  await f.tick(60000);
  assert.equal(f.server.calls.length, calls);
});


const catalog = { questions, lessons, weeks, labs };
const copy = value => structuredClone(value);
const taskA = weeks[0].tasks[0].id;
const taskB = weeks[0].tasks[1].id;
const lessonA = lessons[0].id;
const question = questions[0];
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

// A transport-level CAS service: the real controller, merge model, HKDF, and
// AES-GCM all run. Hooks delay requests before the atomic revision comparison.
class CASService {
  constructor() {
    this.rows = new Map(); this.calls = []; this.gates = [];
    this.offline = false; this.forcedConflicts = 0; this.loseNextPostResponse = false;
    this.failNextGet = false; this.overrideGetPayload = null;
  }
  pauseNext(predicate) {
    const entered = deferred(), release = deferred();
    const gate = { predicate, entered: entered.promise, release: release.resolve, wait: release.promise, used: false };
    gate.signal = entered.resolve;
    this.gates.push(gate);
    return gate;
  }
  transport(label) {
    return async (url, options) => {
      const auth = options.headers.Authorization?.replace(/^Bearer /, '');
      const body = options.body ? JSON.parse(options.body) : undefined;
      const call = { label, method: options.method, auth, body: copy(body), url, cache: options.cache, credentials: options.credentials };
      this.calls.push(call);
      assert.equal(url, 'https://sync.example.test/v1/progress');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.credentials, 'omit');
      assert.match(auth, /^[A-Za-z0-9_-]{43}$/);
      const gate = this.gates.find(item => !item.used && item.predicate(call));
      if (gate) { gate.used = true; gate.signal(call); await gate.wait; }
      if (this.offline) throw new TypeError('network unavailable');
      if (options.method === 'GET' && this.failNextGet) { this.failNextGet = false; throw new TypeError('response lost'); }
      const row = this.rows.get(auth);
      if (options.method === 'POST') {
        if (row) return response(409, { error: 'already_exists' });
        const created = { payload: copy(body.payload), revision: 1, updatedAt: Date.now() };
        this.rows.set(auth, created);
        if (this.loseNextPostResponse) { this.loseNextPostResponse = false; throw new TypeError('response lost after commit'); }
        return response(201, created);
      }
      if (!row) return response(404, { error: 'not_found' });
      if (options.method === 'GET') return response(200, { ...copy(row), payload: copy(this.overrideGetPayload || row.payload) });
      if (options.method === 'PUT') {
        if (this.forcedConflicts > 0) { this.forcedConflicts--; return response(409, { error: 'conflict' }); }
        if (body.expectedRevision !== row.revision) return response(409, { error: 'conflict' });
        const updated = { payload: copy(body.payload), revision: row.revision + 1, updatedAt: Date.now() };
        this.rows.set(auth, updated);
        return response(200, updated);
      }
      return response(405, { error: 'method_not_allowed' });
    };
  }
  async state(key) {
    const keys = await deriveKeys(key);
    const row = this.rows.get(keys.auth);
    assert.ok(row, 'cloud space exists');
    return envelopeState(await decryptEnvelope(row.payload, keys.encryption), catalog);
  }
}

function fixture(t, { browser = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const server = new CASService(), clients = [];
  const descriptors = new Map();
  let events, network;
  if (browser) {
    events = new EventTarget(); network = { onLine: true };
    for (const [key, value] of Object.entries({ window: events, document: { visibilityState: 'visible' }, navigator: network })) {
      descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
  }
  t.after(() => {
    for (const client of clients) client.sync.dispose();
    for (const gate of server.gates) gate.release();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  const client = ({ storage = new MemoryStorage(), initial, label = 'client-' + clients.length } = {}) => {
    let state = copy(initial || JSON.parse(storage.getItem(STORAGE_KEY) || 'null') || defaultState());
    const statuses = [], applied = [];
    const sync = new CloudSync({
      endpoint: 'https://sync.example.test', catalog, storage,
      transport: server.transport(label), getState: () => state,
      applyState: next => { state = copy(next); applied.push(copy(next)); storage.setItem(STORAGE_KEY, JSON.stringify(state)); },
      onStatus: info => statuses.push({ ...info }),
    });
    const result = {
      sync, storage, statuses, applied, label,
      get state() { return state; },
      change(edit) {
        const next = copy(state); edit(next); state = next;
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
        sync.capture(next);
      },
    };
    clients.push(result); return result;
  };
  const tick = async (ms = 1200) => {
    t.mock.timers.tick(ms);
    await Promise.all(clients.map(c => c.sync.flight).filter(Boolean));
  };
  return { server, client, tick, events, network };
}

test('two isolated clients automatically encrypt, upload, poll, and apply full study progress', async t => {
  const f = fixture(t, { browser: true }), a = f.client(), b = f.client();
  await a.sync.start(); await b.sync.start();
  const key = await a.sync.create(); await b.sync.connect(key);
  assert.notEqual(a.storage.getItem(CLOUD_KEYS.device), b.storage.getItem(CLOUD_KEYS.device));
  assert.notEqual(a.storage, b.storage);
  a.change(state => {
    state.tasks[taskA] = true; state.lessons[lessonA] = true;
    state.steps[labs[0].id + ':0'] = true; state.notes[lessonA] = 'Private study note: scope first.';
    state.favorites.push(question.id); state.profile.weeklyHours = 12;
    state.attempts.push({ questionId: question.id, selected: [...question.answers], correct: true, at: 1000, mode: 'practice' });
    state.exams.push({ at: 2000, correct: 40, total: 50, score: 80 });
    state.activity['2026-11-13'] = 2;
    state.session = { id: 'study-session', mode: 'practice', ids: [question.id], index: 0, selections: {}, graded: {}, startedAt: 3000, deadline: null, finished: false };
  });
  assert.equal(a.sync.info.status, 'pending');
  const before = f.server.calls.length;
  await f.tick(1199); assert.equal(f.server.calls.length, before, 'capture is debounced');
  await f.tick(1);
  assert.equal(a.sync.info.status, 'synced');
  await f.tick(20000); // The second device receives the change through its visible-page poll.
  assert.deepEqual(b.state, a.state);
  assert.deepEqual(await f.server.state(key), a.state);
  const wire = JSON.stringify(f.server.calls);
  assert.ok(!wire.includes(key), 'master key must not leave the client');
  assert.ok(!wire.includes('Private study note') && !wire.includes('notes/' + lessonA), 'progress stays encrypted in transit');
  const puts = f.server.calls.filter(c => c.method === 'PUT').length;
  await a.sync.sync(); await b.sync.sync();
  assert.equal(f.server.calls.filter(c => c.method === 'PUT').length, puts, 'clean clients do not rewrite ciphertext');
});

test('a real revision conflict retries against the latest remote state without losing either device edit', async t => {
  const f = fixture(t), a = f.client({ label: 'a' }), b = f.client({ label: 'b' });
  const key = await a.sync.create(); await b.sync.connect(key);
  const gate = f.server.pauseNext(c => c.label === 'a' && c.method === 'PUT');
  a.change(state => { state.tasks[taskA] = true; });
  const first = a.sync.sync();
  const stalePut = await gate.entered;
  b.change(state => { state.tasks[taskB] = true; });
  await b.sync.sync();
  gate.release(); await first;
  const attempts = f.server.calls.filter(c => c.label === 'a' && c.method === 'PUT');
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].body.expectedRevision, stalePut.body.expectedRevision);
  assert.ok(attempts[1].body.expectedRevision > attempts[0].body.expectedRevision);
  await b.sync.sync();
  assert.equal(a.state.tasks[taskA], true); assert.equal(a.state.tasks[taskB], true);
  assert.deepEqual(b.state, a.state); assert.deepEqual(await f.server.state(key), a.state);
});

test('bounded repeated conflicts stay pending and the scheduled retry later succeeds', async t => {
  const f = fixture(t), a = f.client();
  const key = await a.sync.create();
  f.server.forcedConflicts = 4;
  a.change(state => { state.tasks[taskA] = true; });
  await a.sync.sync();
  assert.equal(a.sync.info.status, 'pending');
  assert.equal(f.server.calls.filter(c => c.method === 'PUT').length, 4);
  await f.tick(3000);
  assert.equal(a.sync.info.status, 'synced');
  assert.equal((await f.server.state(key)).tasks[taskA], true);
});

test('offline edits stay local and an online event automatically reconciles independent changes', async t => {
  const f = fixture(t, { browser: true }), a = f.client(), b = f.client();
  await a.sync.start(); await b.sync.start();
  const key = await a.sync.create(); await b.sync.connect(key);
  f.network.onLine = false;
  a.change(state => { state.tasks[taskA] = true; });
  b.change(state => { state.notes[lessonA] = 'Written while disconnected'; });
  const calls = f.server.calls.length;
  await f.tick();
  assert.equal(f.server.calls.length, calls, 'known-offline clients do not issue requests');
  assert.equal(a.sync.info.status, 'offline'); assert.equal(b.sync.info.status, 'offline');
  f.network.onLine = true; f.events.dispatchEvent(new Event('online'));
  await Promise.all([a.sync.flight, b.sync.flight].filter(Boolean));
  await f.tick(20000);
  assert.equal(a.state.tasks[taskA], true);
  assert.equal(a.state.notes[lessonA], 'Written while disconnected');
  assert.deepEqual(a.state, b.state);
  assert.deepEqual(await f.server.state(key), a.state);
});

test('transport failures retain pending edits and retry after reconnection', async t => {
  const f = fixture(t), a = f.client();
  const key = await a.sync.create();
  f.server.offline = true;
  a.change(state => { state.tasks[taskA] = true; });
  await assert.rejects(a.sync.sync(), /offline/);
  assert.equal(a.sync.info.status, 'offline');
  assert.equal(a.state.tasks[taskA], true);
  assert.equal((await f.server.state(key)).tasks[taskA], undefined);
  f.server.offline = false;
  await f.tick(30000);
  assert.equal(a.sync.info.status, 'synced');
  assert.equal((await f.server.state(key)).tasks[taskA], true);
});

test('reload restores credentials and unsent envelope changes, then merges newer remote progress', async t => {
  const f = fixture(t), a = f.client(), b = f.client();
  const key = await a.sync.create(); await b.sync.connect(key);
  a.change(state => { state.tasks[taskA] = true; state.notes[lessonA] = 'Not uploaded before reload'; });
  const device = a.storage.getItem(CLOUD_KEYS.device);
  a.sync.dispose();
  b.change(state => { state.tasks[taskB] = true; }); await b.sync.sync();
  const reloaded = f.client({ storage: a.storage });
  await reloaded.sync.start();
  assert.equal(reloaded.sync.info.status, 'synced');
  assert.equal(reloaded.storage.getItem(CLOUD_KEYS.credentials), key);
  assert.equal(reloaded.storage.getItem(CLOUD_KEYS.device), device);
  assert.equal(reloaded.state.tasks[taskA], true); assert.equal(reloaded.state.tasks[taskB], true);
  assert.equal(reloaded.state.notes[lessonA], 'Not uploaded before reload');
  assert.deepEqual(await f.server.state(key), reloaded.state);
});

test('a wrong pairing key neither connects nor overwrites existing local or remote progress', async t => {
  const f = fixture(t), a = f.client(), b = f.client();
  const key = await a.sync.create();
  a.change(state => { state.tasks[taskA] = true; }); await a.sync.sync();
  b.change(state => { state.notes[lessonA] = 'Keep this local'; });
  const local = copy(b.state), rows = copy([...f.server.rows]);
  await assert.rejects(b.sync.connect(newSyncKey()), /not_found/);
  assert.equal(b.sync.info.connected, false);
  assert.equal(b.storage.getItem(CLOUD_KEYS.credentials), null);
  assert.deepEqual(b.state, local); assert.deepEqual([...f.server.rows], rows);
  assert.equal(f.server.calls.filter(c => c.label === b.label && c.method === 'PUT').length, 0);
  assert.equal((await f.server.state(key)).tasks[taskA], true);
});

test('authenticated but undecryptable cloud data is rejected without storing credentials or writing back', async t => {
  const f = fixture(t), a = f.client(), b = f.client();
  const key = await a.sync.create();
  b.change(state => { state.notes[lessonA] = 'Local must survive'; });
  const local = copy(b.state), rows = copy([...f.server.rows]);
  const wrong = await deriveKeys(newSyncKey());
  f.server.overrideGetPayload = await encryptEnvelope(emptyEnvelope(), wrong.encryption);
  await assert.rejects(b.sync.connect(key), /decrypt_failed/);
  assert.equal(b.storage.getItem(CLOUD_KEYS.credentials), null);
  assert.equal(b.sync.info.connected, false); assert.deepEqual(b.state, local);
  assert.deepEqual([...f.server.rows], rows);
  assert.equal(f.server.calls.filter(c => c.label === b.label && c.method === 'PUT').length, 0);
});

test('edits made while PUT is in flight survive the response and are uploaded in the next automatic pass', async t => {
  const f = fixture(t), a = f.client();
  const key = await a.sync.create();
  const gate = f.server.pauseNext(c => c.method === 'PUT');
  a.change(state => { state.tasks[taskA] = true; });
  const first = a.sync.sync();
  await gate.entered;
  a.change(state => { state.tasks[taskA] = false; state.notes[lessonA] = 'Edited during upload'; });
  gate.release(); await first;
  assert.equal(a.state.tasks[taskA], false);
  assert.equal(a.state.notes[lessonA], 'Edited during upload');
  assert.equal(a.sync.info.status, 'pending');
  await f.tick();
  assert.equal(a.sync.info.status, 'synced');
  assert.deepEqual(await f.server.state(key), a.state);
});

test('disconnect during a pending GET prevents stale remote application and keeps local changes', async t => {
  const f = fixture(t), a = f.client(), b = f.client();
  const key = await a.sync.create(); await b.sync.connect(key);
  a.change(state => { state.tasks[taskA] = true; }); await a.sync.sync();
  const gate = f.server.pauseNext(c => c.label === b.label && c.method === 'GET');
  const pending = b.sync.sync(); await gate.entered;
  b.sync.disconnect();
  b.change(state => { state.notes[lessonA] = 'Local after disconnect'; });
  const before = copy(b.state);
  gate.release(); await pending;
  assert.deepEqual(b.state, before);
  assert.equal(b.sync.info.status, 'local');
  assert.equal(b.sync.info.connected, false);
  assert.equal(b.storage.getItem(CLOUD_KEYS.credentials), null);
});

test('dispose prevents a delayed failed request from restarting timers or notifying a removed UI', async t => {
  const f = fixture(t, { browser: true }), a = f.client();
  await a.sync.start(); await a.sync.create();
  const gate = f.server.pauseNext(c => c.method === 'GET');
  const pending = a.sync.sync(); await gate.entered;
  a.sync.dispose();
  const statuses = a.statuses.length, applied = a.applied.length;
  f.server.offline = true; gate.release();
  await assert.rejects(pending, /offline/);
  const calls = f.server.calls.length;
  f.events.dispatchEvent(new Event('online'));
  f.events.dispatchEvent(new Event('focus'));
  await f.tick(90000);
  assert.equal(f.server.calls.length, calls, 'no debounce, retry, poll, or event listener remains active');
  assert.equal(a.statuses.length, statuses); assert.equal(a.applied.length, applied);
});

test('a committed POST with a lost response retains its recovery key and retry reuses the same cloud space', async t => {
  const f = fixture(t), a = f.client();
  a.change(state => { state.tasks[taskA] = true; });
  f.server.loseNextPostResponse = true;
  await assert.rejects(a.sync.create(), /offline/);
  const key = a.sync.recoveryKey;
  assert.match(key, /^AZ104\./);
  assert.equal(a.storage.getItem(CLOUD_KEYS.credentials), null);
  assert.equal(f.server.rows.size, 1);
  a.change(state => { state.notes[lessonA] = 'Written before retry'; });
  const retried = await a.sync.create();
  assert.equal(retried, key);
  assert.equal(f.server.rows.size, 1, 'retry must not create a second inaccessible space');
  assert.equal(a.sync.recoveryKey, '');
  assert.equal(a.storage.getItem(CLOUD_KEYS.credentials), key);
  assert.equal(a.sync.info.status, 'synced');
  assert.deepEqual(await f.server.state(key), a.state);
});

test('POST success followed by GET failure keeps the recovery key across a page reload', async t => {
  const f = fixture(t), a = f.client();
  f.server.failNextGet = true;
  await assert.rejects(a.sync.create(), /offline/);
  const key = a.sync.recoveryKey;
  assert.ok(key); a.sync.dispose();
  const reload = f.client({ storage: a.storage });
  assert.equal(reload.sync.recoveryKey, key);
  assert.equal(await reload.sync.create(), key);
  assert.equal(f.server.rows.size, 1);
  assert.equal(reload.sync.info.status, 'synced');
  assert.equal(reload.sync.recoveryKey, '');
});

test('disconnect while a new pairing key is deriving cancels connection without saving credentials', async t => {
  const f = fixture(t), a = f.client(), b = f.client();
  const key = await a.sync.create();
  const entered = deferred(), release = deferred();
  const nativeDerive = crypto.subtle.deriveKey.bind(crypto.subtle);
  t.mock.method(crypto.subtle, 'deriveKey', async (...args) => {
    const derived = await nativeDerive(...args);
    entered.resolve(); await release.promise;
    return derived;
  });
  const connecting = b.sync.connect(key); await entered.promise;
  b.sync.disconnect();
  const state = copy(b.state), calls = f.server.calls.length, notices = b.statuses.length;
  release.resolve(); await connecting;
  assert.equal(b.sync.info.connected, false);
  assert.equal(b.sync.info.status, 'local');
  assert.equal(b.storage.getItem(CLOUD_KEYS.credentials), null);
  assert.deepEqual(b.state, state);
  assert.equal(f.server.calls.length, calls);
  assert.equal(b.statuses.length, notices);
});

