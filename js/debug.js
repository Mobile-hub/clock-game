// Dev-only helpers for headless checks: they drive the game through real DOM events, as a child would.
(function (root) {
  const RL = root.RL;
  const T = RL.timemath;

  function pointer(type, target, x, y) {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x || 0, clientY: y || 0, pointerId: 7, pointerType: 'touch', isPrimary: true }));
  }

  function press(key) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  function tap(stage, act, arg) {
    const selector = arg === undefined ? `[data-act="${act}"]` : `[data-act="${act}"][data-arg="${arg}"]`;
    const node = stage.querySelector(selector);
    pointer('pointerdown', node);
    pointer('pointerup', stage);
  }

  // ?drag=minute:0,90,180,360 sweeps a hand through those angles.
  function drag(stage, spec) {
    const [hand, list] = spec.split(':');
    const angles = list.split(',').map(Number);
    const dial = stage.querySelector('[data-drag]');
    const cx = Number(dial.dataset.cx);
    const cy = Number(dial.dataset.cy);
    const radius = Number(dial.dataset.r) * (hand === 'hour' ? 0.4 : 0.8);
    const screen = stage.getScreenCTM();
    const fire = (type, angle, target) => {
      const a = (angle * Math.PI) / 180;
      const p = new DOMPoint(cx + Math.sin(a) * radius, cy - Math.cos(a) * radius).matrixTransform(screen);
      pointer(type, target, p.x, p.y);
    };
    fire('pointerdown', angles[0], dial);
    for (let i = 1; i < angles.length; i++) {
      const from = angles[i - 1];
      const n = Math.max(1, Math.ceil(Math.abs(angles[i] - from) / 20));
      for (let k = 1; k <= n; k++) fire('pointermove', from + ((angles[i] - from) * k) / n, stage);
    }
    fire('pointerup', angles[angles.length - 1], stage);
  }

  function digitsOf(t) {
    return T.format(t).replace(':', '').split('');
  }

  function nudgeClockWithKeys(task) {
    const delta = T.mod(task.answer - task.start, task.mod);
    for (let i = 0; i < (delta % 60) / task.step; i++) press('ArrowUp');
    press('ArrowLeft');
    for (let i = 0; i < Math.floor(delta / 60); i++) press('ArrowUp');
  }

  function jumpsToTarget(task) {
    const presses = [];
    let left = task.answer;
    task.jumps.forEach((m, i) => {
      while (left >= m) {
        presses.push(i + 1);
        left -= m;
      }
    });
    return presses;
  }

  const SOLVE_WITH_KEYS = {
    choice(task) { press(String(task.options.findIndex((o) => o.value === task.answer) + 1)); },
    digital(task) { digitsOf(task.answer).forEach(press); press('Enter'); },
    setclock(task) { nudgeClockWithKeys(task); press('Enter'); },
    timeline(task) { jumpsToTarget(task).forEach((n) => press(String(n))); press('Enter'); },
  };

  const SOLVE_WITH_TAPS = {
    choice(task, stage) { tap(stage, 'opt', task.options.findIndex((o) => o.value === task.answer)); },
    digital(task, stage) { digitsOf(task.answer).forEach((d) => tap(stage, 'pad', d)); tap(stage, 'pad', 'ok'); },
    setclock(task, stage) { nudgeClockWithKeys(task); tap(stage, 'check'); },
    timeline(task, stage) { jumpsToTarget(task).forEach((n) => tap(stage, 'jump', task.jumps[n - 1])); tap(stage, 'check'); },
  };

  // ?solve=keys|taps answers the current exercise right; ?solve=wrong taps a wrong option of a multiple-choice one.
  function solve(stage, how) {
    const task = RL.game.task;
    if (how === 'wrong') return tap(stage, 'opt', task.options.findIndex((o) => o.value !== task.answer));
    return (how === 'keys' ? SOLVE_WITH_KEYS : SOLVE_WITH_TAPS)[task.mode](task, stage);
  }

  RL.debug = { drag, solve };
})(window);
