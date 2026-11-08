// Write the time on a digital clock with the keypad or the number keys.
(function (root) {
  const RL = root.RL;
  const { el, g } = RL.svg;
  const { C, rect, button } = RL.sprites;
  const { displayClocks, restartClass } = RL.modes.common;
  const T = RL.timemath;

  const PAD_X = [780, 900, 1020];
  const PAD_Y = [352, 424, 496, 568];
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'erase', '0', 'ok'];

  // Only digits that can still make a valid HH:MM are accepted.
  function accepts(digits, d) {
    if (digits.length === 0) return d <= 2;
    if (digits.length === 1) return digits[0] !== '2' || d <= 3;
    if (digits.length === 2) return d <= 5;
    return digits.length === 3;
  }

  function padKey(key, i) {
    const x = PAD_X[i % 3];
    const y = PAD_Y[Math.floor(i / 3)];
    const label = key === 'erase' ? 'Borrar' : key === 'ok' ? 'OK' : key;
    const fill = key === 'ok' ? C.leafLight : key === 'erase' ? C.pink : C.cream;
    return g({ transform: `translate(${x} ${y})`, 'data-act': 'pad', 'data-arg': key, class: 'tappable' }, [button(label, 108, 62, fill, { read: true, size: key.length > 1 ? 24 : 34 })]);
  }

  function build(task) {
    let digits = '';
    const entry = el('text', { x: 900, y: 298, class: 'lcd-text', 'text-anchor': 'middle' }, '__:__');
    const panel = g({}, [rect(750, 240, 300, 76, C.lcd, { stroke: C.ink, 'stroke-width': 4 }), entry]);
    const render = () => {
      const shown = digits.padEnd(4, '_');
      entry.textContent = `${shown.slice(0, 2)}:${shown.slice(2)}`;
    };
    const press = (d) => {
      if (!accepts(digits, Number(d))) return null;
      digits += d;
      render();
      return { moved: true };
    };
    const erase = () => {
      digits = digits.slice(0, -1);
      render();
      return { moved: true };
    };
    const submit = () => (digits.length === 4 ? { choice: T.parse(`${digits.slice(0, 2)}:${digits.slice(2)}`) } : null);
    return {
      node: g({}, [displayClocks(task), panel, ...KEYS.map(padKey)]),
      keysHelp: 'Toca los números o usa el teclado · Borrar para corregir · Enter o OK',
      handle(a) {
        if (a.type === 'digit') return press(String(a.n));
        if (a.type === 'key' && a.key === 'erase') return erase();
        if (a.type === 'key' && a.key === 'ok') return submit();
        if (a.type === 'tap' && a.act === 'pad') {
          if (a.arg === 'erase') return erase();
          if (a.arg === 'ok') return submit();
          return press(a.arg);
        }
        return null;
      },
      celebrate(ok) {
        restartClass(panel, ok ? 'good' : 'wrong');
      },
      correctChoice: () => task.answer,
    };
  }

  RL.modes.digital = { build };
})(window);
