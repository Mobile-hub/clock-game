// Exercise generators: each kind returns a task with its prompt, what to show, the answer and plausible wrong options.
// Wrong options come from the mistakes children really make, never from random noise. Pure.
//
// task: { key, kind, mode, prompt, show: [{ type: 'analog'|'digital', t, label }], answer, answerType: 'time'|'duration',
//         mod, options: [{ label, value, clock }], step, start, explain: [lines] }
// Works in the browser (window.RL.exercises) and in node (module.exports) for tests.
(function (root) {
  const inNode = typeof module !== 'undefined' && module.exports;
  const T = inNode ? require('./timemath.js') : root.RL.timemath;
  const Say = inNode ? require('./spoken.js') : root.RL.spoken;
  const { shuffle } = inNode ? require('./deck.js') : root.RL.deck;

  const OPTION_COUNT = 4;
  const HANDS_NOTE = 'La aguja corta señala la hora y la larga, los minutos.';

  const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const intBelow = (n, rng) => Math.floor(rng() * n);

  // A dial has no 00: on 12-hour tasks, hour 0 is written as 12.
  function dialTime(t) {
    const h = T.hours(t) % 12;
    return (h === 0 ? 12 : h) * 60 + T.minutes(t);
  }

  function gridMinute(ctx) {
    const steps = 60 / ctx.level.grid;
    return intBelow(steps, ctx.rng) * ctx.level.grid;
  }

  function randomDialTime(ctx) {
    return (1 + intBelow(12, ctx.rng)) * 60 + gridMinute(ctx);
  }

  function randomAfternoonTime(ctx) {
    return (13 + intBelow(8, ctx.rng)) * 60 + gridMinute(ctx);
  }

  // The usual confusions when reading a clock.
  function timeCandidates(t, grid, mod, extra) {
    const h = T.hours(t);
    const m = T.minutes(t);
    const list = [
      T.add(t, 60), T.add(t, -60), // hour off by one: the hour hand is between two numbers
      T.add(t, 30), T.add(t, -30),
      T.make(h, 60 - m),           // y / menos mirror: 3:20 read as 3:40
      T.make(h, Math.floor(m / 5)), // the numeral read as minutes: the 4 of 3:20 read as 3:04
      T.add(t, 5), T.add(t, -5), T.add(t, 10), T.add(t, -10), T.add(t, 15), T.add(t, -15),
    ];
    if (m % 5 === 0) list.push(T.make(m === 0 ? 12 : m / 5, (h % 12) * 5)); // swapped hands
    if (extra) list.push(...extra, ...extra); // task-specific slips count double
    else if (mod === T.DAY) list.push(T.add(t, 720), T.add(t, 720)); // right dial, wrong half of the day
    return list.filter((c) => c % grid === 0);
  }

  function timeDistractors(t, ctx, mod, extra) {
    const grid = ctx.level.grid;
    const chosen = [];
    const seen = new Set([T.mod(t, mod)]);
    const take = (c) => {
      const value = mod === T.HALF_DAY ? dialTime(c) : c;
      const key = T.mod(value, mod);
      if (seen.has(key) || chosen.length >= OPTION_COUNT - 1) return;
      seen.add(key);
      chosen.push(value);
    };
    shuffle(timeCandidates(t, grid, mod, extra), ctx.rng).forEach(take);
    for (let i = 0; chosen.length < OPTION_COUNT - 1 && i < 200; i++) take(randomDialTime(ctx));
    return chosen;
  }

  // fields are copied onto each option; slips are extra wrong answers specific to the task.
  function timeOptions(t, ctx, mod, label, fields, slips) {
    const all = [t, ...timeDistractors(t, ctx, mod, slips)].map((value) => Object.assign({ label: label(value), value }, fields || {}));
    return shuffle(all, ctx.rng);
  }

  // ---------- durations ----------

  const pick = (list, rng) => list[intBelow(list.length, rng)];

  // The classic slip of subtracting clock times as if they were decimal: 10:10 − 9:50 = "60".
  function decimalDifference(a, b) {
    const asNumber = (t) => T.hours(t) * 100 + T.minutes(t);
    return asNumber(b) - asNumber(a);
  }

  function durationDistractors(d, ctx, a, b) {
    const g5 = Math.max(ctx.level.grid, 5);
    const candidates = [d + g5, d - g5, d + 2 * g5, d - 2 * g5, d + 60, d - 60, d + 15, d - 15, d + 30, d - 30, decimalDifference(a, b)];
    const seen = new Set([d]);
    const chosen = [];
    for (const c of shuffle(candidates, ctx.rng)) {
      if (c > 0 && c <= 360 && !seen.has(c) && chosen.length < OPTION_COUNT - 1) {
        seen.add(c);
        chosen.push(c);
      }
    }
    for (let extra = 1; chosen.length < OPTION_COUNT - 1; extra++) {
      const c = d + extra * 7;
      if (!seen.has(c)) {
        seen.add(c);
        chosen.push(c);
      }
    }
    return chosen;
  }

  function durationOptions(d, ctx, a, b, friendly) {
    const all = [d, ...durationDistractors(d, ctx, a, b)].map((value) => ({ label: Say.duration(value, friendly), value }));
    return shuffle(all, ctx.rng);
  }

  // A starting time during the school day and a span that suits the difficulty of the level.
  function randomInterval(ctx) {
    const { rng, level } = ctx;
    for (;;) {
      const a = (8 + intBelow(9, rng)) * 60 + gridMinute(ctx);
      let d;
      if (level.tier === 1) d = pick([30, 60, 90, 120, 150, 180], rng);
      else if (level.tier === 2) d = 5 * (3 + intBelow(22, rng));
      else d = 7 + intBelow(174, rng);
      const crossesHour = T.minutes(a) + d >= 60;
      if (level.tier === 3 && (!crossesHour || d % 5 === 0)) continue;
      if (level.crossHour && !crossesHour) continue;
      return { a, d, b: a + d };
    }
  }

  function explainSpan(a, b, d) {
    const lines = [`De ${T.format(a)} a ${T.format(b)} pasan ${Say.duration(d)}.`];
    const nextHour = (Math.floor(a / 60) + 1) * 60;
    if (T.minutes(a) !== 0 && b > nextHour) lines.push(`Truco: cuenta primero hasta las ${T.format(nextHour)} y luego el resto.`);
    return lines;
  }

  function explainSum(a, d, b) {
    return [`${T.format(a)} + ${Say.duration(d)} = ${T.format(b)}.`, 'Si los minutos pasan de 60, sumas una hora.'];
  }

  function explainDifference(b, d, a) {
    return [`${T.format(b)} − ${Say.duration(d)} = ${T.format(a)}.`, 'Si no llegan los minutos, pide prestada una hora: son 60 minutos.'];
  }

  // Forgetting to carry the hour: 9:50 + 30 minutes written as 9:20.
  function noCarry(a, d) {
    return T.make(T.hours(a), T.minutes(a) + (d % 60)) + Math.floor(d / 60) * 60;
  }

  function jumpsFor(level) {
    return level.tier === 3 ? [60, 30, 10, 5, 1] : [60, 30, 15, 5];
  }

  function explainTime(t) {
    return [HANDS_NOTE, `El reloj marca ${Say.clockPhrase(t)}: ${T.format(t)}.`];
  }

  function explain24(t) {
    const h = T.hours(t);
    return [`Por la tarde se suma 12 a la hora: ${h - 12} + 12 = ${h}.`, `${cap(Say.fullPhrase(t))}: ${T.format(t)}.`];
  }

  const KINDS = {
    // Read an analog clock and pick how it is said.
    readPhrase(ctx) {
      const t = randomDialTime(ctx);
      return {
        mode: 'choice', answer: t, answerType: 'time', mod: T.HALF_DAY,
        prompt: '¿Qué hora marca el reloj?',
        show: [{ type: 'analog', t }],
        options: timeOptions(t, ctx, T.HALF_DAY, (v) => cap(Say.clockPhrase(v))),
        explain: explainTime(t),
      };
    },
    // Read an analog clock and pick its digital form.
    readDigital(ctx) {
      const t = randomDialTime(ctx);
      return {
        mode: 'choice', answer: t, answerType: 'time', mod: T.HALF_DAY,
        prompt: '¿Qué reloj digital marca la misma hora?',
        show: [{ type: 'analog', t }],
        options: timeOptions(t, ctx, T.HALF_DAY, T.format),
        explain: explainTime(t),
      };
    },
    // Read a digital clock and pick the analog dial.
    digitalToAnalog(ctx) {
      const t = randomDialTime(ctx);
      return {
        mode: 'choice', answer: t, answerType: 'time', mod: T.HALF_DAY,
        prompt: '¿Qué reloj marca esta hora?',
        show: [{ type: 'digital', t }],
        options: timeOptions(t, ctx, T.HALF_DAY, () => '', { clock: true }),
        explain: explainTime(t),
      };
    },
    // Move the hands to a named time.
    setClock(ctx) {
      const t = randomDialTime(ctx);
      let start = randomDialTime(ctx);
      while (T.mod(start - t, T.HALF_DAY) === 0) start = dialTime(T.add(start, 60));
      return {
        mode: 'setclock', answer: t, answerType: 'time', mod: T.HALF_DAY, step: ctx.level.step, start,
        prompt: `Pon el reloj en ${Say.clockPhrase(t)}.`,
        show: [],
        explain: explainTime(t),
      };
    },
    // Say a 24-hour digital time, with its part of the day.
    phrase24(ctx) {
      const t = randomAfternoonTime(ctx);
      return {
        mode: 'choice', answer: t, answerType: 'time', mod: T.DAY,
        prompt: '¿Cómo se dice esta hora?',
        show: [{ type: 'digital', t }],
        options: timeOptions(t, ctx, T.DAY, (v) => cap(Say.fullPhrase(v))),
        explain: explain24(t),
      };
    },
    // Write an afternoon time in 24-hour format.
    type24(ctx) {
      const t = randomAfternoonTime(ctx);
      return {
        mode: 'digital', answer: t, answerType: 'time', mod: T.DAY,
        prompt: `Son ${Say.fullPhrase(t)}. Escríbelo en formato de 24 horas.`.replace(/^Son la /, 'Es la '),
        show: [{ type: 'analog', t }],
        explain: explain24(t),
      };
    },
  };

  // Starts at a, ends at b, how long? Shown as two clocks.
  function intervalTask(ctx, a, b, d, prompt, labels) {
    const type = ctx.level.tier === 1 ? 'analog' : 'digital';
    return {
      mode: 'choice', answer: d, answerType: 'duration', prompt,
      show: [{ type, t: a, label: labels[0] }, { type, t: b, label: labels[1] }],
      options: durationOptions(d, ctx, a, b, ctx.level.tier === 1),
      explain: explainSpan(a, b, d),
      detail: `${a}`,
    };
  }

  Object.assign(KINDS, {
    elapsedPair(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return intervalTask(ctx, a, b, d, '¿Cuánto tiempo pasa de un reloj al otro?', ['Empieza', 'Termina']);
    },
    // Hop along a timeline from the start to the end.
    elapsedTimeline(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return {
        mode: 'timeline', answer: d, answerType: 'duration', start: a, target: b, jumps: jumpsFor(ctx.level),
        prompt: `Salta de ${T.format(a)} a ${T.format(b)} por la línea del tiempo.`,
        show: [],
        explain: explainSpan(a, b, d),
        detail: `${a}`,
      };
    },
    addChoice(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return {
        mode: 'choice', answer: b, answerType: 'time', mod: T.DAY, start: a, duration: d,
        prompt: `Empieza a las ${T.format(a)} y dura ${Say.duration(d)}. ¿A qué hora termina?`,
        show: [{ type: 'digital', t: a }],
        options: timeOptions(b, ctx, T.DAY, T.format, null, [noCarry(a, d)]),
        explain: explainSum(a, d, b),
        detail: `${a}`,
      };
    },
    addSetClock(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return {
        mode: 'setclock', answer: dialTime(b), answerType: 'time', mod: T.HALF_DAY, step: ctx.level.step, start: dialTime(a), duration: d,
        prompt: `Empieza a las ${T.format(a)} y dura ${Say.duration(d)}. Pon el reloj en la hora de terminar.`,
        show: [],
        explain: explainSum(a, d, b),
        detail: `${a}`,
      };
    },
    addDigital(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return {
        mode: 'digital', answer: b, answerType: 'time', mod: T.DAY, start: a, duration: d,
        prompt: `Empieza a las ${T.format(a)} y dura ${Say.duration(d)}. Escribe a qué hora termina.`,
        show: [{ type: 'digital', t: a }],
        explain: explainSum(a, d, b),
        detail: `${a}`,
      };
    },
    subtractChoice(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return {
        mode: 'choice', answer: a, answerType: 'time', mod: T.DAY, end: b, duration: d,
        prompt: `Termina a las ${T.format(b)} y ha durado ${Say.duration(d)}. ¿A qué hora empezó?`,
        show: [{ type: 'digital', t: b }],
        options: timeOptions(a, ctx, T.DAY, T.format, null, [noCarry(b, 60 - (d % 60))]),
        explain: explainDifference(b, d, a),
        detail: `${b}`,
      };
    },
    subtractDigital(ctx) {
      const { a, b, d } = randomInterval(ctx);
      return {
        mode: 'digital', answer: a, answerType: 'time', mod: T.DAY, end: b, duration: d,
        prompt: `Termina a las ${T.format(b)} y ha durado ${Say.duration(d)}. Escribe a qué hora empezó.`,
        show: [{ type: 'digital', t: b }],
        explain: explainDifference(b, d, a),
        detail: `${b}`,
      };
    },
  });

  // Picks a kind from the level and avoids repeating an exercise already served in this level.
  function generate(level, rng, schedule, used) {
    const ctx = { level, rng, schedule };
    let task = null;
    for (let i = 0; i < 40; i++) {
      const kind = level.kinds[intBelow(level.kinds.length, rng)];
      task = KINDS[kind](ctx);
      task.kind = kind;
      task.key = `${kind}:${task.answer}:${task.detail || ''}`;
      if (!used || !used.has(task.key)) break;
    }
    return task;
  }

  function isCorrect(task, given) {
    if (given === null || given === undefined || Number.isNaN(given)) return false;
    return task.answerType === 'time' ? T.mod(given - task.answer, task.mod) === 0 : given === task.answer;
  }

  // Any value the game can pass as a wrong answer (the debug bot's misses).
  function wrongAnswer(task) {
    if (task.options) return task.options.find((o) => !isCorrect(task, o.value)).value;
    return task.answerType === 'time' ? T.add(task.answer, 60) : task.answer + 5;
  }

  const api = { KINDS, generate, isCorrect, wrongAnswer, dialTime };
  if (inNode) module.exports = api;
  else (root.RL = root.RL || {}).exercises = api;
})(typeof window !== 'undefined' ? window : globalThis);
