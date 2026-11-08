// Clock-hand geometry and dragging. Pure.
// The time is the only state: angles are derived from it and a drag integrates angle changes, so nothing ever sets the
// time from an absolute angle. That removes the morning/afternoon ambiguity of a 12-hour dial and makes the hour carry
// in both directions, also across midnight.
// Works in the browser (window.RL.clockmath) and in node (module.exports) for tests.
(function (root) {
  const T = typeof module !== 'undefined' && module.exports ? require('./timemath.js') : root.RL.timemath;

  const DEAD_ZONE = 0.2; // fraction of the dial radius where the angle is too unstable to use

  function angles(t) {
    return { minute: T.mod(t, 60) * 6, hour: T.mod(t, T.HALF_DAY) / 2 };
  }

  // Clockwise degrees from twelve o'clock for a point relative to the centre of the dial.
  function angleAt(dx, dy) {
    return T.mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360);
  }

  function wrap180(degrees) {
    return T.mod(degrees + 180, 360) - 180;
  }

  function snap(value, step) {
    return Math.round(value / step) * step;
  }

  function beginDrag(t, hand, angle, step) {
    return { hand, step: step || 1, lastAngle: angle, start: t, raw: t, turned: 0, t, skipped: false };
  }

  // Feed the pointer angle; returns the new time. radiusRatio (distance / dial radius) is optional: inside the dead zone
  // the move is ignored, and the first move after it only re-anchors, so a finger crossing the centre cannot jump.
  function moveDrag(drag, angle, radiusRatio) {
    if (radiusRatio !== undefined && radiusRatio < DEAD_ZONE) {
      drag.skipped = true;
      return drag.t;
    }
    if (drag.skipped) {
      drag.skipped = false;
      drag.lastAngle = angle;
      return drag.t;
    }
    const delta = wrap180(angle - drag.lastAngle);
    drag.lastAngle = angle;
    if (drag.hand === 'minute') {
      drag.raw += delta / 6; // never write the snapped value back: slow drags would stick
      drag.t = T.mod(snap(drag.raw, drag.step), T.DAY);
    } else {
      // The hour hand moves in whole hours and keeps the minutes, so setting the hour never undoes the minutes.
      drag.turned += delta;
      drag.t = T.mod(drag.start + 60 * Math.round(drag.turned / 30), T.DAY);
    }
    return drag.t;
  }

  // Which hand a touch means. Thin hands are never hit-tested: the whole dial is the target.
  // geometry: { R, hourLen } in the same units as radius.
  function pickHand(t, radius, angle, geometry) {
    if (radius < geometry.R * DEAD_ZONE) return null;
    if (radius > geometry.hourLen * 1.1) return 'minute';
    const a = angles(t);
    const toMinute = Math.abs(wrap180(angle - a.minute));
    const toHour = Math.abs(wrap180(angle - a.hour));
    if (Math.min(toMinute, toHour) > 40) return null;
    if (Math.abs(toMinute - toHour) < 12) return radius < 0.85 * geometry.hourLen ? 'hour' : 'minute';
    return toMinute < toHour ? 'minute' : 'hour';
  }

  // Keyboard and triangle equivalent of a drag.
  function nudge(t, unit, direction, step) {
    return T.add(t, direction * (unit === 'hour' ? 60 : step || 1));
  }

  const api = { DEAD_ZONE, angles, angleAt, wrap180, snap, beginDrag, moveDrag, pickHand, nudge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).clockmath = api;
})(typeof window !== 'undefined' ? window : globalThis);
