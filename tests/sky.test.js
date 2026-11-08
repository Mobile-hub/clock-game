// Tests for js/sky.js. Run: node tests/sky.test.js
const assert = require('assert');
const { test } = require('./harness.js');
const T = require('../js/timemath.js');
const Sky = require('../js/sky.js');

const t = T.parse;
const SUN = { sunrise: t('08:00'), sunset: t('18:00'), twilight: 40 };

test('phases through the day', () => {
  const rows = [['00:00', 'night'], ['07:19', 'night'], ['07:20', 'dawn'], ['07:59', 'dawn'], ['08:00', 'morning'],
    ['08:40', 'day'], ['12:00', 'day'], ['17:20', 'evening'], ['18:00', 'dusk'], ['18:39', 'dusk'], ['18:40', 'night'], ['23:59', 'night']];
  for (const [time, phase] of rows) assert.strictEqual(Sky.at(t(time), SUN).phase, phase, time);
});

test('brightness rises in the morning and falls in the evening, one step at a time', () => {
  let previous = Sky.at(0, SUN).step;
  for (let m = 1; m < T.DAY; m++) {
    const step = Sky.at(m, SUN).step;
    assert.ok(Math.abs(step - previous) <= 1, T.format(m));
    previous = step;
  }
});

test('the sun is highest halfway through the day', () => {
  const noon = Sky.at(t('13:00'), SUN);
  assert.strictEqual(noon.sun.x, 0.5);
  assert.strictEqual(noon.sun.y, 1);
  assert.ok(Sky.at(t('09:00'), SUN).sun.y < noon.sun.y);
});

test('the sun crosses from east to west', () => {
  assert.ok(Sky.at(t('09:00'), SUN).sun.x < Sky.at(t('17:00'), SUN).sun.x);
});

test('sun and moon are never up at once, and one of them always is', () => {
  for (let m = 0; m < T.DAY; m++) {
    const s = Sky.at(m, SUN);
    assert.ok(!!s.sun !== !!s.moon, T.format(m));
  }
});

test('the moon crosses the night sky, also after midnight', () => {
  const late = Sky.at(t('20:00'), SUN).moon.x;
  const early = Sky.at(t('04:00'), SUN).moon.x;
  assert.ok(late > 0 && late < early && early < 1);
});

test('zero twilight still gives a consistent day', () => {
  const sun = { sunrise: t('08:00'), sunset: t('18:00'), twilight: 0 };
  assert.strictEqual(Sky.at(t('07:59'), sun).phase, 'night');
  assert.strictEqual(Sky.at(t('08:00'), sun).phase, 'day');
  assert.strictEqual(Sky.at(t('18:00'), sun).phase, 'night');
});

test('room lights: only with people inside and dark outside', () => {
  assert.strictEqual(Sky.lightsOn('lesson', 1), true);
  assert.strictEqual(Sky.lightsOn('arrival', 2), true);
  assert.strictEqual(Sky.lightsOn('lesson', 4), false);
  assert.strictEqual(Sky.lightsOn('empty', 0), false);
  assert.strictEqual(Sky.lightsOn('dark', 0), false);
});
