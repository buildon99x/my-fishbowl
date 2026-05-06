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
import {
  ALGAE_MAX_LEVEL,
  drawAlgaeLayer,
  getAlgaeStateName,
  restoreAlgaeState,
} from './features/algae/index.js';
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
import { clamp, escapeHtml } from './lib/utils.js';
import { cssVarsToInlineStyle, getFishSpriteStyleVars } from './lib/fishSpriteStyle.js';

const SELECTORS = {
  app: '#app',
};

const STORAGE_KEY = 'my-fishbowl:aquarium';

const DEFAULT_BOUNDS = {
  shape: 'rounded-bowl',
  width: 1152,
  height: 780,
  padding: 66,
};

function createAquarium() {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: '나만의 어항',
    fishes: [],
    cleanliness: 100,
    algaeLevel: 0,
    bounds: { ...DEFAULT_BOUNDS },
    lastCleanedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeAquarium(aquarium) {
  const fallback = createAquarium();
  const fishes = Array.isArray(aquarium?.fishes)
    ? aquarium.fishes.map((fish) => ({
        ...fish,
        hidden: Boolean(fish?.hidden),
        vx: Number.isFinite(fish?.vx) ? fish.vx : 0,
        vy: Number.isFinite(fish?.vy) ? fish.vy : 0,
        speed: Number.isFinite(fish?.speed) ? fish.speed : 0,
        movementStatus: ['cruising', 'idle', 'dart', 'wander', 'turning'].includes(fish?.movementStatus)
          ? fish.movementStatus
          : 'cruising',
        behaviorStatus: ['cruising', 'idle', 'dart', 'wander', 'turning'].includes(fish?.behaviorStatus)
          ? fish.behaviorStatus
          : 'cruising',
        turnUntilMs: Number.isFinite(fish?.turnUntilMs) ? fish.turnUntilMs : 0,
        turnStartedAtMs: Number.isFinite(fish?.turnStartedAtMs) ? fish.turnStartedAtMs : 0,
        turnFromVx: Number.isFinite(fish?.turnFromVx) ? fish.turnFromVx : 0,
        turnFromVy: Number.isFinite(fish?.turnFromVy) ? fish.turnFromVy : 0,
        turnTargetVx: Number.isFinite(fish?.turnTargetVx) ? fish.turnTargetVx : 0,
        turnTargetVy: Number.isFinite(fish?.turnTargetVy) ? fish.turnTargetVy : 0,
        turnReturnStatus: fish?.turnReturnStatus ?? 'cruising',
        wallPauseUntilMs: Number.isFinite(fish?.wallPauseUntilMs) ? fish.wallPauseUntilMs : 0,
        wallResumeVx: Number.isFinite(fish?.wallResumeVx) ? fish.wallResumeVx : 0,
        wallResumeVy: Number.isFinite(fish?.wallResumeVy) ? fish.wallResumeVy : 0,
        nextTargetAtMs: Number.isFinite(fish?.nextTargetAtMs) ? fish.nextTargetAtMs : 0,
        bobPhase: Number.isFinite(fish?.bobPhase) ? fish.bobPhase : 0,
        waveOffset: Number.isFinite(fish?.waveOffset) ? fish.waveOffset : 0,
        movementTilt: Number.isFinite(fish?.movementTilt) ? fish.movementTilt : 0,
        speedMultiplier: Number.isFinite(fish?.speedMultiplier) && fish.speedMultiplier > 0 ? fish.speedMultiplier : null,
        idleBias: Number.isFinite(fish?.idleBias) ? fish.idleBias : null,
        preferredDepth: ['top', 'middle', 'bottom'].includes(fish?.preferredDepth) ? fish.preferredDepth : null,
        wavingFrequency: Number.isFinite(fish?.wavingFrequency) && fish.wavingFrequency > 0 ? fish.wavingFrequency : null,
        wavingAmplitude: Number.isFinite(fish?.wavingAmplitude) && fish.wavingAmplitude > 0 ? fish.wavingAmplitude : null,
        behaviorStartedAtMs: Number.isFinite(fish?.behaviorStartedAtMs) ? fish.behaviorStartedAtMs : 0,
        dartUntilMs: Number.isFinite(fish?.dartUntilMs) ? fish.dartUntilMs : 0,
        wanderUntilMs: Number.isFinite(fish?.wanderUntilMs) ? fish.wanderUntilMs : 0,
        nextBehaviorAtMs: Number.isFinite(fish?.nextBehaviorAtMs) ? fish.nextBehaviorAtMs : 0,
        headDirection: fish?.headDirection === 'left' ? 'left' : 'right',
        movementEnabled: fish?.movementEnabled !== false,
        size: Number.isFinite(fish?.size) ? fish.size : 120,
        rotation: Number.isFinite(fish?.rotation) ? fish.rotation : 0,
        scaleX: Number.isFinite(fish?.scaleX)
          ? fish.scaleX
          : Number.isFinite(fish?.shapeScaleX)
            ? fish.shapeScaleX
            : 1,
        scaleY: Number.isFinite(fish?.scaleY) ? fish.scaleY : 1,
        flipped: Boolean(fish?.flipped),
        flippedY: Boolean(fish?.flippedY),
        hunger: Number.isFinite(fish?.hunger) ? fish.hunger : 0,
      }))
    : [];

  return {
    ...fallback,
    ...aquarium,
    fishes,
    bounds: {
      ...DEFAULT_BOUNDS,
      ...aquarium?.bounds,
    },
  };
}

function loadAquarium() {
  try {
    const savedAquarium = localStorage.getItem(STORAGE_KEY);

    if (!savedAquarium) {
      return createAquarium();
    }

    return normalizeAquarium(JSON.parse(savedAquarium));
  } catch (error) {
    console.warn('Saved aquarium data could not be loaded.', error);
    return createAquarium();
  }
}

function saveAquarium(aquarium) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(aquarium));
  } catch (error) {
    console.warn('Aquarium data could not be saved.', error);
  }
}

function createFishFromDraft(draft, index) {
  const now = new Date().toISOString();
  const lane = index % 5;
  const preferredDepths = ['top', 'middle', 'bottom'];

  return {
    id: crypto.randomUUID(),
    name: draft.name,
    imageUrl: draft.spriteDataUrl,
    x: 28 + lane * 10,
    y: 46 + (lane % 3) * 8,
    vx: 0,
    vy: 0,
    speed: 0,
    movementStatus: 'cruising',
    behaviorStatus: 'cruising',
    turnUntilMs: 0,
    turnStartedAtMs: 0,
    turnFromVx: 0,
    turnFromVy: 0,
    turnTargetVx: 0,
    turnTargetVy: 0,
    turnReturnStatus: 'cruising',
    wallPauseUntilMs: 0,
    wallResumeVx: 0,
    wallResumeVy: 0,
    nextTargetAtMs: 0,
    bobPhase: 0,
    waveOffset: 0,
    movementTilt: 0,
    speedMultiplier: 0.7 + Math.random() * 0.6,
    idleBias: Math.random() * 0.4,
    preferredDepth: preferredDepths[Math.floor(Math.random() * preferredDepths.length)],
    wavingFrequency: 2 + Math.random() * 2,
    wavingAmplitude: 2 + Math.random() * 3,
    behaviorStartedAtMs: 0,
    dartUntilMs: 0,
    wanderUntilMs: 0,
    nextBehaviorAtMs: 0,
    headDirection: 'right',
    movementEnabled: draft.movementEnabled !== false,
    size: 120,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    flipped: false,
    flippedY: false,
    hunger: 0,
    hidden: false,
    createdAt: now,
  };
}

function addFishToAquarium(aquarium, draft) {
  const fish = createFishFromDraft(draft, aquarium.fishes.length);

  aquarium.fishes = [...aquarium.fishes, fish];
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);

  return fish;
}

function deleteFishFromAquarium(aquarium, fishId) {
  aquarium.fishes = aquarium.fishes.filter((fish) => fish.id !== fishId);
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

function toggleFishHidden(aquarium, fishId) {
  aquarium.fishes = aquarium.fishes.map((fish) =>
    fish.id === fishId
      ? {
          ...fish,
          hidden: !fish.hidden,
        }
      : fish,
  );
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

function updateFishAppearance(aquarium, fishId, patch) {
  aquarium.fishes = aquarium.fishes.map((fish) =>
    fish.id === fishId
      ? {
          ...fish,
          ...patch,
        }
      : fish,
  );
  aquarium.updatedAt = new Date().toISOString();
  saveAquarium(aquarium);
}

function getFishById(aquarium, fishId) {
  return aquarium.fishes.find((fish) => fish.id === fishId);
}

function renderEmptyState(fishCount) {
  if (fishCount > 0) {
    return '';
  }

  return '<p class="aquarium-empty">?꾩쭅 臾쇨퀬湲곌? ?놁뒿?덈떎.</p>';
}

function formatRegisteredTime(value) {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function renderFishes(fishes, selectedFishId, editingFishId, fishEatingId) {
  return fishes
    .filter((fish) => !fish.hidden)
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


function renderFishList(fishes, selectedFishId, editingTarget) {
  if (fishes.length === 0) {
    return '<p class="fish-list-empty">등록된 물고기가 없습니다.</p>';
  }

  const editingFishId = editingTarget?.type === 'fish' ? editingTarget.id : null;

  return `
    <div class="fish-list" role="list" data-fish-list>
      ${fishes
        .map(
          (fish) => `
            <div class="fish-list-item ${fish.id === selectedFishId ? 'is-selected' : ''}" role="listitem" data-fish-id="${fish.id}">
              <button class="fish-list-select" type="button" data-select-fish="${fish.id}" aria-pressed="${fish.id === selectedFishId}">
                <img src="${fish.imageUrl}" alt="" class="fish-list-thumb">
                <span class="fish-list-name">${escapeHtml(fish.name)}</span>
                <time class="fish-list-time" datetime="${escapeHtml(fish.createdAt)}">${formatRegisteredTime(fish.createdAt)}</time>
              </button>
              <div class="fish-list-actions">
                <button class="fish-action-button ${fish.id === editingFishId ? 'is-active' : ''}" type="button" data-edit-fish="${fish.id}" title="편집">
                  ✏️
                </button>
                <button class="fish-action-button" type="button" data-toggle-fish-hidden="${fish.id}">
                  ${fish.hidden ? '보이기' : '감추기'}
                </button>
                <button class="fish-action-button fish-action-danger" type="button" data-delete-fish="${fish.id}">
                  삭제
                </button>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function captureFishListScroll(root, appState) {
  const fishList = root.querySelector('[data-fish-list]');
  if (!fishList) return;

  appState.fishListScrollTop = fishList.scrollTop;
}

function restoreFishListScroll(root, appState) {
  const fishList = root.querySelector('[data-fish-list]');
  if (!fishList) return;

  fishList.scrollTop = appState.fishListScrollTop ?? 0;
}

function renderAquariumStatus(aquarium, appState) {
  const bodyId = 'fish-list-panel-body';

  return `
    <aside class="aquarium-status ${appState.isFishListCollapsed ? 'is-collapsed' : ''}" aria-labelledby="aquarium-title">
      <button
        class="aquarium-status-toggle"
        type="button"
        data-toggle-fish-list
        aria-expanded="${!appState.isFishListCollapsed}"
        aria-controls="${bodyId}"
      >
        <span class="aquarium-status-toggle-copy">
          <span id="aquarium-title">물고기 목록</span>
          <span>${aquarium.fishes.length}마리</span>
        </span>
        <span class="aquarium-status-toggle-icon" aria-hidden="true">
          <span>${appState.isFishListCollapsed ? '+' : '-'}</span>
          <span>${appState.isFishListCollapsed ? '펼치기' : '접기'}</span>
        </span>
      </button>

      <div class="aquarium-status-body" id="${bodyId}" ${appState.isFishListCollapsed ? 'hidden' : ''}>
        <dl class="status-list">
          <div>
            <dt>청결도</dt>
            <dd>${aquarium.cleanliness}%</dd>
          </div>
          <div>
            <dt>물고기 수</dt>
            <dd>${aquarium.fishes.length}</dd>
          </div>
          <div>
            <dt>이끼 단계</dt>
            <dd>${aquarium.algaeLevel} / ${ALGAE_MAX_LEVEL} · ${getAlgaeStateName(aquarium.algaeLevel)}</dd>
          </div>
        </dl>
        ${renderFishList(aquarium.fishes, appState.selectedFishId, appState.propPanel.editingTarget)}
      </div>
    </aside>
  `;
}

function bindAquariumControls(root, aquarium, appState, render) {
  root.querySelector('[data-toggle-fish-list]')?.addEventListener('click', () => {
    appState.isFishListCollapsed = !appState.isFishListCollapsed;
    render();
  });

  root.querySelectorAll('[data-select-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      appState.selectedFishId = button.dataset.selectFish;
      render();
    });
  });

  root.querySelectorAll('[data-toggle-fish-hidden]').forEach((button) => {
    button.addEventListener('click', () => {
      toggleFishHidden(aquarium, button.dataset.toggleFishHidden);
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.editFish;
      appState.selectedFishId = fishId;
      const current = appState.propPanel.editingTarget;
      appState.propPanel.editingTarget =
        current?.type === 'fish' && current?.id === fishId
          ? null
          : { id: fishId, type: 'fish' };
      render();
    });
  });

  root.querySelectorAll('[data-fish-sprite]').forEach((sprite) => {
    sprite.addEventListener('pointerdown', (event) => {
      const fishId = sprite.dataset.fishSprite;
      const { editingTarget } = appState.propPanel;

      if (editingTarget?.type !== 'fish' || editingTarget?.id !== fishId) {
        return;
      }

      const layer = root.querySelector('[data-fish-layer]');
      const fish = getFishById(aquarium, fishId);

      if (!layer || !fish) {
        return;
      }

      event.preventDefault();
      sprite.setPointerCapture(event.pointerId);
      appState.selectedFishId = fishId;

      const moveFish = (moveEvent) => {
        const rect = layer.getBoundingClientRect();
        const x = clamp(((moveEvent.clientX - rect.left) / rect.width) * 100, 4, 96);
        const y = clamp(((moveEvent.clientY - rect.top) / rect.height) * 100, 6, 94);

        fish.x = x;
        fish.y = y;
        sprite.style.setProperty('--fish-x', `${x}%`);
        sprite.style.setProperty('--fish-y', `${y}%`);
      };

      const finishMove = () => {
        sprite.releasePointerCapture(event.pointerId);
        sprite.removeEventListener('pointermove', moveFish);
        sprite.removeEventListener('pointerup', finishMove);
        sprite.removeEventListener('pointercancel', finishMove);
        updateFishAppearance(aquarium, fishId, {
          x: fish.x,
          y: fish.y,
        });
        render();
      };

      moveFish(event);
      sprite.addEventListener('pointermove', moveFish);
      sprite.addEventListener('pointerup', finishMove);
      sprite.addEventListener('pointercancel', finishMove);
    });
  });

  root.querySelectorAll('[data-delete-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.deleteFish;

      deleteFishFromAquarium(aquarium, fishId);
      if (appState.selectedFishId === fishId) {
        appState.selectedFishId = null;
      }
      if (appState.propPanel.editingTarget?.type === 'fish' && appState.propPanel.editingTarget?.id === fishId) {
        appState.propPanel.editingTarget = null;
      }
      render();
    });
  });
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
              ${renderFishes(aquarium.fishes, appState.selectedFishId, appState.propPanel.editingTarget?.type === 'fish' ? appState.propPanel.editingTarget.id : null, feedingState.fishEating)}
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
        const fish = addFishToAquarium(aquarium, draft);
        appState.selectedFishId = fish.id;
        appState.propPanel.editingTarget = { id: fish.id, type: 'fish' };
      },
    },
  );
  bindAquariumControls(root, aquarium, appState, () => renderApp(root, aquarium, fishInputState, feedingState, appState));
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
  };

  normalizeAquariumFishMovement(aquarium, performance.now());
  restoreAlgaeState(aquarium);
  saveAquarium(aquarium);
  renderApp(app, aquarium, fishInputState, feedingState, appState);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appState.cleaningState.cleaningMode) {
      exitCleaningMode(appState.cleaningState);
      renderApp(app, aquarium, fishInputState, feedingState, appState);
    }

  });
}

initApp();

