import test from 'node:test';
import assert from 'node:assert/strict';
import { domains, lessons, weeks, resources, examInfo } from '../data/curriculum.js';
import { questions } from '../data/questions.js';
import { labs } from '../data/labs.js';

const tasks = weeks.flatMap(w => w.tasks);
const domainIds = new Set(domains.map(d => d.id));
const uniqueIds = (items, name) => assert.equal(new Set(items.map(x => x.id)).size, items.length, `${name} has duplicate IDs`);
const https = url => assert.equal(new URL(url).protocol, 'https:');

test('the advertised catalog has unique IDs and balanced domain coverage', () => {
  assert.equal(domains.length, 5);
  assert.equal(lessons.length, 20);
  assert.equal(questions.length, 100);
  assert.equal(labs.length, 12);
  for (const [name, items] of Object.entries({ domains, lessons, questions, labs, tasks, resources })) uniqueIds(items, name);
  for (const d of domains) {
    assert.equal(lessons.filter(l => l.domain === d.id).length, 4);
    assert.equal(questions.filter(q => q.domain === d.id).length, 20);
  }
  assert.ok([...lessons, ...questions, ...labs].every(x => domainIds.has(x.domain)));
});

test('all 48 plan tasks total 88 hours, include all content, and budget enough lab time', () => {
  assert.equal(weeks.length, 8);
  assert.equal(tasks.length, 48);
  assert.equal(tasks.reduce((n, t) => n + t.minutes, 0), 88 * 60);
  for (const w of weeks) {
    assert.equal(w.tasks.length, 6);
    assert.equal(w.tasks.reduce((n, t) => n + t.minutes, 0), w.hours * 60);
  }
  for (const t of tasks) {
    assert.ok(Number.isInteger(t.minutes) && t.minutes > 0);
    assert.ok(['learn', 'lab', 'quiz', 'review'].includes(t.type));
    assert.ok(t.detail.length > 10);
    if (t.lessonId) assert.ok(lessons.some(l => l.id === t.lessonId), t.id);
    if (t.labId) {
      const lab = labs.find(l => l.id === t.labId);
      assert.ok(lab, t.id);
      assert.ok(t.minutes >= lab.minutes, `${t.id} needs ${lab.minutes}, allotted ${t.minutes}`);
    }
    if (t.domain) assert.ok(domainIds.has(t.domain), t.id);
  }
  assert.ok(lessons.every(l => tasks.some(t => t.lessonId === l.id)));
  assert.ok(labs.every(l => tasks.some(t => t.labId === l.id)));
  assert.equal(tasks.filter(t => t.mode === 'exam').length, 2);
  assert.ok(tasks.filter(t => t.mode === 'exam').every(t => t.type === 'quiz'));
});

test('lessons contain teaching, misconception checks, self-assessment and official references', () => {
  for (const l of lessons) {
    assert.equal(l.sections.length, 4, l.id);
    assert.ok(l.sections.every(s => s.title && s.body.length >= 40), l.id);
    assert.ok(l.pitfalls.length >= 2, l.id);
    assert.ok(l.checks.length >= 2, l.id);
    assert.ok(l.sources.length >= 2, l.id);
    for (const source of l.sources) {
      https(source.url);
      assert.equal(new URL(source.url).hostname, 'learn.microsoft.com');
      assert.ok(source.label);
    }
  }
});

test('every question can be graded unambiguously and explains every option', () => {
  for (const q of questions) {
    assert.ok(q.prompt.length > 12, q.id);
    assert.equal(q.options.length, 4, q.id);
    assert.equal(new Set(q.options).size, q.options.length, q.id);
    assert.ok(q.answers.length > 0 && q.answers.length < 4, q.id);
    assert.equal(new Set(q.answers).size, q.answers.length, q.id);
    assert.ok(q.answers.every(i => Number.isInteger(i) && i >= 0 && i < q.options.length), q.id);
    assert.equal(q.optionExplanations.length, q.options.length, q.id);
    assert.ok(q.optionExplanations.every(s => typeof s === 'string' && s.length > 5), q.id);
    assert.ok(q.explanation.length > 15, q.id);
    https(q.source.url);
    assert.equal(new URL(q.source.url).hostname, 'learn.microsoft.com');
  }
  assert.ok(questions.some(q => q.answers.length > 1), 'multiselect practice must be available');
});

test('all practical labs include prerequisites, verification and cleanup', () => {
  for (const l of labs) {
    assert.ok(l.requirements.length > 0, l.id);
    assert.ok(l.cost.length > 10, l.id);
    assert.ok(l.steps.length >= 4, l.id);
    assert.ok(l.steps.every(s => s.title && s.body && s.verify), l.id);
    assert.ok(l.deliverables.length > 0, l.id);
    assert.ok(l.cleanup.length > 0, l.id);
    assert.ok(l.sources.length > 0, l.id);
    for (const source of l.sources) https(source.url);
  }
});

test('official links and current assessment destination are explicit', () => {
  https(examInfo.guideUrl);
  for (const resource of resources) https(resource.url);
  assert.ok(resources.some(r => r.url === 'https://aka.ms/az104-pa'));
  assert.ok(!resources.some(r => r.url === 'https://aka.ms/AZ104-LearnPA'), 'legacy assessment is no longer updated');
  assert.ok(!lessons.flatMap(l => l.sources).some(s => s.url.includes('/en-us/cost-management-billing/')), 'cost docs require azure/ prefix');
});
