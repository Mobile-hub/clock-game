// Daylight model: from the time and the sun settings to a phase, a discrete brightness step and the sun and moon
// positions. Discrete on purpose: the art uses a limited palette and dithering, never smooth gradients. Pure.
// Works in the browser (window.RL.sky) and in node (module.exports) for tests.
(function (root) {
  const T = typeof module !== 'undefined' && module.exports ? require('./timemath.js') : root.RL.timemath;

  const NIGHT = 0;
  const FULL_DAY = 4;

  function phaseAt(t, sun) {
    const { sunrise, sunset, twilight } = sun;
    if (t < sunrise - twilight || t >= sunset + twilight) return { phase: 'night', step: NIGHT };
    if (t < sunrise) return { phase: 'dawn', step: t < sunrise - twilight / 2 ? 1 : 2 };
    if (t < sunrise + twilight) return { phase: 'morning', step: 3 };
    if (t < sunset - twilight) return { phase: 'day', step: FULL_DAY };
    if (t < sunset) return { phase: 'evening', step: 3 };
    return { phase: 'dusk', step: t < sunset + twilight / 2 ? 2 : 1 };
  }

  // x runs 0→1 across the sky (east to west); y is the height above the horizon, 0→1→0.
  function at(t, sun) {
    const { phase, step } = phaseAt(t, sun);
    const up = t >= sun.sunrise && t <= sun.sunset;
    const across = up ? (t - sun.sunrise) / (sun.sunset - sun.sunrise) : T.diff(sun.sunset, t) / (T.DAY - (sun.sunset - sun.sunrise));
    const body = { x: across, y: Math.sin(Math.PI * across) };
    return { phase, step, sun: up ? body : null, moon: up ? null : body };
  }

  // Lessons switch the room lights on when it is dark outside; an empty room always stays off.
  function lightsOn(scene, step) {
    return (scene === 'lesson' || scene === 'arrival') && step <= 2;
  }

  const api = { NIGHT, FULL_DAY, at, lightsOn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).sky = api;
})(typeof window !== 'undefined' ? window : globalThis);
