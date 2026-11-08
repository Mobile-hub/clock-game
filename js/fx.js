// Lightweight effects on their own SVG layer: confetti, sparkles, floating texts and screen shake.
(function (root) {
  const { el, translate } = root.RL.svg;
  const { C } = root.RL.sprites;

  const COLORS = [C.red, C.turquoise, C.gold, C.leaf, C.orange, C.royal];
  let layer = null;
  let shakeNode = null;
  let items = [];
  let shakeTime = 0;
  let shakePower = 0;

  function init(fxLayer, shakeTarget) {
    layer = fxLayer;
    shakeNode = shakeTarget;
  }

  function add(node, update, life) {
    layer.appendChild(node);
    items.push({ node, update, life, t: 0 });
  }

  function confetti(x, y, n, spread) {
    for (let i = 0; i < (n || 26); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 200 + Math.random() * (spread || 380);
      let vx = Math.cos(a) * v;
      let vy = Math.sin(a) * v - 260;
      let px = x;
      let py = y;
      const node = el('rect', { x: -7, y: -7, width: 14, height: 14, fill: COLORS[i % COLORS.length], stroke: C.ink, 'stroke-width': 2 });
      add(node, (it, dt) => {
        vy += 900 * dt;
        vx *= 0.99;
        px += vx * dt;
        py += vy * dt;
        translate(node, px, py);
      }, 1.3 + Math.random() * 0.5);
    }
  }

  function floatText(x, y, text, color, size) {
    const node = el('text', { class: 'float-text', 'text-anchor': 'middle', style: `font-size:${size || 44}px;fill:${color || C.leafDark}` }, text);
    add(node, (it) => {
      const k = it.t / it.life;
      translate(node, x, y - k * 90);
      node.setAttribute('opacity', k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
    }, 1.0);
  }

  function shake(power, time) {
    shakePower = power || 10;
    shakeTime = time || 0.3;
  }

  function update(dt) {
    for (const it of items) {
      it.t += dt;
      it.update(it, dt);
    }
    items = items.filter((it) => {
      if (it.t < it.life) return true;
      if (it.node.parentNode) it.node.parentNode.removeChild(it.node);
      return false;
    });
    if (shakeNode) {
      if (shakeTime > 0) {
        shakeTime -= dt;
        const p = shakePower * Math.max(0, shakeTime) * 3;
        shakeNode.setAttribute('transform', `translate(${(Math.random() - 0.5) * p} ${(Math.random() - 0.5) * p})`);
      } else {
        shakeNode.removeAttribute('transform');
      }
    }
  }

  function reset() {
    for (const it of items) if (it.node.parentNode) it.node.parentNode.removeChild(it.node);
    items = [];
    if (shakeNode) shakeNode.removeAttribute('transform');
    shakeTime = 0;
  }

  (root.RL = root.RL || {}).fx = { init, confetti, floatText, shake, update, reset };
})(window);
