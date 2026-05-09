import {
  advanceSequence,
  isOnboardingActive,
  loadOnboardingState,
  resetOnboarding,
  saveOnboardingState,
} from './state.js';
import { renderCanvasOutlineGuide, renderHelpButton, renderOnboardingOverlay } from './view.js';

export { renderHelpButton, renderOnboardingOverlay };

const IDLE_NOTIFY_MS = 30000;
const PULSE_MAX = 3;
const CANVAS_IDLE_REDRAW_MS = 5000;

export function createOnboardingController({ getRoot, getSound, onAdvance, onReset } = {}) {
  const state = loadOnboardingState();
  let lastUserActivityAt = performance.now();
  let idleNotified = false;
  let pulseRetryCount = 0;
  let canvasIdleTimer = null;
  let outlineVisible = true;

  function persist() {
    saveOnboardingState(state);
  }

  function notifyAdvance() {
    onAdvance?.(state);
  }

  function advance(target) {
    if (!isOnboardingActive(state)) return;
    advanceSequence(state, target);
    persist();
    notifyAdvance();
  }

  function activity() {
    lastUserActivityAt = performance.now();
    idleNotified = false;
  }

  function startIdleWatch() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      if (!isOnboardingActive(state)) return;
      if (idleNotified) return;
      const elapsed = performance.now() - lastUserActivityAt;
      if (elapsed >= IDLE_NOTIFY_MS) {
        idleNotified = true;
        const sound = getSound?.();
        sound?.playSound('ui.toggle-on');
        const overlay = getRoot()?.querySelector('[data-onboarding-overlay]');
        overlay?.classList.add('is-emphasized');
        setTimeout(() => overlay?.classList.remove('is-emphasized'), 1200);
      }
    }, 2000);
  }

  function reportPulseRetry() {
    pulseRetryCount += 1;
    if (pulseRetryCount >= PULSE_MAX) {
      const overlay = getRoot()?.querySelector('[data-onboarding-overlay]');
      overlay?.classList.add('is-static-highlight');
    }
  }

  function bind(root, { onSeq1Plus, fishInputState, render } = {}) {
    if (!root) return;

    // Help button — always available
    const help = root.querySelector('[data-onboarding-help]');
    help?.addEventListener('click', () => {
      resetOnboarding(state);
      pulseRetryCount = 0;
      idleNotified = false;
      lastUserActivityAt = performance.now();
      persist();
      onReset?.(state);
      notifyAdvance();
    });

    if (!isOnboardingActive(state)) return;

    const overlay = root.querySelector('[data-onboarding-overlay]');
    if (!overlay) return;

    if (state.sequence === 1) {
      const cta = overlay.querySelector('[data-onboarding-cta]');
      cta?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fishInputState) fishInputState.isExpanded = true;
        onSeq1Plus?.();
        activity();
        advance(2);
      });

      // Listen at the document level for off-target taps. The overlay itself
      // uses pointer-events: none so taps pass through, which means a
      // bubbling listener on the overlay never fires for non-CTA targets.
      const docTapHandler = (e) => {
        if (state.sequence !== 1) {
          document.removeEventListener('pointerdown', docTapHandler, true);
          return;
        }
        if (!(e.target instanceof HTMLElement)) return;
        if (e.target.closest('[data-onboarding-cta]')) return;
        if (e.target.closest('[data-onboarding-help]')) return;
        if (e.target.closest('[data-sound-modal]')) return;
        reportPulseRetry();
        activity();
      };
      document.addEventListener('pointerdown', docTapHandler, true);
    }

    if (state.sequence === 2) {
      const canvas = root.querySelector('[data-fish-canvas]');
      const canvasParent = canvas?.parentElement;
      if (canvasParent && outlineVisible && !canvasParent.querySelector('[data-onboarding-canvas-outline]')) {
        canvasParent.style.position = canvasParent.style.position || 'relative';
        canvasParent.insertAdjacentHTML('beforeend', renderCanvasOutlineGuide(true));
      }
      if (canvas) {
        const dismissDemo = () => {
          outlineVisible = false;
          render?.();
        };
        canvas.addEventListener('pointerdown', () => {
          dismissDemo();
          activity();
          if (canvasIdleTimer) clearTimeout(canvasIdleTimer);
          canvasIdleTimer = setTimeout(() => {
            // Guard: if user has already moved past sequence 2 (e.g. registered
            // a fish before the timer fired), do not rewind onboarding.
            if (state.sequence !== 2) return;
            outlineVisible = true;
            render?.();
            advance(3);
          }, CANVAS_IDLE_REDRAW_MS);
        }, { once: false });
      }
    }
  }

  function getOutlineVisible() {
    return outlineVisible;
  }

  return {
    getState: () => state,
    advance,
    bind,
    activity,
    startIdleWatch,
    isActive: () => isOnboardingActive(state),
    onFishRegistered: () => {
      if (state.sequence === 2 || state.sequence === 3) advance(4);
    },
    onMagicMomentDone: () => {
      if (state.sequence === 4) {
        // Move to step 5 (done) when prop-panel closes; spec says ghost finger
        // points at prop-panel after magic moment. The next prop-panel close
        // triggers complete. For minimal flow, mark done after a short hold.
        setTimeout(() => advance('done'), 4000);
      }
    },
    getOutlineVisible,
  };
}
