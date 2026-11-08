// The worlds and levels of the game mode. Pure.
// grid: resolution of the times in the level, in minutes. step: snapping of the hand when setting the clock.
// Works in the browser (window.RL.levels) and in node (module.exports) for tests.
(function (root) {
  const WORLDS = [
    { id: 'read', name: '¿Qué hora es?', theme: 'read' },
  ];

  const LEVELS = [
    { n: 1, world: 0, tier: 1, title: 'En punto y media', grid: 30, step: 5, goal: 6, kinds: ['readPhrase', 'setClock'] },
    { n: 2, world: 0, tier: 2, title: 'Cuartos y de 5 en 5', grid: 5, step: 5, goal: 7, kinds: ['readPhrase', 'readDigital', 'digitalToAnalog', 'setClock'] },
    { n: 3, world: 0, tier: 3, title: 'Al minuto y en 24 horas', grid: 1, step: 1, goal: 8, kinds: ['readPhrase', 'phrase24', 'type24', 'setClock'] },
  ];

  // Levels open strictly in order.
  function isUnlocked(n, cleared) {
    return n === 1 || cleared.has(n - 1);
  }

  function requirementText(n) {
    return `Supera antes el nivel ${n - 1}`;
  }

  const api = { WORLDS, LEVELS, isUnlocked, requirementText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).levels = api;
})(typeof window !== 'undefined' ? window : globalThis);
