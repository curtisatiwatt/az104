import test from 'node:test';
import assert from 'node:assert/strict';
import * as zhCurriculum from '../data/curriculum.js';
import * as enCurriculum from '../data/curriculum.en.js';
import { labs as zhLabs } from '../data/labs.js';
import { labs as enLabs } from '../data/labs.en.js';

const immutableStringFields = new Set([
  'id', 'domain', 'lessonId', 'labId', 'type', 'mode', 'url',
  'english', 'weight', 'color', 'icon', 'verifiedAt', 'guideUrl', 'command',
]);

function compareContent(zh, en, path = 'content', field = '') {
  assert.equal(typeof en, typeof zh, path + ': type');
  if (Array.isArray(zh)) {
    assert.ok(Array.isArray(en), path + ': array');
    assert.equal(en.length, zh.length, path + ': length');
    zh.forEach((value, i) => compareContent(value, en[i], path + '[' + i + ']', field));
    return;
  }
  if (zh !== null && typeof zh === 'object') {
    assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort(), path + ': fields');
    for (const [key, value] of Object.entries(zh)) compareContent(value, en[key], path + '.' + key, key);
    return;
  }
  if (typeof zh === 'string') {
    assert.ok(en.trim().length, path + ': translated string is empty');
    if (immutableStringFields.has(field)) assert.equal(en, zh, path + ': structural value changed');
    if (field !== 'command') assert.ok(!/\p{Script=Han}/u.test(en), path + ': untranslated Chinese remains');
    if (field !== 'command' && /\p{Script=Han}/u.test(zh)) {
      assert.notEqual(en, zh, path + ': missing English translation');
    }
    return;
  }
  assert.equal(en, zh, path + ': metadata changed');
}

test('English curriculum preserves every field, item, reference, and timing', () => {
  assert.deepEqual(Object.keys(enCurriculum).sort(), Object.keys(zhCurriculum).sort());
  for (const key of Object.keys(zhCurriculum)) compareContent(zhCurriculum[key], enCurriculum[key], key);
  assert.equal(enCurriculum.lessons.length, 20);
  assert.equal(enCurriculum.weeks.length, 8);
  assert.equal(enCurriculum.weeks.flatMap(week => week.tasks).length, 48);
  assert.equal(enCurriculum.weeks.flatMap(week => week.tasks).reduce((sum, task) => sum + task.minutes, 0), 88 * 60);
});

test('English labs preserve progress keys, step order, commands, and all checklists', () => {
  compareContent(zhLabs, enLabs, 'labs');
  assert.equal(enLabs.length, 12);
  assert.equal(enLabs.reduce((sum, lab) => sum + lab.steps.length, 0), 78);
  enLabs.forEach((lab, i) => {
    assert.deepEqual(lab.steps.map(step => step.command), zhLabs[i].steps.map(step => step.command));
    assert.equal(lab.cleanup.length, zhLabs[i].cleanup.length);
  });
});

test('Both languages resolve lesson and lab task references to the same study objects', () => {
  for (const [curriculum, labs] of [[zhCurriculum, zhLabs], [enCurriculum, enLabs]]) {
    const lessonsById = new Map(curriculum.lessons.map(lesson => [lesson.id, lesson]));
    const labsById = new Map(labs.map(lab => [lab.id, lab]));
    for (const task of curriculum.weeks.flatMap(week => week.tasks)) {
      if (task.lessonId) assert.ok(lessonsById.has(task.lessonId), task.id + ': missing lesson');
      if (task.labId) assert.ok(labsById.has(task.labId), task.id + ': missing lab');
    }
  }
});

test('English lessons and lab steps retain substantive instructional text', () => {
  for (const lesson of enCurriculum.lessons) {
    assert.equal(lesson.sections.length, 4, lesson.id);
    for (const section of lesson.sections) assert.ok(section.body.length > 80, lesson.id + ': abbreviated section');
    assert.ok(lesson.checks.length > 0 && lesson.pitfalls.length > 0 && lesson.sources.length > 0);
  }
  for (const lab of enLabs) {
    assert.ok(lab.requirements.length > 0 && lab.deliverables.length > 0 && lab.cleanup.length > 0);
    for (const step of lab.steps) {
      assert.ok(step.body.length > 40, lab.id + ': abbreviated instructions');
      assert.ok(step.verify.length > 20, lab.id + ': missing acceptance criteria');
    }
  }
});

