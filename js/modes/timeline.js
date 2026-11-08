// Timeline: hop from the start time to the end time with jumps of hours and minutes. The hops add up to the duration.
(function (root) {
  const RL = root.RL;
  const { el, g } = RL.svg;
  const { C, rect, poly, button } = RL.sprites;
  const { restartClass, caret } = RL.modes.common;
  const T = RL.timemath;
  const Say = RL.spoken;

  const X0 = 150;
  const X1 = 1130;
  const LINE_Y = 372;
  const ROW_Y = 530;

  function jumpLabel(m) {
    return m >= 60 ? `+${m / 60} h` : `+${m} min`;
  }

  function build(task) {
    const span = task.answer;
    const limit = span + Math.max(30, Math.ceil(span * 0.3)); // room to overshoot and notice it
    const xOf = (m) => X0 + ((X1 - X0) * m) / limit;
    let position = 0;
    const hops = [];

    const arcs = g({});
    const marker = g({}, [poly('-16,-44 16,-44 16,-16 0,0 -16,-16', C.gold, { stroke: C.ink, 'stroke-width': 3 })]);
    const total = el('text', { x: 640, y: 484, class: 'reading', 'text-anchor': 'middle', style: 'font-size:32px' }, '');

    const flag = (x, label, colour) => g({ transform: `translate(${x} ${LINE_Y})` }, [
      rect(-3, -6, 6, 34, C.ink),
      rect(-52, 28, 104, 40, colour, { stroke: C.ink, 'stroke-width': 3 }),
      el('text', { x: 0, y: 57, class: 'reading', 'text-anchor': 'middle', style: 'font-size:28px' }, label),
    ]);

    const line = g({ class: 'crisp' }, [
      rect(X0 - 20, LINE_Y - 4, X1 - X0 + 40, 8, C.ink),
      ...Array.from({ length: Math.floor(limit / 15) + 1 }, (_, i) => rect(xOf(i * 15) - 1, LINE_Y - 12, 3, 24, C.ink)),
    ]);

    const items = [];
    task.jumps.forEach((m, i) => {
      const x = 192 + i * 136;
      items.push({ node: g({ transform: `translate(${x} ${ROW_Y})`, 'data-act': 'jump', 'data-arg': m, class: 'tappable' }, [button(jumpLabel(m), 124, 72, C.sky, { read: true, size: 28 }), caret(-52, 40, 104)]), act: () => jump(m) });
    });
    items.push({ node: g({ transform: `translate(${192 + task.jumps.length * 136} ${ROW_Y})`, 'data-act': 'undo', class: 'tappable' }, [button('Deshacer', 124, 72, C.pink, { read: true, size: 24 }), caret(-52, 40, 104)]), act: () => undo() });
    items.push({ node: g({ transform: `translate(1040 ${ROW_Y})`, 'data-act': 'check', class: 'tappable' }, [button('Comprobar', 270, 72, C.leafLight, { scale: 4 }), caret(-120, 40, 240)]), act: () => check() });

    function render() {
      marker.setAttribute('transform', `translate(${xOf(position).toFixed(1)} ${LINE_Y - 6})`);
      total.textContent = position === 0 ? 'Elige un salto' : `Has avanzado: ${Say.duration(position)}`;
    }

    function drawArc(from, to) {
      const x0 = xOf(from);
      const x1 = xOf(to);
      const h = Math.min(70, 26 + (x1 - x0) * 0.25);
      arcs.appendChild(el('path', { d: `M${x0} ${LINE_Y - 6} Q${(x0 + x1) / 2} ${LINE_Y - 6 - h * 2} ${x1} ${LINE_Y - 6}`, fill: 'none', stroke: C.royal, 'stroke-width': 4 }));
    }

    function jump(m) {
      if (position + m > limit) return { refused: true };
      hops.push(m);
      drawArc(position, position + m);
      position += m;
      render();
      return { moved: true };
    }

    function undo() {
      if (!hops.length) return null;
      position -= hops.pop();
      arcs.removeChild(arcs.lastChild);
      render();
      return { moved: true };
    }

    function check() {
      return position === 0 ? null : { choice: position };
    }

    let cursor = -1;
    const setCursor = (i) => {
      cursor = (i + items.length) % items.length;
      items.forEach((it, k) => it.node.querySelector('.caret').classList.toggle('on', k === cursor));
    };

    render();
    const node = g({}, [line, arcs, flag(xOf(0), T.format(task.start), C.gold), flag(xOf(span), T.format(task.target), C.leafLight), marker, total, ...items.map((it) => it.node)]);

    return {
      node,
      keysHelp: 'Toca un salto · números o flechas y Enter · Borrar deshace',
      handle(a) {
        if (a.type === 'tap' && a.act === 'jump') return jump(Number(a.arg));
        if (a.type === 'tap' && a.act === 'undo') return undo();
        if (a.type === 'tap' && a.act === 'check') return check();
        if (a.type === 'digit' && a.n >= 1 && a.n <= task.jumps.length) return jump(task.jumps[a.n - 1]);
        if (a.type === 'key' && a.key === 'erase') return undo();
        if (a.type === 'key' && a.key === 'left') { setCursor(cursor < 0 ? items.length - 1 : cursor - 1); return { moved: true }; }
        if (a.type === 'key' && a.key === 'right') { setCursor(cursor + 1); return { moved: true }; }
        if (a.type === 'key' && a.key === 'ok') return cursor < 0 ? check() : items[cursor].act();
        return null;
      },
      celebrate(ok) {
        restartClass(marker, ok ? 'good' : 'wrong');
      },
      correctChoice: () => task.answer,
    };
  }

  RL.modes.timeline = { build };
})(window);
