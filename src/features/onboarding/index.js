import {
  advanceSequence,
  isOnboardingActive,
  loadOnboardingState,
  resetOnboarding,
  saveOnboardingState,
} from './state.js';
import { renderCanvasOutlineGuide, renderOnboardingOverlay } from './view.js';

export { renderOnboardingOverlay };

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
  const refs = { voiceGuidePlayedForSeq1: false, seq4DoneListenersBound: false };

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
    const timerId = setInterval(() => {
      if (!isOnboardingActive(state)) {
        clearInterval(timerId);
        return;
      }
      if (idleNotified) return;
      const elapsed = performance.now() - lastUserActivityAt;
      if (elapsed >= IDLE_NOTIFY_MS) {
        idleNotified = true;
        const sound = getSound?.();
        // Soft, warm chime — the idle prompt is "여기로 돌아와", not a click.
        // Reuse magic.welcome at low volume so we don't ship another asset.
        sound?.playSound('magic.welcome', { volume: 0.4 });
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
      // Position the inner CTA at the aquarium-bowl center so the "+" affords
      // tapping into the bowl, instead of floating at viewport center which
      // can sit above or below the bowl on tall phones.
      const bowl = root.querySelector('.aquarium-bowl');
      const innerWrap = overlay.querySelector('[data-onboarding-seq1-inner]');
      if (bowl && innerWrap) {
        const r = bowl.getBoundingClientRect();
        innerWrap.style.position = 'fixed';
        innerWrap.style.left = `${r.left + r.width / 2}px`;
        innerWrap.style.top = `${r.top + r.height / 2}px`;
        innerWrap.style.transform = 'translate(-50%, -50%)';
      }

      // Voice guide: when the user opted into sound and hasn't heard the cue
      // yet this session, play a short voice/chime once on entry to seq 1.
      const sound = getSound?.();
      const s = sound?.getSettings?.();
      if (
        !refs.voiceGuidePlayedForSeq1
        && s?.masterEnabled
        && (s?.voiceGuideEnabled ?? true)
      ) {
        refs.voiceGuidePlayedForSeq1 = true;
        // Short delay so the voice doesn't collide with the modal-dismiss tap.
        setTimeout(() => sound?.playSound('ui.voice-tap-here', { volume: 0.7 }), 300);
      }

      const cta = overlay.querySelector('[data-onboarding-cta]');
      cta?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fishInputState) {
          fishInputState.isExpanded = true;
          fishInputState.sheetStage = 'peek';
        }
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
      if (state.sequence !== 4) return;
      if (refs.seq4DoneListenersBound) return;
      refs.seq4DoneListenersBound = true;

      const finish = () => {
        if (state.sequence !== 4) return;
        cleanup();
        advance('done');
      };

      // Gesture-based exit: any tap on the aquarium bowl, or a prop-panel
      // close, ends onboarding. The 4s auto-timeout is replaced with an 8s
      // safety net so a child who is calmly admiring the new fish is not
      // interrupted.
      const gestureHandler = (e) => {
        if (!(e.target instanceof HTMLElement)) return;
        if (e.target.closest('.aquarium-bowl')) finish();
        else if (e.target.closest('.prop-panel-close')) finish();
      };
      const safetyTimer = setTimeout(finish, 8000);
      function cleanup() {
        document.removeEventListener('pointerdown', gestureHandler, true);
        clearTimeout(safetyTimer);
        refs.seq4DoneListenersBound = false;
      }
      document.addEventListener('pointerdown', gestureHandler, true);
    },
    getOutlineVisible,
  };
}
