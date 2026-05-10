import {
  createMagicMomentState,
  dequeueMagicMoment,
  enqueueMagicMoment,
  isMagicActive,
  MAGIC_PHASE_DURATIONS,
  MAGIC_QUEUE_MAX,
} from './state.js';

export { createMagicMomentState };

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureOverlay() {
  // Attach to document.body so the overlay survives parent re-renders
  // that wipe the app root (#app).
  let overlay = document.body.querySelector('[data-magic-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'magic-moment-overlay';
    overlay.dataset.magicOverlay = '';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
  }
  return overlay;
}

function createBubbleParticle(x, y) {
  const el = document.createElement('span');
  el.className = 'magic-bubble';
  const angle = Math.random() * Math.PI * 2;
  const distance = 24 + Math.random() * 36;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 30;
  const size = 6 + Math.random() * 10;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.setProperty('--bubble-dx', `${dx}px`);
  el.style.setProperty('--bubble-dy', `${dy}px`);
  return el;
}

function emitBubbleBurst(overlay, x, y, count) {
  for (let i = 0; i < count; i++) {
    const b = createBubbleParticle(x, y);
    overlay.appendChild(b);
    setTimeout(() => b.remove(), 900);
  }
}

function emitSplashRing(overlay, x, y) {
  const ring = document.createElement('span');
  ring.className = 'magic-splash-ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  overlay.appendChild(ring);
  setTimeout(() => ring.remove(), 700);
}

function renderQueueIndicator(root, queueLen) {
  const overlay = ensureOverlay();
  let indicator = overlay.querySelector('[data-magic-queue]');
  if (queueLen <= 0) {
    indicator?.remove();
    return;
  }
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'magic-queue-indicator';
    indicator.dataset.magicQueue = '';
    overlay.appendChild(indicator);
  }
  // Position relative to the aquarium-bowl's top-right corner so the indicator
  // sits where the user expects, but stays in the long-lived overlay (parented
  // to document.body) and survives parent re-renders.
  const bowl = root?.querySelector('.aquarium-bowl');
  if (bowl) {
    const rect = bowl.getBoundingClientRect();
    indicator.style.left = `${rect.right - 16}px`;
    indicator.style.top = `${rect.top + 8}px`;
  }
  indicator.textContent = '•'.repeat(Math.min(queueLen, MAGIC_QUEUE_MAX));
}

function getOverlayPoint(overlay, clientX, clientY) {
  const rect = overlay.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function applyViewportFollow(bowl, scale, outMs, holdMs, inMs) {
  if (!bowl) return Promise.resolve();
  bowl.style.transition = `transform ${outMs}ms ease-out`;
  bowl.style.transform = `scale(${scale})`;
  return new Promise((resolve) => {
    setTimeout(() => {
      // Hold at peak so the follow stays synced with the glow's brightest
      // moment instead of receding before the glow even peaks.
      setTimeout(() => {
        bowl.style.transition = `transform ${inMs}ms ease-in`;
        bowl.style.transform = '';
        setTimeout(() => {
          bowl.style.transition = '';
          resolve();
        }, inMs);
      }, holdMs);
    }, outMs);
  });
}

function isSilent(sound) {
  if (!sound) return true;
  const s = sound.getSettings?.();
  if (!s) return true;
  if (!s.masterEnabled) return true;
  if (!s.categories?.magic?.enabled) return true;
  return false;
}

export function createMagicMomentController({ getState, getRoot, getSound }) {
  function tickIndicator() {
    renderQueueIndicator(getRoot(), getState().queue.length);
  }

  async function runPhases({ fishId, sourceRect, getTargetPoint, spriteUrl, onBreathEnd, onWelcoming, short }) {
    const state = getState();
    const root = getRoot();
    const sound = getSound?.();
    const reduced = prefersReducedMotion();
    const silent = isSilent(sound);
    const overlay = ensureOverlay();
    const target = getTargetPoint();
    if (!target) {
      onWelcoming?.();
      onBreathEnd?.();
      state.phase = 'idle';
      return;
    }

    const sourceClient = sourceRect
      ? { x: sourceRect.left + sourceRect.width / 2, y: sourceRect.top + sourceRect.height / 2 }
      : { x: target.clientX, y: target.clientY };
    const sourcePt = getOverlayPoint(overlay, sourceClient.x, sourceClient.y);
    const targetPt = getOverlayPoint(overlay, target.clientX, target.clientY);

    if (short) {
      // Short ritual for default-objects gallery: bubble burst + ring only,
      // no anticipation, no viewport follow, no glow ramp. ~600ms total.
      state.phase = 'transforming';
      state.targetFishId = fishId;
      state.startedAt = performance.now();
      onWelcoming?.();
      if (!reduced) {
        emitBubbleBurst(overlay, targetPt.x, targetPt.y, silent ? 14 : 10);
        emitSplashRing(overlay, targetPt.x, targetPt.y);
      }
      sound?.playSound('magic.splash');
      sound?.playHaptic('light');
      await wait(reduced ? 200 : 600);
      state.phase = 'idle';
      state.targetFishId = null;
      onBreathEnd?.();
      const next = dequeueMagicMoment(state);
      tickIndicator();
      if (next) setTimeout(() => runPhases(next), 0);
      return;
    }

    // Sprite clone
    const clone = document.createElement('img');
    clone.src = spriteUrl;
    clone.className = 'magic-clone';
    clone.style.left = `${sourcePt.x}px`;
    clone.style.top = `${sourcePt.y}px`;
    overlay.appendChild(clone);

    // Phase A: anticipating
    state.phase = 'anticipating';
    state.targetFishId = fishId;
    state.startedAt = performance.now();
    sound?.playSound('magic.anticipate');
    if (!reduced) clone.classList.add('is-anticipating');
    await wait(MAGIC_PHASE_DURATIONS.anticipating);

    // Phase B: transforming
    state.phase = 'transforming';
    if (reduced) {
      clone.classList.add('is-fade-cross');
      clone.style.left = `${targetPt.x}px`;
      clone.style.top = `${targetPt.y}px`;
      await wait(200);
    } else {
      clone.classList.remove('is-anticipating');
      clone.classList.add('is-transforming');
      // RAF to allow transition
      requestAnimationFrame(() => {
        clone.style.left = `${targetPt.x}px`;
        clone.style.top = `${targetPt.y}px`;
      });
      await wait(MAGIC_PHASE_DURATIONS.transforming - 150);
      // When sound is unavailable the visual track must carry the entire
      // emotional payload — boost particle count and emit a second ring.
      const bubbleCount = silent ? 20 : 14;
      emitBubbleBurst(overlay, targetPt.x, targetPt.y, bubbleCount);
      sound?.playSound('magic.splash');
      sound?.playHaptic('magic-b');
      await wait(150);
      emitSplashRing(overlay, targetPt.x, targetPt.y);
      if (silent) {
        setTimeout(() => emitSplashRing(overlay, targetPt.x, targetPt.y), 100);
      }
    }

    // Phase C: welcoming
    state.phase = 'welcoming';
    onWelcoming?.();
    sound?.playSound('magic.welcome');
    clone.remove();
    const glow = document.createElement('div');
    glow.className = `magic-glow${silent ? ' is-silent' : ''}`;
    glow.style.left = `${targetPt.x}px`;
    glow.style.top = `${targetPt.y}px`;
    overlay.appendChild(glow);
    const bowl = root.querySelector('.aquarium-bowl');
    if (!reduced) {
      // Match follow timing to the glow curve (out + hold + in ≈ 1200ms) so
      // the "어항이 새 친구를 따라가는" beat lands at the glow's brightest moment.
      applyViewportFollow(bowl, 1.05, 400, 400, 400);
    }
    const welcomingMs = reduced ? 600 : (silent ? 1800 : MAGIC_PHASE_DURATIONS.welcoming);
    await wait(welcomingMs);
    glow.remove();

    // Breath — stay active so concurrent registers queue rather than
    // starting a parallel ritual during the quiet 200ms.
    state.phase = 'breath';
    await wait(MAGIC_PHASE_DURATIONS.breath);
    state.phase = 'idle';
    state.targetFishId = null;
    onBreathEnd?.();

    // Continue queue
    const next = dequeueMagicMoment(state);
    tickIndicator();
    if (next) {
      setTimeout(() => runPhases(next), 0);
    }
  }

  function trigger(payload) {
    const state = getState();
    if (!state.enabled) {
      payload.onWelcoming?.();
      payload.onBreathEnd?.();
      return;
    }
    if (isMagicActive(state)) {
      const enqueued = enqueueMagicMoment(state, payload);
      tickIndicator();
      if (!enqueued) {
        // Mini bubble fallback + immediate registration
        const overlay = ensureOverlay();
        const tp = payload.getTargetPoint?.();
        if (tp) {
          const pt = getOverlayPoint(overlay, tp.clientX, tp.clientY);
          emitBubbleBurst(overlay, pt.x, pt.y, 4);
        }
        payload.onWelcoming?.();
        payload.onBreathEnd?.();
      }
      return;
    }
    // Reserve phase synchronously so concurrent triggers queue, then start
    // the ritual after the caller's synchronous re-render (which would
    // otherwise wipe overlay nodes parented to #app).
    state.phase = 'anticipating';
    state.targetFishId = payload.fishId ?? null;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => runPhases(payload));
    } else {
      setTimeout(() => runPhases(payload), 0);
    }
  }

  function setEnabled(enabled) {
    getState().enabled = enabled;
  }

  return { trigger, setEnabled, tickIndicator };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
