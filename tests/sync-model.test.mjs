import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../core.js';
import { emptyEnvelope, legacyEnvelope, captureChanges, mergeEnvelopes, envelopeState } from '../sync-model.js';
import { questions } from '../data/questions.js';
import { lessons, weeks } from '../data/curriculum.js';
import { labs } from '../data/labs.js';

const catalog = { questions, lessons, weeks, labs };
const clone = value => structuredClone(value);
const initial = () => ({ ...defaultState(), profile: { startDate: '2026-11-13', weeklyHours: 11 } });
const taskA = weeks[0].tasks[0].id;
const taskB = weeks[0].tasks[1].id;
const lessonA = lessons[0].id;
const lessonB = lessons[1].id;
const questionA = questions[0];
const questionB = questions[1];
const makeAttempt = (question, at, selected = question.answers) => ({ questionId: question.id, selected: [...selected], correct: true, at, mode: 'practice' });
const makeExam = (at, correct = 40) => ({ at, score: correct * 2, correct, total: 50 });
const change = (envelope, before, device, time, edit) => {
  const after = clone(before);
  edit(after);
  return captureChanges(envelope, before, after, device, time);
};
const normalized = envelope => envelopeState(envelope, catalog);
const session = (id, index = 0) => ({ id, mode: 'practice', ids: [questionA.id, questionB.id], index, selections: {}, graded: {}, startedAt: 1000, deadline: null, finished: false });

test('offline devices retain independent task, lesson, and lab-step completions', () => {
  const before = initial();
  const base = legacyEnvelope(before);
  const a = change(base, before, 'device-a', 100, state => {
    state.tasks[taskA] = true;
    state.lessons[lessonA] = true;
  });
  const b = change(base, before, 'device-b', 100, state => {
    state.tasks[taskB] = true;
    state.steps[`${labs[0].id}:0`] = true;
  });
  const result = normalized(mergeEnvelopes(a, b));
  assert.equal(result.tasks[taskA], true);
  assert.equal(result.tasks[taskB], true);
  assert.equal(result.lessons[lessonA], true);
  assert.equal(result.steps[`${labs[0].id}:0`], true);
  assert.deepEqual(mergeEnvelopes(a, b), mergeEnvelopes(b, a));
});

test('an explicit uncheck survives merging with an older completed task', () => {
  const before = initial();
  before.tasks[taskA] = true;
  before.lessons[lessonA] = true;
  before.steps[`${labs[0].id}:cleanup`] = true;
  const old = legacyEnvelope(before);
  const newer = change(old, before, 'phone', 200, state => {
    state.tasks[taskA] = false;
    state.lessons[lessonA] = false;
    state.steps[`${labs[0].id}:cleanup`] = false;
  });
  for (const merged of [mergeEnvelopes(old, newer), mergeEnvelopes(newer, old)]) {
    const result = normalized(merged);
    assert.equal(result.tasks[taskA], false);
    assert.equal(result.lessons[lessonA], false);
    assert.equal(result.steps[`${labs[0].id}:cleanup`], false);
  }
});

test('removing map properties produces tombstones instead of resurrecting stale values', () => {
  const before = initial();
  before.tasks[taskA] = true;
  before.notes[lessonA] = 'old note';
  const old = legacyEnvelope(before);
  const newer = change(old, before, 'laptop', 300, state => {
    delete state.tasks[taskA];
    delete state.notes[lessonA];
  });
  assert.equal(newer.registers[`tasks/${taskA}`].value, false);
  assert.equal(newer.registers[`notes/${lessonA}`].value, '');
  const result = normalized(mergeEnvelopes(newer, old));
  assert.equal(result.tasks[taskA], false);
  assert.equal(result.notes[lessonA], '');
});

test('favorite removals survive stale additions while unrelated favorites are retained', () => {
  const before = initial();
  before.favorites = [questionA.id];
  const base = legacyEnvelope(before);
  const a = change(base, before, 'a', 100, state => { state.favorites = []; });
  const b = change(base, before, 'b', 90, state => { state.favorites.push(questionB.id); });
  const merged = mergeEnvelopes(a, b);
  assert.equal(merged.registers[`favorites/${questionA.id}`].value, false);
  assert.deepEqual(normalized(merged).favorites, [questionB.id]);
  assert.deepEqual(mergeEnvelopes(merged, base), merged);
});

test('note conflicts use last-write-wins without losing independent notes', () => {
  const before = initial();
  const base = legacyEnvelope(before);
  const a = change(base, before, 'a', 100, state => {
    state.notes[lessonA] = 'desktop explanation';
    state.notes[lessonB] = 'independent note';
  });
  const b = change(base, before, 'b', 200, state => { state.notes[lessonA] = 'phone explanation'; });
  const result = normalized(mergeEnvelopes(a, b));
  assert.equal(result.notes[lessonA], 'phone explanation');
  assert.equal(result.notes[lessonB], 'independent note');
});

test('profile fields merge independently and the newest same-field value wins', () => {
  const before = initial();
  const base = legacyEnvelope(before);
  const a = change(base, before, 'a', 100, state => { state.profile.startDate = '2026-12-01'; });
  const b = change(base, before, 'b', 100, state => { state.profile.weeklyHours = 8; });
  const merged = mergeEnvelopes(a, b);
  assert.deepEqual(normalized(merged).profile, { startDate: '2026-12-01', weeklyHours: 8 });
  const c = change(merged, normalized(merged), 'c', 200, state => { state.profile.weeklyHours = 12; });
  assert.equal(normalized(mergeEnvelopes(c, b)).profile.weeklyHours, 12);
});

test('the active session is one LWW register and explicit closure is preserved', () => {
  const before = initial();
  const base = legacyEnvelope(before);
  const a = change(base, before, 'a', 100, state => { state.session = session('desktop'); });
  const b = change(base, before, 'b', 200, state => { state.session = session('phone', 1); });
  const merged = mergeEnvelopes(a, b);
  assert.equal(normalized(merged).session.id, 'phone');
  assert.equal(normalized(merged).session.index, 1);
  const closed = change(merged, normalized(merged), 'b', 300, state => { state.session = null; });
  assert.equal(normalized(mergeEnvelopes(closed, a)).session, null);
});

test('equal-time conflicts converge deterministically and later writes beat clock rollback', () => {
  const before = initial();
  const base = legacyEnvelope(before);
  const a = change(base, before, 'device-a', 500, state => { state.notes[lessonA] = 'A'; });
  const b = change(base, before, 'device-b', 500, state => { state.notes[lessonA] = 'B'; });
  const merged = mergeEnvelopes(a, b);
  assert.deepEqual(merged, mergeEnvelopes(b, a));
  const later = change(merged, normalized(merged), 'device-a', 10, state => { state.notes[lessonA] = 'after clock rollback'; });
  assert.ok(later.registers[`notes/${lessonA}`].at > 500);
  assert.equal(normalized(mergeEnvelopes(later, merged)).notes[lessonA], 'after clock rollback');
});

test('legacy progress from both devices merges while modern removals beat legacy data', () => {
  const first = initial();
  first.tasks[taskA] = true;
  first.favorites = [questionA.id];
  const second = initial();
  second.tasks[taskB] = true;
  second.notes[lessonA] = 'previously local';
  const a = legacyEnvelope(first);
  const b = legacyEnvelope(second);
  const combined = mergeEnvelopes(a, b);
  const state = normalized(combined);
  assert.equal(state.tasks[taskA], true);
  assert.equal(state.tasks[taskB], true);
  assert.equal(state.notes[lessonA], 'previously local');
  const removed = change(combined, state, 'new-device', 50, next => { next.favorites = []; });
  assert.deepEqual(normalized(mergeEnvelopes(removed, a)).favorites, []);
});

test('a new device can import legacy progress without replacing the established profile or active session', () => {
  const established = initial();
  established.profile = { startDate: '2026-10-01', weeklyHours: 12 };
  established.session = session('established');
  const blankDevice = initial();
  blankDevice.tasks[taskA] = true;
  const fresh = legacyEnvelope(blankDevice, false);
  assert.ok(!Object.keys(fresh.registers).some(path => path.startsWith('profile/')));
  assert.ok(!Object.hasOwn(fresh.registers, 'session'));
  const state = normalized(mergeEnvelopes(legacyEnvelope(established), fresh));
  assert.deepEqual(state.profile, established.profile);
  assert.equal(state.session.id, 'established');
  assert.equal(state.tasks[taskA], true);
});

test('attempt and exam histories are unions, chronological, idempotent and commutative', () => {
  const a = emptyEnvelope(), b = emptyEnvelope();
  const commonAttempt = makeAttempt(questionA, 10);
  const commonExam = makeExam(30);
  a.attempts = [makeAttempt(questionB, 20), commonAttempt];
  b.attempts = [commonAttempt, makeAttempt(questionA, 40, [0])];
  a.exams = [makeExam(50, 45), commonExam];
  b.exams = [commonExam];
  const merged = mergeEnvelopes(a, b);
  assert.deepEqual(merged.attempts.map(record => record.at), [10, 20, 40]);
  assert.deepEqual(merged.exams.map(record => record.at), [30, 50]);
  assert.deepEqual(merged, mergeEnvelopes(b, a));
  assert.deepEqual(mergeEnvelopes(merged, merged), merged);
  assert.deepEqual(mergeEnvelopes(merged, a), merged);
});

test('semantically identical record property orders cannot duplicate a real answer or exam', () => {
  const a = emptyEnvelope(), b = emptyEnvelope();
  a.attempts = [makeAttempt(questionA, 10)];
  b.attempts = [{ mode: 'practice', at: 10, correct: true, selected: [...questionA.answers], questionId: questionA.id }];
  a.exams = [makeExam(20)];
  b.exams = [{ total: 50, correct: 40, score: 80, at: 20 }];
  const merged = mergeEnvelopes(a, b);
  assert.equal(merged.attempts.length, 1, 'key order is not a new answer');
  assert.equal(merged.exams.length, 1, 'key order is not a new exam');
  assert.deepEqual(merged, mergeEnvelopes(b, a));
});

test('restore-normalize-capture cycles do not manufacture a second passing mock', () => {
  const before = initial();
  const first = change(emptyEnvelope(), before, 'desktop', 100, next => { next.exams = [makeExam(1234)]; });
  const restored = normalized(first);
  const second = captureChanges(first, restored, restored, 'phone', 200);
  assert.equal(first.exams.length, 1);
  assert.equal(second.exams.length, 1, 'one real mock must remain one history item after normalization');
  assert.deepEqual(normalized(second).exams, restored.exams);
});

test('three-way offline merging is associative and does not mutate source envelopes', () => {
  const before = initial();
  const base = legacyEnvelope(before);
  const a = change(base, before, 'a', 10, state => { state.tasks[taskA] = true; state.attempts.push(makeAttempt(questionA, 100)); });
  const b = change(base, before, 'b', 20, state => { state.tasks[taskB] = true; state.notes[lessonA] = 'B'; });
  const c = change(base, before, 'c', 30, state => { state.notes[lessonA] = 'C'; state.exams.push(makeExam(300)); });
  const copies = [a, b, c].map(clone);
  assert.deepEqual(mergeEnvelopes(mergeEnvelopes(a, b), c), mergeEnvelopes(a, mergeEnvelopes(b, c)));
  assert.deepEqual([a, b, c], copies);
});

test('activity uses the per-day maximum without losing independent active days', () => {
  const a = emptyEnvelope(), b = emptyEnvelope();
  a.activity = { '2026-11-13': 3, '2026-11-14': 1 };
  b.activity = { '2026-11-13': 5, '2026-11-15': 2 };
  const merged = mergeEnvelopes(a, b);
  assert.deepEqual(merged.activity, { '2026-11-13': 5, '2026-11-14': 1, '2026-11-15': 2 });
  assert.deepEqual(mergeEnvelopes(merged, a), merged);
});

test('unknown paths and invalid registers cannot enter normalized learning state', () => {
  const incoming = emptyEnvelope();
  incoming.registers = {
    [`tasks/${taskA}`]: { value: true, at: 10, device: 'a' },
    [`tasks/${taskB}`]: { value: true, at: -1, device: 'a' },
    [`lessons/${lessonA}`]: { value: true, at: 1.5, device: 'a' },
    'tasks/nonexistent': { value: true, at: 10, device: 'a' },
    'not-a-group/id': { value: true, at: 10, device: 'a' },
    'notes/nested/id': { value: 'bad path', at: 10, device: 'a' }
  };
  const merged = mergeEnvelopes(emptyEnvelope(), incoming);
  assert.ok(!Object.hasOwn(merged.registers, 'not-a-group/id'));
  assert.ok(!Object.hasOwn(merged.registers, 'notes/nested/id'));
  assert.deepEqual(normalized(merged).tasks, { [taskA]: true });
  assert.deepEqual(normalized(merged).lessons, {});
  assert.throws(() => mergeEnvelopes({ v: 2 }, incoming), /invalid_cloud_data/);
});
