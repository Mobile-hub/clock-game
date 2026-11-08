// Game state machine: menu → sim | worlds → intro → play ⇄ hint / paused → clear → … → victory.
(function (root) {
  const RL = root.RL;
  const { el, g, clear, wrap } = RL.svg;
  const SP = RL.sprites;
  const { C, rect, button } = SP;
  const font = RL.font;
  const { WORLDS, LEVELS } = RL.levels;
  const D = RL.deck;
  const E = RL.exercises;
  const CF = RL.clockface;
  const audio = RL.audio;
  const fx = RL.fx;

  const PRAISE = ['¡Bien!', '¡Genial!', '¡Muy bien!', '¡Eso es!', '¡Bravo!'];
  const MASCOT = { x: 128, y: 700, scale: 0.6 };
  const LEVELS_PER_WORLD = 3;

  const game = {
    state: 'boot',
    menuSel: 0,
    levelSel: 0,
    timers: [],
    clock: 0,
    debug: {},
    cleared: new Set(),

    init(layers, schedule, debug) {
      this.L = layers;
      this.schedule = schedule;
      this.debug = debug || {};
      this.rng = D.makeRng(this.debug.seed !== undefined ? this.debug.seed : Date.now() % 100000);
      RL.input.onAction((a) => this.onAction(a));
      fx.init(layers.fx, layers.fixed);
    },

    after(sec, fn) {
      this.timers.push({ at: this.clock + sec, fn });
    },

    // ---------- shared drawing ----------

    resetLayers() {
      fx.reset();
      for (const k of ['bg', 'scene', 'fixed', 'hud', 'overlay']) clear(this.L[k]);
      this.timers = [];
      this.mode = null;
      this.sim = null;
      this.cardButtons = null;
      this.muteSlot = g({ transform: 'translate(1240 40)', 'data-act': 'mute', class: 'tappable' });
      this.L.hud.appendChild(this.muteSlot);
      this.drawMute();
    },

    drawMute() {
      clear(this.muteSlot);
      const muted = audio.isMuted();
      this.muteSlot.appendChild(el('circle', { r: 28, fill: C.cream, stroke: C.ink, 'stroke-width': 4 }));
      this.muteSlot.appendChild(el('path', { d: 'M-14 -6 H-6 L4 -15 V15 L-6 6 H-14 Z', fill: C.ink }));
      this.muteSlot.appendChild(muted
        ? el('path', { d: 'M8 -8 L18 8 M18 -8 L8 8', stroke: C.ink, 'stroke-width': 4 })
        : el('path', { d: 'M9 -8 L15 0 L9 8', fill: 'none', stroke: C.ink, 'stroke-width': 4 }));
    },

    label(x, y, size, text, extra) {
      return el('text', Object.assign({ x, y, class: 'reading', 'text-anchor': 'middle', style: `font-size:${size}px` }, extra || {}), text);
    },

    title(x, y, scale, text, fill) {
      return g({ transform: `translate(${x} ${y})` }, [font.text(text, { scale, fill: fill || C.white, shadow: C.ink, outline: C.ink })]);
    },

    tappable(x, y, act, arg, children) {
      return g({ transform: `translate(${x} ${y})`, 'data-act': act, 'data-arg': arg, class: 'tappable' }, children);
    },

    // Overlay card with buttons, navigable with ← → / Enter or by tapping.
    showCard(title, bodyNodes, buttons, opts) {
      const o = opts || {};
      const h = o.height || 460;
      const y = (720 - h) / 2;
      const ov = clear(this.L.overlay);
      ov.appendChild(rect(-200, -200, 1680, 1120, C.night, { opacity: 0.55 }));
      ov.appendChild(rect(176, y + 7, 940, h, C.ink));
      ov.appendChild(rect(170, y, 940, h, C.wood, { stroke: C.ink, 'stroke-width': 5 }));
      ov.appendChild(rect(184, y + 14, 912, h - 28, C.cream, { stroke: C.ink, 'stroke-width': 3 }));
      if (title) ov.appendChild(g({ transform: `translate(640 ${y + 46})` }, [font.text(title, { scale: o.titleScale || 6, fill: C.royal })]));
      bodyNodes.forEach((n) => ov.appendChild(n));
      this.cardButtons = buttons;
      this.cardSel = o.selected !== undefined ? o.selected : buttons.length - 1;
      const bw = 250;
      const total = buttons.length * bw + (buttons.length - 1) * 30;
      buttons.forEach((b, i) => {
        const bx = 640 - total / 2 + bw / 2 + i * (bw + 30);
        b.node = this.tappable(bx, y + h - 66, 'card', i, [button(b.label, bw, 72, b.color || C.cream, { scale: 4 })]);
        ov.appendChild(b.node);
      });
      this.highlightCard();
    },

    highlightCard() {
      (this.cardButtons || []).forEach((b, i) => b.node && b.node.querySelector('.button').classList.toggle('selected', i === this.cardSel));
    },

    cardInput(a) {
      if (!this.cardButtons || !this.cardButtons.length) return;
      if (a.type === 'key' && (a.key === 'left' || a.key === 'right')) {
        const n = this.cardButtons.length;
        this.cardSel = (this.cardSel + (a.key === 'left' ? n - 1 : 1)) % n;
        this.highlightCard();
        audio.play('move');
      } else if (a.type === 'key' && a.key === 'ok') {
        this.cardAction(this.cardButtons[this.cardSel].act);
      } else if (a.type === 'tap' && a.act === 'card') {
        this.cardAction(this.cardButtons[Number(a.arg)].act);
      }
    },

    cardAction(act) {
      audio.play('click');
      if (act === 'menu') this.showMenu();
      else if (act === 'worlds') this.showWorlds();
      else if (act === 'retry') this.startLevel(this.levelIdx);
      else if (act === 'next') this.nextLevel();
      else if (act === 'resume') this.resume();
      else if (act === 'start') this.beginPlay();
      else if (act === 'hintdone') this.dismissHint();
    },

    // ---------- menu ----------

    showMenu() {
      this.state = 'menu';
      this.resetLayers();
      this.L.bg.appendChild(SP.facade());
      const s = this.L.scene;
      s.appendChild(g({ transform: 'translate(120 118) scale(0.85)' }, [SP.emblem()]));
      s.appendChild(this.title(735, 46, 7, 'La hora del Suanzes'));
      s.appendChild(g({ transform: 'translate(735 118)' }, [font.text('Aprende a leer el reloj', { scale: 3, fill: C.ink })]));
      s.appendChild(g({ transform: `translate(${MASCOT.x} 712) scale(0.62)` }, [SP.segundo('happy')]));
      s.appendChild(this.label(1100, 590, 24, 'CEIP Marqués de Suanzes', { class: 'reading hint' }));
      this.menuNodes = [
        this.tappable(470, 648, 'menu', 'sim', [button('El aula', 330, 96, C.gold, { scale: 5 })]),
        this.tappable(850, 648, 'menu', 'worlds', [button('Los retos', 330, 96, C.leafLight, { scale: 5 })]),
      ];
      this.menuNodes.forEach((n) => s.appendChild(n));
      this.highlightMenu();
    },

    highlightMenu() {
      this.menuNodes.forEach((n, i) => n.querySelector('.button').classList.toggle('selected', i === this.menuSel));
    },

    menuAction(which) {
      audio.play('click');
      if (which === 'sim') this.openSimulator();
      else this.showWorlds();
    },

    menuInput(a) {
      if (a.type === 'key' && (a.key === 'left' || a.key === 'right')) {
        this.menuSel = 1 - this.menuSel;
        this.highlightMenu();
        audio.play('move');
      } else if (a.type === 'key' && a.key === 'ok') {
        this.menuAction(this.menuSel === 0 ? 'sim' : 'worlds');
      } else if (a.type === 'tap' && a.act === 'menu') {
        this.menuAction(a.arg);
      }
    },

    openSimulator(time) {
      this.state = 'sim';
      this.resetLayers();
      this.sim = RL.simulator.create(this.L, this.schedule, { time });
    },

    // ---------- level map ----------

    isCleared(n) {
      return this.cleared.has(n);
    },

    starsOf(n) {
      return this.isCleared(n) ? 1 : 0;
    },

    unlocked(n) {
      return !!this.debug.all || RL.levels.isUnlocked(n, this.cleared);
    },

    firstOpenLevel() {
      const open = LEVELS.filter((l) => this.unlocked(l.n));
      const todo = open.find((l) => !this.isCleared(l.n));
      return (todo || open[open.length - 1]).n - 1;
    },

    showWorlds() {
      this.state = 'worlds';
      this.resetLayers();
      this.L.bg.appendChild(SP.backdrop('read'));
      const s = this.L.scene;
      s.appendChild(this.title(640, 30, 7, 'Los retos'));
      this.levelSel = this.firstOpenLevel();
      this.levelNodes = [];
      WORLDS.forEach((world, wi) => {
        const y = 170 + wi * 158;
        s.appendChild(el('text', { x: 500, y: y + 12, class: 'reading world-name', 'text-anchor': 'end', style: 'font-size:38px' }, `${wi + 1}. ${world.name}`));
        LEVELS.filter((l) => l.world === wi).forEach((lv, li) => {
          const open = this.unlocked(lv.n);
          const stars = this.starsOf(lv.n);
          const tile = this.tappable(650 + li * 215, y, 'level', lv.n - 1, [
            button('', 180, 124, open ? [C.sky, C.gold, C.leafLight][li] : C.greyLight),
            g({ transform: 'translate(0 -44)' }, [font.text(String(lv.n), { scale: 7, fill: C.ink })]),
          ]);
          const badge = g({ transform: 'translate(0 36)' }, open
            ? [0, 1, 2].map((i) => g({ transform: `translate(${(i - 1) * 42} 0)` }, [SP.star(i < stars, 17)]))
            : [g({ transform: 'translate(0 -6) scale(1.1)' }, [SP.padlock()])]);
          tile.appendChild(badge);
          this.levelNodes.push(tile);
          s.appendChild(tile);
        });
      });
      this.levelStatus = this.label(640, 660, 28, '');
      s.appendChild(this.levelStatus);
      this.L.hud.appendChild(this.tappable(90, 680, 'back', '', [button('Menú', 130, 54, C.cream, { scale: 3 })]));
      this.highlightLevels();
    },

    highlightLevels() {
      this.levelNodes.forEach((n, i) => n.querySelector('.button').classList.toggle('selected', i === this.levelSel));
      const lv = LEVELS[this.levelSel];
      this.levelStatus.textContent = this.unlocked(lv.n) ? `Nivel ${lv.n}: ${lv.title}` : RL.levels.requirementText(lv.n);
    },

    tryStart(idx) {
      if (this.unlocked(idx + 1)) return this.startLevel(idx);
      audio.play('bad');
      RL.modes.common.restartClass(this.levelNodes[idx], 'wrong');
      return undefined;
    },

    worldsInput(a) {
      if (a.type === 'tap' && a.act === 'back') return this.showMenu();
      if (a.type === 'key' && a.key === 'pause') return this.showMenu();
      if (a.type === 'key') {
        const delta = { left: -1, right: 1, up: -LEVELS_PER_WORLD, down: LEVELS_PER_WORLD }[a.key];
        if (delta) {
          this.levelSel = (this.levelSel + delta + LEVELS.length) % LEVELS.length;
          this.highlightLevels();
          audio.play('move');
        } else if (a.key === 'ok') {
          this.tryStart(this.levelSel);
        }
      } else if (a.type === 'tap' && a.act === 'level') {
        this.levelSel = Number(a.arg);
        this.highlightLevels();
        this.tryStart(this.levelSel);
      }
      return undefined;
    },

    // ---------- level flow ----------

    startLevel(idx) {
      if (idx >= LEVELS.length) return this.showVictory();
      audio.play('click');
      this.levelIdx = idx;
      this.levelSel = idx;
      this.level = LEVELS[idx];
      this.deck = new D.Deck(this.level, this.rng, (used) => E.generate(this.level, this.rng, this.schedule, used));
      this.state = 'intro';
      this.resetLayers();
      const world = WORLDS[this.level.world];
      this.L.bg.appendChild(SP.backdrop(world.theme));
      this.mascot = g({ transform: `translate(${MASCOT.x} ${MASCOT.y}) scale(${MASCOT.scale})` });
      this.L.scene.appendChild(this.mascot);
      this.prop = g({ transform: 'translate(1168 700)', class: 'crisp' });
      this.L.scene.appendChild(this.prop);
      this.setMood('happy');
      this.task = null;
      this.renderHud();
      const body = [
        this.label(640, 300, 34, `Nivel ${this.level.n} · ${world.name}`, { class: 'reading soft' }),
        this.label(640, 372, 44, this.level.title),
        this.label(640, 438, 28, `Consigue ${this.level.goal} aciertos para pasar de nivel.`, { class: 'reading soft' }),
      ];
      this.showCard('¡Vamos!', body, [{ label: 'Empezar', act: 'start', color: C.leafLight }], { height: 420 });
      return undefined;
    },

    setMood(mood) {
      if (this.mascot) clear(this.mascot).appendChild(SP.segundo(mood));
    },

    beginPlay() {
      clear(this.L.overlay);
      this.cardButtons = null;
      this.state = 'play';
      this.spawn();
    },

    spawn() {
      clear(this.L.fixed);
      this.task = this.debug.task || this.deck.next();
      this.mode = RL.modes[this.task.mode].build(this.task);
      this.L.fixed.appendChild(this.mode.node);
      this.resolving = false;
      this.spawnedAt = this.clock;
      this.setMood('happy');
      clear(this.prop);
      if (this.task.prop) this.prop.appendChild(SP.PROP[this.task.prop]());
      this.renderHud();
    },

    resolve(choice) {
      if (this.resolving) return;
      this.resolving = true;
      const task = this.task;
      const ok = E.isCorrect(task, choice);
      this.deck.answer(task, ok);
      this.mode.celebrate(ok, choice);
      if (ok) {
        audio.play('good');
        this.setMood('wow');
        fx.floatText(640, 330, PRAISE[Math.floor(Math.random() * PRAISE.length)], C.leafDark, 52);
        this.after(0.7, () => (this.deck.done ? this.levelClear() : this.spawn()));
      } else {
        audio.play('bad');
        fx.shake(8, 0.3);
        this.setMood('sad');
        this.after(0.55, () => this.showHint());
      }
      this.renderHud();
    },

    // After a miss: show the right answer and why. The exercise comes back later in the level.
    showHint() {
      this.state = 'hint';
      this.hintReadyAt = this.clock + 0.5;
      const task = this.task;
      const nodes = [];
      const isTime = task.answerType === 'time';
      const textX = isTime ? 760 : 640;
      if (isTime) nodes.push(CF.analog({ x: 360, y: 350, R: 105, t: task.answer }).node);
      let y = 256;
      for (const line of task.explain) {
        for (const part of wrap(line, isTime ? 34 : 54)) {
          nodes.push(this.label(textX, y, 30, part));
          y += 42;
        }
        y += 10;
      }
      nodes.push(this.label(640, 500, 24, 'Este ejercicio volverá a salir más adelante.', { class: 'reading soft' }));
      this.showCard('¡Casi! Fíjate', nodes, [{ label: 'Seguir', act: 'hintdone', color: C.leafLight }], { height: 520 });
    },

    hintInput(a) {
      if (this.clock < this.hintReadyAt) return;
      if (a.type === 'key' && (a.key === 'mute' || a.key === 'pause')) return;
      this.cardInput(a);
    },

    dismissHint() {
      clear(this.L.overlay);
      this.cardButtons = null;
      this.state = 'play';
      this.spawn();
    },

    levelClear() {
      this.state = 'clear';
      clear(this.L.fixed);
      this.mode = null;
      const stars = this.deck.stars;
      this.cleared.add(this.level.n);
      audio.play('clear');
      fx.confetti(640, 200, 80, 500);
      this.setMood('happy');
      this.renderHud();
      const last = this.levelIdx === LEVELS.length - 1;
      const nodes = [
        g({ transform: 'translate(640 310)' }, [0, 1, 2].map((i) => g({ transform: `translate(${(i - 1) * 120} ${i === 1 ? -14 : 0})` }, [SP.star(i < stars, 50)]))),
        this.label(640, 420, 30, this.deck.misses === 0 ? '¡Todo a la primera!' : 'Cada error te enseña algo. ¡Sigue así!'),
      ];
      const buttons = [
        { label: 'Retos', act: 'worlds', color: C.cream },
        { label: 'Repetir', act: 'retry', color: C.sky },
        { label: last ? '¡Final!' : 'Siguiente', act: 'next', color: C.leafLight },
      ];
      this.showCard('¡Nivel superado!', nodes, buttons, { height: 420, titleScale: 5 });
    },

    nextLevel() {
      if (this.levelIdx === LEVELS.length - 1) this.showVictory();
      else this.startLevel(this.levelIdx + 1);
    },

    showVictory() {
      this.state = 'victory';
      this.resetLayers();
      this.L.bg.appendChild(SP.facade());
      audio.play('clear');
      fx.confetti(640, 200, 120, 600);
      this.after(0.8, () => fx.confetti(320, 260, 60));
      this.after(1.4, () => fx.confetti(960, 260, 60));
      const nodes = [
        g({ transform: 'translate(640 400) scale(0.75)' }, [SP.segundo('wow')]),
        this.label(640, 452, 30, `Has superado los ${LEVELS.length} retos del Suanzes.`),
      ];
      this.showCard('¡Ya sabes la hora!', nodes, [{ label: 'Menú', act: 'menu', color: C.leafLight }], { height: 460, titleScale: 5 });
    },

    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused';
      this.showCard('Pausa', [this.label(640, 330, 30, 'El juego está en pausa.')], [{ label: 'Retos', act: 'worlds', color: C.cream }, { label: 'Seguir', act: 'resume', color: C.leafLight }], { height: 360 });
    },

    resume() {
      clear(this.L.overlay);
      this.cardButtons = null;
      this.state = 'play';
    },

    // ---------- HUD ----------

    renderHud() {
      const old = this.L.hud.querySelector('#play-hud');
      if (old) old.remove();
      const h = g({ id: 'play-hud' });
      this.L.hud.appendChild(h);
      h.appendChild(rect(16, 12, 560, 58, C.cream, { stroke: C.ink, 'stroke-width': 4 }));
      h.appendChild(this.label(296, 52, 28, `Nivel ${this.level.n} · ${WORLDS[this.level.world].name}`));
      const goal = this.level.goal;
      const done = Math.min(goal, this.deck.correct);
      for (let i = 0; i < goal; i++) h.appendChild(rect(600 + i * 42, 26, 34, 30, i < done ? C.leaf : C.white, { stroke: C.ink, 'stroke-width': 3 }));
      h.appendChild(this.tappable(1172, 40, 'pause', '', [el('circle', { r: 28, fill: C.cream, stroke: C.ink, 'stroke-width': 4 }), rect(-11, -12, 8, 24, C.ink), rect(3, -12, 8, 24, C.ink)]));
      if (!this.task) return;
      h.appendChild(rect(46, 91, 1200, 128, C.ink));
      h.appendChild(rect(40, 84, 1200, 128, C.white, { stroke: C.ink, 'stroke-width': 4 }));
      const promptLines = wrap(this.task.prompt, 66).slice(0, 2);
      let y = 128;
      if (this.task.story) {
        h.appendChild(this.label(640, y, 26, this.task.story, { class: 'reading story' }));
        y += 40;
      } else if (promptLines.length === 1) {
        y = 160;
      }
      promptLines.forEach((line, i) => h.appendChild(this.label(640, y + i * 36, 30, line)));
      if (this.mode && this.mode.keysHelp && this.state !== 'hint') h.appendChild(this.label(700, 706, 22, this.mode.keysHelp, { class: 'reading hint' }));
    },

    // ---------- input & loop ----------

    onAction(a) {
      if ((a.type === 'key' && a.key === 'mute') || (a.type === 'tap' && a.act === 'mute')) {
        audio.toggleMute();
        this.drawMute();
        return undefined;
      }
      switch (this.state) {
        case 'menu': return this.menuInput(a);
        case 'worlds': return this.worldsInput(a);
        case 'sim':
          if (this.sim.handle(a) === 'back') { audio.play('click'); this.showMenu(); }
          return undefined;
        case 'intro':
          if (a.type === 'key' && a.key === 'pause') return this.showWorlds();
          return this.cardInput(a);
        case 'play':
          if ((a.type === 'key' && a.key === 'pause') || (a.type === 'tap' && a.act === 'pause')) return this.pause();
          if (this.resolving || !this.mode) return undefined;
          {
            const r = this.mode.handle(a);
            if (!r) return undefined;
            if (r.moved) audio.play('move');
            if (r.choice !== undefined) this.resolve(r.choice);
          }
          return undefined;
        case 'hint': return this.hintInput(a);
        case 'paused':
          if (a.type === 'key' && a.key === 'pause') return this.resume();
          return this.cardInput(a);
        case 'clear':
        case 'victory':
          return this.cardInput(a);
        default:
          return undefined;
      }
    },

    update(dt) {
      this.clock += dt;
      document.body.dataset.state = `${this.state}:${this.level ? this.level.n : 0}:${this.deck ? this.deck.correct : 0}`;
      const due = this.timers.filter((t) => t.at <= this.clock);
      this.timers = this.timers.filter((t) => t.at > this.clock);
      due.forEach((t) => t.fn());
      if (this.sim) this.sim.update(dt);
      fx.update(dt);
    },

    // Jump straight to a screen for screenshots: ?screen=sim|worlds|intro|play|hint|pause|clear|victory
    debugScreen(screen) {
      if (screen === 'sim') return this.openSimulator(this.debug.time);
      if (screen === 'worlds') return this.showWorlds();
      if (screen === 'victory') return this.showVictory();
      this.startLevel(this.debug.level ? this.debug.level - 1 : 0);
      if (screen === 'intro') return undefined;
      this.beginPlay();
      if (screen === 'hint') this.showHint();
      else if (screen === 'pause') this.pause();
      else if (screen === 'clear') this.levelClear();
      return undefined;
    },
  };

  RL.game = game;
})(window);
