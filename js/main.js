// Boot: load and validate the timetable, build the SVG layers, wait for the fonts and start.
(function (root) {
  const RL = root.RL;
  const { el, clear } = RL.svg;
  const T = RL.timemath;
  const S = RL.schedule;

  function params() {
    const q = new URLSearchParams(location.search);
    const out = {};
    if (q.has('time') && !Number.isNaN(T.parse(q.get('time')))) out.time = T.parse(q.get('time'));
    if (q.has('sim')) out.sim = Number(q.get('sim')) || 0;
    if (/^(minute|hour):-?\d+(,-?\d+)+$/.test(q.get('drag') || '')) out.drag = q.get('drag');
    return out;
  }

  window.addEventListener('error', (e) => {
    document.body.dataset.error = `${e.message} @ ${e.filename}:${e.lineno}`;
  });

  async function loadSchedule() {
    let data;
    try {
      const response = await fetch('data/schedule.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      data = await response.json();
    } catch (e) {
      return { errors: ['No se ha podido leer data/schedule.json.', 'Abre el juego con «make serve», no con doble clic.', 'Si editaste el archivo, revisa que sea un JSON correcto.'] };
    }
    const errors = S.validate(data);
    return errors.length ? { errors } : { schedule: S.build(data) };
  }

  function showErrors(stage, errors) {
    clear(stage);
    document.body.dataset.error = errors.join(' | ');
    stage.appendChild(el('rect', { x: 0, y: 0, width: 1280, height: 720, fill: '#fbf7ea' }));
    stage.appendChild(el('text', { x: 640, y: 120, class: 'reading', 'text-anchor': 'middle', style: 'font-size:48px' }, 'El horario tiene un problema'));
    errors.slice(0, 10).forEach((line, i) => {
      stage.appendChild(el('text', { x: 640, y: 210 + i * 46, class: 'reading', 'text-anchor': 'middle', style: 'font-size:28px' }, line));
    });
  }

  // ?drag=minute:0,90,180,360 sweeps a hand through those angles with real pointer events (dev only).
  function scriptedDrag(stage, spec) {
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
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: p.x, clientY: p.y, pointerId: 7, pointerType: 'touch', isPrimary: true }));
    };
    fire('pointerdown', angles[0], dial);
    for (let i = 1; i < angles.length; i++) {
      const from = angles[i - 1];
      const n = Math.max(1, Math.ceil(Math.abs(angles[i] - from) / 20));
      for (let k = 1; k <= n; k++) fire('pointermove', from + ((angles[i] - from) * k) / n, stage);
    }
    fire('pointerup', angles[angles.length - 1], stage);
  }

  function boot(loaded) {
    const stage = document.getElementById('stage');
    if (loaded.errors) return showErrors(stage, loaded.errors);
    clear(stage);
    RL.sprites.init(stage);
    const layers = {};
    for (const name of ['bg', 'scene', 'fixed', 'fx', 'hud', 'overlay']) {
      layers[name] = el('g', { id: name });
      stage.appendChild(layers[name]);
    }
    const debug = params();
    RL.input.init(stage, () => RL.audio.unlock());
    const simulator = RL.simulator.create(layers, loaded.schedule, { time: debug.time });
    RL.input.onAction((a) => simulator.handle(a));
    const tick = (dt) => {
      RL.input.flush();
      simulator.update(dt);
    };
    if (debug.drag) scriptedDrag(stage, debug.drag);

    // ?sim=N: simulate N seconds in fixed steps (headless browsers do not run animation frames).
    if (debug.sim) {
      let steps = Math.round(debug.sim * 30);
      const chunk = () => {
        try {
          for (let i = 0; i < 300 && steps > 0; i++, steps--) tick(1 / 30);
        } catch (e) {
          document.body.dataset.error = e.stack;
          steps = 0;
        }
        if (steps > 0) setTimeout(chunk, 0);
        else document.body.dataset.simDone = '1';
      };
      setTimeout(chunk, 0);
      return;
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(dt);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Text is measured to lay out cards, so wait for the bundled fonts (with a timeout fallback).
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('800 60px Nunito'), document.fonts.load('700 60px Fredoka')])
    : Promise.resolve();
  const fonts = Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  Promise.all([loadSchedule(), fonts]).then(([loaded]) => boot(loaded));
})(window);
