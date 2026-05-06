import './styles/index.css';
import {
  bindFishInputEvents,
  createFishInputState,
  renderFishInputPanel,
} from './features/fish-input/index.js';

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
        hidden: false,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        flipped: false,
        flippedY: false,
        ...fish,
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

  return {
    id: crypto.randomUUID(),
    name: draft.name,
    imageUrl: draft.spriteDataUrl,
    x: 28 + lane * 10,
    y: 46 + (lane % 3) * 8,
    vx: 0,
    vy: 0,
    speed: 0,
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
        <clipPath id="water-shape">
          <path d="M93 390 C126 268 224 243 352 320 C414 357 421 277 555 327 C666 368 626 216 798 300 C901 350 865 232 974 246 C1052 341 1068 494 1000 612 C913 763 684 766 500 744 C240 713 53 547 93 390 Z" />
        </clipPath>
      </defs>

      <g clip-path="url(#bowl-shape)">
        <rect x="180" y="34" width="792" height="84" fill="#80caf0" />
        <ellipse cx="576" cy="70" rx="398" ry="52" fill="#9ccfed" />
        <path d="M180 68 C204 32 941 34 972 68 C984 83 979 154 949 177 C1065 279 1116 404 1091 523 C1057 685 878 769 583 769 C287 769 113 672 77 515 C50 398 96 278 213 177 C181 148 169 88 180 68 Z" fill="#b8dcf3" />
        <path d="M93 390 C126 268 224 243 352 320 C414 357 421 277 555 327 C666 368 626 216 798 300 C901 350 865 232 974 246 C1052 341 1068 494 1000 612 C913 763 684 766 500 744 C240 713 53 547 93 390 Z" fill="#58bdd4" />
        <g clip-path="url(#water-shape)">
          <path d="M205 346 C258 247 257 583 544 691 C695 748 409 790 238 641 C105 526 128 435 205 346 Z" fill="#49aeca" opacity="0.42" />
          <path d="M610 307 C727 259 785 368 890 303 C949 266 980 310 1005 407 C961 298 891 308 860 338 C792 403 721 299 610 307 Z" fill="#7bc7dc" opacity="0.55" />
        </g>

        <g class="reference-bubbles">
          <circle cx="876" cy="372" r="22" fill="#86cfee" stroke="#d4f0ff" stroke-width="4" />
          <circle cx="923" cy="448" r="18" fill="#86cfee" stroke="#d4f0ff" stroke-width="4" />
          <circle cx="884" cy="367" r="5" fill="#ffffff" />
          <circle cx="926" cy="436" r="5" fill="#ffffff" />
          <path d="M861 374 C860 389 871 400 884 402" fill="none" stroke="#d4f0ff" stroke-width="7" stroke-linecap="round" opacity="0.8" />
          <path d="M909 450 C909 461 918 469 928 471" fill="none" stroke="#d4f0ff" stroke-width="6" stroke-linecap="round" opacity="0.8" />
        </g>

        <path d="M936 112 C970 113 980 116 970 139 C956 172 925 207 914 191 C907 181 927 129 936 112 Z" fill="#e6f5ff" opacity="0.85" />
        <path d="M935 224 C994 228 1072 340 1035 394 C1006 436 965 267 935 224 Z" fill="#e6f5ff" opacity="0.7" />
        <ellipse cx="1071" cy="458" rx="25" ry="36" fill="#e6f5ff" opacity="0.52" />
      </g>
    </svg>
  `;
}

function renderEmptyState(fishCount) {
  if (fishCount > 0) {
    return '';
  }

  return '<p class="aquarium-empty">아직 물고기가 없습니다.</p>';
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

function renderFishes(fishes, selectedFishId, editingFishId) {
  return fishes
    .filter((fish) => !fish.hidden)
    .map(
      (fish) => `
        <img
          class="fish-sprite ${fish.id === selectedFishId ? 'is-selected' : ''} ${fish.id === editingFishId ? 'is-editing' : ''}"
          data-fish-sprite="${fish.id}"
          src="${fish.imageUrl}"
          alt="${escapeHtml(fish.name)}"
          style="--fish-x: ${fish.x}%; --fish-y: ${fish.y}%; --fish-size: ${fish.size}px; --fish-scale-x: ${fish.scaleX}; --fish-scale-y: ${fish.scaleY}; --fish-rotation: ${fish.rotation}deg; --fish-flip: ${fish.flipped ? -1 : 1}; --fish-flip-y: ${fish.flippedY ? -1 : 1};"
        >
      `,
    )
    .join('');
}

function renderFishEditor(fish) {
  return `
    <div class="fish-editor">
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

function bindAquariumControls(root, aquarium, appState, render) {
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

function renderApp(root, aquarium, fishInputState, appState) {
  root.innerHTML = `
    <main class="fishbowl-page">
      <header class="page-header">
        <p class="eyebrow">My Fishbowl</p>
        <h1>${aquarium.name}</h1>
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
            <div class="fish-layer" data-fish-layer>
              ${renderFishes(aquarium.fishes, appState.selectedFishId, appState.editingFishId)}
            </div>
            ${renderEmptyState(aquarium.fishes.length)}
          </div>
        </div>

        <aside class="aquarium-status" aria-labelledby="aquarium-title">
          <h2 id="aquarium-title">물고기 목록</h2>
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
              <dd>${aquarium.algaeLevel}</dd>
            </div>
          </dl>
          ${renderFishList(aquarium.fishes, appState.selectedFishId, appState.editingFishId)}
        </aside>
      </section>

      ${renderFishInputPanel(fishInputState)}
    </main>
  `;

  bindFishInputEvents(
    root,
    fishInputState,
    () => renderApp(root, aquarium, fishInputState, appState),
    {
      onRegister: (draft) => {
        const fish = addFishToAquarium(aquarium, draft);
        appState.selectedFishId = fish.id;
        appState.editingFishId = fish.id;
      },
    },
  );
  bindAquariumControls(root, aquarium, appState, () => renderApp(root, aquarium, fishInputState, appState));
}

function initApp() {
  const app = document.querySelector(SELECTORS.app);
  const aquarium = loadAquarium();
  const fishInputState = createFishInputState();
  const appState = {
    selectedFishId: null,
    editingFishId: null,
  };

  saveAquarium(aquarium);
  renderApp(app, aquarium, fishInputState, appState);
}

initApp();
