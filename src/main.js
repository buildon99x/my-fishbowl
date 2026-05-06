import './styles/index.css';

const SELECTORS = {
  app: '#app',
};

const STORAGE_KEY = 'my-fishbowl:aquarium';

const DEFAULT_BOUNDS = {
  shape: 'rounded-bowl',
  width: 360,
  height: 520,
  padding: 36,
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

  return {
    ...fallback,
    ...aquarium,
    fishes: Array.isArray(aquarium?.fishes) ? aquarium.fishes : [],
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

function renderDecoration() {
  return `
    <div class="bubbles" aria-hidden="true">
      <span class="bubble bubble-large"></span>
      <span class="bubble bubble-medium"></span>
      <span class="bubble bubble-small"></span>
    </div>
    <div class="plant" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="pebble-stack" aria-hidden="true">
      <span class="pebble pebble-blue"></span>
      <span class="pebble pebble-yellow"></span>
      <span class="pebble pebble-green"></span>
    </div>
  `;
}

function renderEmptyState(fishCount) {
  if (fishCount > 0) {
    return '';
  }

  return '<p class="aquarium-empty">아직 물고기가 없습니다.</p>';
}

function renderApp(root, aquarium) {
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
            ${renderEmptyState(aquarium.fishes.length)}
          </div>
        </div>

        <aside class="aquarium-status" aria-labelledby="aquarium-title">
          <h2 id="aquarium-title">어항 상태</h2>
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
        </aside>
      </section>
    </main>
  `;
}

function initApp() {
  const app = document.querySelector(SELECTORS.app);
  const aquarium = loadAquarium();

  saveAquarium(aquarium);
  renderApp(app, aquarium);
}

initApp();
