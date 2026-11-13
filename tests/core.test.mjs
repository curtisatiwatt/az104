import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, defaultState, domainStats, examQuestions, isCorrect, latestAttempts, normalizeState, readiness, shuffle } from '../core.js';
import { domains, lessons, weeks } from '../data/curriculum.js';
import { questions } from '../data/questions.js';
import { labs } from '../data/labs.js';

const catalog = { questions, lessons, weeks, labs };
const normalize = patch => normalizeState({ ...defaultState(), ...patch }, catalog);
const attempt = (q, selected = q.answers, extra = {}) => ({ questionId: q.id, selected, at: 1234, mode: 'practice', ...extra });

test('single and multi-select grading requires an exact, order-independent set', () => {
  assert.equal(isCorrect([2], [2]), true);
  assert.equal(isCorrect([2], [1]), false);
  assert.equal(isCorrect([0, 3], [3, 0]), true);
  assert.equal(isCorrect([0, 3], [0]), false);
  assert.equal(isCorrect([0, 3], [0, 2, 3]), false);
  assert.equal(isCorrect([0, 3], [0, 0]), false);
  assert.equal(isCorrect([0]), false);
  const answers = [3, 0], selection = [0, 3];
  isCorrect(answers, selection);
  assert.deepEqual(answers, [3, 0]);
  assert.deepEqual(selection, [0, 3]);
});

test('shuffle preserves the pool without modifying its source', () => {
  const input = ['a', 'b', 'c', 'd'];
  const output = shuffle(input, () => 0);
  assert.deepEqual(input, ['a', 'b', 'c', 'd']);
  assert.deepEqual([...output].sort(), input);
  assert.notDeepEqual(output, input);
});

test('every 50-question mock has unique known questions and official domain proportions', () => {
  const original = questions.map(q => q.id);
  const byId = new Map(questions.map(q => [q.id, q]));
  for (let round = 0; round < 20; round++) {
    const ids = examQuestions(questions);
    assert.equal(ids.length, 50);
    assert.equal(new Set(ids).size, 50);
    assert.ok(ids.every(id => byId.has(id)));
    for (const d of domains) {
      const [minimum, maximum] = d.weight.match(/\d+/g).map(Number);
      const proportion = ids.filter(id => byId.get(id).domain === d.id).length * 2;
      assert.ok(proportion >= minimum && proportion <= maximum, `${d.id}: ${proportion}% outside ${d.weight}`);
    }
  }
  assert.deepEqual(questions.map(q => q.id), original);
});

test('domain statistics count distinct questions and use the latest result', () => {
  const q1 = questions[0], q2 = questions[1];
  const attempts = [attempt(q1, [0], { correct: false }), attempt(q2, [0], { correct: false }), attempt(q1, q1.answers, { correct: true })];
  assert.equal(latestAttempts(attempts)[q1.id].correct, true);
  assert.deepEqual(domainStats(questions, attempts).identity, { total: 20, answered: 2, correct: 1, accuracy: 50 });
  assert.equal(domainStats(questions, attempts).network.answered, 0);
  assert.equal(domainStats(questions, [attempt(q1, [], { correct: false })]).identity.answered, 0, 'blank submissions must not inflate practice coverage');
});

test('backup normalization drops unknown IDs and invalid booleans, limits notes and deduplicates favorites', () => {
  const q = questions[0], l = lessons[0], lab = labs[0], t = weeks[0].tasks[0];
  const state = normalize({ tasks: { [t.id]: true, bogus: true }, lessons: { [l.id]: 'yes' }, steps: { [`${lab.id}:0`]: true, [`${lab.id}:999`]: true }, notes: { [l.id]: 'a'.repeat(25000), [lab.id]: 'my lab note', bogus: 'unknown' }, favorites: [q.id, q.id, 'missing'] });
  assert.deepEqual(state.tasks, { [t.id]: true });
  assert.deepEqual(state.lessons, {});
  assert.deepEqual(state.steps, { [`${lab.id}:0`]: true });
  assert.equal(state.notes[l.id].length, 20000);
  assert.equal(state.notes[lab.id], 'my lab note');
  assert.equal(state.notes.bogus, undefined);
  assert.deepEqual(state.favorites, [q.id]);
});

test('import recomputes correctness and rejects duplicate, unknown and out-of-range selections', () => {
  const q = questions[0];
  const state = normalize({ attempts: [attempt(q, q.answers, { correct: false }), attempt(q, [], { correct: true }), attempt(q, [0, 0]), attempt(q, [4]), attempt(q, ['1']), attempt(q, [0], { questionId: 'missing' }), attempt(q, [0], { at: null })] });
  assert.equal(state.attempts.length, 2);
  assert.equal(state.attempts[0].correct, true);
  assert.equal(state.attempts[1].correct, false);
});

test('invalid backup versions are rejected instead of overwriting user data', () => {
  for (const bad of [null, {}, [], { version: 2 }, 'hello']) assert.throws(() => normalizeState(bad, catalog), /版本/);
});

test('invalid calendar dates and activity entries do not survive import', () => {
  const state = normalize({ profile: { startDate: '2026-02-30', weeklyHours: -10 }, activity: { '2026-11-13': 2, '2026-02-30': 3, '2026-11-14': -1, '2026-11-15': '5' } });
  assert.notEqual(state.profile.startDate, '2026-02-30');
  assert.ok(state.profile.weeklyHours > 0);
  assert.deepEqual(state.activity, { '2026-11-13': 2 });
  assert.equal(normalize({ profile: { startDate: '2028-02-29', weeklyHours: 11 } }).profile.startDate, '2028-02-29');
});

test('valid unfinished practice resumes with sanitized selections and a clamped cursor', () => {
  const [a, b] = questions;
  const session = { id: 'session-1', mode: 'practice', ids: [a.id, b.id], index: 999, startedAt: 1000, deadline: 2000, selections: { [a.id]: a.answers, [b.id]: [99], missing: [1] }, graded: { [a.id]: true, missing: true }, finished: false };
  const s = normalize({ session }).session;
  assert.equal(s.index, 1);
  assert.equal(s.deadline, null);
  assert.deepEqual(s.selections, { [a.id]: a.answers });
  assert.deepEqual(s.graded, { [a.id]: true });
  assert.equal(s.finished, false);
});

test('duplicate or missing question references invalidate an imported session', () => {
  const base = { id: 'x', mode: 'practice', index: 0, startedAt: 1000, selections: {}, graded: {} };
  for (const ids of [[], [questions[0].id, questions[0].id], ['missing']]) assert.equal(normalize({ session: { ...base, ids } }).session, null);
});

test('corrupted grading flags cannot lock an unanswered practice or pregrade an active mock', () => {
  const q = questions[0];
  const unfinished = { id: 'x', mode: 'practice', ids: [q.id], index: 0, startedAt: 1000, selections: { [q.id]: [99] }, graded: { [q.id]: true }, finished: false };
  assert.notEqual(normalize({ session: unfinished }).session.graded[q.id], true);
  const exam = { ...unfinished, mode: 'exam', ids: examQuestions(questions), deadline: 6001000, selections: { [q.id]: q.answers } };
  assert.deepEqual(normalize({ session: exam }).session.graded, {});
});

test('mock import requires exactly 50 questions and a valid deadline', () => {
  const base = { id: 'x', mode: 'exam', index: 0, startedAt: 1000, deadline: 6001000, selections: {}, graded: {} };
  const ids = examQuestions(questions);
  assert.equal(normalize({ session: { ...base, ids } }).session.ids.length, 50);
  for (const bad of [{ ...base, ids: ids.slice(0, 1) }, { ...base, ids, deadline: null }, { ...base, ids, deadline: 999 }]) {
    assert.equal(normalize({ session: bad }).session, null);
  }
});

test('normalized mock history cannot show a score inconsistent with the correct count', () => {
  const state = normalize({ exams: [{ at: 1234, total: 50, score: 99, correct: 0 }, { at: 1235, total: 50, score: 80, correct: 40 }, { at: 1236, total: 10, score: 100, correct: 10 }] });
  assert.ok(state.exams.some(e => e.score === 80 && e.correct === 40));
  assert.ok(state.exams.every(e => e.total === 50 && Number.isInteger(e.correct) && e.correct >= 0 && e.correct <= 50 && e.score === e.correct * 2));
});

test('readiness requires coverage, cleanup and two consecutive full mock passes', () => {
  const state = defaultState();
  assert.deepEqual(readiness(questions, state, labs).map(c => c.met), [false, false, false]);
  for (const d of domains) state.attempts.push(...questions.filter(q => q.domain === d.id).slice(0, 15).map(q => attempt(q, q.answers, { correct: true })));
  for (const lab of labs) {
    lab.steps.forEach((_, i) => { state.steps[`${lab.id}:${i}`] = true; });
    state.steps[`${lab.id}:cleanup`] = true;
  }
  state.exams = [{ total: 50, score: 84 }, { total: 50, score: 80 }];
  assert.deepEqual(readiness(questions, state, labs).map(c => c.met), [true, true, true]);
  state.steps[`${labs[0].id}:cleanup`] = false;
  state.exams.push({ total: 50, score: 78 });
  assert.deepEqual(readiness(questions, state, labs).map(c => c.met), [true, false, false]);
  state.exams = [{ total: 10, score: 100 }, { total: 10, score: 100 }];
  assert.equal(readiness(questions, state, labs)[2].met, false);
});

test('calendar-based plans cross year, leap-day and daylight-saving boundaries', () => {
  assert.equal(addDays('2026-11-13', 55), '2027-01-07');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-07', 2), '2026-03-09');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
});
