// Table tests for how times and durations are said in Spanish. Run: node tests/spoken.test.js
const assert = require('assert');
const { test } = require('./harness.js');
const T = require('../js/timemath.js');
const S = require('../js/spoken.js');

const t = T.parse;

function table(fn, rows) {
  for (const [input, expected] of rows) assert.strictEqual(fn(t(input)), expected, input);
}

test('o\'clock and the singular "la una"', () => {
  table(S.clockPhrase, [
    ['03:00', 'las tres en punto'],
    ['15:00', 'las tres en punto'],
    ['01:00', 'la una en punto'],
    ['13:00', 'la una en punto'],
    ['12:00', 'las doce en punto'],
    ['00:00', 'las doce en punto'],
  ]);
});

test('"y" up to the half hour, with cuarto and media', () => {
  table(S.clockPhrase, [
    ['10:05', 'las diez y cinco'],
    ['10:15', 'las diez y cuarto'],
    ['10:20', 'las diez y veinte'],
    ['10:25', 'las diez y veinticinco'],
    ['10:30', 'las diez y media'],
    ['01:30', 'la una y media'],
  ]);
});

test('"menos" from minute 31 on, naming the next hour', () => {
  table(S.clockPhrase, [
    ['10:31', 'las once menos veintinueve minutos'],
    ['10:35', 'las once menos veinticinco'],
    ['10:40', 'las once menos veinte'],
    ['10:45', 'las once menos cuarto'],
    ['10:55', 'las once menos cinco'],
    ['12:45', 'la una menos cuarto'],
    ['00:45', 'la una menos cuarto'],
    ['11:40', 'las doce menos veinte'],
    ['23:40', 'las doce menos veinte'],
  ]);
});

test('minutes that are not multiples of five, with their accents and apocopes', () => {
  table(S.clockPhrase, [
    ['08:01', 'las ocho y un minuto'],
    ['08:07', 'las ocho y siete minutos'],
    ['08:16', 'las ocho y dieciséis minutos'],
    ['08:21', 'las ocho y veintiún minutos'],
    ['08:22', 'las ocho y veintidós minutos'],
    ['08:23', 'las ocho y veintitrés minutos'],
    ['08:26', 'las ocho y veintiséis minutos'],
    ['08:59', 'las nueve menos un minuto'],
    ['08:39', 'las nueve menos veintiún minutos'],
  ]);
});

test('the part of the day follows the real time', () => {
  table(S.dayPart, [
    ['00:00', 'de la noche'],
    ['00:59', 'de la noche'],
    ['01:00', 'de la madrugada'],
    ['05:59', 'de la madrugada'],
    ['06:00', 'de la mañana'],
    ['11:59', 'de la mañana'],
    ['12:00', 'del mediodía'],
    ['12:59', 'del mediodía'],
    ['13:00', 'de la tarde'],
    ['20:59', 'de la tarde'],
    ['21:00', 'de la noche'],
    ['23:59', 'de la noche'],
  ]);
});

test('full sentences agree in number with the hour', () => {
  table(S.say, [
    ['09:00', 'Son las nueve en punto de la mañana'],
    ['13:15', 'Es la una y cuarto de la tarde'],
    ['12:45', 'Es la una menos cuarto del mediodía'],
    ['14:40', 'Son las tres menos veinte de la tarde'],
    ['00:30', 'Son las doce y media de la noche'],
    ['00:45', 'Es la una menos cuarto de la noche'],
  ]);
});

test('every minute of the day produces a phrase with no gaps', () => {
  for (let m = 0; m < T.DAY; m++) {
    const said = S.say(m);
    assert.ok(/^(Es la|Son las) /.test(said), said);
    assert.ok(!/undefined| {2}/.test(said), said);
  }
});

test('durations in hours and minutes', () => {
  const rows = [[0, '0 minutos'], [1, '1 minuto'], [45, '45 minutos'], [60, '1 hora'], [61, '1 hora y 1 minuto'],
    [90, '1 hora y 30 minutos'], [120, '2 horas'], [135, '2 horas y 15 minutos']];
  for (const [m, text] of rows) assert.strictEqual(S.duration(m), text, String(m));
});

test('friendly durations use the everyday words', () => {
  const rows = [[15, 'un cuarto de hora'], [30, 'media hora'], [45, 'tres cuartos de hora'], [60, 'una hora'],
    [75, 'una hora y cuarto'], [90, 'una hora y media'], [120, 'dos horas'], [150, 'dos horas y media'], [50, '50 minutos']];
  for (const [m, text] of rows) assert.strictEqual(S.duration(m, true), text, String(m));
});
