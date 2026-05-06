import './styles/index.css';
import {
  bindFishInputEvents,
  createFishInputState,
  renderFishInputPanel,
} from './features/fish-input/index.js';
import {
  bindFeedingEvents,
  createFeedingState,
  renderFeedingControls,
  renderFoods,
  tickFeeding,
} from './features/feeding/index.js';
import {
  normalizeAquariumFishMovement,
  shouldFlipFishForMovement,
  startFishMovement,
} from './features/fish-movement/index.js';
import {
  ALGAE_STATE_NAMES,
  drawAlgaeLayer,
  restoreAlgaeState,
} from './features/algae/index.js';
import { createBubblesState, startBubbles } from './features/bubbles/index.js';

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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function renderDecoration() {
  return `
    <svg class="aquarium-art" viewBox="0 0 1152 780" role="img" aria-label="Glass fishbowl with water and goldfish">
      <defs>
        <clipPath id="bowl-shape">
          <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" />
        </clipPath>
        <clipPath id="bowl-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.122 0.049 C0.145 0 0.836 0.003 0.865 0.049 C0.876 0.069 0.872 0.166 0.843 0.197 C0.952 0.335 1 0.505 0.977 0.666 C0.945 0.886 0.777 1 0.5 1 C0.222 1 0.059 0.869 0.025 0.655 C0 0.497 0.043 0.334 0.153 0.197 C0.123 0.157 0.112 0.076 0.122 0.049 Z" />
        </clipPath>
        <clipPath id="water-shape">
          <path d="M118 142 C238 118 341 164 455 142 C571 119 656 166 774 142 C856 126 916 141 972 158 C1066 260 1116 403 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 397 71 244 118 142 Z" />
        </clipPath>
      </defs>

      <g clip-path="url(#bowl-shape)">
        <rect x="180" y="34" width="792" height="84" fill="#80caf0" />
        <ellipse cx="576" cy="70" rx="398" ry="52" fill="#9ccfed" />
        <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" fill="#b8dcf3" />
        <path d="M118 142 C238 118 341 164 455 142 C571 119 656 166 774 142 C856 126 916 141 972 158 C1066 260 1116 403 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 397 71 244 118 142 Z" fill="#58bdd4" />
        <g clip-path="url(#water-shape)">
          <path d="M181 190 C267 127 369 211 476 178 C608 137 680 217 817 174 C894 151 943 173 1000 241 C942 158 856 167 779 198 C661 246 587 158 453 194 C334 227 265 157 181 190 Z" fill="#7bc7dc" opacity="0.58" />
          <path d="M205 210 C258 112 257 583 544 691 C695 748 409 790 238 641 C105 526 128 299 205 210 Z" fill="#49aeca" opacity="0.42" />
        </g>

        <g class="aquarium-ground" aria-hidden="true">
          <path class="sand-bed" d="M169 650 C301 602 418 646 566 621 C745 590 887 609 999 662 C920 736 758 769 582 768 C398 767 250 731 169 650 Z" />
          <g class="sway-plant sway-plant-left">
            <path d="M306 654 C289 606 303 562 277 520 C253 480 269 431 249 392" />
            <path d="M321 654 C324 602 357 573 354 523 C351 473 391 441 390 398" />
            <path d="M336 655 C360 618 383 590 395 546 C407 500 456 492 464 449" />
          </g>
          <g class="sway-plant sway-plant-right">
            <path d="M818 657 C798 616 817 578 790 535 C765 496 775 459 746 421" />
            <path d="M838 657 C850 606 879 579 869 530 C860 486 895 451 888 409" />
          </g>
          <g class="garden-eel garden-eel-one">
            <path d="M514 650 C495 603 501 562 527 523 C548 491 541 458 520 428" />
            <circle cx="512" cy="424" r="4" />
            <circle cx="529" cy="425" r="4" />
          </g>
          <g class="garden-eel garden-eel-two">
            <path d="M642 651 C666 612 674 572 653 532 C635 498 653 469 681 444" />
            <circle cx="676" cy="438" r="4" />
            <circle cx="690" cy="447" r="4" />
          </g>
          <path class="sand-cover" d="M151 665 C286 618 418 655 564 631 C753 600 902 622 1020 675 C934 740 763 771 582 769 C394 767 238 733 151 665 Z" />
          <ellipse class="sand-glint" cx="418" cy="665" rx="118" ry="18" />
          <ellipse class="sand-glint sand-glint-right" cx="782" cy="663" rx="154" ry="22" />
        </g>

<path d="M936 112 C970 113 980 116 970 139 C956 172 925 207 914 191 C907 181 927 129 936 112 Z" fill="#e6f5ff" opacity="0.85" />
        <path d="M935 224 C994 228 1072 340 1035 394 C1006 436 965 267 935 224 Z" fill="#e6f5ff" opacity="0.7" />
        <ellipse cx="1071" cy="458" rx="25" ry="36" fill="#e6f5ff" opacity="0.52" />
        <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" fill="none" stroke="#e6f5ff" stroke-width="16" stroke-linejoin="round" opacity="0.78" />
        <path d="M183 72 C226 39 923 42 969 72" fill="none" stroke="#f7fcff" stroke-width="9" stroke-linecap="round" opacity="0.86" />
        <path d="M181 69 C205 33 941 35 971 69" fill="none" stroke="#498aa8" stroke-width="4" stroke-linecap="round" opacity="0.32" />
      </g>
    </svg>
  `;
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
          style="--fish-x: ${fish.x}%; --fish-y: ${fish.y}%; --fish-size: ${fish.size}px; --fish-scale-x: ${fish.scaleX}; --fish-scale-y: ${fish.scaleY}; --fish-rotation: ${fish.rotation}deg; --fish-tilt: ${fish.movementTilt ?? 0}deg; --fish-bob-y: ${fish.waveOffset ?? 0}px; --fish-flip: ${shouldFlipFishForMovement(fish) ? -1 : 1}; --fish-flip-y: ${fish.flippedY ? -1 : 1};"
        >
      `,
    )
    .join('');
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

    if (result.didChange) {
      renderApp(root, aquarium, fishInputState, feedingState, appState);
    }

    if (feedingState.foods.length > 0) {
      appState.feedingAnimationId = window.requestAnimationFrame(runFrame);
      return;
    }

    appState.feedingAnimationId = null;

    if (feedingState.fishEating) {
      window.setTimeout(() => {
        feedingState.fishEating = null;
        renderApp(root, aquarium, fishInputState, feedingState, appState);
      }, 260);
    }
  };

  appState.feedingAnimationId = window.requestAnimationFrame(runFrame);
}

function renderFishEditor(fish) {
  return `
    <div class="fish-editor">
      <label class="fish-editor-name">
        <span>이름</span>
        <input
          type="text"
          maxlength="40"
          value="${escapeHtml(fish.name)}"
          data-edit-fish-name="${fish.id}"
        >
      </label>
      <div class="fish-editor-toolbar">
        <button class="fish-action-button" type="button" data-flip-fish="${fish.id}">
          좌우반전
        </button>
        <button class="fish-action-button" type="button" data-flip-fish-y="${fish.id}">
          상하 반전
        </button>
        <button class="fish-action-button" type="button" data-reset-fish-transform="${fish.id}">
          초기화
        </button>
      </div>
      <label>
        <span>머리</span>
        <select data-edit-fish-head-direction="${fish.id}">
          <option value="right" ${fish.headDirection === 'left' ? '' : 'selected'}>오른쪽</option>
          <option value="left" ${fish.headDirection === 'left' ? 'selected' : ''}>왼쪽</option>
        </select>
      </label>
      <label>
        <span>이동</span>
        <select data-edit-fish-movement="${fish.id}">
          <option value="on" ${fish.movementEnabled === false ? '' : 'selected'}>On</option>
          <option value="off" ${fish.movementEnabled === false ? 'selected' : ''}>Off</option>
        </select>
      </label>
      <label>
        <span>크기</span>
        <input
          type="range"
          min="60"
          max="220"
          step="5"
          value="${fish.size}"
          data-edit-fish-size="${fish.id}"
        >
      </label>
      <label>
        <span>회전</span>
        <input
          type="range"
          min="-180"
          max="180"
          step="5"
          value="${fish.rotation}"
          data-edit-fish-rotation="${fish.id}"
        >
      </label>
      <label>
        <span>가로</span>
        <input
          type="range"
          min="0.65"
          max="1.45"
          step="0.05"
          value="${fish.scaleX}"
          data-edit-fish-scale-x="${fish.id}"
        >
      </label>
      <label>
        <span>세로</span>
        <input
          type="range"
          min="0.65"
          max="1.45"
          step="0.05"
          value="${fish.scaleY}"
          data-edit-fish-scale-y="${fish.id}"
        >
      </label>
    </div>
  `;
}

function renderFishList(fishes, selectedFishId, editingFishId) {
  if (fishes.length === 0) {
    return '<p class="fish-list-empty">등록된 물고기가 없습니다.</p>';
  }

  return `
    <div class="fish-list" role="list">
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
                <button class="fish-action-button" type="button" data-edit-fish="${fish.id}">
                  편집
                </button>
                <button class="fish-action-button" type="button" data-toggle-fish-hidden="${fish.id}">
                  ${fish.hidden ? '보이기' : '감추기'}
                </button>
                <button class="fish-action-button fish-action-danger" type="button" data-delete-fish="${fish.id}">
                  삭제
                </button>
              </div>
              ${fish.id === editingFishId ? renderFishEditor(fish) : ''}
            </div>
          `,
        )
        .join('')}
    </div>
  `;
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
            <dd>${aquarium.algaeLevel} · ${ALGAE_STATE_NAMES[aquarium.algaeLevel] ?? 'clean'}</dd>
          </div>
        </dl>
        ${renderFishList(aquarium.fishes, appState.selectedFishId, appState.editingFishId)}
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
      appState.selectedFishId = button.dataset.editFish;
      appState.editingFishId = appState.editingFishId === button.dataset.editFish ? null : button.dataset.editFish;
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-name]').forEach((input) => {
    input.addEventListener('input', () => {
      const fishId = input.dataset.editFishName;

      appState.selectedFishId = fishId;
      updateFishAppearance(aquarium, fishId, { name: input.value });
    });

    input.addEventListener('change', () => {
      const fishId = input.dataset.editFishName;
      const trimmed = input.value.trim();

      if (!trimmed) {
        updateFishAppearance(aquarium, fishId, { name: '이름 없는 물고기' });
      }
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-size]').forEach((input) => {
    input.addEventListener('input', () => {
      appState.selectedFishId = input.dataset.editFishSize;
      updateFishAppearance(aquarium, input.dataset.editFishSize, {
        size: Number(input.value),
      });
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-rotation]').forEach((input) => {
    input.addEventListener('input', () => {
      appState.selectedFishId = input.dataset.editFishRotation;
      updateFishAppearance(aquarium, input.dataset.editFishRotation, {
        rotation: Number(input.value),
      });
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-scale-x]').forEach((input) => {
    input.addEventListener('input', () => {
      appState.selectedFishId = input.dataset.editFishScaleX;
      updateFishAppearance(aquarium, input.dataset.editFishScaleX, {
        scaleX: Number(input.value),
      });
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-scale-y]').forEach((input) => {
    input.addEventListener('input', () => {
      appState.selectedFishId = input.dataset.editFishScaleY;
      updateFishAppearance(aquarium, input.dataset.editFishScaleY, {
        scaleY: Number(input.value),
      });
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-head-direction]').forEach((select) => {
    select.addEventListener('change', () => {
      const fishId = select.dataset.editFishHeadDirection;

      appState.selectedFishId = fishId;
      updateFishAppearance(aquarium, fishId, {
        headDirection: select.value === 'left' ? 'left' : 'right',
      });
      render();
    });
  });

  root.querySelectorAll('[data-edit-fish-movement]').forEach((select) => {
    select.addEventListener('change', () => {
      const fishId = select.dataset.editFishMovement;

      appState.selectedFishId = fishId;
      updateFishAppearance(aquarium, fishId, {
        movementEnabled: select.value !== 'off',
      });
      render();
    });
  });

  root.querySelectorAll('[data-flip-fish]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.flipFish;
      const fish = getFishById(aquarium, fishId);

      appState.selectedFishId = fishId;
      updateFishAppearance(aquarium, fishId, {
        flipped: !fish?.flipped,
      });
      render();
    });
  });

  root.querySelectorAll('[data-flip-fish-y]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.flipFishY;
      const fish = getFishById(aquarium, fishId);

      appState.selectedFishId = fishId;
      updateFishAppearance(aquarium, fishId, {
        flippedY: !fish?.flippedY,
      });
      render();
    });
  });

  root.querySelectorAll('[data-reset-fish-transform]').forEach((button) => {
    button.addEventListener('click', () => {
      const fishId = button.dataset.resetFishTransform;

      appState.selectedFishId = fishId;
      updateFishAppearance(aquarium, fishId, {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        flipped: false,
        flippedY: false,
        size: 120,
      });
      render();
    });
  });

  root.querySelectorAll('[data-fish-sprite]').forEach((sprite) => {
    sprite.addEventListener('pointerdown', (event) => {
      const fishId = sprite.dataset.fishSprite;

      if (appState.editingFishId !== fishId) {
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
      if (appState.editingFishId === fishId) {
        appState.editingFishId = null;
      }
      render();
    });
  });
}

function renderApp(root, aquarium, fishInputState, feedingState, appState) {
  appState.movementController?.stop();
  appState.bubbleController?.stop();

  root.innerHTML = `
    <main class="fishbowl-page">
      <header class="page-header">
        <p class="eyebrow">My Fishbowl</p>
        <h1>${aquarium.name}</h1>
        ${renderFeedingControls(feedingState)}
      </header>

      <section class="aquarium-layout" aria-labelledby="aquarium-title">
        <div class="aquarium-shell">
          <div
            class="aquarium-bowl"
            data-shape="${aquarium.bounds.shape}"
            style="--bowl-width: ${aquarium.bounds.width}px; --bowl-height: ${aquarium.bounds.height}px;"
          >
            <div class="water-surface" aria-hidden="true"></div>
            <div class="swim-boundary" aria-hidden="true"></div>
            ${renderDecoration()}
            <svg class="bubble-layer" data-bubble-svg viewBox="0 0 1152 780" aria-hidden="true"></svg>
            <canvas class="algae-layer" data-algae-canvas aria-hidden="true"></canvas>
            <div class="fish-layer" data-fish-layer>
              <div class="food-layer" aria-hidden="true">
                ${renderFoods(feedingState.foods)}
              </div>
              ${renderFishes(aquarium.fishes, appState.selectedFishId, appState.editingFishId, feedingState.fishEating)}
            </div>
            ${renderEmptyState(aquarium.fishes.length)}
          </div>
        </div>

        ${renderAquariumStatus(aquarium, appState)}
      </section>

      ${renderFishInputPanel(fishInputState)}
    </main>
  `;

  const algaeCanvas = root.querySelector('[data-algae-canvas]');
  if (algaeCanvas) {
    drawAlgaeLayer(algaeCanvas, aquarium.algaeLevel);
  }

  bindFishInputEvents(
    root,
    fishInputState,
    () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    {
      onRegister: (draft) => {
        const fish = addFishToAquarium(aquarium, draft);
        appState.selectedFishId = fish.id;
        appState.editingFishId = fish.id;
      },
    },
  );
  bindAquariumControls(root, aquarium, appState, () => renderApp(root, aquarium, fishInputState, feedingState, appState));
  bindFeedingEvents(root, feedingState, {
    render: () => renderApp(root, aquarium, fishInputState, feedingState, appState),
    startAnimation: () => startFeedingAnimation(root, aquarium, fishInputState, feedingState, appState),
  });
  appState.movementController = startFishMovement(root, aquarium, {
    getPausedFishIds: () => new Set(appState.editingFishId ? [appState.editingFishId] : []),
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
    editingFishId: null,
    feedingAnimationId: null,
    isFishListCollapsed: false,
    movementController: null,
    bubbleController: null,
    bubblesState: createBubblesState(),
  };

  normalizeAquariumFishMovement(aquarium, performance.now());
  restoreAlgaeState(aquarium);
  saveAquarium(aquarium);
  renderApp(app, aquarium, fishInputState, feedingState, appState);
}

initApp();

