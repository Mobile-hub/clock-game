// Soft synthesized sounds (WebAudio), no audio files. M toggles mute.
(function (root) {
  const MUTE_KEY = 'reloj:muted';
  const VOLUME = 0.5;
  let ctx = null;
  let master = null;
  let muted = false;
  let lastTick = 0;

  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch (e) { /* storage unavailable */ }

  // Must be called from a user gesture (browsers block audio until then).
  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
  }

  function tone(freq, start, dur, type, vol, slideTo) {
    if (!ctx) return;
    const t = ctx.currentTime + (start || 0);
    const o = ctx.createOscillator();
    const env = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(env);
    env.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  const N = (semi) => 523.25 * Math.pow(2, semi / 12); // semitones from C5

  const sfx = {
    // The soft wooden "clonc" of a clock mechanism settling: a tiny click over a low falling body.
    clonc() {
      tone(1250, 0, 0.018, 'square', 0.05);
      tone(220, 0, 0.24, 'sine', 0.5, 130);
      tone(440, 0.006, 0.09, 'triangle', 0.12, 300);
    },
    tick() {
      if (!ctx || ctx.currentTime - lastTick < 0.04) return;
      lastTick = ctx.currentTime;
      tone(1800, 0, 0.012, 'square', 0.03);
    },
    click() { tone(N(7), 0, 0.06, 'triangle', 0.18); },
    move() { tone(N(12), 0, 0.04, 'sine', 0.12); },
    good() { tone(N(4), 0, 0.1, 'triangle', 0.25); tone(N(11), 0.07, 0.16, 'triangle', 0.25); },
    bad() { tone(N(-5), 0, 0.22, 'triangle', 0.25, N(-9)); },
    clear() { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(N(s), i * 0.1, 0.18, 'triangle', 0.25)); },
    bell() { [12, 7, 12, 7].forEach((s, i) => tone(N(s), i * 0.22, 0.4, 'sine', 0.2)); },
  };

  function play(name) {
    if (sfx[name]) sfx[name]();
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : VOLUME;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch (e) { /* storage unavailable */ }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend();
  }

  (root.RL = root.RL || {}).audio = { unlock, play, toggleMute, isMuted, suspend };
})(window);
