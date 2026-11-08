// Tests for js/timemath.js. Run: node tests/timemath.test.js
const assert = require('assert');
const { test } = require('./harness.js');
const T = require('../js/timemath.js');

test('parse accepts strict 24-hour HH:MM', () => {
  assert.strictEqual(T.parse('00:00'), 0);
  assert.strictEqual(T.parse('09:05'), 545);
  assert.strictEqual(T.parse('23:59'), 1439);
});

test('parse rejects anything else', () => {
  for (const bad of ['9:05', '24:00', '12:60', 'mediodía', '', '12:5', null, undefined]) {
    assert.ok(Number.isNaN(T.parse(bad)), String(bad));
  }
});

test('format is the inverse of parse for the whole day', () => {
  for (let t = 0; t < T.DAY; t++) assert.strictEqual(T.parse(T.format(t)), t);
});

test('add wraps around midnight in both directions', () => {
  assert.strictEqual(T.add(T.parse('23:50'), 20), T.parse('00:10'));
  assert.strictEqual(T.add(T.parse('00:10'), -20), T.parse('23:50'));
});

test('diff goes forward, also across midnight', () => {
  assert.strictEqual(T.diff(T.parse('12:30'), T.parse('14:30')), 120);
  assert.strictEqual(T.diff(T.parse('23:30'), T.parse('00:15')), 45);
  assert.strictEqual(T.diff(T.parse('08:00'), T.parse('08:00')), 0);
});

test('hours and minutes split a time', () => {
  const t = T.make(14, 35);
  assert.strictEqual(T.hours(t), 14);
  assert.strictEqual(T.minutes(t), 35);
});
