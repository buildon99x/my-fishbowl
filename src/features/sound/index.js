import { createAudioEngine } from './audio.js';
import { playHaptic as runHaptic } from './haptic.js';
import {
  enableAllCategories,
  loadSoundSettings,
  saveSoundSettings,
  SOUND_CATEGORIES,
} from './state.js';
import { renderMuteToggle, renderSoundModal } from './view.js';

export { renderMuteToggle, renderSoundModal };

export function createSoundController() {
  const settings = loadSoundSettings();
  const engine = createAudioEngine(() => settings);

  const listeners = new Set();
  function notify() {
    listeners.forEach((fn) => {
      try { fn(settings); } catch { /* ignore */ }
    });
  }

  function persist() {
    saveSoundSettings(settings);
    engine.applySettings();
    notify();
  }

  // Snapshot of the most recent per-category opt-in state. Used to restore
  // user preferences when the master toggle is flipped on after they've been
  // through onboarding (vs. the first-time recovery from "🤫 나중에", where
  // we want to enable all categories).
  const lastEnabledCategories = SOUND_CATEGORIES.reduce((acc, name) => {
    acc[name] = settings.categories[name].enabled;
    return acc;
  }, {});

  function snapshotEnabledCategories() {
    SOUND_CATEGORIES.forEach((name) => {
      lastEnabledCategories[name] = settings.categories[name].enabled;
    });
  }

  function setMasterMuted(muted) {
    const turningOn = !muted;
    if (!turningOn) snapshotEnabledCategories();
    settings.masterEnabled = turningOn;
    if (turningOn) {
      const allCategoriesOff = SOUND_CATEGORIES.every((name) => !settings.categories[name].enabled);
      if (allCategoriesOff) {
        if (settings.onboardingShown) {
          // Restore the snapshot of categories enabled before mute. If every
          // snapshot entry is false (e.g. the user manually turned everything
          // off), enable ambient as the gentlest default so the toggle is not
          // a no-op.
          let restoredAny = false;
          SOUND_CATEGORIES.forEach((name) => {
            if (lastEnabledCategories[name]) {
              settings.categories[name].enabled = true;
              restoredAny = true;
            }
          });
          if (!restoredAny) settings.categories.ambient.enabled = true;
        } else {
          SOUND_CATEGORIES.forEach((name) => {
            settings.categories[name].enabled = true;
          });
        }
      }
    }
    persist();
    if (settings.masterEnabled && settings.categories.ambient.enabled) {
      engine.startAmbient();
    } else {
      engine.stopAmbient();
    }
  }

  function setCategoryEnabled(category, enabled) {
    if (!SOUND_CATEGORIES.includes(category)) return;
    settings.categories[category].enabled = enabled;
    lastEnabledCategories[category] = enabled;
    persist();
    if (category === 'ambient') {
      if (enabled && settings.masterEnabled) engine.startAmbient();
      else engine.stopAmbient();
    }
  }

  async function acceptSoundOnboarding() {
    enableAllCategories(settings, true);
    settings.onboardingShown = true;
    persist();
    await engine.resume();
    engine.startAmbient();
  }

  function declineSoundOnboarding() {
    enableAllCategories(settings, false);
    settings.onboardingShown = true;
    persist();
  }

  async function resumeFromPersisted() {
    if (!settings.masterEnabled) return;
    await engine.resume();
    if (settings.categories.ambient.enabled) engine.startAmbient();
  }

  async function previewSound() {
    await engine.resume();
    // Force splash playback even before user accepts (master not on yet),
    // by temporarily enabling magic.
    const wasEnabled = settings.masterEnabled;
    const wasMagicEnabled = settings.categories.magic.enabled;
    settings.masterEnabled = true;
    settings.categories.magic.enabled = true;
    engine.applySettings();
    // Use the warmest tone (magic.welcome) so the preview represents the
    // overall character of the app sound rather than a sharp splash burst.
    engine.playSound('magic.welcome', { volume: 0.6 });
    settings.masterEnabled = wasEnabled;
    settings.categories.magic.enabled = wasMagicEnabled;
    engine.applySettings();
  }

  function bindModal(root, { onResolved } = {}) {
    const modal = root.querySelector('[data-sound-modal]');
    if (!modal) return;
    modal.addEventListener('click', async (e) => {
      const target = e.target;
      if (!(target instanceof window.HTMLElement)) return;
      const action = target.closest('[data-sound-action]')?.getAttribute('data-sound-action');
      if (!action) return;
      if (action === 'enable') {
        await acceptSoundOnboarding();
        modal.remove();
        onResolved?.('enabled');
      } else if (action === 'later') {
        declineSoundOnboarding();
        modal.remove();
        onResolved?.('declined');
      } else if (action === 'preview') {
        await previewSound();
      }
    });
  }

  function bindMuteToggle(root, { render } = {}) {
    const btn = root.querySelector('[data-sound-mute-toggle]');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const turningOn = !settings.masterEnabled;
      setMasterMuted(!turningOn);
      if (turningOn) {
        await engine.resume();
      }
      render?.();
    });
  }

  function bindVisibility() {
    if (typeof document === 'undefined') return () => {};
    const handler = () => {
      if (document.hidden) engine.pauseAmbientForVisibility();
      else engine.resumeAmbientFromVisibility();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }

  function shouldShowModal() {
    return !settings.onboardingShown;
  }

  function reopenSoundModal() {
    settings.onboardingShown = false;
    persist();
  }

  function getSettings() {
    return settings;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    playSound: (id, opts) => engine.playSound(id, opts),
    playHaptic: (pattern) => runHaptic(pattern, () => settings),
    setMasterMuted,
    setCategoryEnabled,
    acceptSoundOnboarding,
    declineSoundOnboarding,
    resumeFromPersisted,
    bindModal,
    bindMuteToggle,
    bindVisibility,
    shouldShowModal,
    reopenSoundModal,
    getSettings,
    subscribe,
  };
}
