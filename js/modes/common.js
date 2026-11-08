// Shared by the exercise modes. Every mode's build(task) returns the same shape:
//   { node, keysHelp, handle(action) → null | { moved } | { choice }, celebrate(ok, choice), correctChoice() }
(function (root) {
  const RL = root.RL;
  const { el, g } = RL.svg;
  const { C } = RL.sprites;
  const CF = RL.clockface;

  const LEFT_X = 290;
  const CLOCK_Y = 425;

  // The clocks the exercise is about, on the left of the play area. Two of them for an interval.
  function displayClocks(task) {
    if (task.show.length === 1) {
      const s = task.show[0];
      return s.type === 'analog' ? CF.analog({ x: LEFT_X, y: CLOCK_Y, R: 160, t: s.t }).node : CF.digital({ x: LEFT_X, y: CLOCK_Y, t: s.t }).node;
    }
    return g({}, task.show.map((s, i) => {
      const x = 165 + i * 250;
      const label = el('text', { x, y: 262, class: 'reading', 'text-anchor': 'middle', style: 'font-size:30px' }, s.label);
      const clock = s.type === 'analog' ? CF.analog({ x, y: 400, R: 108, t: s.t }).node : CF.digital({ x, y: 400, t: s.t, scale: 0.72 }).node;
      return g({}, [label, clock]);
    }));
  }

  function restartClass(node, name) {
    node.classList.remove(name);
    node.getBoundingClientRect();
    node.classList.add(name);
  }

  function caret(x, y, w) {
    return el('rect', { x, y, width: w, height: 6, fill: C.ink, class: 'caret' });
  }

  ((root.RL = root.RL || {}).modes = root.RL.modes || {}).common = { displayClocks, restartClass, caret };
})(window);
