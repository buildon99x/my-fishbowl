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
};

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
      if (!buf || ambientSource || ctx.state === 'closed') return;
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
    });
  }

  function stopAmbient() {
    if (!ctx || !ambientSource) return;
    const src = ambientSource;
    const g = ambientGain;
    const t = ctx.currentTime;
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

  function pauseAmbientForVisibility() {
    if (!ambientSource) return;
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
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = opts.volume ?? 1;
      src.connect(g).connect(categoryGains[category]);
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
