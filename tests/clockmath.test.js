// Tests for js/clockmath.js: scripted angle paths stand in for a finger. Run: node tests/clockmath.test.js
const assert = require('assert');
const { test } = require('./harness.js');
const T = require('../js/timemath.js');
const C = require('../js/clockmath.js');

const t = T.parse;

// Sweep the pointer from one angle to another in small steps and return the resulting time.
function sweep(drag, from, to, stepDegrees) {
  const step = stepDegrees || 5;
  const n = Math.max(1, Math.round(Math.abs(to - from) / step));
  let result = drag.t;
  for (let i = 1; i <= n; i++) result = C.moveDrag(drag, from + ((to - from) * i) / n);
  return result;
}

function dragFrom(time, hand, angle, step) {
  return C.beginDrag(t(time), hand, angle, step);
}

test('angles of the hands', () => {
  assert.deepStrictEqual(C.angles(t('03:00')), { minute: 0, hour: 90 });
  assert.deepStrictEqual(C.angles(t('15:00')), { minute: 0, hour: 90 });
  assert.deepStrictEqual(C.angles(t('12:30')), { minute: 180, hour: 15 });
  assert.deepStrictEqual(C.angles(t('09:15')), { minute: 90, hour: 277.5 });
});

test('angleAt measures clockwise from twelve', () => {
  assert.strictEqual(C.angleAt(0, -10), 0);
  assert.strictEqual(C.angleAt(10, 0), 90);
  assert.strictEqual(C.angleAt(0, 10), 180);
  assert.strictEqual(C.angleAt(-10, 0), 270);
});

test('one clockwise turn of the minute hand advances one hour', () => {
  assert.strictEqual(sweep(dragFrom('09:00', 'minute', 0), 0, 360), t('10:00'));
});

test('three turns carry three hours', () => {
  assert.strictEqual(sweep(dragFrom('09:00', 'minute', 0), 0, 1080), t('12:00'));
});

test('dragging back across twelve takes the hour back', () => {
  assert.strictEqual(sweep(dragFrom('09:05', 'minute', 30), 30, -30), t('08:55'));
});

test('the minute hand crosses midnight both ways', () => {
  assert.strictEqual(sweep(dragFrom('23:50', 'minute', 300), 300, 420), t('00:10'));
  assert.strictEqual(sweep(dragFrom('00:10', 'minute', 60), 60, -60), t('23:50'));
});

test('grabbing away from the hand does not make it jump', () => {
  const drag = dragFrom('09:00', 'minute', 37);
  assert.strictEqual(C.moveDrag(drag, 37), t('09:00'));
  assert.strictEqual(sweep(drag, 37, 97), t('09:10'));
});

test('very slow drags still accumulate', () => {
  const drag = dragFrom('09:00', 'minute', 0);
  assert.strictEqual(sweep(drag, 0, 60, 0.1), t('09:10'));
});

test('snapping to five minutes', () => {
  const drag = dragFrom('09:00', 'minute', 0, 5);
  assert.strictEqual(sweep(drag, 0, 14), t('09:00'));
  assert.strictEqual(sweep(drag, 14, 16), t('09:05'));
  assert.strictEqual(sweep(drag, 16, 180), t('09:30'));
});

test('passing through the centre does not jump', () => {
  const drag = dragFrom('09:00', 'minute', 0);
  C.moveDrag(drag, 30, 0.8);
  assert.strictEqual(drag.t, t('09:05'));
  C.moveDrag(drag, 120, 0.05);
  C.moveDrag(drag, 200, 0.1);
  assert.strictEqual(drag.t, t('09:05'));
  assert.strictEqual(C.moveDrag(drag, 210, 0.8), t('09:05'));
  assert.strictEqual(C.moveDrag(drag, 216, 0.8), t('09:06'));
});

test('the hour hand moves whole hours and keeps the minutes', () => {
  assert.strictEqual(sweep(dragFrom('09:20', 'hour', 280), 280, 310), t('10:20'));
  assert.strictEqual(sweep(dragFrom('09:20', 'hour', 280), 280, 220), t('07:20'));
});

test('the hour hand crosses midnight both ways', () => {
  assert.strictEqual(sweep(dragFrom('23:20', 'hour', 340), 340, 370), t('00:20'));
  assert.strictEqual(sweep(dragFrom('00:20', 'hour', 10), 10, -20), t('23:20'));
});

test('a full turn of the hour hand is twelve hours', () => {
  assert.strictEqual(sweep(dragFrom('03:00', 'hour', 90), 90, 450), t('15:00'));
});

test('pickHand: the outer ring is always the minute hand', () => {
  const geometry = { R: 100, hourLen: 50 };
  assert.strictEqual(C.pickHand(t('03:00'), 90, 200, geometry), 'minute');
});

test('pickHand: inside, the nearest hand; empty areas and the centre select nothing', () => {
  const geometry = { R: 100, hourLen: 50 };
  assert.strictEqual(C.pickHand(t('03:00'), 40, 95, geometry), 'hour');
  assert.strictEqual(C.pickHand(t('03:00'), 40, 350, geometry), 'minute');
  assert.strictEqual(C.pickHand(t('03:00'), 40, 200, geometry), null);
  assert.strictEqual(C.pickHand(t('03:00'), 10, 90, geometry), null);
});

test('pickHand: when the hands overlap, distance from the centre decides', () => {
  const geometry = { R: 100, hourLen: 50 };
  assert.strictEqual(C.pickHand(t('12:00'), 30, 0, geometry), 'hour');
  assert.strictEqual(C.pickHand(t('12:00'), 50, 0, geometry), 'minute');
});

test('nudge moves by hours or minutes, with wrap', () => {
  assert.strictEqual(C.nudge(t('23:30'), 'hour', 1), t('00:30'));
  assert.strictEqual(C.nudge(t('00:00'), 'minute', -1), t('23:59'));
  assert.strictEqual(C.nudge(t('09:00'), 'minute', 1, 5), t('09:05'));
});
