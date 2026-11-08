// Progress record kept only on this device, in localStorage (never cookies, nothing leaves the browser):
//   { v: 1, levels: { "<n>": { cleared: true, stars: 1–3 } } }
// Every access is wrapped in try/catch: without storage the game still works, progress just lasts one session.
// Works in the browser (window.RL.storage) and in node (module.exports) for tests, with any localStorage-like store.
(function (root) {
  const L = typeof module !== 'undefined' && module.exports ? require('./levels.js') : root.RL.levels;

  const KEY = 'reloj:progress';

  function empty() {
    return { v: 1, levels: {} };
  }

  function defaultStore() {
    try {
      return root.localStorage || null;
    } catch (e) {
      return null;
    }
  }

  function load(store) {
    const s = store === undefined ? defaultStore() : store;
    try {
      const p = JSON.parse((s && s.getItem(KEY)) || 'null');
      if (!p || p.v !== 1 || typeof p.levels !== 'object' || p.levels === null) return empty();
      return { v: 1, levels: p.levels };
    } catch (e) {
      return empty();
    }
  }

  function save(p, store) {
    const s = store === undefined ? defaultStore() : store;
    try {
      if (s) s.setItem(KEY, JSON.stringify(p));
    } catch (e) { /* storage full or blocked: keep playing */ }
  }

  function cleared(p) {
    return new Set(Object.keys(p.levels).filter((n) => p.levels[n].cleared).map(Number));
  }

  function isUnlocked(p, n) {
    return L.isUnlocked(n, cleared(p));
  }

  function levelInfo(p, n) {
    return p.levels[n] || { cleared: false, stars: 0 };
  }

  // Record a cleared level, keeping the best stars; returns the level numbers this clear has just unlocked.
  function recordClear(p, n, stars) {
    const before = cleared(p);
    p.levels[n] = { cleared: true, stars: Math.max(levelInfo(p, n).stars, stars) };
    const after = cleared(p);
    return L.LEVELS.map((l) => l.n).filter((m) => !L.isUnlocked(m, before) && L.isUnlocked(m, after));
  }

  const api = { KEY, empty, load, save, cleared, isUnlocked, levelInfo, recordClear };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).storage = api;
})(typeof window !== 'undefined' ? window : globalThis);
