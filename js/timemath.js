// Time of day as integer minutes (0–1439): parsing, formatting and arithmetic. Pure.
// Works in the browser (window.RL.timemath) and in node (module.exports) for tests.
(function (root) {
  const DAY = 1440;
  const HALF_DAY = 720;

  function mod(value, m) {
    return ((value % m) + m) % m;
  }

  // Strict "HH:MM" (24 h); anything else gives NaN so bad data never passes as a time.
  function parse(text) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(text));
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
  }

  function format(t) {
    const v = mod(t, DAY);
    return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  }

  function make(hours, minutes) {
    return mod(hours * 60 + minutes, DAY);
  }

  function hours(t) {
    return Math.floor(mod(t, DAY) / 60);
  }

  function minutes(t) {
    return mod(t, 60);
  }

  function add(t, delta) {
    return mod(t + delta, DAY);
  }

  // Minutes going forward from a to b, also across midnight.
  function diff(a, b) {
    return mod(b - a, DAY);
  }

  const api = { DAY, HALF_DAY, mod, parse, format, make, hours, minutes, add, diff };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).timemath = api;
})(typeof window !== 'undefined' ? window : globalThis);
