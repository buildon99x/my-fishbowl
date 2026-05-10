import { MASTER_VOLUME_CAP, SOUND_CATEGORIES } from './state.js';
import {
  createConcurrencyState,
  registerActive,
  releaseActive,
  shouldRateLimit,
} from './concurrency.js';

const SOUND_BASE = '/sounds';

const SOUND_PATHS = {
  'ambient.water-loop': 'ambient/water-loop.ogg',
  'ui.tap': 'ui/tap.ogg',
  'ui.panel-open': 'ui/panel-open.ogg',
  'ui.panel-close': 'ui/panel-close.ogg',
  'ui.toggle-on': 'ui/toggle-on.ogg',
  'ui.toggle-off': 'ui/toggle-off.ogg',
  'interaction.food-drop': 'interaction/food-drop.ogg',
  'interaction.food-eat': 'interaction/food-eat.ogg',
  'interaction.clean-stroke': 'interaction/clean-stroke.ogg',
  'interaction.clean-complete': 'interaction/clean-complete.ogg',
  'interaction.fish-delete': 'interaction/fish-delete.ogg',
  'magic.anticipate': 'magic/magic-anticipate.ogg',
  'magic.splash': 'magic/magic-splash.ogg',
  'magic.welcome': 'magic/magic-welcome.ogg',
  'ui.voice-tap-here': 'ui/voice-tap-here.ogg',
};

// Synthesized fallback sounds. When a real asset is missing or fails to fetch,
// we play a programmatic substitute so the sound modal's promise is kept and
// the magic-moment audio channel is never silent. Real assets always win when
// present.
const SYNTH_RECIPES = {
  'ambient.water-loop': { kind: 'rumble', duration: 4, loop: true },
  'ui.tap': { kind: 'click', freq: 1100, duration: 0.06 },
  'ui.panel-open': { kind: 'click', freq: 880, duration: 0.09 },
  'ui.panel-close': { kind: 'click', freq: 660, duration: 0.09 },
  'ui.toggle-on': { kind: 'twoNote', notes: [660, 990], duration: 0.18 },
  'ui.toggle-off': { kind: 'twoNote', notes: [990, 660], duration: 0.18 },
  'ui.voice-tap-here': { kind: 'chime', notes: [880, 1175, 1568], duration: 0.9 },
  'interaction.food-drop': { kind: 'click', freq: 320, duration: 0.12 },
  'interaction.food-eat': { kind: 'pop', freq: 520, duration: 0.18 },
  'interaction.clean-stroke': { kind: 'noise', duration: 0.14, hp: 600 },
  'interaction.clean-complete': { kind: 'chime', notes: [660, 880, 1320], duration: 0.6 },
  'interaction.fish-delete': { kind: 'chime', notes: [660, 440, 330], duration: 0.5 },
  'magic.anticipate': { kind: 'sweep', from: 220, to: 660, duration: 0.3 },
  'magic.splash': { kind: 'noise', duration: 0.25, hp: 1200, lp: 4500 },
  'magic.welcome': { kind: 'chime', notes: [523, 659, 784, 1047], duration: 1.4, bell: true },
};

function playSynth(ctx, dest, soundId, opts = {}) {
  const recipe = SYNTH_RECIPES[soundId];
  if (!recipe) return null;
  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = opts.volume ?? 1;
  out.connect(dest);
  const sources = [];

  function envelope(node, attack, peak, decay) {
    node.gain.cancelScheduledValues(t0);
    node.gain.setValueAtTime(0, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  function makeNoise(duration) {
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(sr * duration)), sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  if (recipe.kind === 'click') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = recipe.freq;
    osc.type = 'triangle';
    osc.connect(g).connect(out);
    envelope(g, 0.005, 0.7, recipe.duration);
    osc.start(t0); osc.stop(t0 + recipe.duration + 0.05);
    sources.push(osc);
  } else if (recipe.kind === 'twoNote') {
    recipe.notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(g).connect(out);
      const start = t0 + i * (recipe.duration * 0.6);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.6, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + recipe.duration);
      osc.start(start); osc.stop(start + recipe.duration + 0.05);
      sources.push(osc);
    });
  } else if (recipe.kind === 'chime') {
    const oscType = recipe.bell ? 'sine' : 'triangle';
    recipe.notes.forEach((freq, i) => {
      const start = t0 + i * 0.12;
      const dur = recipe.duration - i * 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = oscType;
      osc.frequency.value = freq;
      osc.connect(g).connect(out);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.5, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start); osc.stop(start + dur + 0.05);
      sources.push(osc);
    });
  } else if (recipe.kind === 'pop') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(recipe.freq, t0);
    osc.frequency.exponentialRampToValueAtTime(recipe.freq * 1.8, t0 + recipe.duration);
    osc.connect(g).connect(out);
    envelope(g, 0.005, 0.6, recipe.duration);
    osc.start(t0); osc.stop(t0 + recipe.duration + 0.05);
    sources.push(osc);
  } else if (recipe.kind === 'sweep') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(recipe.from, t0);
    osc.frequency.exponentialRampToValueAtTime(recipe.to, t0 + recipe.duration);
    osc.connect(g).connect(out);
    envelope(g, 0.02, 0.55, recipe.duration);
    osc.start(t0); osc.stop(t0 + recipe.duration + 0.05);
    sources.push(osc);
  } else if (recipe.kind === 'noise') {
    const src = makeNoise(recipe.duration);
    const g = ctx.createGain();
    let node = src;
    if (recipe.hp) {
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = recipe.hp;
      node.connect(f); node = f;
    }
    if (recipe.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = recipe.lp;
      node.connect(f); node = f;
    }
    node.connect(g).connect(out);
    envelope(g, 0.005, 0.55, recipe.duration);
    src.start(t0); src.stop(t0 + recipe.duration + 0.05);
    sources.push(src);
  } else if (recipe.kind === 'rumble') {
    // Continuous low rumble for ambient. Returns a stoppable handle via "loop"
    // semantics — caller manages lifecycle through stop().
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * recipe.duration));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      data[i] = Math.sin(2 * Math.PI * 80 * t) * 0.3
        + Math.sin(2 * Math.PI * 120 * t + 0.7) * 0.18
        + (Math.random() * 2 - 1) * 0.05;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;
    src.connect(lp).connect(out);
    src.start(t0);
    sources.push(src);
  }

  return {
    sources,
    output: out,
    stop(when) {
      const t = when ?? ctx.currentTime;
      sources.forEach((s) => { try { s.stop(t); } catch { /* ignore */ } });
    },
  };
}

const AMBIENT_FADE_IN = 1.5;
const AMBIENT_FADE_OUT = 1.0;

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

export function createAudioEngine(getSettings) {
  const Ctor = getAudioContextCtor();
  const concurrency = createConcurrencyState();
  const buffers = new Map();
  const inflight = new Map();
  let ctx = null;
  let masterGain = null;
  let categoryGains = null;
  let ambientSource = null;
  let ambientGain = null;
  const ambient = { synth: null };
  let ambientPausedByVisibility = false;

  function ensureContext() {
    if (ctx || !Ctor) return ctx;
    try {
      ctx = new Ctor();
      masterGain = ctx.createGain();
      masterGain.gain.value = Math.min(getSettings().masterVolume, MASTER_VOLUME_CAP);
      masterGain.connect(ctx.destination);
      categoryGains = {};
      SOUND_CATEGORIES.forEach((name) => {
        const g = ctx.createGain();
        g.gain.value = getSettings().categories[name].volume;
        g.connect(masterGain);
        categoryGains[name] = g;
      });
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function isSuspended() {
    return Boolean(ctx && ctx.state === 'suspended');
  }

  async function resume() {
    ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  async function loadBuffer(soundId) {
    if (buffers.has(soundId)) return buffers.get(soundId);
    if (inflight.has(soundId)) return inflight.get(soundId);
    const path = SOUND_PATHS[soundId];
    if (!path || !ctx) return null;
    const promise = (async () => {
      try {
        const res = await fetch(`${SOUND_BASE}/${path}`);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        buffers.set(soundId, buf);
        return buf;
      } catch {
        return null;
      } finally {
        inflight.delete(soundId);
      }
    })();
    inflight.set(soundId, promise);
    return promise;
  }

  function applySettings() {
    const s = getSettings();
    if (!ctx || !masterGain || !categoryGains) return;
    masterGain.gain.value = s.masterEnabled ? Math.min(s.masterVolume, MASTER_VOLUME_CAP) : 0;
    SOUND_CATEGORIES.forEach((name) => {
      categoryGains[name].gain.value = s.categories[name].enabled ? s.categories[name].volume : 0;
    });
    if (!s.masterEnabled || !s.categories.ambient.enabled) {
      stopAmbient();
    }
  }

  function startAmbient() {
    ensureContext();
    const s = getSettings();
    if (!ctx || !s.masterEnabled || !s.categories.ambient.enabled) return;
    if (ambientSource) return;
    loadBuffer('ambient.water-loop').then((buf) => {
      if (ambientSource || ambient.synth || ctx.state === 'closed') return;
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(g).connect(categoryGains.ambient);
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(1, t + AMBIENT_FADE_IN);
        src.start();
        ambientSource = src;
        ambientGain = g;
        return;
      }
      // Asset missing — fall back to synthesized rumble so ambient never goes
      // silent after the user opted in.
      const synth = playSynth(ctx, categoryGains.ambient, 'ambient.water-loop');
      if (!synth) return;
      const t = ctx.currentTime;
      synth.output.gain.cancelScheduledValues(t);
      synth.output.gain.setValueAtTime(0, t);
      synth.output.gain.linearRampToValueAtTime(0.6, t + AMBIENT_FADE_IN);
      ambient.synth = synth;
    });
  }

  function stopAmbient() {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (ambientSource) {
      const src = ambientSource;
      const g = ambientGain;
      try {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(0, t + AMBIENT_FADE_OUT);
        src.stop(t + AMBIENT_FADE_OUT + 0.05);
      } catch {
        /* ignore */
      }
      ambientSource = null;
      ambientGain = null;
    }
    if (ambient.synth) {
      try {
        ambient.synth.output.gain.cancelScheduledValues(t);
        ambient.synth.output.gain.setValueAtTime(ambient.synth.output.gain.value, t);
        ambient.synth.output.gain.linearRampToValueAtTime(0, t + AMBIENT_FADE_OUT);
        ambient.synth.stop(t + AMBIENT_FADE_OUT + 0.05);
      } catch {
        /* ignore */
      }
      ambient.synth = null;
    }
  }

  function pauseAmbientForVisibility() {
    if (!ambientSource && !ambient.synth) return;
    stopAmbient();
    ambientPausedByVisibility = true;
  }

  function resumeAmbientFromVisibility() {
    if (!ambientPausedByVisibility) return;
    ambientPausedByVisibility = false;
    startAmbient();
  }

  function playSound(soundId, opts = {}) {
    const s = getSettings();
    if (!s.masterEnabled) return;
    const [category] = soundId.split('.');
    if (!categoryGains || !categoryGains[category]) return;
    if (!s.categories[category]?.enabled) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (shouldRateLimit(concurrency, soundId, now)) return;
    ensureContext();
    if (!ctx) return;
    loadBuffer(soundId).then((buf) => {
      let src;
      let g;
      if (buf) {
        src = ctx.createBufferSource();
        src.buffer = buf;
        g = ctx.createGain();
        g.gain.value = opts.volume ?? 1;
        src.connect(g).connect(categoryGains[category]);
      } else {
        // Asset missing — synthesized fallback so the modal's promise is kept.
        const synth = playSynth(ctx, categoryGains[category], soundId, opts);
        if (!synth) return;
        src = synth.sources[0];
        g = synth.output;
      }
      const entry = { id: soundId, category, source: src, gain: g };
      const result = registerActive(concurrency, entry);
      if (!result.accepted) {
        try { src.disconnect(); g.disconnect(); } catch { /* ignore */ }
        return;
      }
      if (result.evicted) {
        try {
          const t = ctx.currentTime;
          result.evicted.gain.gain.cancelScheduledValues(t);
          result.evicted.gain.gain.linearRampToValueAtTime(0, t + 0.08);
          result.evicted.source.stop(t + 0.1);
        } catch {
          /* ignore */
        }
        releaseActive(concurrency, result.evicted);
      }
      src.onended = () => releaseActive(concurrency, entry);
      try {
        src.start();
      } catch {
        releaseActive(concurrency, entry);
      }
    });
  }

  function dispose() {
    stopAmbient();
    if (ctx) {
      try { ctx.close(); } catch { /* ignore */ }
    }
    ctx = null;
  }

  return {
    ensureContext,
    resume,
    isSuspended,
    playSound,
    applySettings,
    startAmbient,
    stopAmbient,
    pauseAmbientForVisibility,
    resumeAmbientFromVisibility,
    dispose,
    _internalForTests: { buffers, concurrency },
  };
}
