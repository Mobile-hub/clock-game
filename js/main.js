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

  function boot(loaded) {
    const stage = document.getElementById('stage');
    if (loaded.errors) return showErrors(stage, loaded.errors);
    clear(stage);
    RL.sprites.init(stage);
    const debug = params();
    const scene = RL.scene.create();
    stage.appendChild(scene.node);
    const t = debug.time !== undefined ? debug.time : T.parse('10:00');
    const event = S.at(loaded.schedule, t);
    scene.update(t, event, loaded.schedule.sun);
    document.body.dataset.time = T.format(t);
    document.body.dataset.scene = event.scene;
  }

  // Text is measured to lay out cards, so wait for the bundled fonts (with a timeout fallback).
  const fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('800 60px Nunito'), document.fonts.load('700 60px Fredoka')])
    : Promise.resolve();
  const fonts = Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  Promise.all([loadSchedule(), fonts]).then(([loaded]) => boot(loaded));
})(window);
