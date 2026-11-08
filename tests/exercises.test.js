// Tests for js/exercises.js and js/deck.js over many seeds. Run: node tests/exercises.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { test } = require('./harness.js');
const T = require('../js/timemath.js');
const D = require('../js/deck.js');
const E = require('../js/exercises.js');
const L = require('../js/levels.js');
const S = require('../js/schedule.js');

const schedule = S.build(JSON.parse(fs.readFileSync(path.join(__dirname, '../data/schedule.json'), 'utf8')));
const SEEDS = 1000;

function forEachTask(check) {
  for (const level of L.LEVELS) {
    for (let seed = 0; seed < SEEDS; seed++) {
      const task = E.generate(level, D.makeRng(seed), schedule);
      check(task, level, seed);
    }
  }
}

const where = (task, seed) => `${task.kind} seed ${seed}: ${JSON.stringify(task)}`;

test('every task has a prompt, an explanation and a valid mode', () => {
  forEachTask((task, level, seed) => {
    assert.ok(typeof task.prompt === 'string' && task.prompt.length > 3, where(task, seed));
    assert.ok(Array.isArray(task.explain) && task.explain.length > 0, where(task, seed));
    assert.ok(['choice', 'setclock', 'digital', 'timeline'].includes(task.mode), where(task, seed));
    assert.ok(!/undefined|NaN/.test(JSON.stringify(task)), where(task, seed));
  });
});

test('multiple choice: four different options, exactly one correct', () => {
  forEachTask((task, level, seed) => {
    if (task.mode !== 'choice') return;
    assert.strictEqual(task.options.length, 4, where(task, seed));
    assert.strictEqual(task.options.filter((o) => E.isCorrect(task, o.value)).length, 1, where(task, seed));
    const labels = task.options.filter((o) => !o.clock).map((o) => o.label);
    assert.strictEqual(new Set(labels).size, labels.length, where(task, seed));
    if (task.answerType === 'time') {
      const keys = task.options.map((o) => T.mod(o.value, task.mod));
      assert.strictEqual(new Set(keys).size, 4, where(task, seed));
    }
  });
});

test('options and answers stay on the grid of the level', () => {
  forEachTask((task, level, seed) => {
    if (task.answerType !== 'time') return;
    assert.strictEqual(task.answer % level.grid, 0, where(task, seed));
    (task.options || []).forEach((o) => assert.strictEqual(o.value % level.grid, 0, where(task, seed)));
  });
});

test('a 12-hour dial never offers an hour 00', () => {
  forEachTask((task, level, seed) => {
    if (task.mode !== 'choice' || task.mod !== T.HALF_DAY) return;
    task.options.forEach((o) => assert.ok(!/^00:/.test(T.format(o.value)), where(task, seed)));
  });
});

test('setting the clock never starts on the answer and can reach it', () => {
  forEachTask((task, level, seed) => {
    if (task.mode !== 'setclock') return;
    assert.notStrictEqual(T.mod(task.start - task.answer, task.mod), 0, where(task, seed));
    assert.strictEqual(task.answer % task.step, 0, where(task, seed));
  });
});

test('24-hour tasks are in the afternoon', () => {
  forEachTask((task, level, seed) => {
    if (task.kind !== 'phrase24' && task.kind !== 'type24') return;
    assert.ok(task.answer >= T.parse('13:00'), where(task, seed));
    assert.strictEqual(task.mod, T.DAY, where(task, seed));
  });
});

test('isCorrect compares a dial modulo twelve hours and the digital clock modulo a day', () => {
  const dial = { answerType: 'time', answer: T.parse('03:20'), mod: T.HALF_DAY };
  const day = { answerType: 'time', answer: T.parse('15:20'), mod: T.DAY };
  assert.ok(E.isCorrect(dial, T.parse('15:20')));
  assert.ok(!E.isCorrect(day, T.parse('03:20')));
  assert.ok(E.isCorrect(day, T.parse('15:20')));
  assert.ok(!E.isCorrect(dial, null));
});

test('the wrong answer used by the bot is really wrong', () => {
  forEachTask((task, level, seed) => {
    assert.ok(!E.isCorrect(task, E.wrongAnswer(task)), where(task, seed));
  });
});

test('generate avoids repeating served exercises', () => {
  const level = L.LEVELS[2];
  const rng = D.makeRng(5);
  const used = new Set();
  for (let i = 0; i < 12; i++) {
    const task = E.generate(level, rng, schedule, used);
    assert.ok(!used.has(task.key), task.key);
    used.add(task.key);
  }
});

function playDeck(miss) {
  const level = { goal: 3 };
  let id = 0;
  const deck = new D.Deck(level, D.makeRng(1), () => ({ key: String(id++) }));
  let turns = 0;
  while (!deck.done && turns++ < 50) {
    const task = deck.next();
    deck.answer(task, !miss(task));
  }
  return { deck, turns };
}

test('deck: a clean run ends at the goal with three stars', () => {
  const { deck, turns } = playDeck(() => false);
  assert.strictEqual(turns, 3);
  assert.strictEqual(deck.stars, 3);
});

test('deck: a missed exercise comes back and must be solved', () => {
  let missed = false;
  const { deck } = playDeck((task) => {
    if (task.key === '1' && !missed) {
      missed = true;
      return true;
    }
    return false;
  });
  assert.strictEqual(deck.misses, 1);
  assert.strictEqual(deck.stars, 2);
  assert.ok(deck.done);
});

test('deck: many misses still end with one star', () => {
  const seen = new Set();
  const { deck } = playDeck((task) => {
    if (seen.has(task.key)) return false;
    seen.add(task.key);
    return true;
  });
  assert.strictEqual(deck.stars, 1);
  assert.ok(deck.done);
});

test('there are three worlds of three levels', () => {
  assert.strictEqual(L.WORLDS.length, 3);
  assert.strictEqual(L.LEVELS.length, 9);
  L.WORLDS.forEach((w, i) => assert.strictEqual(L.LEVELS.filter((l) => l.world === i).length, 3));
});

test('every kind named by a level exists', () => {
  L.LEVELS.forEach((l) => l.kinds.forEach((k) => assert.ok(E.KINDS[k], k)));
});

test('duration options are positive, different and contain the answer once', () => {
  forEachTask((task, level, seed) => {
    if (task.answerType !== 'duration' || task.mode !== 'choice') return;
    const values = task.options.map((o) => o.value);
    assert.ok(values.every((v) => v > 0), where(task, seed));
    assert.strictEqual(new Set(values).size, 4, where(task, seed));
    assert.ok(values.includes(task.answer), where(task, seed));
  });
});

test('intervals agree with their clocks', () => {
  forEachTask((task, level, seed) => {
    if (task.kind !== 'elapsedPair') return;
    assert.strictEqual(T.diff(task.show[0].t, task.show[1].t), task.answer, where(task, seed));
  });
});

test('timelines can reach the end with the available jumps', () => {
  forEachTask((task, level, seed) => {
    if (task.mode !== 'timeline') return;
    const finest = Math.min(...task.jumps);
    assert.strictEqual(task.answer % finest, 0, where(task, seed));
    assert.strictEqual(task.target - task.start, task.answer, where(task, seed));
  });
});

test('level 6 always crosses an hour and is not on the five-minute grid', () => {
  for (let seed = 0; seed < SEEDS; seed++) {
    const task = E.generate(L.LEVELS[5], D.makeRng(seed), schedule);
    const a = task.mode === 'timeline' ? task.start : task.show[0].t;
    assert.ok(T.minutes(a) + task.answer >= 60, where(task, seed));
    assert.notStrictEqual(task.answer % 5, 0, where(task, seed));
  }
});

test('sums and differences are arithmetically right', () => {
  forEachTask((task, level, seed) => {
    if (task.kind.startsWith('add') && task.mode !== 'setclock') assert.strictEqual(T.add(task.start, task.duration), task.answer, where(task, seed));
    if (task.kind.startsWith('subtract')) assert.strictEqual(T.add(task.end, -task.duration), task.answer, where(task, seed));
  });
});

test('arithmetic stays within the school day', () => {
  forEachTask((task, level, seed) => {
    if (!task.kind.startsWith('add') && !task.kind.startsWith('subtract')) return;
    const times = task.mode === 'setclock' ? [] : [task.answer, task.start === undefined ? task.end : task.start];
    times.forEach((v) => assert.ok(v >= 480 && v < 1320, where(task, seed)));
  });
});

test('level 8 always crosses the hour', () => {
  for (let seed = 0; seed < SEEDS; seed++) {
    const task = E.generate(L.LEVELS[7], D.makeRng(seed), schedule);
    assert.ok(T.minutes(T.parse('00:00') + (task.start % 60)) + task.duration >= 60, where(task, seed));
  }
});
