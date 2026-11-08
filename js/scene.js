// The classroom, built once and then only updated: a drag can change the time many times per second, so nothing is
// redrawn, groups are just toggled and moved. The right-hand column of the wall is kept clear for the two clocks.
(function (root) {
  const RL = root.RL;
  const { el, g } = RL.svg;
  const SP = RL.sprites;
  const { C, rect, poly } = SP;
  const font = RL.font;
  const Sky = RL.sky;

  const WIN = { x: 50, y: 64, w: 450, h: 280 };
  const HORIZON = WIN.y + 196;
  const SKY_COLOURS = {
    night: { 0: ['#0b1030', '#1a2450'] },
    dawn: { 1: ['#2c2d5e', '#7a4f7c'], 2: ['#5a5a9a', '#f0a070'] },
    morning: { 3: ['#6ab4e8', '#f7d7a0'] },
    day: { 4: ['#4aa8e8', '#a8e0f5'] },
    evening: { 3: ['#5a90d0', '#f5b060'] },
    dusk: { 2: ['#4b3a78', '#f08050'], 1: ['#241f52', '#8a4a70'] },
  };
  const ROOM_SHADE = [0.74, 0.56, 0.34, 0.1, 0];
  const OUTSIDE_SHADE = [0.72, 0.5, 0.28, 0.06, 0];
  const SHADE_WITH_LIGHTS = 0.08;

  // Pupils, by desk. Built from parameters: nobody real.
  const PUPILS = [
    { skin: 0, hair: 1, style: 'short' }, { skin: 1, hair: 3, style: 'bob', top: C.royal }, { skin: 2, hair: 3, style: 'curly' }, { skin: 3, hair: 2, style: 'pony', top: C.royal },
    { skin: 1, hair: 0, style: 'scarf', scarf: C.lilac }, { skin: 0, hair: 4, style: 'short', top: C.royal }, { skin: 3, hair: 1, style: 'pony', wheelchair: true }, { skin: 2, hair: 3, style: 'short' },
  ];
  const BACK_ROW = { y: 520, scale: 0.9, xs: [170, 370, 570, 770] };
  const FRONT_ROW = { y: 622, scale: 1.08, xs: [105, 320, 535, 750] };

  function frieze() {
    const colours = [C.red, C.turquoise, C.gold, C.leaf, C.lilac, C.orange];
    const nodes = [];
    'ABCDEFGHIJKLMN'.split('').forEach((letter, i) => {
      const x = 56 + i * 62;
      nodes.push(rect(x, 16, 54, 40, colours[i % colours.length], { stroke: C.ink, 'stroke-width': 3 }));
      nodes.push(g({ transform: `translate(${x + 27} 26)` }, [font.text(letter, { scale: 3, fill: C.white })]));
    });
    return g({}, nodes);
  }

  function corkboard() {
    const notes = [[812, 112, 48, 54, C.white], [868, 108, 44, 40, C.gold], [824, 180, 40, 46, C.pink], [872, 164, 42, 60, C.sky], [814, 238, 92, 40, C.leafLight]];
    return g({}, [
      rect(798, 94, 128, 200, C.woodDark, { stroke: C.ink, 'stroke-width': 3 }),
      rect(806, 102, 112, 184, SP.speckle(C.cork, C.woodDark)),
      ...notes.map(([x, y, w, h, c]) => g({}, [rect(x, y, w, h, c, { stroke: C.ink, 'stroke-width': 2 }), rect(x + w / 2 - 3, y - 2, 6, 6, C.red)])),
    ]);
  }

  function chalkLine(x, y, size, text) {
    return el('text', { x, y, class: 'chalk', 'text-anchor': 'middle', style: `font-size:${size}px` }, text);
  }

  function blackboardWriting() {
    return {
      lesson: g({}, [
        chalkLine(655, 150, 30, 'Hoy: la hora'),
        chalkLine(655, 200, 34, '¿Qué hora es?'),
        el('circle', { cx: 655, cy: 244, r: 26, fill: 'none', stroke: C.chalk, 'stroke-width': 3 }),
        rect(653, 222, 3, 24, C.chalk), rect(654, 243, 18, 3, C.chalk),
      ]),
      recess: g({}, [chalkLine(655, 205, 44, '¡Recreo!')]),
      lunch: g({}, [chalkLine(655, 185, 34, '¡Buen'), chalkLine(655, 230, 34, 'provecho!')]),
      arrival: g({}, [chalkLine(655, 205, 34, '¡Buenos días!')]),
    };
  }

  function buildRoom() {
    const nodes = [
      rect(0, 0, 1280, 470, C.wall),
      rect(0, 0, 1280, 10, C.white),
      rect(0, 400, 1280, 70, SP.dither(C.wall, C.wallShade)),
      rect(0, 470, 1280, 250, SP.speckle(C.floor, C.floorLight)),
      rect(0, 466, 1280, 6, C.ink),
      frieze(),
      rect(522, 90, 266, 204, C.woodDark, { stroke: C.ink, 'stroke-width': 3 }),
      rect(532, 100, 246, 184, C.board),
      rect(532, 268, 246, 16, C.boardDark),
      rect(540, 288, 60, 8, C.chalk),
      corkboard(),
    ];
    return g({}, nodes);
  }

  function buildTeacherDesk() {
    return g({}, [
      rect(590, 392, 250, 14, C.cream, { stroke: C.ink, 'stroke-width': 3 }),
      rect(604, 406, 10, 70, C.legGreen, { stroke: C.ink, 'stroke-width': 3 }),
      rect(816, 406, 10, 70, C.legGreen, { stroke: C.ink, 'stroke-width': 3 }),
      rect(620, 406, 190, 60, C.leaf, { stroke: C.ink, 'stroke-width': 3 }),
      g({ transform: 'translate(800 348)' }, [SP.globe()]),
      rect(620, 378, 70, 14, C.royal, { stroke: C.ink, 'stroke-width': 2 }),
      rect(628, 364, 60, 14, C.red, { stroke: C.ink, 'stroke-width': 2 }),
    ]);
  }

  // The low shelf under the digital clock.
  function buildBookcase() {
    const nodes = [rect(962, 540, 290, 180, C.slate, { stroke: C.ink, 'stroke-width': 4 }), rect(962, 616, 290, 8, C.navy)];
    const colours = [C.red, C.gold, C.leaf, C.cream, C.turquoise, C.orange, C.lilac];
    for (let i = 0; i < 12; i++) {
      const h = 52 + ((i * 7) % 15);
      nodes.push(rect(976 + i * 22, 612 - h, 18, h, colours[i % colours.length], { stroke: C.ink, 'stroke-width': 2 }));
      nodes.push(rect(976 + i * 22, 712 - h - 4, 18, h, colours[(i + 3) % colours.length], { stroke: C.ink, 'stroke-width': 2 }));
    }
    return g({}, nodes);
  }

  function seatRow(row, seated, pupils) {
    return row.xs.map((x, i) => {
      const pupil = pupils[i];
      const parts = [g({ transform: 'translate(0 -56)' }, [SP.desk(164)])];
      const person = pupil ? (pupil.wheelchair ? SP.wheelchairBack(pupil) : SP.kidBack(pupil)) : null;
      if (person) {
        const holder = g({ style: 'display:none' }, [person]);
        seated.push(holder);
        parts.push(holder);
      }
      if (!pupil || !pupil.wheelchair) parts.push(SP.chairBack());
      return g({ transform: `translate(${x} ${row.y}) scale(${row.scale})` }, parts);
    });
  }

  function hide(node, hidden) {
    node.style.display = hidden ? 'none' : '';
  }

  function create() {
    const seated = [];
    const backRow = seatRow(BACK_ROW, seated, PUPILS.slice(0, 4));
    const frontRow = seatRow(FRONT_ROW, seated, PUPILS.slice(4, 8));

    const floorLight = poly('140,490 440,490 520,660 60,660', SP.dither('#fff4bf', C.floorLight, 4), { opacity: 0.55 });

    const lamps = [160, 480, 800].map((x) => rect(x - 80, 1, 160, 8, C.white, { stroke: C.ink, 'stroke-width': 2 }));
    const lampGlow = g({}, [160, 480, 800].map((x) => poly(`${x - 80},9 ${x + 80},9 ${x + 200},460 ${x - 200},460`, '#fff4bf', { opacity: 0.08 })));
    const teacherNode = g({ transform: 'translate(690 470)' }, [SP.teacher()]);

    const arrivals = [
      { x: 250, y: 610, o: { skin: 1, hair: 1, style: 'short', bag: C.red } },
      { x: 460, y: 640, o: { skin: 2, hair: 3, style: 'short', bag: C.gold, top: C.royal } },
      { x: 660, y: 600, o: { skin: 0, hair: 2, style: 'scarf', scarf: C.lilac, bag: C.leaf } },
      { x: 860, y: 650, o: { skin: 3, hair: 4, style: 'short', bag: C.turquoise, top: C.royal } },
    ];
    const arrivalKids = g({}, arrivals.map((a) => g({ transform: `translate(${a.x} ${a.y})` }, [SP.kidStand(a.o)])));
    const board = blackboardWriting();
    const boardWriting = g({}, Object.values(board));

    const roomShade = rect(0, 0, 1280, 720, C.night, { opacity: 0 });

    // Window contents, above the room shade because the sky has its own light.
    const skyTop = rect(WIN.x, WIN.y, WIN.w, 96, C.sky);
    const skyMix = rect(WIN.x, WIN.y + 96, WIN.w, 40, C.sky);
    const skyLow = rect(WIN.x, WIN.y + 136, WIN.w, HORIZON - WIN.y - 136, C.sky);
    const stars = g({}, [[86, 92], [140, 130], [210, 84], [270, 150], [330, 104], [394, 138], [452, 90], [120, 170], [430, 180]].map(([x, y]) => rect(x, y, 4, 4, C.white)));
    const sun = g({}, [
      ...[0, 45, 90, 135].map((a) => rect(-44, -3, 88, 6, C.gold, { transform: `rotate(${a})` })),
      el('circle', { r: 26, fill: C.gold, stroke: C.orange, 'stroke-width': 4 }),
    ]);
    const moon = g({}, [el('path', { d: 'M8 -26 A26 26 0 1 0 8 26 A20 20 0 1 1 8 -26', fill: C.cream })]);

    const clipId = 'window-clip';
    SP.addDef(el('clipPath', { id: clipId }, [rect(WIN.x, WIN.y, WIN.w, WIN.h, '#000')]));

    const trees = g({}, [
      poly(`60,${HORIZON + 6} 76,204 122,180 170,210 196,${HORIZON + 6}`, C.leafDark),
      poly(`350,${HORIZON + 6} 372,190 420,170 470,200 490,${HORIZON + 6}`, C.leafDark),
    ]);
    const gym = g({}, [
      rect(160, 216, 190, 54, C.brick, { stroke: C.ink, 'stroke-width': 2 }),
      rect(160, 236, 190, 12, C.wallShade),
      poly('148,216 362,216 340,194 170,194', C.roof, { stroke: C.ink, 'stroke-width': 2 }),
      ...[0, 1, 2, 3].map((i) => rect(174 + i * 44, 222, 32, 10, C.sky, { stroke: C.ink, 'stroke-width': 1 })),
    ]);
    const court = g({}, [
      rect(WIN.x, 270, WIN.w, 74, C.court),
      rect(WIN.x, 270, WIN.w, 3, C.white),
      poly('190,344 240,282 310,282 360,344', 'none', { stroke: C.white, 'stroke-width': 3 }),
      rect(WIN.x, 256, WIN.w, 14, C.greyLight),
      ...Array.from({ length: 12 }, (_, i) => rect(54 + i * 38, 244, 5, 26, C.red)),
      rect(WIN.x, 248, WIN.w, 4, C.red),
    ]);
    const recessPositions = [[120, 322], [190, 334], [262, 316], [326, 336], [400, 322], [452, 340]];
    const recessKids = g({}, recessPositions.map(([x, y], i) => g({ transform: `translate(${x} ${y}) scale(0.4)` }, [SP.kidStand({ skin: i % 4, hair: (i + 1) % 5, style: i === 2 ? 'scarf' : 'short', top: i % 2 ? C.royal : C.navy })])));
    const ball = el('circle', { cx: 300, cy: 332, r: 8, fill: C.orange, stroke: C.ink, 'stroke-width': 2 });
    const outsideShade = rect(WIN.x, HORIZON - 80, WIN.w, WIN.h - (HORIZON - 80 - WIN.y), C.night, { opacity: 0 });

    const blindSlats = g({}, [0, 1, 2, 3, 4].map((i) => rect(WIN.x, WIN.y + i * 9, WIN.w, 7, C.greyLight, { stroke: C.greyDark, 'stroke-width': 1 })));
    const frame = g({}, [
      rect(WIN.x - 10, WIN.y - 10, WIN.w + 20, 10, C.white, { stroke: C.ink, 'stroke-width': 3 }),
      rect(WIN.x - 10, WIN.y + WIN.h, WIN.w + 20, 12, C.white, { stroke: C.ink, 'stroke-width': 3 }),
      rect(WIN.x - 10, WIN.y, 10, WIN.h, C.white, { stroke: C.ink, 'stroke-width': 3 }),
      rect(WIN.x + WIN.w, WIN.y, 10, WIN.h, C.white, { stroke: C.ink, 'stroke-width': 3 }),
      rect(WIN.x + WIN.w / 3 - 4, WIN.y, 8, WIN.h, C.white, { stroke: C.ink, 'stroke-width': 2 }),
      rect(WIN.x + (2 * WIN.w) / 3 - 4, WIN.y, 8, WIN.h, C.white, { stroke: C.ink, 'stroke-width': 2 }),
      rect(WIN.x, WIN.y + 150, WIN.w, 6, C.white, { stroke: C.ink, 'stroke-width': 1 }),
    ]);
    // The frame and blinds darken with the room: a silhouette of them, in the night colour, drawn on top.
    const frameShade = g({ opacity: 0, 'pointer-events': 'none' }, [blindSlats.cloneNode(true), frame.cloneNode(true)]);
    frameShade.querySelectorAll('rect').forEach((r) => {
      r.setAttribute('fill', C.night);
      r.setAttribute('stroke', C.night);
    });

    const windowGroup = g({}, [
      g({ 'clip-path': `url(#${clipId})` }, [skyTop, skyMix, skyLow, stars, sun, moon, trees, gym, court, recessKids, ball, outsideShade]),
      blindSlats,
      frame,
      frameShade,
    ]);

    const root = g({ class: 'crisp' }, [
      buildRoom(),
      floorLight,
      teacherNode,
      buildTeacherDesk(),
      buildBookcase(),
      ...backRow,
      ...frontRow,
      arrivalKids,
      lampGlow,
      ...lamps,
      boardWriting,
      roomShade,
      windowGroup,
    ]);

    let appliedSky = '';

    function applySky(sky) {
      const key = `${sky.phase}${sky.step}`;
      if (key === appliedSky) return;
      appliedSky = key;
      const [top, bottom] = SKY_COLOURS[sky.phase][sky.step];
      skyTop.setAttribute('fill', top);
      skyMix.setAttribute('fill', SP.dither(top, bottom));
      skyLow.setAttribute('fill', bottom);
      hide(stars, sky.step > 1);
      outsideShade.setAttribute('opacity', OUTSIDE_SHADE[sky.step]);
      frameShade.setAttribute('opacity', ROOM_SHADE[sky.step]);
    }

    function place(node, body) {
      hide(node, !body);
      if (!body) return;
      const x = WIN.x + 20 + body.x * (WIN.w - 40);
      const y = HORIZON - 6 - body.y * 150;
      node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    }

    function applyPeople(scene) {
      const inLesson = scene === 'lesson';
      seated.forEach((node) => hide(node, !inLesson));
      hide(teacherNode, !inLesson && scene !== 'arrival');
      hide(arrivalKids, scene !== 'arrival');
      hide(recessKids, scene !== 'recess');
      hide(ball, scene !== 'recess');
      for (const [name, node] of Object.entries(board)) hide(node, name !== scene);
    }

    function update(t, event, sun_) {
      const sky = Sky.at(t, sun_);
      applySky(sky);
      place(sun, sky.sun);
      place(moon, sky.moon);
      applyPeople(event.scene);
      const lights = Sky.lightsOn(event.scene, sky.step);
      const dark = event.scene === 'dark' ? ROOM_SHADE[0] : ROOM_SHADE[sky.step];
      roomShade.setAttribute('opacity', lights ? SHADE_WITH_LIGHTS : dark);
      hide(lampGlow, !lights);
      const sunOnFloor = sky.sun && sky.step >= 3 && event.scene !== 'dark';
      hide(floorLight, !sunOnFloor);
      if (sunOnFloor) floorLight.setAttribute('transform', `translate(${((0.5 - sky.sun.x) * 260).toFixed(1)} 0)`);
      return sky;
    }

    return { node: root, update };
  }

  RL.scene = { create };
})(window);
