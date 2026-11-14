import test from 'node:test';
import assert from 'node:assert/strict';
import { hkdfSync } from 'node:crypto';
import { toBase64, fromBase64, newSyncKey, validateSyncKey, deriveKeys, encryptEnvelope, decryptEnvelope } from '../sync-crypto.js';

const fixedBytes = Uint8Array.from({ length: 32 }, (_, index) => index);
const fixedKey = `AZ104.${toBase64(fixedBytes)}`;
const sample = () => ({
  v: 1,
  registers: {
    'notes/id01': { value: 'RBAC: scope matters. 权限范围。', at: 1234, device: 'desktop' },
    'tasks/w1-1': { value: true, at: 1235, device: 'phone' }
  },
  attempts: [], exams: [], activity: { '2026-11-13': 2 }
});

test('generated pairing keys carry 32 random bytes in canonical base64url form', () => {
  const first = newSyncKey(), second = newSyncKey();
  assert.match(first, /^AZ104\.[A-Za-z0-9_-]{43}$/);
  assert.equal(fromBase64(first.slice(6)).length, 32);
  assert.equal(validateSyncKey(first), first);
  assert.equal(validateSyncKey(`  ${first}\n`), first);
  assert.notEqual(first, second);
  assert.equal(toBase64(fromBase64(first.slice(6))), first.slice(6));
});

test('invalid versions, truncated keys and noncanonical encodings are rejected', async () => {
  const invalid = [
    '', null, {}, 'AZ104.short', fixedKey.slice(0, -1), `${fixedKey}A`,
    fixedKey.replace('AZ104.', 'AZ105.'), `AZ104.${'A'.repeat(42)}B`,
    `AZ104.${'A'.repeat(42)}=`, `AZ104.${'A'.repeat(42)}+`
  ];
  for (const value of invalid) {
    assert.throws(() => validateSyncKey(value), /invalid_key/);
    await assert.rejects(deriveKeys(value), /invalid_key/);
  }
});

test('HKDF authentication and encryption domains are distinct and deterministic', async () => {
  const first = await deriveKeys(fixedKey);
  const second = await deriveKeys(fixedKey);
  const expectedAuth = new Uint8Array(hkdfSync('sha256', fixedBytes, 'AZ104 cloud sync v1', 'authentication', 32));
  const expectedEncryption = new Uint8Array(hkdfSync('sha256', fixedBytes, 'AZ104 cloud sync v1', 'encryption', 32));
  assert.equal(first.auth, toBase64(expectedAuth));
  assert.equal(first.auth, second.auth);
  assert.notEqual(first.auth, toBase64(expectedEncryption));
  assert.notEqual(first.auth, fixedKey.slice(6));
  assert.equal(first.encryption.extractable, false);
  assert.deepEqual(first.encryption.algorithm, { name: 'AES-GCM', length: 256 });
  assert.deepEqual([...first.encryption.usages].sort(), ['decrypt', 'encrypt']);
  await assert.rejects(crypto.subtle.exportKey('raw', first.encryption));
  const expectedKey = await crypto.subtle.importKey('raw', expectedEncryption, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const payload = await encryptEnvelope(sample(), expectedKey);
  assert.deepEqual(await decryptEnvelope(payload, first.encryption), sample());
  assert.deepEqual(await decryptEnvelope(payload, second.encryption), sample());
  const authAsAES = await crypto.subtle.importKey('raw', fromBase64(first.auth), 'AES-GCM', false, ['decrypt']);
  await assert.rejects(decryptEnvelope(payload, authAsAES), /decrypt_failed/, 'the server authentication value must not decrypt cloud data');
});

test('AES-GCM round trips Unicode state with a fresh 96-bit IV for each encryption', async () => {
  const { encryption } = await deriveKeys(fixedKey);
  const input = sample();
  const first = await encryptEnvelope(input, encryption);
  const second = await encryptEnvelope(input, encryption);
  assert.equal(first.v, 1);
  assert.equal(fromBase64(first.iv).length, 12);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.data, second.data);
  assert.deepEqual(await decryptEnvelope(first, encryption), input);
  assert.deepEqual(await decryptEnvelope(second, encryption), input);
  assert.doesNotMatch(JSON.stringify(first), /scope matters|权限|notes\/id01/);
});

test('ciphertext changes, tag changes, IV changes and wrong keys fail authentication', async () => {
  const { encryption } = await deriveKeys(fixedKey);
  const payload = await encryptEnvelope(sample(), encryption);
  for (const position of [0, fromBase64(payload.data).length - 1]) {
    const bytes = fromBase64(payload.data);
    bytes[position] ^= 1;
    await assert.rejects(decryptEnvelope({ ...payload, data: toBase64(bytes) }, encryption), /decrypt_failed/);
  }
  const iv = fromBase64(payload.iv);
  iv[0] ^= 1;
  await assert.rejects(decryptEnvelope({ ...payload, iv: toBase64(iv) }, encryption), /decrypt_failed/);
  const other = await deriveKeys(newSyncKey());
  await assert.rejects(decryptEnvelope(payload, other.encryption), /decrypt_failed/);
});

test('ciphertext from a different authenticated context is not accepted', async () => {
  const { encryption } = await deriveKeys(fixedKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('another application context') }, encryption, new TextEncoder().encode(JSON.stringify(sample())));
  await assert.rejects(decryptEnvelope({ v: 1, iv: toBase64(iv), data: toBase64(data) }, encryption), /decrypt_failed/);
});

test('malformed payloads and oversized plaintext are rejected before successful use', async () => {
  const { encryption } = await deriveKeys(fixedKey);
  for (const payload of [null, {}, { v: 2, iv: '', data: '' }, { v: 1, iv: [], data: '' }, { v: 1, iv: '', data: 1 }, { v: 1, iv: '', data: 'A'.repeat(1800001) }]) {
    await assert.rejects(decryptEnvelope(payload, encryption), /invalid_cloud_data/);
  }
  for (const payload of [{ v: 1, iv: '!', data: '!' }, { v: 1, iv: 'AA', data: 'AA' }]) {
    await assert.rejects(decryptEnvelope(payload, encryption), /decrypt_failed/);
  }
  await assert.rejects(encryptEnvelope({ note: 'x'.repeat(1300001) }, encryption), /too_large/);
});
