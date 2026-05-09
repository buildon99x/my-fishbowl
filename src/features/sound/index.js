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

  function setMasterMuted(muted) {
    const turningOn = !muted;
    settings.masterEnabled = turningOn;
    if (turningOn) {
      const allCategoriesOff = SOUND_CATEGORIES.every((name) => !settings.categories[name].enabled);
      if (allCategoriesOff) {
        SOUND_CATEGORIES.forEach((name) => {
          settings.categories[name].enabled = true;
        });
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

  async function previewSound() {
    await engine.resume();
    // Force splash playback even before user accepts (master not on yet),
    // by temporarily enabling magic.
    const wasEnabled = settings.masterEnabled;
    const wasMagicEnabled = settings.categories.magic.enabled;
    settings.masterEnabled = true;
    settings.categories.magic.enabled = true;
    engine.applySettings();
    engine.playSound('magic.splash');
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
    bindModal,
    bindMuteToggle,
    bindVisibility,
    shouldShowModal,
    reopenSoundModal,
    getSettings,
    subscribe,
  };
}
