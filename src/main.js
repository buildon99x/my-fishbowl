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
import { addFishToAquarium } from './features/aquarium/fish-actions.js';
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
import { bindFishListEvents } from './features/fish-list/events.js';
import { renderAquariumStatus } from './features/fish-list/view.js';
import { captureFishListScroll, restoreFishListScroll } from './features/fish-list/scroll.js';
import { bindFishSpriteDrag } from './features/fish-edit/drag.js';
import { escapeHtml } from './lib/utils.js';
import { cssVarsToInlineStyle, getFishSpriteStyleVars } from './lib/fishSpriteStyle.js';

const SELECTORS = {
  app: '#app',
};

function renderEmptyState(fishCount) {
  if (fishCount > 0) {
    return '';
  }

  return '<p class="aquarium-empty">?꾩쭅 臾쇨퀬湲곌? ?놁뒿?덈떎.</p>';
}


function renderFishes(fishes, selectedFishId, editingFishId, fishEatingId, magicHidden) {
  return fishes
    .filter((fish) => !fish.hidden && !magicHidden?.has(fish.id))
    .map(
      (fish) => `
        <img
          class="fish-sprite ${fish.id === selectedFishId ? 'is-selected' : ''} ${fish.id === editingFishId ? 'is-editing' : ''} ${fish.id === fishEatingId ? 'is-eating' : ''}"
          data-fish-sprite="${fish.id}"
          src="${fish.imageUrl}"
          alt="${escapeHtml(fish.name)}"
          style="${cssVarsToInlineStyle(getFishSpriteStyleVars(fish))}"
        >
      `,
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
              ${renderFishes(aquarium.fishes, appState.selectedFishId, appState.propPanel.editingTarget?.type === 'fish' ? appState.propPanel.editingTarget.id : null, feedingState.fishEating, appState.magicMomentState?.hiddenFishIds)}
            </div>
            ${renderEmptyState(aquarium.fishes.length)}
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
      })}
      ${renderMuteToggle(appState.sound.getSettings().masterEnabled)}
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
        const fish = addFishToAquarium(aquarium, draft);
        appState.selectedFishId = fish.id;
        appState.magicMomentState.hiddenFishIds.add(fish.id);

        const renderRef = () => renderApp(root, aquarium, fishInputState, feedingState, appState);
        appState.magicController.trigger({
          fishId: fish.id,
          sourceRect,
          spriteUrl: fish.imageUrl,
          getTargetPoint: () => {
            const bowl = root.querySelector('.aquarium-bowl');
            if (!bowl) return null;
            const r = bowl.getBoundingClientRect();
            return {
              clientX: r.left + (fish.x / 100) * r.width,
              clientY: r.top + (fish.y / 100) * r.height,
            };
          },
          onWelcoming: () => {
            appState.magicMomentState.hiddenFishIds.delete(fish.id);
            renderRef();
          },
          onBreathEnd: () => {
            appState.propPanel.editingTarget = { id: fish.id, type: 'fish' };
            renderRef();
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
  );
  bindCleaningEvents(root, aquarium, appState, {
    render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    save: saveAquarium,
  });
  appState.movementController = startFishMovement(root, aquarium, {
    getPausedFishIds: () => {
      const paused = new Set();
      const t = appState.propPanel.editingTarget;
      if (t?.type === 'fish') paused.add(t.id);
      if (feedingState.foods.length > 0) {
        aquarium.fishes.forEach((fish) => paused.add(fish.id));
      }
      return paused;
    },
    onSave: () => saveAquarium(aquarium),
  });

  const bubbleSvg = root.querySelector('[data-bubble-svg]');

  appState.bubbleController = startBubbles(bubbleSvg, appState.bubblesState);

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
    sound: createSoundController(),
    magicMomentState: createMagicMomentState(),
    magicController: null,
  };
  appState.magicController = createMagicMomentController({
    getState: () => appState.magicMomentState,
    getRoot: () => app,
    getSound: () => appState.sound,
  });
  appState.sound.bindVisibility();
  if (appState.sound.getSettings().masterEnabled && appState.sound.getSettings().categories.ambient.enabled) {
    appState.sound.acceptSoundOnboarding();
  }

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

