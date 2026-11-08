// Hand-written SVG art: palette, dithering and every character and prop, all original.
// Each function returns a node drawn around its own origin, documented where it matters.
(function (root) {
  const { el, g } = root.RL.svg;
  const font = root.RL.font;

  // Limited palette built from the school's colours: uniform navy and grey, turquoise, leaf green, tan brick, red railings.
  const C = {
    ink: '#1f2a44', navy: '#1f2a44', royal: '#1e4fa3', slate: '#385080', sky: '#80d8f0', turquoise: '#18c8d8', cyan: '#0090b0',
    leaf: '#509058', leafDark: '#2f6b44', leafLight: '#86bd6c',
    brick: '#c8763c', brickDark: '#9a5428', court: '#b6483a', red: '#b3261e', roof: '#a33a2c',
    wall: '#f2cf63', wallShade: '#d9ae43', floor: '#7d8ea3', floorLight: '#93a3b6', floorDark: '#6a7a90',
    cream: '#f6ecd2', white: '#fbf7ea', grey: '#8a8d91', greyLight: '#c4c7c9', greyDark: '#5f6368',
    wood: '#a9713a', woodDark: '#7a4d24', woodLight: '#c98f52', gold: '#f5c542', orange: '#f08820', pink: '#e8879c', lilac: '#8e6bb0',
    board: '#2f5d50', boardDark: '#244a40', chalk: '#eef2e6', chairGreen: '#a7cfa0', legGreen: '#3f7d5a', cork: '#b98a55',
    night: '#0b1030', lcd: '#16282e', lcdOn: '#7df0c0', lcdOff: '#1f3d3f',
  };

  const SKIN = ['#f2c8a0', '#d9a172', '#8a5a3b', '#f6d7b8'];
  const HAIR = ['#3a2a20', '#7a4d24', '#d9a13a', '#1c1c24', '#a33a2c'];

  const rect = (x, y, w, h, fill, extra) => el('rect', Object.assign({ x, y, width: w, height: h, fill }, extra));
  const poly = (points, fill, extra) => el('polygon', Object.assign({ points, fill }, extra));
  const outline = { stroke: C.ink, 'stroke-width': 3 };

  // ---------- dithering ----------

  let defs = null;
  const patterns = new Set();

  function init(stage) {
    defs = el('defs');
    stage.insertBefore(defs, stage.firstChild);
    patterns.clear();
  }

  function addDef(node) {
    defs.appendChild(node);
  }

  // Checkerboard of two colours: the limited-palette way of mixing them. Returns a value for fill.
  function dither(a, b, cell) {
    const size = cell || 4;
    const id = `d${a.slice(1)}${b.slice(1)}${size}`;
    if (!patterns.has(id)) {
      patterns.add(id);
      addDef(el('pattern', { id, width: size * 2, height: size * 2, patternUnits: 'userSpaceOnUse' }, [
        rect(0, 0, size * 2, size * 2, a), rect(0, 0, size, size, b), rect(size, size, size, size, b),
      ]));
    }
    return `url(#${id})`;
  }

  // A sparse scatter of one colour over another, for the speckled school floor.
  function speckle(a, b) {
    const id = `s${a.slice(1)}${b.slice(1)}`;
    if (!patterns.has(id)) {
      patterns.add(id);
      addDef(el('pattern', { id, width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, [
        rect(0, 0, 24, 24, a), rect(3, 5, 3, 3, b), rect(15, 2, 3, 3, b), rect(9, 14, 3, 3, b), rect(20, 18, 3, 3, b),
      ]));
    }
    return `url(#${id})`;
  }

  // ---------- people (no real pupils or staff: generic figures built from parameters) ----------

  // Pupil sitting at a desk seen from behind. Origin: middle of the seat.
  function kidBack(o) {
    const skin = SKIN[o.skin];
    const hair = HAIR[o.hair];
    const parts = [
      rect(-30, -66, 60, 66, o.top || C.navy, outline),
      rect(-9, -78, 18, 14, skin),
    ];
    if (o.style === 'scarf') {
      parts.push(poly('-27,-124 -18,-132 18,-132 27,-124 30,-74 -30,-74', o.scarf || C.lilac, outline), rect(-2, -130, 3, 54, C.ink, { opacity: 0.35 }));
    } else {
      parts.push(rect(-25, -112, 7, 16, skin), rect(18, -112, 7, 16, skin));
      parts.push(rect(-20, -128, 40, 54, skin));
      if (o.style === 'bob') parts.push(poly('-28,-122 -18,-134 18,-134 28,-122 28,-70 -28,-70', hair, outline));
      else if (o.style === 'pony') parts.push(poly('-22,-124 -14,-134 14,-134 22,-124 22,-84 -22,-84', hair, outline), rect(-8, -86, 16, 40, hair, outline));
      else if (o.style === 'curly') parts.push(poly('-30,-112 -26,-130 -10,-138 10,-138 26,-130 30,-112 26,-82 -26,-82', hair, outline));
      else parts.push(poly('-22,-124 -14,-134 14,-134 22,-124 22,-86 -22,-86', hair, outline));
    }
    return g({}, parts);
  }

  // Pupil standing, facing us. Origin: between the feet.
  function kidStand(o) {
    const skin = SKIN[o.skin];
    const hair = HAIR[o.hair];
    const parts = [
      rect(-20, -44, 16, 44, C.grey, outline), rect(4, -44, 16, 44, C.grey, outline),
      rect(-26, -96, 52, 56, o.top || C.navy, outline),
      rect(-20, -146, 40, 50, skin, outline),
    ];
    if (o.bag) parts.unshift(rect(-34, -92, 68, 46, o.bag, outline));
    if (o.style === 'scarf') {
      parts.push(poly('-26,-126 -18,-152 18,-152 26,-126 26,-94 12,-94 12,-130 -12,-130 -12,-94 -26,-94', o.scarf || C.turquoise, outline));
    } else {
      parts.push(poly('-24,-124 -22,-150 22,-150 24,-124 14,-134 -14,-134', hair, outline));
    }
    parts.push(rect(-11, -122, 6, 8, C.ink), rect(5, -122, 6, 8, C.ink), rect(-6, -108, 12, 3, C.ink));
    return g({}, parts);
  }

  // Generic teacher behind the desk. Origin: floor point between the feet.
  function teacher() {
    return g({}, [
      rect(-22, -60, 18, 60, C.slate, outline), rect(4, -60, 18, 60, C.slate, outline),
      poly('-32,-130 32,-130 36,-58 -36,-58', C.leaf, outline),
      rect(-16, -130, 32, 22, C.white),
      rect(-20, -188, 40, 56, SKIN[1], outline),
      poly('-24,-160 -24,-188 -14,-198 14,-198 24,-188 24,-160 14,-176 -14,-176', C.greyDark, outline),
      rect(-11, -164, 6, 8, C.ink), rect(5, -164, 6, 8, C.ink), rect(-7, -148, 14, 3, C.ink),
      poly('32,-126 66,-168 74,-160 40,-110', C.leaf, outline),
      rect(68, -178, 6, 16, C.chalk),
    ]);
  }

  // Wheelchair seen from behind, with its pupil. Origin: middle of the seat.
  function wheelchairBack(o) {
    return g({}, [
      kidBack(o),
      rect(-34, -40, 68, 40, C.greyDark, outline),
      rect(-52, -34, 14, 96, C.ink), rect(38, -34, 14, 96, C.ink),
      rect(-30, 0, 60, 8, C.greyDark),
    ]);
  }

  // ---------- classroom furniture ----------

  // Desk seen from the front. Origin: centre of the table top.
  function desk(width) {
    const w = width || 150;
    return g({}, [
      rect(-w / 2 + 8, 0, 8, 82, C.legGreen, outline), rect(w / 2 - 16, 0, 8, 82, C.legGreen, outline),
      rect(-w / 2, -8, w, 16, C.cream, outline),
    ]);
  }

  // Back of a chair, in front of whoever sits on it. Origin: middle of the seat.
  function chairBack() {
    return g({}, [
      rect(-24, 0, 7, 60, C.legGreen), rect(17, 0, 7, 60, C.legGreen),
      rect(-30, -32, 60, 28, C.chairGreen, outline),
      rect(-30, -2, 60, 10, C.chairGreen, outline),
    ]);
  }

  function globe() {
    return g({}, [
      el('circle', { cx: 0, cy: 0, r: 34, fill: C.cyan, stroke: C.ink, 'stroke-width': 3 }),
      poly('-22,-20 -6,-24 2,-10 -8,0 -20,-4', C.leaf), poly('6,4 22,-6 26,10 12,24 4,16', C.leaf),
      rect(-14, 36, 28, 8, C.woodDark), rect(-3, 32, 6, 8, C.woodDark),
    ]);
  }

  // ---------- mascot: Segundo, the snail from the school garden ----------

  // Origin: bottom centre. mood: happy | wow | sad.
  function segundo(mood) {
    const body = '#e6d58a';
    const shell = C.brick;
    const eyes = mood === 'sad'
      ? [rect(74, -142, 12, 4, C.ink), rect(104, -142, 12, 4, C.ink)]
      : [rect(74, -150, 10, 12, C.ink), rect(106, -150, 10, 12, C.ink)];
    const mouth = mood === 'wow' ? el('ellipse', { cx: 100, cy: -58, rx: 9, ry: 12, fill: C.ink })
      : mood === 'sad' ? el('path', { d: 'M86 -52 L100 -60 L114 -52', fill: 'none', stroke: C.ink, 'stroke-width': 5 })
        : el('path', { d: 'M86 -62 L100 -52 L114 -62', fill: 'none', stroke: C.ink, 'stroke-width': 5 });
    return g({ class: 'crisp' }, [
      poly('-104,0 130,0 138,-44 128,-90 74,-90 66,-34 -66,-20', body, outline),
      rect(74, -136, 8, 50, body, outline), rect(108, -136, 8, 50, body, outline),
      rect(66, -156, 26, 26, C.white, outline), rect(100, -156, 26, 26, C.white, outline),
      ...eyes,
      mouth,
      poly('-92,-24 -66,-104 -4,-138 54,-104 76,-44 44,-14 -60,-14', shell, outline),
      el('circle', { cx: -8, cy: -64, r: 46, fill: C.cream, stroke: C.ink, 'stroke-width': 5 }),
      ...[0, 90, 180, 270].map((a) => rect(-11, -106, 6, 10, C.ink, { transform: `rotate(${a} -8 -64)` })),
      rect(-11, -94, 6, 32, C.red), rect(-10, -66, 30, 6, C.royal),
      rect(-14, -70, 12, 12, C.ink),
    ]);
  }

  // ---------- emblem and small icons ----------

  // Original badge: an open book with a clock rising behind it and a sprout. Radius 100 around the origin.
  function emblem() {
    return g({}, [
      el('circle', { r: 100, fill: C.white, stroke: C.ink, 'stroke-width': 6 }),
      el('circle', { r: 88, fill: C.turquoise }),
      el('circle', { cy: -22, r: 48, fill: C.cream, stroke: C.ink, 'stroke-width': 5 }),
      rect(-3, -60, 6, 40, C.royal), rect(-3, -25, 30, 6, C.red),
      el('circle', { cy: -22, r: 6, fill: C.ink }),
      poly('-72,16 -6,28 -6,70 -72,58', C.white, outline), poly('72,16 6,28 6,70 72,58', C.white, outline),
      poly('-6,28 6,28 6,70 -6,70', C.royal, outline),
      ...[0, 1, 2].map((i) => rect(-62, 28 + i * 11, 44, 3, C.greyLight, { transform: 'skewY(10)' })),
      ...[0, 1, 2].map((i) => rect(18, 42 + i * 11, 44, 3, C.greyLight, { transform: 'skewY(-10)' })),
      poly('58,-14 82,-46 88,-16 72,-2', C.leaf, outline), poly('-58,-14 -82,-46 -88,-16 -72,-2', C.leaf, outline),
    ]);
  }

  function star(on, r) {
    const R = r || 30;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const d = i % 2 ? R * 0.45 : R;
      pts.push(`${(Math.cos(a) * d).toFixed(1)},${(Math.sin(a) * d).toFixed(1)}`);
    }
    return poly(pts.join(' '), on ? C.gold : C.greyLight, { stroke: C.ink, 'stroke-width': 4 });
  }

  function padlock() {
    return g({}, [
      el('path', { d: 'M-11 -2 V-13 H11 V-2', fill: 'none', stroke: C.ink, 'stroke-width': 6 }),
      rect(-17, -3, 34, 26, C.gold, outline),
      rect(-3, 5, 6, 10, C.ink),
    ]);
  }

  // Props beside the mascot, one per school activity. About 110 units across, origin at the bottom centre.
  const PROP = {
    radio: () => g({}, [
      rect(-46, -128, 92, 40, C.red, outline),
      g({ transform: 'translate(0 -116)' }, [font.text('ANTENA', { scale: 2, fill: C.white })]),
      rect(-6, -48, 12, 48, C.grey, outline), rect(-34, -8, 68, 8, C.ink),
      rect(-16, -86, 32, 42, C.greyDark, outline),
      ...[0, 1, 2].map((i) => rect(-12, -80 + i * 10, 24, 3, C.greyLight)),
    ]),
    garden: () => g({}, [
      rect(-56, -30, 112, 30, C.woodDark, outline),
      ...[-34, 0, 34].map((x) => g({ transform: `translate(${x} -30)` }, [rect(-3, -34, 6, 34, C.leafDark), poly('0,-34 -20,-58 -2,-50', C.leaf, outline), poly('0,-40 20,-66 4,-54', C.leafLight, outline)])),
    ]),
    lunch: () => g({}, [
      rect(-60, -14, 120, 14, C.greyLight, outline),
      poly('-34,-14 -26,-46 26,-46 34,-14', C.white, outline),
      rect(-28, -54, 56, 8, C.orange, outline),
      rect(44, -62, 6, 48, C.grey), rect(-52, -62, 6, 48, C.grey),
    ]),
    patio: () => g({}, [
      rect(-54, -112, 8, 112, C.red), rect(46, -112, 8, 112, C.red), rect(-54, -112, 108, 8, C.white, outline),
      el('circle', { cx: 8, cy: -24, r: 24, fill: C.orange, stroke: C.ink, 'stroke-width': 4 }),
      rect(6, -48, 4, 48, C.ink), rect(-16, -26, 48, 4, C.ink),
    ]),
    trip: () => g({}, [
      rect(-66, -74, 132, 58, C.gold, outline),
      ...[-48, -18, 12, 42].map((x) => rect(x, -66, 22, 20, C.sky, outline)),
      el('circle', { cx: -36, cy: -14, r: 14, fill: C.ink }), el('circle', { cx: 36, cy: -14, r: 14, fill: C.ink }),
      rect(-66, -36, 132, 6, C.royal),
    ]),
    race: () => g({}, [
      rect(-5, -120, 10, 120, C.greyDark, outline),
      rect(5, -120, 62, 40, C.white, outline),
      ...[0, 1, 2, 3, 4, 5].map((i) => rect(5 + i * 10, -120 + ((i % 2) * 20), 10, 20, C.ink)),
      el('circle', { cx: -34, cy: -14, r: 14, fill: C.turquoise, stroke: C.ink, 'stroke-width': 4 }),
      rect(-34, -46, 4, 32, C.ink),
    ]),
    book: () => g({}, [
      poly('-54,-68 -4,-54 -4,-6 -54,-20', C.white, outline), poly('54,-68 4,-54 4,-6 54,-20', C.white, outline),
      rect(-4, -54, 8, 48, C.royal),
    ]),
    choir: () => g({}, [
      rect(-30, -96, 8, 76, C.ink), rect(22, -112, 8, 76, C.ink), poly('-30,-96 30,-112 30,-92 -30,-76', C.ink),
      el('ellipse', { cx: -40, cy: -20, rx: 18, ry: 13, fill: C.ink }), el('ellipse', { cx: 12, cy: -36, rx: 18, ry: 13, fill: C.ink }),
    ]),
  };

  // Chamfered retro button. Origin: centre. opts: { size, scale, read } (read = sentence in the reading font).
  function button(label, w, h, fill, opts) {
    const o = opts || {};
    const c = 10;
    const x = w / 2;
    const y = h / 2;
    const outlinePts = `${-x + c},${-y} ${x - c},${-y} ${x},${-y + c} ${x},${y - c} ${x - c},${y} ${-x + c},${y} ${-x},${y - c} ${-x},${-y + c}`;
    const inner = o.read
      ? el('text', { x: 0, y: (o.size || 30) * 0.35, class: 'reading', 'text-anchor': 'middle', style: `font-size:${o.size || 30}px` }, label)
      : g({ transform: `translate(0 ${-Math.round((7 * (o.scale || 4)) / 2)})` }, [font.text(label, { scale: o.scale || 4, fill: C.ink })]);
    return g({ class: 'button' }, [
      el('polygon', { points: outlinePts, class: 'focus-ring', transform: 'scale(1.08 1.16)' }),
      el('polygon', { points: outlinePts, fill: C.ink, transform: 'translate(5 6)' }),
      el('polygon', { points: outlinePts, fill: fill || C.cream, stroke: C.ink, 'stroke-width': 4 }),
      inner,
    ]);
  }

  // ---------- backgrounds ----------

  function skyBands(top, bottom, height) {
    return g({}, [rect(0, 0, 1280, height, top), rect(0, height * 0.55, 1280, height * 0.25, dither(top, bottom)), rect(0, height * 0.8, 1280, height * 0.2, bottom)]);
  }

  function brickWall(x, y, w, h) {
    const nodes = [rect(x, y, w, h, C.brick)];
    for (let row = 0; row * 18 < h; row++) {
      nodes.push(rect(x, y + row * 18, w, 3, C.brickDark));
      for (let col = 0; col * 44 < w; col++) nodes.push(rect(x + col * 44 + (row % 2 ? 22 : 0), y + row * 18, 3, 18, C.brickDark));
    }
    return g({ class: 'crisp' }, [g({ 'clip-path': 'none' }, nodes)]);
  }

  function schoolWindow(x, y) {
    return g({}, [rect(x, y, 86, 66, C.white, outline), rect(x + 7, y + 7, 72, 52, C.sky), rect(x + 41, y + 7, 4, 52, C.white), rect(x + 7, y + 30, 72, 4, C.white), rect(x + 7, y + 7, 72, 14, C.greyLight)]);
  }

  // The school seen from the front, for the menu: brick, white band, red canopy and railings, flags and a big tree.
  function facade() {
    const parts = [skyBands(C.cyan, C.sky, 320)];
    parts.push(poly('140,92 240,92 270,74 330,74 360,92 430,92 400,112 170,112', C.white));
    parts.push(poly('830,62 910,62 940,44 1000,44 1034,62 1130,62 1090,84 860,84', C.white));
    parts.push(brickWall(70, 250, 1140, 300));
    parts.push(rect(70, 372, 1140, 18, C.white, outline));
    parts.push(rect(50, 236, 1180, 18, C.greyLight, outline));
    for (let col = 0; col < 8; col++) {
      if (col === 3 || col === 4) continue;
      const x = 110 + col * 138;
      parts.push(schoolWindow(x, 280), schoolWindow(x, 412));
    }
    parts.push(rect(530, 400, 220, 150, C.greyDark, outline), rect(570, 420, 66, 130, C.slate, outline), rect(644, 420, 66, 130, C.slate, outline));
    parts.push(poly('506,392 774,392 790,356 490,356', C.red, outline));
    parts.push(rect(0, 550, 1280, 170, speckle(C.greyLight, C.grey)));
    for (const [y, x, w] of [[550, 500, 280], [566, 484, 312], [582, 468, 344]]) parts.push(rect(x, y, w, 16, C.white, outline));
    parts.push(rect(462, 520, 8, 78, C.red), rect(810, 520, 8, 78, C.red), rect(462, 520, 40, 8, C.red), rect(778, 520, 40, 8, C.red));
    for (const x of [1000, 1050, 1100]) parts.push(rect(x, 96, 6, 158, C.greyDark));
    parts.push(poly('1006,100 1050,108 1006,122', C.red), poly('1056,100 1098,108 1056,122', C.turquoise), poly('1106,100 1148,108 1106,122', C.gold));
    parts.push(rect(134, 330, 26, 240, C.woodDark, outline));
    parts.push(poly('40,350 60,250 110,190 190,184 248,230 262,330 216,386 80,392', C.leaf, outline));
    parts.push(poly('90,300 130,230 190,240 210,320 150,350', C.leafLight));
    parts.push(el('ellipse', { cx: 147, cy: 576, rx: 92, ry: 26, fill: C.greyDark, stroke: C.ink, 'stroke-width': 3 }));
    return g({ class: 'crisp' }, parts);
  }

  // Plain themed walls behind the exercises. theme: read | elapsed | maths
  function backdrop(theme) {
    const palette = { read: [C.wall, C.wallShade], elapsed: [C.sky, C.turquoise], maths: [C.leafLight, C.leaf] }[theme] || [C.wall, C.wallShade];
    return g({ class: 'crisp' }, [
      rect(0, 0, 1280, 620, palette[0]),
      rect(0, 560, 1280, 60, dither(palette[0], palette[1])),
      rect(0, 620, 1280, 100, speckle(C.floor, C.floorLight)),
      rect(0, 618, 1280, 5, C.ink),
    ]);
  }

  root.RL.sprites = { C, rect, poly, init, addDef, dither, speckle, kidBack, kidStand, teacher, wheelchairBack, desk, chairBack, globe, segundo, emblem, star, padlock, PROP, button, facade, backdrop, brickWall };
})(window);
