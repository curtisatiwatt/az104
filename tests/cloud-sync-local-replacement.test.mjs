import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudSync } from '../cloud-sync.js';
import { defaultState, STORAGE_KEY } from '../core.js';
import { questions } from '../data/questions.js';
import { lessons, weeks } from '../data/curriculum.js';
import { labs } from '../data/labs.js';

const catalog = { questions, lessons, weeks, labs };
const clone = value => structuredClone(value);

// A same-origin localStorage hub: writes notify OTHER tabs, only when the
// value changes. A queue models browser storage events without cloud traffic.
function browserFixture(t, initial) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(initial)]]), tabs = [], queue = [];
  const saved = new Map(['window', 'document'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { visibilityState: 'hidden' } });
  const setWindow = window => Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  const write = (source, key, next) => {
    const oldValue = values.get(key) ?? null;
    if (next === null) values.delete(key); else values.set(key, String(next));
    const newValue = values.get(key) ?? null;
    if (oldValue !== newValue) for (const tab of tabs) if (tab !== source) queue.push({ tab, key, oldValue, newValue });
  };
  const openTab = async () => {
    const tab = { window: new EventTarget(), state: JSON.parse(values.get(STORAGE_KEY)) };
    tab.storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => write(tab, key, String(value)), removeItem: key => write(tab, key, null) };
    setWindow(tab.window);
    tab.cloud = new CloudSync({ endpoint: '', catalog, storage: tab.storage, getState: () => tab.state, applyState: next => { tab.state = clone(next); tab.storage.setItem(STORAGE_KEY, JSON.stringify(next)); }, transport: () => { throw new Error('A local reset must not send network traffic'); } });
    tabs.push(tab);
    await tab.cloud.start();
    tab.replace = next => {
      tab.cloud.disconnect();
      tab.state = clone(next);
      tab.cloud.resetLocal(tab.state);
      tab.cloud.capture(tab.state);
      tab.storage.setItem(STORAGE_KEY, JSON.stringify(tab.state));
    };
    return tab;
  };
  const flush = () => {
    let count = 0;
    while (queue.length) {
      assert.ok(count++ < 200, 'storage events must converge');
      const { tab, ...data } = queue.shift();
      const event = new Event('storage');
      Object.assign(event, data);
      tab.window.dispatchEvent(event);
    }
  };
  t.after(() => {
    for (const tab of tabs) { setWindow(tab.window); tab.cloud.dispose(); }
    for (const [key, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  });
  return { openTab, flush, values };
}

test('clearing local progress is a replacement across open tabs, not a merge that resurrects records', async t => {
  const initial = defaultState();
  initial.tasks[weeks[0].tasks[0].id] = true;
  initial.notes[lessons[0].id] = 'The note being cleared';
  initial.favorites = [questions[0].id];
  const f = browserFixture(t, initial), a = await f.openTab(), b = await f.openTab();
  a.cloud.capture(a.state); f.flush();
  const reset = defaultState();
  a.replace(reset); f.flush();
  assert.deepEqual(a.state, reset, 'the resetting tab must stay empty');
  assert.deepEqual(b.state, reset, 'another tab must not restore cleared progress');
  assert.deepEqual(JSON.parse(f.values.get(STORAGE_KEY)), reset);
  assert.equal(a.cloud.info.connected, false);
  assert.equal(b.cloud.info.connected, false);
});

test('importing a backup replaces local records consistently in every open tab', async t => {
  const initial = defaultState();
  initial.tasks[weeks[0].tasks[0].id] = true;
  initial.notes[lessons[0].id] = 'Old note';
  const f = browserFixture(t, initial), a = await f.openTab(), b = await f.openTab();
  a.state.notes[lessons[0].id] = 'Newer local note that import should replace';
  a.cloud.capture(a.state); a.storage.setItem(STORAGE_KEY, JSON.stringify(a.state)); f.flush();
  const imported = defaultState();
  imported.profile.weeklyHours = 8;
  imported.tasks[weeks[0].tasks[1].id] = true;
  imported.notes[lessons[0].id] = 'Imported backup note';
  a.replace(imported); f.flush();
  assert.deepEqual(a.state, imported, 'the selected backup must remain authoritative locally');
  assert.deepEqual(b.state, imported);
  assert.deepEqual(JSON.parse(f.values.get(STORAGE_KEY)), imported);
});
