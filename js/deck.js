// Seeded random numbers and the per-level queue of exercises, with retries of missed ones. Pure.
// Works in the browser (window.RL.deck) and in node (module.exports) for tests.
(function (root) {
  const RETRY_GAP = [2, 4]; // a missed exercise comes back after 2 to 4 others

  // mulberry32: small deterministic generator so ?seed=N replays the same game.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // generate(used) must return a new task; used is the set of task keys already served.
  class Deck {
    constructor(level, rng, generate) {
      this.level = level;
      this.rng = rng;
      this.generate = generate;
      this.used = new Set();
      this.retries = [];
      this.retryOut = null; // retry served but not answered yet
      this.served = 0;
      this.correct = 0;
      this.misses = 0;
    }

    next() {
      // Once the goal is reached only the pending retries remain, so they are served straight away.
      const dueIdx = this.retries.findIndex((r) => r.due <= this.served || this.correct >= this.level.goal);
      let task;
      if (dueIdx >= 0) {
        task = this.retries.splice(dueIdx, 1)[0].task;
        task.retry = true;
        this.retryOut = task;
      } else {
        task = this.generate(this.used);
        this.used.add(task.key);
      }
      this.served++;
      return task;
    }

    // A solved retry counts towards the goal too, so a child who keeps missing at the first try can still finish.
    answer(task, ok) {
      if (task === this.retryOut) this.retryOut = null;
      if (ok) {
        this.correct++;
        return;
      }
      if (!task.retry) this.misses++;
      const gap = RETRY_GAP[0] + Math.floor(this.rng() * (RETRY_GAP[1] - RETRY_GAP[0] + 1));
      this.retries.push({ task, due: this.served + gap });
    }

    get done() {
      return this.correct >= this.level.goal && this.retries.length === 0 && !this.retryOut;
    }

    get progress() {
      return Math.min(1, this.correct / this.level.goal);
    }

    // Stars reward getting it right the first time; nothing is ever lost for trying.
    get stars() {
      if (this.misses === 0) return 3;
      return this.misses <= 2 ? 2 : 1;
    }
  }

  const api = { makeRng, shuffle, Deck };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.RL = root.RL || {}).deck = api;
})(typeof window !== 'undefined' ? window : globalThis);
