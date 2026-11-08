// Tests for js/storage.js with an in-memory store. Run: node tests/storage.test.js
const assert = require('assert');
const { test } = require('./harness.js');
const ST = require('../js/storage.js');

function memoryStore(initial) {
  const data = Object.assign({}, initial);
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

test('empty or broken storage gives a fresh record', () => {
  assert.deepStrictEqual(ST.load(memoryStore()), ST.empty());
  assert.deepStrictEqual(ST.load(memoryStore({ [ST.KEY]: 'not json' })), ST.empty());
  assert.deepStrictEqual(ST.load(memoryStore({ [ST.KEY]: '{"v":9,"levels":{}}' })), ST.empty());
  assert.deepStrictEqual(ST.load(memoryStore({ [ST.KEY]: '{"v":1,"levels":null}' })), ST.empty());
  assert.deepStrictEqual(ST.load(null), ST.empty());
});

test('a record survives a save and a load', () => {
  const store = memoryStore();
  const p = ST.empty();
  ST.recordClear(p, 1, 2);
  ST.save(p, store);
  assert.deepStrictEqual(ST.load(store), p);
});

test('a throwing store never breaks the game', () => {
  const store = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.deepStrictEqual(ST.load(store), ST.empty());
  ST.save(ST.empty(), store);
});

test('only level 1 is open at the start', () => {
  const p = ST.empty();
  assert.ok(ST.isUnlocked(p, 1));
  assert.ok(!ST.isUnlocked(p, 2));
});

test('clearing a level unlocks the next one', () => {
  const p = ST.empty();
  assert.deepStrictEqual(ST.recordClear(p, 1, 3), [2]);
  assert.ok(ST.isUnlocked(p, 2));
  assert.ok(!ST.isUnlocked(p, 3));
});

test('clearing the last level unlocks nothing, clearing again neither', () => {
  const p = ST.empty();
  assert.deepStrictEqual(ST.recordClear(p, 9, 3), []);
  ST.recordClear(p, 1, 1);
  assert.deepStrictEqual(ST.recordClear(p, 1, 1), []);
});

test('the best stars are kept', () => {
  const p = ST.empty();
  ST.recordClear(p, 1, 3);
  ST.recordClear(p, 1, 1);
  assert.strictEqual(ST.levelInfo(p, 1).stars, 3);
});
