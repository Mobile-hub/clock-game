// Set the clock: move the hands to the time asked for, then check.
(function (root) {
  const RL = root.RL;
  const { el, g } = RL.svg;
  const { C, button } = RL.sprites;
  const { restartClass } = RL.modes.common;
  const CF = RL.clockface;
  const CM = RL.clockmath;
  const T = RL.timemath;
  const audio = RL.audio;

  const UNIT_TEXT = { hour: 'Teclado: mueves la aguja de las HORAS', minute: 'Teclado: mueves la aguja de los MINUTOS' };

  function build(task) {
    const analog = CF.analog({ x: 420, y: 430, R: 175, t: task.start, interactive: true, step: task.step });
    const check = g({ transform: 'translate(910 400)', 'data-act': 'check', class: 'tappable' }, [button('Comprobar', 340, 96, C.leafLight, { scale: 5 })]);
    let unit = 'minute';
    const unitText = el('text', { x: 910, y: 510, class: 'reading', 'text-anchor': 'middle', style: 'font-size:24px' }, UNIT_TEXT[unit]);
    return {
      node: g({}, [analog.node, check, unitText]),
      keysHelp: 'Arrastra las agujas · Teclado: ← → eliges aguja, ↑ ↓ la mueves, Enter comprueba',
      handle(a) {
        if (a.type === 'drag') {
          const result = analog.handleDrag(a);
          if (result === 'changed' && T.mod(analog.t, 5) === 0) audio.play('tick');
          else if (result === 'released') audio.play('clonc');
          return null;
        }
        if ((a.type === 'tap' && a.act === 'check') || (a.type === 'key' && a.key === 'ok')) return { choice: analog.t };
        if (a.type === 'key' && (a.key === 'left' || a.key === 'right')) {
          unit = unit === 'hour' ? 'minute' : 'hour';
          unitText.textContent = UNIT_TEXT[unit];
          return { moved: true };
        }
        if (a.type === 'key' && (a.key === 'up' || a.key === 'down')) {
          analog.set(CM.nudge(analog.t, unit, a.key === 'up' ? 1 : -1, task.step));
          audio.play('tick');
          return null;
        }
        return null;
      },
      celebrate(ok) {
        restartClass(analog.node, ok ? 'good' : 'wrong');
      },
      correctChoice: () => task.answer,
    };
  }

  RL.modes.setclock = { build };
})(window);
