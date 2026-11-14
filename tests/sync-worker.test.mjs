import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import worker from '../sync-service/worker.js';

// Exercise the Worker's actual SQL, not a mock that recognizes query strings.
// The adapter implements the D1 methods used by this service; Cloudflare runtime
// compatibility still needs deployment/runtime verification separately.
const schema = readFileSync(new URL('../sync-service/schema.sql', import.meta.url), 'utf8');
const ORIGIN = 'https://curtisatiwatt.github.io';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const payload = () => ({ v: 1, iv: randomBytes(12).toString('base64url'), data: randomBytes(40).toString('base64url') });

function fixture(t, overrides = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schema);
  t.after(() => sqlite.close());
  const calls = [];
  const DB = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const prepared = (params = []) => ({
        bind: (...args) => prepared(args),
        async first(column) {
          calls.push({ sql, params });
          const row = statement.get(...params);
          return row ? (column ? row[column] : { ...row }) : null;
        },
        async run() {
          calls.push({ sql, params });
          const result = statement.run(...params);
          return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
        },
      });
      return prepared();
    },
  };
  const env = { DB, ALLOWED_ORIGINS: ORIGIN, ...overrides };
  const request = async ({ method = 'GET', path = '/v1/progress', auth, body, origin = ORIGIN, ip = '192.0.2.1', headers = {}, rawBody } = {}) => {
    const requestHeaders = new Headers(headers);
    if (origin !== null) requestHeaders.set('Origin', origin);
    if (auth !== undefined) requestHeaders.set('Authorization', auth);
    if (ip !== null) requestHeaders.set('CF-Connecting-IP', ip);
    if (body !== undefined && !requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');
    const response = await worker.fetch(new Request('https://sync.example.test' + path, { method, headers: requestHeaders, body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)) }), env);
    return response;
  };
  return { sqlite, calls, env, request };
}

test('sync CORS permits only exact configured origins and does not use cookies', async t => {
  const f = fixture(t, { ALLOWED_ORIGINS: `${ORIGIN},http://localhost:5184` });
  for (const origin of [ORIGIN, 'http://localhost:5184']) {
    const response = await f.request({ method: 'OPTIONS', origin });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('vary'), 'Origin');
    assert.match(response.headers.get('access-control-allow-methods'), /PUT/);
    assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  for (const origin of ['https://evil.example', 'null', 'https://curtisatiwatt.github.io.evil.example']) {
    const response = await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() }, origin });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.deepEqual(await response.json(), { error: 'origin_not_allowed' });
  }
  assert.equal(f.calls.length, 0, 'preflight and denied origins must not access the database');
});

test('health is public, unknown routes and unsupported methods are explicit', async t => {
  const f = fixture(t);
  const health = await f.request({ path: '/health', origin: null });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { service: 'az104-progress-sync', version: 1 });
  assert.equal(health.headers.get('access-control-allow-origin'), null);
  const missing = await f.request({ path: '/v1/not-a-route' });
  assert.equal(missing.status, 404);
  const unsupported = await f.request({ method: 'DELETE' });
  assert.equal(unsupported.status, 405);
  assert.match(unsupported.headers.get('allow'), /GET/);
  assert.equal(f.calls.length, 0);
});

test('sync requires a well-formed bearer capability before reading storage or bodies', async t => {
  const f = fixture(t);
  for (const auth of [undefined, '', `Basic ${token()}`, `Bearer ${'a'.repeat(42)}`, `Bearer ${'a'.repeat(44)}`, `Bearer ${'a'.repeat(42)}!`]) {
    for (const method of ['GET', 'POST', 'PUT']) {
      const response = await f.request({ method, auth });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'unauthorized' });
      assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }
  assert.equal(f.calls.length, 0);
});

test('creation stores only a hashed capability and returns the opaque encrypted envelope', async t => {
  const f = fixture(t), secret = token(), encrypted = payload();
  const created = await f.request({ method: 'POST', auth: `Bearer ${secret}`, body: { payload: encrypted } });
  assert.equal(created.status, 201);
  const result = await created.json();
  assert.equal(result.revision, 1);
  assert.ok(Number.isSafeInteger(result.updatedAt));
  const row = f.sqlite.prepare('SELECT * FROM progress_spaces').get();
  assert.equal(row.id, sha256(secret));
  assert.equal(row.revision, 1);
  assert.equal(row.created_at, row.updated_at);
  assert.deepEqual(JSON.parse(row.payload), encrypted);
  assert.ok(!JSON.stringify(row).includes(secret));
  const rate = f.sqlite.prepare('SELECT id FROM creation_limits').get();
  assert.equal(rate.id, sha256('az104-create:192.0.2.1'));
  const downloaded = await f.request({ auth: `Bearer ${secret}` });
  assert.deepEqual(await downloaded.json(), { payload: encrypted, revision: 1, updatedAt: result.updatedAt });
  assert.equal(downloaded.headers.get('cache-control'), 'no-store');
  assert.equal(downloaded.headers.get('x-content-type-options'), 'nosniff');
});

test('a different valid bearer capability cannot read or overwrite another space', async t => {
  const f = fixture(t), owner = token(), outsider = token(), original = payload();
  await f.request({ method: 'POST', auth: `Bearer ${owner}`, body: { payload: original } });
  const wrongRead = await f.request({ auth: `Bearer ${outsider}` });
  assert.equal(wrongRead.status, 404);
  assert.deepEqual(await wrongRead.json(), { error: 'not_found' });
  const wrongWrite = await f.request({ method: 'PUT', auth: `Bearer ${outsider}`, body: { expectedRevision: 1, payload: payload() } });
  assert.equal(wrongWrite.status, 404);
  const after = await (await f.request({ auth: `Bearer ${owner}` })).json();
  assert.equal(after.revision, 1);
  assert.deepEqual(after.payload, original);
});

test('duplicate creation cannot replace existing data', async t => {
  const f = fixture(t), auth = `Bearer ${token()}`, original = payload();
  assert.equal((await f.request({ method: 'POST', auth, body: { payload: original } })).status, 201);
  const duplicate = await f.request({ method: 'POST', auth, body: { payload: payload() } });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: 'space_unavailable' });
  assert.deepEqual((await (await f.request({ auth })).json()).payload, original);
});

test('PUT uses revision compare-and-swap and concurrent stale writers cannot win twice', async t => {
  const f = fixture(t), auth = `Bearer ${token()}`, a = payload(), b = payload();
  await f.request({ method: 'POST', auth, body: { payload: payload() } });
  const responses = await Promise.all([a, b].map(p => f.request({ method: 'PUT', auth, body: { expectedRevision: 1, payload: p } })));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const winner = responses[0].status === 200 ? a : b;
  const stored = await (await f.request({ auth })).json();
  assert.equal(stored.revision, 2);
  assert.deepEqual(stored.payload, winner);
  const next = await f.request({ method: 'PUT', auth, body: { expectedRevision: 2, payload: payload() } });
  assert.equal(next.status, 200);
  assert.equal((await next.json()).revision, 3);
});

test('invalid revisions never mutate an existing space', async t => {
  const f = fixture(t), auth = `Bearer ${token()}`, original = payload();
  await f.request({ method: 'POST', auth, body: { payload: original } });
  for (const expectedRevision of [undefined, null, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
    const response = await f.request({ method: 'PUT', auth, body: { expectedRevision, payload: payload() } });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid_revision' });
  }
  assert.deepEqual((await (await f.request({ auth })).json()).payload, original);
});

test('only structurally valid encrypted JSON payloads are accepted', async t => {
  const f = fixture(t), auth = `Bearer ${token()}`, good = payload();
  const malformed = [null, {}, { payload: null }, { payload: { ...good, v: 2 } }, { payload: { ...good, iv: 'short' } }, { payload: { ...good, data: 'a'.repeat(21) } }, { payload: { ...good, data: 'a'.repeat(25) } }, { payload: { ...good, data: 'a'.repeat(23) + '!' } }, { payload: { ...good, data: { secret: true } } }];
  for (const body of malformed) {
    const response = await f.request({ method: 'POST', auth, body });
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), { error: 'invalid_body' });
  }
  for (const contentType of ['text/plain', 'text/plain; note=application/json']) {
    const response = await f.request({ method: 'POST', auth, body: { payload: good }, headers: { 'Content-Type': contentType } });
    assert.equal(response.status, 400, contentType);
  }
  const invalidJSON = await f.request({ method: 'POST', auth, rawBody: '{secret: not-json}', headers: { 'Content-Type': 'application/json' } });
  assert.equal(invalidJSON.status, 400);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM progress_spaces').get().n, 0);
  const valid = await f.request({ method: 'POST', auth, body: { payload: good }, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  assert.equal(valid.status, 201);
});

test('declared and streamed body size limits reject before writing a space', async t => {
  const f = fixture(t), auth = `Bearer ${token()}`;
  const declared = await f.request({ method: 'POST', auth, body: { payload: payload() }, headers: { 'Content-Length': '1800101' } });
  assert.equal(declared.status, 413);
  const streamed = await f.request({ method: 'POST', auth, body: { payload: { ...payload(), data: 'a'.repeat(1800101) } } });
  assert.equal(streamed.status, 413);
  assert.deepEqual(await streamed.json(), { error: 'too_large' });
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM progress_spaces').get().n, 0);
});

test('creation is limited to three attempts per IP per hour and recovers in the next window', async t => {
  const f = fixture(t);
  const fixedNow = 1800000000000;
  t.mock.method(Date, 'now', () => fixedNow);
  for (let i = 0; i < 3; i++) assert.equal((await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() } })).status, 201);
  const limited = await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() } });
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), { error: 'rate_limited' });
  assert.equal(limited.headers.get('retry-after'), '3600');
  assert.equal(f.sqlite.prepare('SELECT count FROM creation_limits WHERE id=?').get(sha256('az104-create:192.0.2.1')).count, 3);
  assert.equal((await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() }, ip: '192.0.2.2' })).status, 201);
  Date.now.mock.mockImplementation(() => fixedNow + 3600000);
  assert.equal((await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() } })).status, 201);
  assert.equal(f.sqlite.prepare('SELECT count FROM creation_limits WHERE id=?').get(sha256('az104-create:192.0.2.1')).count, 1);
});

test('global space quota is enforced by SQL and existing spaces remain writable', async t => {
  const f = fixture(t), auth = `Bearer ${token()}`;
  const insert = f.sqlite.prepare('INSERT INTO progress_spaces (id,payload,revision,created_at,updated_at) VALUES (?,?,1,1,1)');
  for (let i = 0; i < 127; i++) insert.run(sha256('seed:' + i), JSON.stringify(payload()));
  assert.equal((await f.request({ method: 'POST', auth, body: { payload: payload() } })).status, 201);
  const blocked = await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() }, ip: '192.0.2.2' });
  assert.equal(blocked.status, 409);
  assert.deepEqual(await blocked.json(), { error: 'space_unavailable' });
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM progress_spaces').get().n, 128);
  assert.equal((await f.request({ method: 'PUT', auth, body: { payload: payload(), expectedRevision: 1 } })).status, 200);
});

test('expired rate-limit records are removed without storing raw client IP addresses', async t => {
  const f = fixture(t);
  const currentWindow = Math.floor(Date.now() / 3600000);
  f.sqlite.prepare('INSERT INTO creation_limits VALUES (?,?,?)').run(sha256('old-client'), currentWindow - 25, 3);
  assert.equal((await f.request({ method: 'POST', auth: `Bearer ${token()}`, body: { payload: payload() } })).status, 201);
  const rows = f.sqlite.prepare('SELECT * FROM creation_limits').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, sha256('az104-create:192.0.2.1'));
  assert.ok(!JSON.stringify(rows).includes('192.0.2.1'));
});

test('database failures return a generic error and do not leak tokens, payloads or exception messages', async t => {
  const secret = token(), encrypted = payload(), logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  const env = { ALLOWED_ORIGINS: ORIGIN, DB: { prepare() { throw new Error(`SQL failed, token=${secret}, data=${encrypted.data}`); } } };
  const response = await worker.fetch(new Request('https://sync.example.test/v1/progress', { headers: { Origin: ORIGIN, Authorization: `Bearer ${secret}` } }), env);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('access-control-allow-origin'), ORIGIN);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { error: 'service_unavailable' });
  assert.equal(logs.length, 1);
  assert.ok(![text, ...logs].some(value => value.includes(secret) || value.includes(encrypted.data) || value.includes('SQL failed')));
  assert.deepEqual(JSON.parse(logs[0]), { event: 'sync_request_failed', type: 'Error' });
});
