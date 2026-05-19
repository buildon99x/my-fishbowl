import './styles/index.css';
import {
  bindFishInputEvents,
  createFishInputState,
  renderFishInputPanel,
} from './features/fish-input/index.js';
import {
  bindFeedingEvents,
  createFeedingState,
  renderFoods,
  tickFeeding,
} from './features/feeding/index.js';
import {
  normalizeAquariumFishMovement,
  startFishMovement,
} from './features/fish-movement/index.js';
import { drawAlgaeLayer, restoreAlgaeState } from './features/algae/index.js';
import { createBubblesState, startBubbles } from './features/bubbles/index.js';
import {
  bindActionClusterEvents,
  bindPropPanelEvents,
  createPropPanelState,
  renderActionCluster,
  renderPropPanel,
} from './features/prop-panel/index.js';

import {
  bindCleaningEvents,
  createCleaningState,
  exitCleaningMode,
  renderCleaningExitButton,
  renderCleaningOverlay,
  renderCleaningProgressBar,
  snapshotCanvas,
} from './features/cleaning/index.js';
import { renderDecoration } from './features/aquarium/decoration.js';
import { addUserPropToAquarium } from './features/aquarium/fish-actions.js';
import { loadAquarium, saveAquarium } from './features/aquarium/storage.js';
import {
  createSoundController,
  renderMuteToggle,
  renderSoundModal,
} from './features/sound/index.js';
import {
  createMagicMomentController,
  createMagicMomentState,
} from './features/magic-moment/index.js';
import {
  createOnboardingController,
  renderOnboardingOverlay,
} from './features/onboarding/index.js';
import {
  bindDrawerEvents,
  renderDrawer,
  renderMenuButton,
} from './features/drawer/index.js';
import { bindFishListEvents } from './features/fish-list/events.js';
import { startChromeIdleWatcher } from './features/chrome-idle/index.js';
import {
  bindDefaultObjectsEvents,
  createDefaultObjectsState,
  markCtaPulseShown,
  shouldShowCtaPulse,
} from './features/default-objects/index.js';
import { renderAquariumStatus, renderUndoSnackbar } from './features/fish-list/view.js';
import { captureFishListScroll, restoreFishListScroll } from './features/fish-list/scroll.js';
import { bindFishSpriteDrag } from './features/fish-edit/drag.js';
import { escapeHtml } from './lib/utils.js';
import { cssVarsToInlineStyle, getFishSpriteStyleVars } from './lib/fishSpriteStyle.js';

const SELECTORS = {
  app: '#app',
};

// Keeps the prop-panel outer element stable across re-renders. When the
// editing target is unchanged we replace only the inner contents, so the
// CSS @starting-style entrance animation does not re-trigger on every
// interaction (slider drag, status update, flip, etc.). When the target
// changes we remount fully so the new panel slides in.
function syncPropPanelMount(root, aquarium, appState) {
  const host = root.querySelector('[data-prop-panel-host]');
  if (!host) return;
  const target = appState.propPanel.editingTarget;
  const currentKey = target ? `${target.type}:${target.id ?? '_'}` : null;
  const lastKey = appState.propPanel._mountedKey;

  if (!target) {
    host.innerHTML = '';
    appState.propPanel._mountedKey = null;
    return;
  }

  const html = renderPropPanel(target, aquarium, appState.propPanel);
  const existingPanel = host.querySelector('.prop-panel');

  if (currentKey !== lastKey || !existingPanel) {
    host.innerHTML = html;
  } else {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const fresh = temp.querySelector('.prop-panel');
    if (fresh) existingPanel.innerHTML = fresh.innerHTML;
    else host.innerHTML = html;
  }
  appState.propPanel._mountedKey = currentKey;
}

function renderEmptyState(propCount) {
  if (propCount > 0) {
    return '';
  }

  return `
    <div class="aquarium-empty" role="status">
      <span class="aquarium-empty-icon" aria-hidden="true">➕</span>
      <p class="aquarium-empty-text">➕ 버튼을 눌러 첫 친구를 만들어 보세요!</p>
      <span class="aquarium-empty-arrow" aria-hidden="true">↓</span>
    </div>
  `;
}


function renderFishes(fishes, selectedFishId, editingPropId, fishEatingId, magicHidden) {
  return fishes
    .filter((fish) => !fish.hidden && !fish.pendingDelete && !magicHidden?.has(fish.id))
    .map(
      (fish) => {
        const isDeco = fish.type === 'deco';
        return `
        <img
          class="fish-sprite ${isDeco ? 'is-deco' : ''} ${fish.id === selectedFishId ? 'is-selected' : ''} ${fish.id === editingPropId ? 'is-editing' : ''} ${fish.id === fishEatingId ? 'is-eating' : ''}"
          data-fish-sprite="${fish.id}"
          data-prop-type="${isDeco ? 'deco' : 'fish'}"
          src="${fish.imageUrl}"
          alt="${escapeHtml(fish.name)}"
          style="${cssVarsToInlineStyle(getFishSpriteStyleVars(fish))}"
        >
      `;
      },
    )
    .join('');
}

function patchFoodLayer(root, foods) {
  const foodLayer = root.querySelector('[data-food-layer]');
  if (!foodLayer) return;

  const existing = foodLayer.querySelectorAll('[data-food-id]');
  const existingIds = new Set([...existing].map((el) => el.dataset.foodId));
  const newIds = new Set(foods.map((f) => f.id));
  const sameSet = existingIds.size === newIds.size && [...newIds].every((id) => existingIds.has(id));

  if (!sameSet) {
    foodLayer.innerHTML = renderFoods(foods);
    return;
  }

  foods.forEach((food) => {
    const el = foodLayer.querySelector(`[data-food-id="${food.id}"]`);
    if (el) el.style.setProperty('--food-y', `${food.y}%`);
  });
}

function patchFishPositions(root, fishes, fishEatingId) {
  fishes.forEach((fish) => {
    if (fish.type === 'deco') return;
    const sprite = root.querySelector(`[data-fish-sprite="${fish.id}"]`);
    if (!sprite) return;
    const vars = getFishSpriteStyleVars(fish);
    sprite.style.setProperty('--fish-x', vars['--fish-x']);
    sprite.style.setProperty('--fish-y', vars['--fish-y']);
    sprite.style.setProperty('--fish-flip', vars['--fish-flip']);
    sprite.classList.toggle('is-eating', fish.id === fishEatingId);
  });
}

const FEEDING_SAVE_INTERVAL_MS = 2000;

function startFeedingAnimation(root, aquarium, fishInputState, feedingState, appState) {
  if (appState.feedingAnimationId) {
    return;
  }

  let lastFeedingSavedMs = 0;

  const runFrame = (now) => {
    const result = tickFeeding(feedingState, aquarium.fishes, now);

    aquarium.fishes = result.fishes;

    if (result.didEat || now - lastFeedingSavedMs >= FEEDING_SAVE_INTERVAL_MS) {
      aquarium.updatedAt = new Date().toISOString();
      saveAquarium(aquarium);
      lastFeedingSavedMs = now;
    }

    if (result.didEat) {
      appState.sound?.playSound('interaction.food-eat');
      appState.sound?.playHaptic('medium');
    }

    patchFoodLayer(root, feedingState.foods);
    patchFishPositions(root, aquarium.fishes, feedingState.fishEating);

    if (feedingState.foods.length > 0) {
      appState.feedingAnimationId = window.requestAnimationFrame(runFrame);
      return;
    }

    appState.feedingAnimationId = null;

    if (feedingState.fishEating) {
      window.setTimeout(() => {
        feedingState.fishEating = null;
        root.querySelectorAll('[data-fish-sprite]').forEach((el) => el.classList.remove('is-eating'));
      }, 260);
    }
  };

  appState.feedingAnimationId = window.requestAnimationFrame(runFrame);
}




function renderApp(root, aquarium, fishInputState, feedingState, appState) {
  captureFishListScroll(root, appState);
  appState.movementController?.stop();
  appState.bubbleController?.stop();

  const render = () => renderApp(root, aquarium, fishInputState, feedingState, appState);

  const { cleaningState } = appState;

  // S-034: cleaning mode owns the canvas; close all editing surfaces
  // before render so they can't shadow the cleaning brush hit area.
  if (cleaningState.cleaningMode) {
    appState.propPanel.editingTarget = null;
    fishInputState.isExpanded = false;
  }
  // S-034: prop-panel and the ➕ sheet both anchor to the bottom on narrow
  // screens. They must never render together — if a callback set both,
  // collapse the sheet so only the panel is visible. (The active opener
  // path already calls this, but row-tap and other handlers don't have a
  // direct reference to fishInputState; this normalization is the safety
  // net.)
  if (appState.propPanel.editingTarget && fishInputState.isExpanded) {
    fishInputState.isExpanded = false;
  }

  const visibleProps = aquarium.fishes.filter((p) => !p.pendingDelete);
  const editingTargetId = appState.propPanel.editingTarget?.id ?? null;

  const defaultObjectsCtaPulse = shouldShowCtaPulse(visibleProps.length, appState.defaultObjects);
  if (defaultObjectsCtaPulse) markCtaPulseShown(appState.defaultObjects);

  root.innerHTML = `
    <main class="fishbowl-page">
      <section class="aquarium-layout" aria-labelledby="aquarium-title">
        <div class="aquarium-shell">
          <div
            class="aquarium-bowl ${cleaningState.cleaningMode ? 'is-cleaning' : ''}"
            data-shape="${aquarium.bounds.shape}"
            style="--bowl-width: ${aquarium.bounds.width}px; --bowl-height: ${aquarium.bounds.height}px;"
          >
            ${cleaningState.cleaningMode ? renderCleaningProgressBar(cleaningState) : ''}
            ${renderDecoration()}
            <svg class="bubble-layer" data-bubble-svg viewBox="0 0 1152 780" aria-hidden="true"></svg>
            <canvas class="algae-layer" data-algae-canvas aria-hidden="true"></canvas>
            <div class="fish-layer" data-fish-layer>
              <div class="food-layer" data-food-layer aria-hidden="true">
                ${renderFoods(feedingState.foods)}
              </div>
              ${renderFishes(aquarium.fishes, appState.selectedFishId, editingTargetId, feedingState.fishEating, appState.magicMomentState?.hiddenFishIds)}
            </div>
            ${renderEmptyState(visibleProps.length)}
            ${cleaningState.cleaningMode ? renderCleaningOverlay(cleaningState) : ''}
          </div>
        </div>
      </section>

      ${renderMenuButton()}
      ${renderDrawer({
        open: appState.drawerOpen,
        aquariumName: aquarium.name,
        statusHtml: renderAquariumStatus(aquarium, appState),
      })}

      ${renderFishInputPanel(fishInputState)}
      <div class="prop-panel-host" data-prop-panel-host></div>
      ${renderActionCluster({
        feedingState,
        fishInputState,
        propPanelState: appState.propPanel,
        cleaningState: appState.cleaningState,
        defaultObjectsCtaPulse,
      })}
      ${cleaningState.cleaningMode ? renderCleaningExitButton() : ''}
      ${renderUndoSnackbar(appState.undoDelete)}
      ${renderMuteToggle(appState.sound.getSettings().masterEnabled)}
      ${renderOnboardingOverlay(appState.onboarding.getState())}
      ${appState.sound.shouldShowModal() ? renderSoundModal() : ''}
    </main>
  `;
  restoreFishListScroll(root, appState);
  syncPropPanelMount(root, aquarium, appState);

  // S-033: toggle a body-level flag so dock can hide while the ➕ sheet is
  // open. Only one chrome surface at a time.
  document.body.dataset.sheetOpen = fishInputState.isExpanded ? 'true' : 'false';

  const algaeCanvas = root.querySelector('[data-algae-canvas]');
  if (algaeCanvas) {
    drawAlgaeLayer(algaeCanvas, aquarium.algaeLevel, aquarium.lastCleanedAt);
    if (cleaningState.cleaningMode) {
      snapshotCanvas(algaeCanvas, cleaningState);
    }
  }

  bindFishInputEvents(
    root,
    fishInputState,
    render,
    {
      onRegister: (draft) => {
        const previewCanvas = root.querySelector('[data-fish-canvas]');
        const sourceRect = previewCanvas?.getBoundingClientRect();
        const prop = addUserPropToAquarium(aquarium, draft);
        appState.selectedFishId = prop.id;

        if (prop.type === 'deco') {
          appState.propPanel.editingTarget = { id: prop.id, type: prop.type };
          // S-034: sheet must close before panel opens so the two bottom
          // surfaces don't stack on narrow screens.
          fishInputState.isExpanded = false;
          appState.onboarding.onFishRegistered();
          return;
        }

        appState.magicMomentState.hiddenFishIds.add(prop.id);
        appState.onboarding.onFishRegistered();

        appState.magicController.trigger({
          fishId: prop.id,
          sourceRect,
          spriteUrl: prop.imageUrl,
          getTargetPoint: () => {
            const bowl = root.querySelector('.aquarium-bowl');
            if (!bowl) return null;
            const r = bowl.getBoundingClientRect();
            return {
              clientX: r.left + (prop.x / 100) * r.width,
              clientY: r.top + (prop.y / 100) * r.height,
            };
          },
          onWelcoming: () => {
            appState.magicMomentState.hiddenFishIds.delete(prop.id);
            render();
          },
          onBreathEnd: () => {
            appState.propPanel.editingTarget = { id: prop.id, type: prop.type };
            // S-034: close sheet defensively (it's usually already closed
            // by magic-moment timing, but ensure no overlap on narrow).
            fishInputState.isExpanded = false;
            render();
            appState.onboarding.onMagicMomentDone();
          },
        });
      },
    },
  );
  bindFishListEvents(root, aquarium, appState, { render });
  bindFishSpriteDrag(root, aquarium, appState, { render });
  bindFeedingEvents(root, feedingState, {
    startAnimation: () => startFeedingAnimation(root, aquarium, fishInputState, feedingState, appState),
  });
  bindActionClusterEvents(
    root,
    { fishInputState, propPanelState: appState.propPanel },
    {
      render,
      onFeedingToggle: () => { feedingState.feedingMode = !feedingState.feedingMode; },
      onFoodTypeChange: (type) => { feedingState.selectedType = type; },
      onCleaningToggle: () => {
        const cs = appState.cleaningState;
        if (cs.cleaningMode) {
          exitCleaningMode(cs);
        } else if (aquarium.algaeLevel > 0) {
          Object.assign(cs, {
            cleaningMode: true,
            cleaning: false,
            cleaned: false,
            cleaningProgress: 0,
            snapshotData: null,
            initialAlphaSum: 0,
            initialAlgaePixels: 0,
          });
        }
      },
    },
  );
  bindPropPanelEvents(
    root,
    aquarium,
    appState,
    saveAquarium,
    render,
    { feedingState },
  );
  bindCleaningEvents(root, aquarium, appState, {
    render,
    save: saveAquarium,
  });
  bindDefaultObjectsEvents(root, {
    state: appState.defaultObjects,
    appState,
    aquarium,
    render,
    onRegisterEntry: ({ entry, spriteDataUrl, name, cardElement }) => {
      const draft = {
        name,
        spriteDataUrl,
        type: entry.type,
        movementEnabled: entry.defaultMovementEnabled,
      };
      const prop = addUserPropToAquarium(aquarium, draft);
      const updates = {};
      if (typeof entry.defaultSize === 'number') updates.size = entry.defaultSize;
      if (entry.type === 'fish' && typeof entry.defaultSpeedMultiplier === 'number') {
        updates.speedMultiplier = entry.defaultSpeedMultiplier;
      }
      if (Object.keys(updates).length > 0) {
        Object.assign(prop, updates);
        saveAquarium(aquarium);
      }

      appState.sound?.playSound('magic.splash');
      appState.sound?.playHaptic('light');

      if (entry.type === 'fish' && appState.magicController) {
        const sourceRect = cardElement?.getBoundingClientRect?.() ?? null;
        appState.magicController.trigger({
          short: true,
          fishId: prop.id,
          sourceRect,
          spriteUrl: prop.imageUrl,
          getTargetPoint: () => {
            const bowl = root.querySelector('.aquarium-bowl');
            if (!bowl) return null;
            const r = bowl.getBoundingClientRect();
            return {
              clientX: r.left + (prop.x / 100) * r.width,
              clientY: r.top + (prop.y / 100) * r.height,
            };
          },
        });
      }

      render();

      return prop;
    },
  });
  appState.movementController = startFishMovement(root, aquarium, {
    getPausedFishIds: () => {
      const paused = new Set();
      const t = appState.propPanel.editingTarget;
      if (t?.type === 'fish') paused.add(t.id);
      if (feedingState.foods.length > 0) {
        aquarium.fishes.forEach((fish) => {
          if (fish.type !== 'deco') paused.add(fish.id);
        });
      }
      return paused;
    },
    onSave: () => saveAquarium(aquarium),
  });

  const bubbleSvg = root.querySelector('[data-bubble-svg]');

  appState.bubbleController = startBubbles(bubbleSvg, appState.bubblesState);

  appState.onboarding.bind(root, { fishInputState, render });

  appState.sound.bindModal(root, { onResolved: render });
  appState.sound.bindMuteToggle(root, { render });
  bindDrawerEvents(root, appState, { render });
}


function initApp() {
  const app = document.querySelector(SELECTORS.app);
  const aquarium = loadAquarium();
  const fishInputState = createFishInputState();
  const feedingState = createFeedingState();
  const appState = {
    selectedFishId: null,
    drawerOpen: false,
    feedingAnimationId: null,
    fishListScrollTop: 0,
    movementController: null,
    bubbleController: null,
    bubblesState: createBubblesState(),
    propPanel: createPropPanelState(),
    cleaningState: createCleaningState(),
    undoDelete: { visible: false, propId: null, name: '', timerId: null },
    sound: createSoundController(),
    magicMomentState: createMagicMomentState(),
    magicController: null,
    onboarding: null,
    defaultObjects: createDefaultObjectsState(),
  };
  appState.onboarding = createOnboardingController({
    getRoot: () => app,
    getSound: () => appState.sound,
    onAdvance: () => renderApp(app, aquarium, fishInputState, feedingState, appState),
    onReset: () => renderApp(app, aquarium, fishInputState, feedingState, appState),
  });
  appState.onboarding.startIdleWatch();
  startChromeIdleWatcher();
  // Install once at startup so the idle watchdog gets every pointerdown,
  // not just the first one after each renderApp.
  document.addEventListener('pointerdown', () => {
    if (appState.onboarding.isActive()) appState.onboarding.activity();
  }, { capture: true });
  appState.magicController = createMagicMomentController({
    getState: () => appState.magicMomentState,
    getRoot: () => app,
    getSound: () => appState.sound,
  });
  appState.sound.bindVisibility();
  // On reload, resume audio without overwriting the user's per-category opt-outs.
  // (acceptSoundOnboarding is reserved for the first-time modal flow.)
  appState.sound.resumeFromPersisted();

  normalizeAquariumFishMovement(aquarium, performance.now());
  restoreAlgaeState(aquarium);
  saveAquarium(aquarium);
  renderApp(app, aquarium, fishInputState, feedingState, appState);

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('[data-sound-modal]')) return;
    const btn = target.closest('button');
    if (!btn) return;
    appState.sound.playSound('ui.tap');
    appState.sound.playHaptic('light');
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appState.cleaningState.cleaningMode) {
      exitCleaningMode(appState.cleaningState);
      renderApp(app, aquarium, fishInputState, feedingState, appState);
    }

  });
}

initApp();
