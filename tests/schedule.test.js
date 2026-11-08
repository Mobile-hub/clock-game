// Tests for js/schedule.js and for the committed data/schedule.json. Run: node tests/schedule.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test } = require('./harness.js');
const T = require('../js/timemath.js');
const S = require('../js/schedule.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/schedule.json'), 'utf8'));
const schedule = S.build(data);
const t = T.parse;

const copy = () => JSON.parse(JSON.stringify(data));

function errorsAfter(change) {
  const broken = copy();
  change(broken);
  return S.validate(broken).join(' | ');
}

test('the committed schedule is valid', () => {
  assert.deepStrictEqual(S.validate(data), []);
});

test('the published timetable of the school', () => {
  assert.strictEqual(S.startOf(schedule, 'morningLessons'), t('09:00'));
  assert.strictEqual(S.startOf(schedule, 'lunch'), t('12:30'));
  assert.strictEqual(S.startOf(schedule, 'afternoonLessons'), t('14:30'));
  assert.strictEqual(S.startOf(schedule, 'schoolOut'), t('16:00'));
});

test('at returns the event in force, including its edges', () => {
  assert.strictEqual(S.at(schedule, t('00:00')).id, 'midnight');
  assert.strictEqual(S.at(schedule, t('08:59')).id, 'arrival');
  assert.strictEqual(S.at(schedule, t('09:00')).id, 'morningLessons');
  assert.strictEqual(S.at(schedule, t('12:29')).id, 'afterRecess');
  assert.strictEqual(S.at(schedule, t('12:30')).id, 'lunch');
  assert.strictEqual(S.at(schedule, t('23:59')).id, 'nightfall');
});

test('durationOf measures up to the next event, and the last one up to midnight', () => {
  assert.strictEqual(S.durationOf(schedule, 'recess'), 30);
  assert.strictEqual(S.durationOf(schedule, 'lunch'), 120);
  assert.strictEqual(S.durationOf(schedule, 'nightfall'), T.DAY - t('20:00'));
});

test('rejects a wrong version and a missing file body', () => {
  assert.match(errorsAfter((d) => { d.version = 2; }), /version/);
  assert.notDeepStrictEqual(S.validate(null), []);
});

test('rejects a day that does not start at 00:00', () => {
  assert.match(errorsAfter((d) => { d.events.shift(); }), /00:00/);
});

test('rejects unordered or repeated times', () => {
  assert.match(errorsAfter((d) => { d.events[3].time = '08:00'; }), /orden creciente/);
  assert.match(errorsAfter((d) => { d.events[4].time = d.events[3].time; }), /orden creciente/);
});

test('rejects malformed times, unknown scenes and bad texts', () => {
  assert.match(errorsAfter((d) => { d.events[2].time = '9:00'; }), /HH:MM/);
  assert.match(errorsAfter((d) => { d.events[2].scene = 'fiesta'; }), /fiesta/);
  assert.match(errorsAfter((d) => { d.events[2].text = ''; }), /caracteres/);
  assert.match(errorsAfter((d) => { d.events[2].text = 'x'.repeat(61); }), /caracteres/);
});

test('rejects repeated ids and missing required events', () => {
  assert.match(errorsAfter((d) => { d.events[2].id = d.events[1].id; }), /repetido/);
  assert.match(errorsAfter((d) => { d.events = d.events.filter((e) => e.id !== 'lunch'); }), /"lunch"/);
});

test('rejects an impossible sun', () => {
  assert.match(errorsAfter((d) => { d.sun.sunrise = '20:00'; }), /antes de ponerse/);
  assert.match(errorsAfter((d) => { d.sun.twilightMinutes = 500; }), /twilightMinutes/);
  assert.match(errorsAfter((d) => { d.sun.sunset = '23:50'; }), /mismo día/);
  assert.match(errorsAfter((d) => { delete d.sun; }), /sun/);
});

test('reports every problem at once', () => {
  const broken = copy();
  broken.version = 9;
  broken.events[2].scene = 'x';
  assert.ok(S.validate(broken).length >= 2);
});
