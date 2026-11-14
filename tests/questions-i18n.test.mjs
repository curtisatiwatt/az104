import test from 'node:test';
import assert from 'node:assert/strict';
import { questions as chinese } from '../data/questions.js';
import { questions as english } from '../data/questions.en.js';

const textFields = ['topic', 'difficulty', 'prompt', 'explanation'];

test('English questions preserve all IDs, domains, answer indices, and reference URLs', () => {
  assert.equal(english.length, 100);
  assert.equal(english.length, chinese.length);
  assert.equal(new Set(english.map(question => question.id)).size, 100);
  for (let i = 0; i < chinese.length; i++) {
    const source = chinese[i];
    const translated = english[i];
    assert.equal(translated.id, source.id);
    assert.equal(translated.domain, source.domain, source.id);
    assert.deepEqual(translated.answers, source.answers, source.id);
    assert.equal(translated.source.url, source.source.url, source.id);
    assert.equal(translated.options.length, source.options.length, source.id);
    assert.equal(translated.optionExplanations.length, source.optionExplanations.length, source.id);
  }
});

test('Every question has complete English visible text without untranslated Han characters', () => {
  for (const question of english) {
    const visible = [
      ...textFields.map(field => question[field]),
      ...question.options,
      ...question.optionExplanations,
      question.source.label
    ];
    for (const value of visible) {
      assert.equal(typeof value, 'string', question.id);
      assert.ok(value.trim().length > 0, `${question.id}: empty translation`);
      assert.doesNotMatch(value, /\p{Script=Han}/u, `${question.id}: untranslated text`);
      assert.doesNotMatch(value, /\b(?:undefined|null)\b/, `${question.id}: missing text`);
    }
    assert.equal(question.options.length, 4, question.id);
    assert.equal(question.optionExplanations.length, 4, question.id);
    assert.ok(['Fundamentals', 'Applied', 'Advanced'].includes(question.difficulty), question.id);
    if (question.answers.length > 1) {
      assert.match(question.prompt, /select two/i, `${question.id}: explicit multi-select instruction`);
    }
  }
});

test('Language selection preserves domain balance and multi-select question count', () => {
  const counts = Object.fromEntries(['identity', 'storage', 'compute', 'network', 'monitor'].map(domain => [domain, english.filter(q => q.domain === domain).length]));
  assert.deepEqual(counts, { identity: 20, storage: 20, compute: 20, network: 20, monitor: 20 });
  assert.equal(english.filter(q => q.answers.length > 1).length, 18);
  for (const question of english) {
    assert.equal(new Set(question.answers).size, question.answers.length, question.id);
    assert.ok(question.answers.every(index => Number.isInteger(index) && index >= 0 && index < question.options.length), question.id);
  }
});
