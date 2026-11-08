// The simulator: play with either clock and the classroom follows. On release, a soft "clonc" and a hanging sign.
(function (root) {
  const RL = root.RL;
  const { el, g, clear, wrap } = RL.svg;
  const { C, rect, button } = RL.sprites;
  const T = RL.timemath;
  const CM = RL.clockmath;
  const S = RL.schedule;
  const audio = RL.audio;

  const CARTEL_SECONDS = 7;
  const KEY_RELEASE_DELAY = 0.35; // keyboard has no "release": the sign comes once the keys stop
  const HOLD_DELAY = 0.4;
  const HOLD_REPEAT = 0.09;

  // onBack: called for the "Menú" button; layers: { scene, fixed, hud, overlay }.
  function create(layers, schedule, options) {
    let t = options.time !== undefined ? options.time : T.parse('10:00');
    let clock = 0;
    let unit = 'minute';
    let hold = null;
    let releaseAt = null;
    let hideAt = null;

    const scene = RL.scene.create();
    layers.scene.appendChild(scene.node);

    const analog = RL.clockface.analog({ x: 1105, y: 186, R: 128, t, interactive: true });
    const digital = RL.clockface.digital({ x: 1105, y: 435, t, interactive: true });
    layers.fixed.appendChild(analog.node);
    layers.fixed.appendChild(digital.node);

    layers.hud.appendChild(g({ transform: 'translate(80 690)', 'data-act': 'back', class: 'tappable' }, [button('Menú', 130, 48, C.cream, { scale: 3 })]));
    layers.hud.appendChild(el('text', { x: 570, y: 701, class: 'reading hint', 'text-anchor': 'middle', style: 'font-size:22px' }, 'Arrastra las agujas o toca los triángulos · Teclado: ← → ↑ ↓'));

    const cartelSlot = g({});
    layers.overlay.appendChild(cartelSlot);

    function setTime(next) {
      t = next;
      const event = S.at(schedule, t);
      scene.update(t, event, schedule.sun);
      analog.set(t);
      digital.set(t);
      document.body.dataset.time = T.format(t);
      document.body.dataset.scene = event.scene;
      document.body.dataset.event = event.id;
    }

    function drawCartel() {
      const event = S.at(schedule, t);
      const said = RL.spoken.say(t);
      const sayLines = wrap(said, 36);
      const eventLines = wrap(event.text, 50);
      const height = 34 + sayLines.length * 44 + eventLines.length * 34 + 10;
      const top = 22;
      const x0 = 110;
      const width = 720;
      const parts = [
        rect(x0 + 60, -10, 8, top + 12, C.woodDark), rect(x0 + width - 68, -10, 8, top + 12, C.woodDark),
        rect(x0 + 6, top + 7, width, height, C.ink),
        rect(x0, top, width, height, C.wood, { stroke: C.ink, 'stroke-width': 4 }),
        rect(x0 + 12, top + 12, width - 24, height - 24, C.cream, { stroke: C.ink, 'stroke-width': 3 }),
      ];
      let y = top + 52;
      for (const line of sayLines) {
        parts.push(el('text', { x: x0 + width / 2, y, class: 'reading', 'text-anchor': 'middle', style: 'font-size:34px' }, line));
        y += 44;
      }
      y -= 8;
      for (const line of eventLines) {
        parts.push(el('text', { x: x0 + width / 2, y, class: 'reading event-line', 'text-anchor': 'middle', style: 'font-size:26px' }, line));
        y += 34;
      }
      clear(cartelSlot).appendChild(g({ class: 'cartel' }, parts));
      document.body.dataset.cartel = `${said} · ${event.text}`;
      hideAt = clock + CARTEL_SECONDS;
    }

    function release() {
      releaseAt = null;
      audio.play('clonc');
      drawCartel();
    }

    function changed(next) {
      if (next === t) return;
      setTime(next);
      if (T.mod(next, 5) === 0) audio.play('tick');
    }

    function focus(next) {
      unit = next;
      digital.setFocus(unit);
    }

    function handle(a) {
      if (a.type === 'drag') {
        const result = analog.handleDrag(a);
        if (result === 'changed') changed(analog.t);
        else if (result === 'released') release();
        return null;
      }
      if (a.type === 'tap' && a.act === 'nudge') {
        const [which, dir] = a.arg.split(':');
        focus(which);
        changed(CM.nudge(t, which, Number(dir)));
        audio.play('tick');
        hold = { unit: which, dir: Number(dir), at: clock + HOLD_DELAY };
        return null;
      }
      if (a.type === 'release' && hold) {
        hold = null;
        release();
        return null;
      }
      if (a.type === 'key') {
        if (a.key === 'left' || a.key === 'right') {
          focus(unit === 'hour' ? 'minute' : 'hour');
          audio.play('move');
        } else if (a.key === 'up' || a.key === 'down') {
          focus(unit);
          changed(CM.nudge(t, unit, a.key === 'up' ? 1 : -1));
          releaseAt = clock + KEY_RELEASE_DELAY;
        } else if (a.key === 'pause') {
          return 'back';
        }
        return null;
      }
      if (a.type === 'tap' && a.act === 'back') return 'back';
      return null;
    }

    function update(dt) {
      clock += dt;
      if (hold && clock >= hold.at) {
        hold.at = clock + HOLD_REPEAT;
        changed(CM.nudge(t, hold.unit, hold.dir));
      }
      if (releaseAt !== null && clock >= releaseAt) release();
      if (hideAt !== null && clock >= hideAt) {
        hideAt = null;
        clear(cartelSlot);
      }
    }

    setTime(t);
    return { handle, update, get time() { return t; } };
  }

  RL.simulator = { create };
})(window);
