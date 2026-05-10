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
  renderHelpButton,
  renderOnboardingOverlay,
} from './features/onboarding/index.js';
import { bindFishListEvents } from './features/fish-list/events.js';
import {
  bindDefaultObjectsEvents,
  createDefaultObjectsState,
  renderDefaultObjectsModal,
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

function renderEmptyState(propCount) {
  if (propCount > 0) {
    return '';
  }

  return '<p class="aquarium-empty">오른쪽 아래 ➕ 버튼을 눌러 첫 친구를 만들어 보세요!</p>';
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

function startFeedingAnimation(root, aquarium, fishInputState, feedingState, appState) {
  if (appState.feedingAnimationId) {
    return;
  }

  const runFrame = (now) => {
    const result = tickFeeding(feedingState, aquarium.fishes, now);
    const fishChanged = result.fishes !== aquarium.fishes;

    aquarium.fishes = result.fishes;

    if (fishChanged || result.didEat) {
      aquarium.updatedAt = new Date().toISOString();
      saveAquarium(aquarium);
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

  const { cleaningState } = appState;
  const visibleProps = aquarium.fishes.filter((p) => !p.pendingDelete);
  const editingTargetId = appState.propPanel.editingTarget?.id ?? null;

  root.innerHTML = `
    <main class="fishbowl-page">
      <header class="page-header">
        <p class="eyebrow">My Fishbowl</p>
        <h1>${aquarium.name}</h1>
      </header>

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

        ${renderAquariumStatus(aquarium, appState)}
      </section>

      ${renderFishInputPanel(fishInputState)}
      ${renderPropPanel(appState.propPanel.editingTarget, aquarium, appState.propPanel)}
      ${renderActionCluster({
        feedingState,
        fishInputState,
        propPanelState: appState.propPanel,
        cleaningState: appState.cleaningState,
        defaultObjectsCtaPulse: shouldShowCtaPulse(aquarium.fishes.filter((p) => !p.pendingDelete).length),
      })}
      ${renderDefaultObjectsModal(appState.defaultObjects)}
      ${renderUndoSnackbar(appState.undoDelete)}
      ${renderMuteToggle(appState.sound.getSettings().masterEnabled)}
      ${renderHelpButton()}
      ${renderOnboardingOverlay(appState.onboarding.getState())}
      ${appState.sound.shouldShowModal() ? renderSoundModal() : ''}
    </main>
  `;
  restoreFishListScroll(root, appState);

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
    () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    {
      onRegister: (draft) => {
        const previewCanvas = root.querySelector('[data-fish-canvas]');
        const sourceRect = previewCanvas?.getBoundingClientRect();
        const prop = addUserPropToAquarium(aquarium, draft);
        appState.selectedFishId = prop.id;
        const renderRef = () => renderApp(root, aquarium, fishInputState, feedingState, appState);

        if (prop.type === 'deco') {
          // Deco props skip the magic moment ritual.
          appState.propPanel.editingTarget = { id: prop.id, type: prop.type };
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
            renderRef();
          },
          onBreathEnd: () => {
            appState.propPanel.editingTarget = { id: prop.id, type: prop.type };
            renderRef();
            appState.onboarding.onMagicMomentDone();
          },
        });
      },
    },
  );
  const renderAppCallback = () => renderApp(root, aquarium, fishInputState, feedingState, appState);
  bindFishListEvents(root, aquarium, appState, { render: renderAppCallback });
  bindFishSpriteDrag(root, aquarium, appState, { render: renderAppCallback });
  bindFeedingEvents(root, feedingState, {
    startAnimation: () => startFeedingAnimation(root, aquarium, fishInputState, feedingState, appState),
  });
  bindActionClusterEvents(
    root,
    { fishInputState, propPanelState: appState.propPanel },
    {
      render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
      onFeedingToggle: () => { feedingState.feedingMode = !feedingState.feedingMode; },
      onFoodTypeChange: (type) => { feedingState.selectedType = type; },
      onCleaningToggle: () => {
        const cs = appState.cleaningState;
        if (cs.cleaningMode) {
          exitCleaningMode(cs);
        } else if (aquarium.algaeLevel > 0) {
          cs.cleaningMode = true;
          cs.cleaning = false;
          cs.cleaned = false;
          cs.cleaningProgress = 0;
          cs.snapshotData = null;
          cs.initialAlphaSum = 0;
          cs.initialAlgaePixels = 0;
        }
      },
    },
  );
  bindPropPanelEvents(
    root,
    aquarium,
    appState,
    saveAquarium,
    () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    { feedingState },
  );
  bindCleaningEvents(root, aquarium, appState, {
    render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    save: saveAquarium,
  });
  bindDefaultObjectsEvents(root, {
    state: appState.defaultObjects,
    appState,
    aquarium,
    render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    onRegisterEntry: ({ entry, spriteDataUrl, name, cardElement }) => {
      const draft = {
        name,
        spriteDataUrl,
        type: entry.type,
        movementEnabled: entry.defaultMovementEnabled,
      };
      const prop = addUserPropToAquarium(aquarium, draft);
      // Apply manifest defaults that the generic addUserPropToAquarium doesn't know about.
      const updates = {};
      if (typeof entry.defaultSize === 'number') updates.size = entry.defaultSize;
      if (entry.type === 'fish' && typeof entry.defaultSpeedMultiplier === 'number') {
        updates.speedMultiplier = entry.defaultSpeedMultiplier;
      }
      if (Object.keys(updates).length > 0) {
        Object.assign(prop, updates);
        saveAquarium(aquarium);
      }

      // Sound: S-022 splash SE (1x, no-op when muted).
      appState.sound?.playSound('magic.splash');
      appState.sound?.playHaptic('light');

      // Short magic-moment for fish (deco skips per main flow convention).
      if (entry.type === 'fish' && appState.magicController) {
        appState.magicMomentState.hiddenFishIds.add(prop.id);
        const sourceRect = cardElement?.getBoundingClientRect?.() ?? null;
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
            renderApp(root, aquarium, fishInputState, feedingState, appState);
          },
        });
      }

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

  appState.onboarding.bind(root, {
    fishInputState,
    render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
  });


  appState.sound.bindModal(root, {
    onResolved: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
  });
  appState.sound.bindMuteToggle(root, {
    render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
  });
}


function initApp() {
  const app = document.querySelector(SELECTORS.app);
  const aquarium = loadAquarium();
  const fishInputState = createFishInputState();
  const feedingState = createFeedingState();
  const appState = {
    selectedFishId: null,
    feedingAnimationId: null,
    isFishListCollapsed: false,
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
