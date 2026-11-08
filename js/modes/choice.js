// Multiple choice: four sentences or times, or four small dials.
(function (root) {
  const RL = root.RL;
  const { el, g, textWidth } = RL.svg;
  const { C, button, rect } = RL.sprites;
  const { displayClocks, restartClass, caret } = RL.modes.common;
  const CF = RL.clockface;

  const COLORS = [C.sky, C.gold, C.leafLight, C.pink];
  const TEXT_W = 660;
  const TEXT_H = 74;

  function fit(label, maxWidth, size) {
    const w = textWidth(label, size, 800);
    return w > maxWidth ? Math.floor((size * maxWidth) / w) : size;
  }

  function textOption(option, i) {
    return g({ transform: `translate(880 ${270 + i * 88})`, 'data-act': 'opt', 'data-arg': i, class: 'tappable' }, [
      button(option.label, TEXT_W, TEXT_H, COLORS[i], { read: true, size: fit(option.label, TEXT_W - 110, 32) }),
      el('text', { x: -TEXT_W / 2 + 34, y: 10, class: 'reading key-badge', 'text-anchor': 'middle', style: 'font-size:26px' }, String(i + 1)),
      caret(-TEXT_W / 2 + 20, TEXT_H / 2 + 5, TEXT_W - 40),
    ]);
  }

  function clockOption(option, i) {
    const x = 740 + (i % 2) * 250;
    const y = 318 + Math.floor(i / 2) * 200;
    return g({ 'data-act': 'opt', 'data-arg': i, class: 'tappable option-clock' }, [
      rect(x - 118, y - 106, 236, 212, 'transparent'),
      CF.analog({ x, y, R: 88, t: option.value }).node,
      el('text', { x: x - 106, y: y - 74, class: 'reading key-badge', 'text-anchor': 'middle', style: 'font-size:26px' }, String(i + 1)),
      caret(x - 80, y + 102, 160),
    ]);
  }

  function build(task) {
    const nodes = task.options.map((o, i) => (o.clock ? clockOption(o, i) : textOption(o, i)));
    const node = g({}, [displayClocks(task), ...nodes]);
    // Nothing is preselected: the blinking underline only appears once the arrows are used.
    let cursor = -1;
    const setCursor = (i) => {
      cursor = (i + nodes.length) % nodes.length;
      nodes.forEach((n, k) => n.querySelector('.caret').classList.toggle('on', k === cursor));
    };
    const value = (i) => ({ choice: task.options[i].value });
    return {
      node,
      keysHelp: 'Toca una respuesta · o pulsa su número · o flechas y Enter',
      handle(a) {
        if (a.type === 'key' && (a.key === 'up' || a.key === 'left')) { setCursor(cursor < 0 ? nodes.length - 1 : cursor - 1); return { moved: true }; }
        if (a.type === 'key' && (a.key === 'down' || a.key === 'right')) { setCursor(cursor + 1); return { moved: true }; }
        if (a.type === 'key' && a.key === 'ok') return cursor < 0 ? null : value(cursor);
        if (a.type === 'digit' && a.n >= 1 && a.n <= nodes.length) { setCursor(a.n - 1); return value(a.n - 1); }
        if (a.type === 'tap' && a.act === 'opt') { setCursor(Number(a.arg)); return value(Number(a.arg)); }
        return null;
      },
      celebrate(ok, choice) {
        const i = task.options.findIndex((o) => o.value === choice);
        if (i >= 0) restartClass(nodes[i], ok ? 'good' : 'wrong');
      },
      correctChoice: () => task.answer,
    };
  }

  RL.modes.choice = { build };
})(window);
