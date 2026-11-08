// The two clocks, shared by the simulator and the exercises. Both show a time and, when interactive, change it.
(function (root) {
  const RL = root.RL;
  const { el, g } = RL.svg;
  const { C, rect, poly } = RL.sprites;
  const CM = RL.clockmath;
  const T = RL.timemath;

  // ---------- analog ----------

  // opts: { x, y, R, t, interactive, step } in stage coordinates.
  function analog(opts) {
    const R = opts.R;
    const step = opts.step || 1;
    const hourLen = R * 0.5;
    const minuteLen = R * 0.82;
    const geometry = { R, hourLen };
    let t = opts.t || 0;
    let drag = null;

    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      ticks.push(rect(big ? -3 : -1, -R * 0.93, big ? 6 : 2, big ? R * 0.1 : R * 0.05, C.ink, { transform: `rotate(${i * 6})` }));
    }
    const numerals = [];
    for (let h = 1; h <= 12; h++) {
      const a = (h * 30 * Math.PI) / 180;
      const d = R * 0.7;
      const size = R * 0.22;
      numerals.push(el('text', { x: (Math.sin(a) * d).toFixed(1), y: (-Math.cos(a) * d + size * 0.36).toFixed(1), class: 'reading', 'text-anchor': 'middle', style: `font-size:${size.toFixed(1)}px` }, String(h)));
    }

    const handShape = (len, half) => `${-half},${len * 0.14} ${half},${len * 0.14} ${half},${-len + half * 2} 0,${-len} ${-half},${-len + half * 2}`;
    const hourKnob = opts.interactive ? el('circle', { cy: -hourLen, r: Math.max(16, R * 0.11), fill: C.red, opacity: 0.45 }) : null;
    const minuteKnob = opts.interactive ? el('circle', { cy: -minuteLen, r: Math.max(16, R * 0.11), fill: C.royal, opacity: 0.45 }) : null;
    const hourHand = g({}, [poly(handShape(hourLen, R * 0.05), C.red, { stroke: C.ink, 'stroke-width': 2 }), hourKnob]);
    const minuteHand = g({}, [poly(handShape(minuteLen, R * 0.032), C.royal, { stroke: C.ink, 'stroke-width': 2 }), minuteKnob]);

    const node = g({ transform: `translate(${opts.x} ${opts.y})` }, [
      el('circle', { r: R + R * 0.07, fill: C.ink, transform: 'translate(5 6)' }),
      el('circle', { r: R + R * 0.07, fill: C.wood, stroke: C.ink, 'stroke-width': 4 }),
      el('circle', { r: R, fill: C.cream, stroke: C.ink, 'stroke-width': 3 }),
      ...ticks,
      ...numerals,
      hourHand,
      minuteHand,
      el('circle', { r: R * 0.07, fill: C.ink }),
      opts.interactive ? el('circle', { r: R + R * 0.07, fill: 'transparent', 'data-drag': 'clock', 'data-cx': opts.x, 'data-cy': opts.y, 'data-r': R, class: 'grab' }) : null,
    ]);

    function render() {
      const a = CM.angles(t);
      hourHand.setAttribute('transform', `rotate(${a.hour})`);
      minuteHand.setAttribute('transform', `rotate(${a.minute})`);
    }

    function set(value) {
      t = T.mod(value, T.DAY);
      render();
    }

    function setActive(hand) {
      if (hourKnob) hourKnob.setAttribute('opacity', hand === 'hour' ? 0.9 : 0.45);
      if (minuteKnob) minuteKnob.setAttribute('opacity', hand === 'minute' ? 0.9 : 0.45);
    }

    // Handles a 'drag' action. Returns 'changed', 'released' or null.
    function handleDrag(a) {
      const dx = a.x - opts.x;
      const dy = a.y - opts.y;
      const radius = Math.hypot(dx, dy);
      const angle = CM.angleAt(dx, dy);
      if (a.phase === 'start') {
        const hand = CM.pickHand(t, radius, angle, geometry);
        if (!hand) return null;
        drag = CM.beginDrag(t, hand, angle, step);
        setActive(hand);
        return null;
      }
      if (!drag) return null;
      if (a.phase === 'move') {
        const next = CM.moveDrag(drag, angle, radius / R);
        if (next === t) return null;
        set(next);
        return 'changed';
      }
      drag = null;
      setActive(null);
      return 'released';
    }

    render();
    return { node, set, handleDrag, get t() { return t; } };
  }

  // ---------- digital ----------

  const SEGMENTS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };

  function makeDigit(x, y, w, h, th) {
    const bars = {
      a: [th, 0, w - th * 2, th],
      b: [w - th, th, th, h / 2 - th * 1.5],
      c: [w - th, h / 2 + th / 2, th, h / 2 - th * 1.5],
      d: [th, h - th, w - th * 2, th],
      e: [0, h / 2 + th / 2, th, h / 2 - th * 1.5],
      f: [0, th, th, h / 2 - th * 1.5],
      g: [th, h / 2 - th / 2, w - th * 2, th],
    };
    const nodes = {};
    const group = g({ transform: `translate(${x} ${y})` }, Object.keys(bars).map((k) => {
      nodes[k] = rect(bars[k][0], bars[k][1], bars[k][2], bars[k][3], C.lcdOff);
      return nodes[k];
    }));
    return {
      node: group,
      show(n) {
        for (const k of Object.keys(nodes)) nodes[k].setAttribute('fill', SEGMENTS[n].includes(k) ? C.lcdOn : C.lcdOff);
      },
    };
  }

  // opts: { x, y, t, interactive, scale }. Interactive clocks show triangles with data-act="nudge" data-arg="hour:1".
  function digital(opts) {
    const dw = 56;
    const dh = 84;
    const th = 12;
    let t = opts.t || 0;
    const digits = [-132, -68, 12, 76].map((x) => makeDigit(x, -dh / 2, dw, dh, th));

    const triangle = (x, y, up, arg) => g({ transform: `translate(${x} ${y})`, 'data-act': 'nudge', 'data-arg': arg, class: 'tappable' }, [
      rect(-62, -24, 124, 48, 'transparent'),
      poly(up ? '-32,14 32,14 0,-16' : '-32,-14 32,-14 0,16', C.gold, { stroke: C.ink, 'stroke-width': 3 }),
    ]);

    const hourFocus = rect(-132, 46, 120, 6, C.lcdOn, { class: 'caret' });
    const minuteFocus = rect(12, 46, 120, 6, C.lcdOn, { class: 'caret' });

    const children = [
      rect(-145, -100 + 6, 290 + 5, 200, C.ink),
      rect(-150, -100, 300, 200, C.slate, { stroke: C.ink, 'stroke-width': 4 }),
      rect(-142, -54, 284, 108, C.lcd, { stroke: C.ink, 'stroke-width': 3 }),
      ...digits.map((d) => d.node),
      rect(-6, -24, 12, 12, C.lcdOn),
      rect(-6, 12, 12, 12, C.lcdOn),
    ];
    if (opts.interactive) {
      children.push(hourFocus, minuteFocus);
      children.push(triangle(-72, -77, true, 'hour:1'), triangle(-72, 77, false, 'hour:-1'));
      children.push(triangle(72, -77, true, 'minute:1'), triangle(72, 77, false, 'minute:-1'));
    }
    const scale = opts.scale || 1;
    const node = g({ transform: `translate(${opts.x} ${opts.y}) scale(${scale})`, class: 'crisp' }, children);

    function render() {
      const text = T.format(t).replace(':', '');
      digits.forEach((d, i) => d.show(Number(text[i])));
    }

    function set(value) {
      t = T.mod(value, T.DAY);
      render();
    }

    function setFocus(unit) {
      hourFocus.classList.toggle('on', unit === 'hour');
      minuteFocus.classList.toggle('on', unit === 'minute');
    }

    render();
    return { node, set, setFocus, get t() { return t; } };
  }

  RL.clockface = { analog, digital };
})(window);
