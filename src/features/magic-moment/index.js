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

function ensureOverlay(root) {
  let overlay = root.querySelector('[data-magic-overlay]');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'magic-moment-overlay';
    overlay.dataset.magicOverlay = '';
    overlay.setAttribute('aria-hidden', 'true');
    root.appendChild(overlay);
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
  const bowl = root.querySelector('.aquarium-bowl');
  if (!bowl) return;
  let indicator = bowl.querySelector('[data-magic-queue]');
  if (queueLen <= 0) {
    indicator?.remove();
    return;
  }
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'magic-queue-indicator';
    indicator.dataset.magicQueue = '';
    bowl.appendChild(indicator);
  }
  indicator.textContent = '•'.repeat(Math.min(queueLen, MAGIC_QUEUE_MAX));
}

function getOverlayPoint(overlay, clientX, clientY) {
  const rect = overlay.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function applyViewportFollow(bowl, scale, ms) {
  if (!bowl) return Promise.resolve();
  bowl.style.transition = `transform ${ms}ms ease-out`;
  bowl.style.transform = `scale(${scale})`;
  return new Promise((resolve) => {
    setTimeout(() => {
      bowl.style.transform = '';
      setTimeout(() => {
        bowl.style.transition = '';
        resolve();
      }, ms);
    }, ms);
  });
}

export function createMagicMomentController({ getState, getRoot, getSound }) {
  function tickIndicator() {
    renderQueueIndicator(getRoot(), getState().queue.length);
  }

  async function runPhases({ fishId, sourceRect, getTargetPoint, spriteUrl, onBreathEnd, onWelcoming }) {
    const state = getState();
    const root = getRoot();
    const sound = getSound?.();
    const reduced = prefersReducedMotion();
    const overlay = ensureOverlay(root);
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
      emitBubbleBurst(overlay, targetPt.x, targetPt.y, 14);
      sound?.playSound('magic.splash');
      sound?.playHaptic('magic-b');
      await wait(150);
      emitSplashRing(overlay, targetPt.x, targetPt.y);
    }

    // Phase C: welcoming
    state.phase = 'welcoming';
    onWelcoming?.();
    sound?.playSound('magic.welcome');
    clone.remove();
    const glow = document.createElement('div');
    glow.className = 'magic-glow';
    glow.style.left = `${targetPt.x}px`;
    glow.style.top = `${targetPt.y}px`;
    overlay.appendChild(glow);
    const bowl = root.querySelector('.aquarium-bowl');
    const followMs = reduced ? 0 : 250;
    if (!reduced) applyViewportFollow(bowl, 1.05, followMs);
    await wait(reduced ? 600 : MAGIC_PHASE_DURATIONS.welcoming);
    glow.remove();

    // Breath
    state.phase = 'idle';
    state.targetFishId = null;
    await wait(MAGIC_PHASE_DURATIONS.breath);
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
        const overlay = ensureOverlay(getRoot());
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
    runPhases(payload);
  }

  function setEnabled(enabled) {
    getState().enabled = enabled;
  }

  return { trigger, setEnabled, tickIndicator };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
