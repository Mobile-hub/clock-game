// Turns keyboard, mouse and touch into abstract actions for the game:
//   { type: 'key', key: 'left'|'right'|'up'|'down'|'ok'|'pause'|'mute'|'erase'|'other' }
//   { type: 'digit', n }
//   { type: 'tap', act, arg }       (pointer on an element with data-act / data-arg)
//   { type: 'tapAny' }              (pointer anywhere else)
//   { type: 'drag', phase: 'start'|'move'|'end', x, y }   (started on an element with data-drag; stage coordinates)
//   { type: 'release' }             (a non-drag pointer was lifted)
(function (root) {
  const KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Enter: 'ok', ' ': 'ok', Spacebar: 'ok',
    p: 'pause', P: 'pause', Escape: 'pause',
    m: 'mute', M: 'mute',
    Backspace: 'erase', Delete: 'erase',
  };

  let handler = () => {};
  const queue = [];

  function emit(action) {
    queue.push(action);
  }

  function init(stage, onFirstGesture) {
    let unlocked = false;
    let dragPointer = null;
    const gesture = () => {
      if (!unlocked) {
        unlocked = true;
        onFirstGesture();
      }
    };

    // From screen pixels to the 1280×720 stage, whatever the letterboxing.
    const toStage = (e) => {
      const m = stage.getScreenCTM().inverse();
      return { x: m.a * e.clientX + m.c * e.clientY + m.e, y: m.b * e.clientX + m.d * e.clientY + m.f };
    };

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      gesture();
      if (/^[0-9]$/.test(e.key)) {
        emit({ type: 'digit', n: Number(e.key) });
      } else {
        emit({ type: 'key', key: KEYS[e.key] || 'other' });
      }
      if (KEYS[e.key] || /^[0-9]$/.test(e.key)) e.preventDefault();
    });

    stage.addEventListener('pointerdown', (e) => {
      gesture();
      e.preventDefault();
      if (dragPointer !== null) return; // a second finger never interrupts a drag
      const handle = e.target.closest && e.target.closest('[data-drag]');
      if (handle) {
        dragPointer = e.pointerId;
        // Captured on the stage, not on the hand: redrawing the hand would drop the capture.
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers cannot be captured */ }
        emit(Object.assign({ type: 'drag', phase: 'start' }, toStage(e)));
        return;
      }
      const target = e.target.closest && e.target.closest('[data-act]');
      if (target) emit({ type: 'tap', act: target.getAttribute('data-act'), arg: target.getAttribute('data-arg') });
      else emit({ type: 'tapAny' });
    });

    stage.addEventListener('pointermove', (e) => {
      if (e.pointerId === dragPointer) emit(Object.assign({ type: 'drag', phase: 'move' }, toStage(e)));
    });

    const lift = (e) => {
      if (e.pointerId === dragPointer) {
        dragPointer = null;
        emit(Object.assign({ type: 'drag', phase: 'end' }, toStage(e)));
      } else {
        emit({ type: 'release' });
      }
    };
    stage.addEventListener('pointerup', lift);
    stage.addEventListener('pointercancel', lift);

    stage.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Delivered once per frame by the main loop so the game handles input in a predictable order.
  function flush() {
    while (queue.length) handler(queue.shift());
  }

  function onAction(fn) {
    handler = fn;
  }

  (root.RL = root.RL || {}).input = { init, flush, onAction, emit };
})(window);
