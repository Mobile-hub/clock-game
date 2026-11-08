// Tiny SVG DOM helpers shared by every visual module.
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';

  // el('rect', { x: 0, class: 'a' }, [child, 'text'])
  function el(tag, attrs, children) {
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        node.setAttribute(k, v);
      }
    }
    if (children !== undefined) append(node, children);
    return node;
  }

  function append(node, children) {
    for (const c of [].concat(children)) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function g(attrs, children) {
    return el('g', attrs, children);
  }

  function translate(node, x, y, scale, rotate) {
    let t = `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
    if (rotate) t += ` rotate(${rotate.toFixed(1)})`;
    if (scale !== undefined && scale !== 1) t += ` scale(${scale.toFixed(3)})`;
    node.setAttribute('transform', t);
    return node;
  }

  // Width of a string in the given font, measured with a hidden text node (needs the fonts to be loaded).
  let probe = null;
  const widthCache = new Map();
  function textWidth(str, size, weight, family) {
    const key = `${str}|${size}|${weight}|${family}`;
    if (widthCache.has(key)) return widthCache.get(key);
    const stage = document.getElementById('stage');
    if (!probe) {
      probe = el('text', { x: -9999, y: -9999, 'aria-hidden': 'true' });
      stage.appendChild(probe);
    }
    probe.setAttribute('style', `font: ${weight || 700} ${size}px ${family || 'var(--font-read)'}`);
    probe.textContent = str;
    const w = probe.getComputedTextLength() || str.length * size * 0.6;
    widthCache.set(key, w);
    return w;
  }

  // Greedy word wrap by character count (good enough for short Spanish sentences).
  function wrap(text, maxChars) {
    const out = [];
    let line = '';
    for (const word of text.split(' ')) {
      if (line && (line + ' ' + word).length > maxChars) {
        out.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) out.push(line);
    return out;
  }

  (root.RL = root.RL || {}).svg = { NS, el, g, append, clear, translate, textWidth, wrap };
})(window);
